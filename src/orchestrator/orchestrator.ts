/**
 * Agent Orchestrator
 *
 * Coordinates multiple specialized agents for complex multi-step tasks.
 */

import { EventEmitter } from "node:events";

import type {
  OrchestratorConfig,
  OrchestratorAgentConfig,
  TaskDefinition,
  TaskResult,
  TaskState,
  WorkflowDefinition,
  WorkflowState,
  DecompositionResult,
  AgentSelectionResult,
  OrchestratorEvents,
} from "./types.js";
import { TaskQueue } from "./task-queue.js";

export type AgentExecutor = (params: {
  agentId: string;
  prompt: string;
  context?: Record<string, unknown>;
  model?: string;
  tools?: string[];
  timeoutSec?: number;
}) => Promise<{ success: boolean; output?: unknown; error?: string }>;

export type OrchestratorOptions = {
  config: OrchestratorConfig;
  executeAgent: AgentExecutor;
};

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private executeAgent: AgentExecutor;
  private agents: Map<string, OrchestratorAgentConfig> = new Map();
  private activeWorkflows: Map<string, WorkflowState> = new Map();
  private runningTasks: Map<string, Promise<TaskResult>> = new Map();

  constructor(options: OrchestratorOptions) {
    super();
    this.config = options.config;
    this.executeAgent = options.executeAgent;

    // Index agents
    for (const agent of options.config.agents) {
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Execute a single task with automatic agent selection
   */
  async executeTask(task: TaskDefinition): Promise<TaskResult> {
    const startTime = Date.now();

    // Select agent
    const agent = this.selectAgent(task);
    if (!agent) {
      return {
        success: false,
        error: "No suitable agent found for task",
        durationMs: Date.now() - startTime,
        retries: 0,
      };
    }

    this.emit("task:started", { taskId: task.id, agentId: agent.agentId });

    // Build prompt from task
    const prompt = this.buildTaskPrompt(task);

    // Execute with retries
    let lastError: string | undefined;
    const maxRetries = task.maxRetries ?? 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeAgent({
          agentId: agent.agentId,
          prompt,
          context: task.context,
          model: this.agents.get(agent.agentId)?.model,
          tools: this.agents.get(agent.agentId)?.tools,
          timeoutSec: task.timeoutSec ?? this.config.defaultTimeoutSec,
        });

        if (result.success) {
          const taskResult: TaskResult = {
            success: true,
            output: result.output,
            durationMs: Date.now() - startTime,
            retries: attempt,
          };

          this.emit("task:completed", { taskId: task.id, result: taskResult });
          return taskResult;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      if (attempt < maxRetries) {
        this.emit("task:failed", {
          taskId: task.id,
          error: lastError ?? "Unknown error",
          retrying: true,
        });
      }
    }

    const failedResult: TaskResult = {
      success: false,
      error: lastError,
      durationMs: Date.now() - startTime,
      retries: maxRetries,
    };

    this.emit("task:failed", { taskId: task.id, error: lastError ?? "Unknown error", retrying: false });
    return failedResult;
  }

  /**
   * Execute a workflow (multiple tasks with dependencies)
   */
  async executeWorkflow(workflow: WorkflowDefinition): Promise<Map<string, TaskResult>> {
    const workflowState: WorkflowState = {
      workflow,
      tasks: new Map(),
      status: "pending",
      results: new Map(),
    };

    this.activeWorkflows.set(workflow.id, workflowState);
    this.emit("workflow:started", { workflowId: workflow.id });

    // Create task queue
    const queue = new TaskQueue();
    queue.addAll(workflow.tasks);

    workflowState.status = "running";
    workflowState.startedAt = new Date();

    const results = new Map<string, TaskResult>();
    const maxParallel = workflow.maxParallel ?? this.config.maxConcurrentTasks ?? 4;

    try {
      // Process tasks until all complete
      while (!queue.isComplete()) {
        // Get ready tasks
        const runningCount = queue.getRunningTasks().length;
        const slotsAvailable = maxParallel - runningCount;

        if (slotsAvailable > 0) {
          const readyTasks = queue.getReadyTasks(slotsAvailable);

          for (const taskState of readyTasks) {
            queue.updateStatus(taskState.task.id, "running");

            // Execute task in background
            const taskPromise = this.executeTask(taskState.task).then((result) => {
              results.set(taskState.task.id, result);
              taskState.result = result;
              queue.updateStatus(
                taskState.task.id,
                result.success ? "completed" : "failed",
              );

              this.runningTasks.delete(taskState.task.id);
              return result;
            });

            this.runningTasks.set(taskState.task.id, taskPromise);
          }
        }

        // Wait for at least one task to complete
        if (this.runningTasks.size > 0) {
          await Promise.race(Array.from(this.runningTasks.values()));
        } else {
          // No tasks running and none ready - might be blocked
          const blocked = queue.getBlockedTasks();
          if (blocked.length > 0 && !queue.hasFailures()) {
            // Deadlock - tasks are waiting on each other
            throw new Error("Workflow deadlock: tasks have circular dependencies");
          }
          break;
        }

        // Check for failures if abort strategy
        if (workflow.onFailure === "abort" && queue.hasFailures()) {
          queue.cancelAll();
          break;
        }
      }

      // Determine final status
      workflowState.completedAt = new Date();
      workflowState.results = results;

      if (queue.hasFailures()) {
        workflowState.status = "failed";
        const failedTasks = queue.getByStatus("failed");
        const error = `Workflow failed: ${failedTasks.length} task(s) failed`;
        this.emit("workflow:failed", { workflowId: workflow.id, error });
      } else {
        workflowState.status = "completed";
        this.emit("workflow:completed", { workflowId: workflow.id, results });
      }

      return results;
    } catch (error) {
      workflowState.status = "failed";
      workflowState.completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit("workflow:failed", { workflowId: workflow.id, error: errorMessage });
      throw error;
    } finally {
      this.activeWorkflows.delete(workflow.id);
    }
  }

  /**
   * Decompose a complex task into subtasks
   */
  async decompose(
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<DecompositionResult> {
    // Use coordinator agent to decompose
    const coordinator = this.getCoordinator();
    if (!coordinator) {
      throw new Error("No coordinator agent available for decomposition");
    }

    const decompositionPrompt = `
You are a task decomposition expert. Break down the following task into smaller, executable subtasks.

**Task**: ${prompt}

${context ? `**Context**: ${JSON.stringify(context, null, 2)}` : ""}

For each subtask, provide:
1. A unique ID
2. A clear title
3. A detailed description
4. Required skills (from: research, coding, writing, data, devops, automation)
5. Dependencies on other subtasks (by ID)
6. Priority (critical, high, normal, low)

Output as JSON array of tasks.
`;

    const result = await this.executeAgent({
      agentId: coordinator.id,
      prompt: decompositionPrompt,
      model: coordinator.model,
    });

    if (!result.success || !result.output) {
      throw new Error("Failed to decompose task");
    }

    // Parse decomposition result
    const tasks = this.parseDecompositionResult(result.output);

    // Build execution order based on dependencies
    const executionOrder = this.topologicalSort(tasks);
    const parallelGroups = this.findParallelGroups(tasks, executionOrder);

    return {
      tasks,
      executionOrder,
      parallelGroups,
    };
  }

  /**
   * Select the best agent for a task
   */
  selectAgent(task: TaskDefinition): AgentSelectionResult | null {
    // If already assigned, use that
    if (task.assignedAgent && this.agents.has(task.assignedAgent)) {
      return {
        agentId: task.assignedAgent,
        confidence: 1.0,
        reasoning: "Explicitly assigned",
      };
    }

    // Find agents with matching skills
    const requiredSkills = task.requiredSkills ?? [];
    const candidates: Array<{ agent: OrchestratorAgentConfig; score: number }> = [];

    for (const agent of this.agents.values()) {
      if (agent.role === "coordinator") continue; // Coordinators don't execute tasks

      const agentSkills = new Set(agent.skills ?? []);
      const matchedSkills = requiredSkills.filter((s) => agentSkills.has(s));
      const score = requiredSkills.length > 0
        ? matchedSkills.length / requiredSkills.length
        : 0.5; // Default score if no skills required

      if (score > 0 || requiredSkills.length === 0) {
        candidates.push({ agent, score });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    return {
      agentId: best.agent.id,
      confidence: best.score,
      reasoning: `Best skill match (${Math.round(best.score * 100)}%)`,
    };
  }

  /**
   * Get the coordinator agent
   */
  private getCoordinator(): OrchestratorAgentConfig | undefined {
    if (this.config.defaultCoordinator) {
      return this.agents.get(this.config.defaultCoordinator);
    }

    return Array.from(this.agents.values()).find((a) => a.role === "coordinator");
  }

  /**
   * Build a prompt for a task
   */
  private buildTaskPrompt(task: TaskDefinition): string {
    let prompt = `# Task: ${task.title}\n\n${task.description}`;

    if (task.input) {
      prompt += `\n\n## Input\n\`\`\`json\n${JSON.stringify(task.input, null, 2)}\n\`\`\``;
    }

    if (task.context) {
      prompt += `\n\n## Context\n${JSON.stringify(task.context, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Parse decomposition result from LLM output
   */
  private parseDecompositionResult(output: unknown): TaskDefinition[] {
    // Try to extract JSON from output
    let data: unknown;

    if (typeof output === "string") {
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch {
          return [];
        }
      }
    } else {
      data = output;
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: Record<string, unknown>, index: number) => ({
      id: (item.id as string) || `task-${index + 1}`,
      title: (item.title as string) || `Task ${index + 1}`,
      description: (item.description as string) || "",
      priority: (item.priority as TaskDefinition["priority"]) || "normal",
      requiredSkills: (item.skills as string[]) || (item.requiredSkills as string[]) || [],
      dependencies: Array.isArray(item.dependencies)
        ? item.dependencies.map((d: string | { taskId: string }) =>
            typeof d === "string" ? { taskId: d, type: "blocks" as const } : d,
          )
        : [],
    }));
  }

  /**
   * Topological sort for task dependencies
   */
  private topologicalSort(tasks: TaskDefinition[]): string[] {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const task of tasks) {
      graph.set(task.id, new Set());
      inDegree.set(task.id, 0);
    }

    // Build graph
    for (const task of tasks) {
      for (const dep of task.dependencies ?? []) {
        graph.get(dep.taskId)?.add(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of graph.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Find groups of tasks that can run in parallel
   */
  private findParallelGroups(tasks: TaskDefinition[], executionOrder: string[]): string[][] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const groups: string[][] = [];
    const completed = new Set<string>();

    while (completed.size < executionOrder.length) {
      const group: string[] = [];

      for (const taskId of executionOrder) {
        if (completed.has(taskId)) continue;

        const task = taskMap.get(taskId);
        const deps = task?.dependencies ?? [];
        const allDepsComplete = deps.every((d) => completed.has(d.taskId));

        if (allDepsComplete) {
          group.push(taskId);
        }
      }

      if (group.length === 0) break; // Prevent infinite loop

      for (const id of group) {
        completed.add(id);
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Get status of active workflows
   */
  getActiveWorkflows(): WorkflowState[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    workflow.status = "cancelled";
    workflow.completedAt = new Date();

    // Cancel all pending/running tasks
    for (const taskState of workflow.tasks.values()) {
      if (taskState.status === "pending" || taskState.status === "running") {
        taskState.status = "cancelled";
        taskState.completedAt = new Date();
      }
    }

    return true;
  }
}

export type { OrchestratorEvents };
