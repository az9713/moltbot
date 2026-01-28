/**
 * Proactive Task Manager
 *
 * Manages proactive tasks with various trigger types.
 */

import { EventEmitter } from "node:events";
import * as fs from "node:fs";

import type {
  ProactiveConfig,
  ProactiveTaskConfig,
  TaskExecution,
  TaskExecutionStatus,
  DeliveryTarget,
  ProactiveEvents,
  ProactiveTrigger,
} from "./types.js";
import { ProactiveScheduler } from "./scheduler.js";

export type ProactiveManagerOptions = {
  config: ProactiveConfig;
  executeAgent: (params: {
    agentId?: string;
    prompt: string;
    model?: string;
    thinking?: string;
    timeoutSec?: number;
    env?: Record<string, string>;
  }) => Promise<{ success: boolean; output?: string; error?: string }>;
  deliverMessage: (target: DeliveryTarget, message: string) => Promise<boolean>;
};

export class ProactiveManager extends EventEmitter {
  private config: ProactiveConfig;
  private tasks: Map<string, ProactiveTaskConfig> = new Map();
  private scheduler: ProactiveScheduler;
  private executions: Map<string, TaskExecution> = new Map();
  private executeAgent: ProactiveManagerOptions["executeAgent"];
  private deliverMessage: ProactiveManagerOptions["deliverMessage"];
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private running = false;
  private executionCounter = 0;

  constructor(options: ProactiveManagerOptions) {
    super();
    this.config = options.config;
    this.executeAgent = options.executeAgent;
    this.deliverMessage = options.deliverMessage;
    this.scheduler = new ProactiveScheduler();

    // Initialize tasks
    for (const task of options.config.tasks ?? []) {
      if (task.enabled !== false) {
        this.tasks.set(task.id, task);
      }
    }

    // Set up scheduler callback
    this.scheduler.onTrigger(async (taskId) => {
      const task = this.tasks.get(taskId);
      if (task) {
        await this.trigger(taskId, task.trigger);
      }
    });
  }

  /**
   * Start the proactive manager
   */
  start(): void {
    if (!this.config.enabled) return;

    this.running = true;

    // Set up schedule triggers
    for (const task of this.tasks.values()) {
      if (task.trigger.type === "schedule") {
        this.scheduler.schedule(task.id, task.trigger);
      } else if (task.trigger.type === "file") {
        this.setupFileWatcher(task.id, task.trigger);
      }
    }

    this.scheduler.start();
  }

  /**
   * Stop the proactive manager
   */
  stop(): void {
    this.running = false;
    this.scheduler.stop();

    // Clean up file watchers
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    this.fileWatchers.clear();
  }

