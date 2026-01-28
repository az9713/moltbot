/**
 * Agent Orchestrator Types
 *
 * Types for coordinating multiple specialized agents for complex tasks.
 */

export type OrchestratorAgentRole = "coordinator" | "specialist" | "worker";

export type OrchestratorAgentConfig = {
  /** Agent identifier */
  id: string;
  /** Agent role in orchestration */
  role: OrchestratorAgentRole;
  /** Human-readable name */
  name?: string;
  /** Agent capabilities/skills */
  skills?: string[];
  /** Agents this coordinator can spawn */
  canSpawn?: string[];
  /** Maximum concurrent sub-agents */
  maxConcurrent?: number;
  /** Model to use for this agent */
  model?: string;
  /** Tools available to this agent */
  tools?: string[];
};

export type TaskPriority = "low" | "normal" | "high" | "critical";

export type TaskStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskDependency = {
  /** Task ID this depends on */
  taskId: string;
  /** Type of dependency */
  type: "blocks" | "requires_output";
};

export type TaskDefinition = {
  /** Unique task identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Task priority */
  priority: TaskPriority;
  /** Agent to execute this task */
  assignedAgent?: string;
  /** Required skills for this task */
  requiredSkills?: string[];
  /** Task dependencies */
  dependencies?: TaskDependency[];
  /** Estimated duration in seconds */
  estimatedDurationSec?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
  /** Timeout in seconds */
  timeoutSec?: number;
  /** Context to pass to the agent */
  context?: Record<string, unknown>;
  /** Input data for the task */
  input?: unknown;
};

export type TaskResult = {
  /** Whether task succeeded */
  success: boolean;
  /** Task output */
  output?: unknown;
  /** Error message if failed */
  error?: string;
  /** Execution duration in ms */
  durationMs: number;
  /** Number of retries attempted */
  retries: number;
};

export type TaskState = {
  /** Task definition */
  task: TaskDefinition;
  /** Current status */
  status: TaskStatus;
  /** Result if completed/failed */
  result?: TaskResult;
  /** When task was created */
  createdAt: Date;
  /** When task started running */
  startedAt?: Date;
  /** When task completed */
  completedAt?: Date;
  /** Current retry count */
  retryCount: number;
};

export type WorkflowDefinition = {
  /** Workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the workflow */
  description?: string;
  /** Tasks in this workflow */
  tasks: TaskDefinition[];
  /** Maximum parallel tasks */
  maxParallel?: number;
  /** Overall timeout in seconds */
  timeoutSec?: number;
  /** Failure handling strategy */
  onFailure?: "abort" | "continue" | "retry";
};

export type WorkflowState = {
  /** Workflow definition */
  workflow: WorkflowDefinition;
  /** Status of all tasks */
  tasks: Map<string, TaskState>;
  /** Overall workflow status */
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  /** When workflow started */
  startedAt?: Date;
  /** When workflow completed */
  completedAt?: Date;
  /** Aggregated results */
  results?: Map<string, TaskResult>;
};

export type DecompositionResult = {
  /** Decomposed tasks */
  tasks: TaskDefinition[];
  /** Suggested execution order */
  executionOrder: string[];
  /** Parallel groups (tasks that can run together) */
  parallelGroups: string[][];
};

export type AgentSelectionResult = {
  /** Selected agent ID */
  agentId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for selection */
  reasoning?: string;
};

export type OrchestratorConfig = {
  /** Available agents */
  agents: OrchestratorAgentConfig[];
  /** Default coordinator agent */
  defaultCoordinator?: string;
  /** Maximum total concurrent tasks */
  maxConcurrentTasks?: number;
  /** Default task timeout */
  defaultTimeoutSec?: number;
  /** Enable automatic task decomposition */
  autoDecompose?: boolean;
  /** Enable automatic agent selection */
  autoSelectAgent?: boolean;
};

export type OrchestratorEvents = {
  "task:started": { taskId: string; agentId: string };
  "task:completed": { taskId: string; result: TaskResult };
  "task:failed": { taskId: string; error: string; retrying: boolean };
  "workflow:started": { workflowId: string };
  "workflow:completed": { workflowId: string; results: Map<string, TaskResult> };
  "workflow:failed": { workflowId: string; error: string };
  "agent:spawned": { agentId: string; taskId: string };
  "agent:completed": { agentId: string; taskId: string };
};
