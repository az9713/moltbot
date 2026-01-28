/**
 * Proactive Agent System Types
 *
 * Types for agents that act autonomously based on triggers, schedules, and external events.
 */

export type TriggerType = "schedule" | "webhook" | "channel" | "file" | "threshold";

export type ScheduleTrigger = {
  type: "schedule";
  /** Cron expression (e.g., "0 9 * * 1-5" for 9am weekdays) */
  cron: string;
  /** Timezone (default: system timezone) */
  timezone?: string;
};

export type WebhookTrigger = {
  type: "webhook";
  /** Webhook path (e.g., "/github") */
  path: string;
  /** Event type to match (e.g., "pull_request.opened") */
  event?: string;
  /** Optional secret for validation */
  secret?: string;
  /** HTTP method to accept */
  method?: "GET" | "POST" | "PUT" | "DELETE";
};

export type ChannelTrigger = {
  type: "channel";
  /** Channel to monitor (e.g., "telegram", "discord") */
  channel: string;
  /** Pattern to match in messages (regex) */
  pattern?: string;
  /** Match mentions of the bot */
  onMention?: boolean;
  /** Match specific chat/channel IDs */
  chatId?: string | string[];
};

export type FileTrigger = {
  type: "file";
  /** File or directory path to watch */
  path: string;
  /** Events to trigger on */
  events?: ("change" | "create" | "delete")[];
  /** Glob pattern for file matching */
  pattern?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
};

export type ThresholdTrigger = {
  type: "threshold";
  /** Metric to monitor */
  metric: string;
  /** Threshold value */
  value: number;
  /** Comparison operator */
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  /** Check interval in seconds */
  intervalSec?: number;
  /** Cooldown after triggering (seconds) */
  cooldownSec?: number;
};

export type ProactiveTrigger =
  | ScheduleTrigger
  | WebhookTrigger
  | ChannelTrigger
  | FileTrigger
  | ThresholdTrigger;

export type DeliveryTarget = {
  /** Delivery channel */
  channel: "telegram" | "discord" | "slack" | "signal" | "email" | "webhook";
  /** Target identifier (user ID, channel ID, email, URL) */
  to: string;
  /** Thread/topic ID if applicable */
  threadId?: string;
};

export type ProactiveTaskConfig = {
  /** Unique task identifier */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Description of what this task does */
  description?: string;
  /** Whether this task is enabled */
  enabled?: boolean;
  /** Trigger configuration */
  trigger: ProactiveTrigger;
  /** Agent to use for execution */
  agent?: string;
  /** Prompt to send to the agent */
  prompt: string;
  /** Delivery target for results */
  deliver?: DeliveryTarget;
  /** Model override */
  model?: string;
  /** Thinking mode */
  thinking?: "off" | "minimal" | "low" | "medium" | "high";
  /** Timeout in seconds */
  timeoutSec?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
  /** Whether to run in background */
  background?: boolean;
  /** Environment variables for this task */
  env?: Record<string, string>;
};

export type ProactiveConfig = {
  /** Enable proactive agent system */
  enabled?: boolean;
  /** Proactive task configurations */
  tasks?: ProactiveTaskConfig[];
  /** Global settings */
  settings?: {
    /** Default agent for proactive tasks */
    defaultAgent?: string;
    /** Default timeout */
    defaultTimeoutSec?: number;
    /** Maximum concurrent proactive tasks */
    maxConcurrent?: number;
    /** Webhook server settings */
    webhook?: {
      port?: number;
      basePath?: string;
    };
  };
};

// Runtime types

export type TaskExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type TaskExecution = {
  /** Execution ID */
  id: string;
  /** Task ID */
  taskId: string;
  /** Trigger that caused this execution */
  trigger: ProactiveTrigger;
  /** Trigger payload/context */
  payload?: unknown;
  /** Execution status */
  status: TaskExecutionStatus;
  /** When execution started */
  startedAt: Date;
  /** When execution completed */
  completedAt?: Date;
  /** Result output */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Whether result was delivered */
  delivered?: boolean;
};

export type ScheduledTaskInfo = {
  taskId: string;
  nextRun: Date;
  lastRun?: Date;
  lastResult?: "success" | "failure";
};

export type ProactiveEvents = {
  "task:scheduled": { taskId: string; nextRun: Date };
  "task:triggered": { taskId: string; trigger: ProactiveTrigger; payload?: unknown };
  "task:started": { executionId: string; taskId: string };
  "task:completed": { executionId: string; taskId: string; output?: string };
  "task:failed": { executionId: string; taskId: string; error: string };
  "task:delivered": { executionId: string; taskId: string; target: DeliveryTarget };
  "webhook:received": { path: string; method: string; body?: unknown };
  "file:changed": { path: string; event: string };
  "threshold:crossed": { metric: string; value: number; threshold: number };
};