  /**
   * Manually trigger a task
   */
  async trigger(
    taskId: string,
    trigger: ProactiveTrigger,
    payload?: unknown,
  ): Promise<TaskExecution | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[Proactive] Task not found: ${taskId}`);
      return null;
    }

    const executionId = `exec-${++this.executionCounter}-${Date.now()}`;

    const execution: TaskExecution = {
      id: executionId,
      taskId,
      trigger,
      payload,
      status: "pending",
      startedAt: new Date(),
    };

    this.executions.set(executionId, execution);
    this.emit("task:triggered", { taskId, trigger, payload });

    // Execute the task
    execution.status = "running";
    this.emit("task:started", { executionId, taskId });

    try {
      // Build prompt with payload context
      let prompt = task.prompt;
      if (payload) {
        prompt = this.interpolatePrompt(prompt, payload);
      }

      const result = await this.executeAgent({
        agentId: task.agent ?? this.config.settings?.defaultAgent,
        prompt,
        model: task.model,
        thinking: task.thinking,
        timeoutSec: task.timeoutSec ?? this.config.settings?.defaultTimeoutSec,
        env: task.env,
      });

      if (result.success) {
        execution.status = "completed";
        execution.output = result.output;
        execution.completedAt = new Date();

        this.emit("task:completed", { executionId, taskId, output: result.output });

        // Deliver result if configured
        if (task.deliver && result.output) {
          const delivered = await this.deliverMessage(task.deliver, result.output);
          execution.delivered = delivered;

          if (delivered) {
            this.emit("task:delivered", { executionId, taskId, target: task.deliver });
          }
        }
      } else {
        execution.status = "failed";
        execution.error = result.error;
        execution.completedAt = new Date();

        this.emit("task:failed", { executionId, taskId, error: result.error ?? "Unknown error" });
      }
    } catch (error) {
      execution.status = "failed";
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      this.emit("task:failed", { executionId, taskId, error: execution.error });
    }

    return execution;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    path: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<TaskExecution[]> {
    this.emit("webhook:received", { path, method, body });

    const executions: TaskExecution[] = [];

    for (const task of this.tasks.values()) {
      if (task.trigger.type !== "webhook") continue;

      // Match path
      if (task.trigger.path !== path) continue;

      // Match method if specified
      if (task.trigger.method && task.trigger.method !== method) continue;

      // Match event if specified and present in body
      if (task.trigger.event && body) {
        const eventType = this.extractWebhookEvent(body, headers);
        if (eventType !== task.trigger.event) continue;
      }

      // Trigger the task
      const execution = await this.trigger(task.id, task.trigger, body);
      if (execution) {
        executions.push(execution);
      }
    }

    return executions;
  }

  /**
   * Set up file watcher for a task
   */
  private setupFileWatcher(taskId: string, trigger: { type: "file"; path: string; events?: string[]; debounceMs?: number }): void {
    const filePath = trigger.path;

    if (!fs.existsSync(filePath)) {
      console.warn(`[Proactive] File not found for watching: ${filePath}`);
      return;
    }

    let debounceTimer: NodeJS.Timeout | null = null;
    const debounceMs = trigger.debounceMs ?? 1000;

    const watcher = fs.watch(filePath, { persistent: true }, (eventType) => {
      // Debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        // Check if event type matches
        const events = trigger.events ?? ["change"];
        if (!events.includes(eventType)) return;

        this.emit("file:changed", { path: filePath, event: eventType });

        // Trigger the task
        await this.trigger(taskId, { type: "file", path: filePath }, { event: eventType, path: filePath });
      }, debounceMs);
    });

    this.fileWatchers.set(taskId, watcher);
  }

  /**
   * Interpolate prompt template with payload data
   */
  private interpolatePrompt(prompt: string, payload: unknown): string {
    if (typeof payload !== "object" || payload === null) {
      return prompt.replace(/\{\{payload\}\}/g, String(payload));
    }

    // Replace {{key}} with payload values
    return prompt.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getNestedValue(payload as Record<string, unknown>, path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Extract event type from webhook payload
   */
  private extractWebhookEvent(body: unknown, headers?: Record<string, string>): string | undefined {
    // GitHub style
    if (headers?.["x-github-event"]) {
      const event = headers["x-github-event"];
      const action = typeof body === "object" && body !== null && "action" in body
        ? (body as { action?: string }).action
        : undefined;
      return action ? `${event}.${action}` : event;
    }

    // GitLab style
    if (headers?.["x-gitlab-event"]) {
      return headers["x-gitlab-event"];
    }

    // Generic action field
    if (typeof body === "object" && body !== null) {
      const b = body as Record<string, unknown>;
      if (b.type) return String(b.type);
      if (b.event) return String(b.event);
      if (b.action) return String(b.action);
    }

    return undefined;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): ProactiveTaskConfig | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): ProactiveTaskConfig[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get recent executions
   */
  getRecentExecutions(limit: number = 20): TaskExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get scheduled tasks info
   */
  getScheduledTasks(): ReturnType<ProactiveScheduler["getScheduledTasks"]> {
    return this.scheduler.getScheduledTasks();
  }

  /**
   * Add a new task at runtime
   */
  addTask(task: ProactiveTaskConfig): void {
    this.tasks.set(task.id, task);

    if (this.running) {
      if (task.trigger.type === "schedule") {
        this.scheduler.schedule(task.id, task.trigger);
      } else if (task.trigger.type === "file") {
        this.setupFileWatcher(task.id, task.trigger);
      }
    }
  }

  /**
   * Remove a task
   */
  removeTask(taskId: string): boolean {
    if (!this.tasks.has(taskId)) return false;

    this.tasks.delete(taskId);
    this.scheduler.unschedule(taskId);

    const watcher = this.fileWatchers.get(taskId);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(taskId);
    }

    return true;
  }

  /**
   * Update task configuration
   */
  updateTask(taskId: string, updates: Partial<ProactiveTaskConfig>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const updatedTask = { ...task, ...updates, id: taskId };
    this.removeTask(taskId);
    this.addTask(updatedTask);

    return true;
  }
}

export type { ProactiveEvents };
