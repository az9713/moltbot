/**
 * Agent Hooks System Types
 *
 * Event-driven hooks that intercept and modify agent behavior at key lifecycle points.
 */

export type AgentHookEventType =
  | "agent:start"
  | "agent:stop"
  | "agent:error"
  | "tool:invoke"
  | "tool:result"
  | "token:threshold"
  | "message:received"
  | "message:sending"
  | "session:start"
  | "session:end"
  | "compaction:before"
  | "compaction:after";

export type AgentHookAction =
  | "allow"
  | "deny"
  | "require_approval"
  | "alert"
  | "log"
  | "transform"
  | "custom";

export type AgentHookNotifyTarget = {
  channel: "telegram" | "discord" | "slack" | "email" | "webhook";
  to: string;
};

export type AgentHookMatchCondition = {
  /** Match specific tool names */
  tool?: string | string[];
  /** Match tool arguments (supports wildcards) */
  "args.*"?: string;
  /** Match specific channels */
  channel?: string | string[];
  /** Match specific agent IDs */
  agentId?: string | string[];
  /** Match specific session keys */
  sessionKey?: string;
  /** Match by time window (cron-like) */
  timeWindow?: {
    start?: string;
    end?: string;
    timezone?: string;
    days?: number[];
  };
  /** Match by token count threshold */
  tokenThreshold?: number;
  /** Custom matcher function path */
  customMatcher?: string;
};

export type AgentHookConfig = {
  /** Unique hook identifier */
  id?: string;
  /** Human-readable name */
  name?: string;
  /** Description of what this hook does */
  description?: string;
  /** Whether this hook is enabled */
  enabled?: boolean;
  /** Events this hook handles */
  events: AgentHookEventType[];
  /** Conditions that must match for hook to fire */
  match?: AgentHookMatchCondition;
  /** Action to take when hook fires */
  action: AgentHookAction;
  /** Notification target for alert actions */
  notify?: AgentHookNotifyTarget;
  /** Message template for notifications */
  message?: string;
  /** Priority (lower runs first) */
  priority?: number;
  /** Path to custom handler module */
  handler?: string;
  /** Export name from handler module */
  handlerExport?: string;
};

export type AgentHooksConfig = {
  /** Enable agent hooks system */
  enabled?: boolean;
  /** List of hook configurations */
  hooks?: AgentHookConfig[];
  /** Global notification settings */
  notifications?: {
    /** Default notification channel */
    defaultChannel?: AgentHookNotifyTarget["channel"];
    /** Default notification target */
    defaultTo?: string;
    /** Rate limit notifications (per minute) */
    rateLimitPerMinute?: number;
  };
  /** Token threshold settings */
  tokenThresholds?: {
    /** Warning threshold (percentage of context window) */
    warning?: number;
    /** Critical threshold */
    critical?: number;
    /** Emit event at these thresholds */
    emitEvents?: boolean;
  };
};

// Runtime event types

export type AgentHookContext = {
  agentId: string;
  sessionKey: string;
  channel?: string;
  accountId?: string;
  timestamp: Date;
};

export type AgentStartEvent = {
  type: "agent:start";
  context: AgentHookContext;
  prompt: string;
  model?: string;
};

export type AgentStopEvent = {
  type: "agent:stop";
  context: AgentHookContext;
  success: boolean;
  durationMs: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
};

export type AgentErrorEvent = {
  type: "agent:error";
  context: AgentHookContext;
  error: Error;
  recoverable: boolean;
};

export type ToolInvokeEvent = {
  type: "tool:invoke";
  context: AgentHookContext;
  toolName: string;
  toolArgs: Record<string, unknown>;
};

export type ToolResultEvent = {
  type: "tool:result";
  context: AgentHookContext;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
};

export type TokenThresholdEvent = {
  type: "token:threshold";
  context: AgentHookContext;
  tokensUsed: number;
  maxTokens: number;
  percentage: number;
  level: "warning" | "critical";
};

export type MessageReceivedEvent = {
  type: "message:received";
  context: AgentHookContext;
  from: string;
  content: string;
  messageId?: string;
};

export type MessageSendingEvent = {
  type: "message:sending";
  context: AgentHookContext;
  to: string;
  content: string;
};

export type SessionStartEvent = {
  type: "session:start";
  context: AgentHookContext;
  resumedFrom?: string;
};

export type SessionEndEvent = {
  type: "session:end";
  context: AgentHookContext;
  messageCount: number;
  durationMs: number;
};

export type CompactionBeforeEvent = {
  type: "compaction:before";
  context: AgentHookContext;
  messageCount: number;
  tokenCount: number;
};

export type CompactionAfterEvent = {
  type: "compaction:after";
  context: AgentHookContext;
  messageCount: number;
  tokenCount: number;
  compactedCount: number;
};

export type AgentHookEvent =
  | AgentStartEvent
  | AgentStopEvent
  | AgentErrorEvent
  | ToolInvokeEvent
  | ToolResultEvent
  | TokenThresholdEvent
  | MessageReceivedEvent
  | MessageSendingEvent
  | SessionStartEvent
  | SessionEndEvent
  | CompactionBeforeEvent
  | CompactionAfterEvent;

export type AgentHookResult = {
  /** Whether to proceed with the action */
  proceed: boolean;
  /** Reason for blocking (if proceed is false) */
  blockReason?: string;
  /** Modified event data (for transform actions) */
  transformed?: Partial<AgentHookEvent>;
  /** Additional data to attach to the event */
  metadata?: Record<string, unknown>;
};

export type AgentHookHandler = (
  event: AgentHookEvent,
  config: AgentHookConfig,
) => Promise<AgentHookResult> | AgentHookResult;

export type RegisteredAgentHook = {
  config: AgentHookConfig;
  handler: AgentHookHandler;
};
