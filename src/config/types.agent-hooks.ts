/**
 * Agent Hooks configuration types
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
  /** Notification channel */
  channel: "telegram" | "discord" | "slack" | "email" | "webhook";
  /** Target identifier (user ID, channel ID, email, or URL) */
  to: string;
};

export type AgentHookTimeWindow = {
  /** Start time in HH:MM format */
  start?: string;
  /** End time in HH:MM format */
  end?: string;
  /** Timezone (e.g., "America/New_York") */
  timezone?: string;
  /** Days of week (0=Sunday, 6=Saturday) */
  days?: number[];
};

export type AgentHookMatchCondition = {
  /** Match specific tool names (supports wildcards) */
  tool?: string | string[];
  /** Match tool argument patterns */
  "args.*"?: string;
  /** Match specific channels */
  channel?: string | string[];
  /** Match specific agent IDs */
  agentId?: string | string[];
  /** Match specific session keys */
  sessionKey?: string;
  /** Match by time window */
  timeWindow?: AgentHookTimeWindow;
  /** Match by token count threshold */
  tokenThreshold?: number;
  /** Path to custom matcher module */
  customMatcher?: string;
};

export type AgentHookConfig = {
  /** Unique hook identifier */
  id?: string;
  /** Human-readable name */
  name?: string;
  /** Description of what this hook does */
  description?: string;
  /** Whether this hook is enabled (default: true) */
  enabled?: boolean;
  /** Events this hook handles */
  events: AgentHookEventType[];
  /** Conditions that must match for hook to fire */
  match?: AgentHookMatchCondition;
  /** Action to take when hook fires */
  action: AgentHookAction;
  /** Notification target for alert actions */
  notify?: AgentHookNotifyTarget;
  /** Message template for notifications (supports {{variable}} syntax) */
  message?: string;
  /** Priority (lower runs first, default: 0) */
  priority?: number;
  /** Path to custom handler module */
  handler?: string;
  /** Export name from handler module (default: "default") */
  handlerExport?: string;
};

export type AgentHooksNotificationConfig = {
  /** Default notification channel */
  defaultChannel?: AgentHookNotifyTarget["channel"];
  /** Default notification target */
  defaultTo?: string;
  /** Rate limit notifications (per minute) */
  rateLimitPerMinute?: number;
};

export type AgentHooksTokenThresholdConfig = {
  /** Warning threshold (percentage of context window, default: 70) */
  warning?: number;
  /** Critical threshold (percentage of context window, default: 90) */
  critical?: number;
  /** Emit events at thresholds (default: true) */
  emitEvents?: boolean;
};

export type AgentHooksConfig = {
  /** Enable agent hooks system */
  enabled?: boolean;
  /** List of hook configurations */
  hooks?: AgentHookConfig[];
  /** Global notification settings */
  notifications?: AgentHooksNotificationConfig;
  /** Token threshold settings */
  tokenThresholds?: AgentHooksTokenThresholdConfig;
};
