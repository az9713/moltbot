/**
 * Security System Types
 *
 * Types for RBAC, audit logging, rate limiting, and security policies.
 */

// ============================================================================
// Role-Based Access Control (RBAC)
// ============================================================================

export type RoleId = "owner" | "admin" | "operator" | "user" | "readonly" | "guest";

export type Permission =
  // Agent permissions
  | "agent:create"
  | "agent:read"
  | "agent:update"
  | "agent:delete"
  | "agent:execute"
  // Session permissions
  | "session:create"
  | "session:read"
  | "session:update"
  | "session:delete"
  | "session:reset"
  // Tool permissions
  | "tool:bash"
  | "tool:write"
  | "tool:edit"
  | "tool:browser"
  | "tool:canvas"
  | "tool:message"
  | "tool:memory"
  | "tool:web"
  | "tool:cron"
  // Channel permissions
  | "channel:connect"
  | "channel:disconnect"
  | "channel:send"
  | "channel:receive"
  // Config permissions
  | "config:read"
  | "config:write"
  // Admin permissions
  | "admin:users"
  | "admin:roles"
  | "admin:audit"
  | "admin:security"
  // Special permissions
  | "elevated:approve"
  | "elevated:reject"
  | "*";

export type Role = {
  /** Role ID */
  id: RoleId | string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Permissions granted */
  permissions: Permission[];
  /** Roles this role inherits from */
  inherits?: RoleId[];
  /** Is this a built-in role */
  builtin?: boolean;
};

export type Principal = {
  /** Principal ID (user, device, or service) */
  id: string;
  /** Principal type */
  type: "user" | "device" | "service" | "channel";
  /** Display name */
  name?: string;
  /** Roles assigned */
  roles: RoleId[];
  /** Custom permissions (additive) */
  permissions?: Permission[];
  /** Denied permissions (overrides role grants) */
  deniedPermissions?: Permission[];
  /** Channel-specific roles */
  channelRoles?: Record<string, RoleId[]>;
  /** Agent-specific roles */
  agentRoles?: Record<string, RoleId[]>;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Created at */
  createdAt: Date;
  /** Last active */
  lastActiveAt?: Date;
};

// ============================================================================
// Audit Logging
// ============================================================================

export type AuditAction =
  // Authentication
  | "auth.login"
  | "auth.logout"
  | "auth.failed"
  | "auth.token_refresh"
  // Authorization
  | "authz.granted"
  | "authz.denied"
  | "authz.elevated"
  | "authz.approval_requested"
  | "authz.approval_granted"
  | "authz.approval_denied"
  // Agent actions
  | "agent.created"
  | "agent.updated"
  | "agent.deleted"
  | "agent.started"
  | "agent.stopped"
  // Session actions
  | "session.created"
  | "session.updated"
  | "session.reset"
  | "session.deleted"
  // Tool actions
  | "tool.invoked"
  | "tool.blocked"
  | "tool.completed"
  | "tool.failed"
  // Channel actions
  | "channel.connected"
  | "channel.disconnected"
  | "channel.message_sent"
  | "channel.message_received"
  // Config actions
  | "config.read"
  | "config.updated"
  // Security actions
  | "security.policy_updated"
  | "security.role_created"
  | "security.role_updated"
  | "security.role_deleted"
  | "security.principal_created"
  | "security.principal_updated"
  | "security.principal_deleted"
  | "security.rate_limit_exceeded"
  // Admin actions
  | "admin.gateway_started"
  | "admin.gateway_stopped";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export type AuditEntry = {
  /** Entry ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Action type */
  action: AuditAction;
  /** Severity level */
  severity: AuditSeverity;
  /** Principal who performed action */
  principal?: {
    id: string;
    type: Principal["type"];
    name?: string;
  };
  /** Resource affected */
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  /** Channel context */
  channel?: string;
  /** Agent context */
  agentId?: string;
  /** Session context */
  sessionId?: string;
  /** Outcome */
  outcome: "success" | "failure" | "denied";
  /** Details */
  details?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Request ID for correlation */
  requestId?: string;
};

export type AuditQuery = {
  /** Filter by action types */
  actions?: AuditAction[];
  /** Filter by severity */
  severity?: AuditSeverity[];
  /** Filter by principal ID */
  principalId?: string;
  /** Filter by principal type */
  principalType?: Principal["type"];
  /** Filter by resource type */
  resourceType?: string;
  /** Filter by resource ID */
  resourceId?: string;
  /** Filter by channel */
  channel?: string;
  /** Filter by agent */
  agentId?: string;
  /** Filter by outcome */
  outcome?: AuditEntry["outcome"];
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
};

// ============================================================================
// Rate Limiting
// ============================================================================

export type RateLimitWindow = "second" | "minute" | "hour" | "day";

export type RateLimitRule = {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Description */
  description?: string;
  /** Scope of the limit */
  scope: "global" | "channel" | "agent" | "principal" | "ip";
  /** Resource to limit (e.g., "tool:bash", "channel:telegram") */
  resource: string;
  /** Maximum requests */
  limit: number;
  /** Time window */
  window: RateLimitWindow;
  /** Window size (e.g., 5 for "5 minutes") */
  windowSize?: number;
  /** Action when limit exceeded */
  action: "block" | "throttle" | "warn";
  /** Custom message when blocked */
  message?: string;
  /** Whether rule is enabled */
  enabled?: boolean;
  /** Priority (higher = checked first) */
  priority?: number;
};

export type RateLimitState = {
  /** Rule ID */
  ruleId: string;
  /** Key (scope identifier) */
  key: string;
  /** Current count */
  count: number;
  /** Window start time */
  windowStart: Date;
  /** Window end time */
  windowEnd: Date;
  /** Whether currently limited */
  isLimited: boolean;
  /** When limit will reset */
  resetAt: Date;
};

export type RateLimitResult = {
  /** Whether request is allowed */
  allowed: boolean;
  /** Rule that triggered (if denied) */
  rule?: RateLimitRule;
  /** Current count */
  count: number;
  /** Limit */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** When limit resets */
  resetAt: Date;
  /** Retry after (seconds) */
  retryAfter?: number;
};

// ============================================================================
// Security Policy
// ============================================================================

export type TimeCondition = {
  /** Days of week (0=Sunday) */
  daysOfWeek?: number[];
  /** Start time (HH:MM) */
  startTime?: string;
  /** End time (HH:MM) */
  endTime?: string;
  /** Timezone */
  timezone?: string;
};

export type ContextCondition = {
  /** Required channel */
  channel?: string[];
  /** Required agent */
  agentId?: string[];
  /** IP allowlist */
  ipAllowlist?: string[];
  /** IP blocklist */
  ipBlocklist?: string[];
  /** Require elevated mode */
  requireElevated?: boolean;
  /** Require approval */
  requireApproval?: boolean;
  /** Custom condition expression */
  expression?: string;
};

export type SecurityRule = {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Description */
  description?: string;
  /** Whether rule is enabled */
  enabled?: boolean;
  /** Priority (higher = checked first) */
  priority?: number;
  /** Action type this rule applies to */
  action?: string | string[];
  /** Resource pattern this rule applies to */
  resource?: string | string[];
  /** Principals this rule applies to */
  principals?: string | string[];
  /** Time conditions */
  timeCondition?: TimeCondition;
  /** Context conditions */
  contextCondition?: ContextCondition;
  /** Effect of the rule */
  effect: "allow" | "deny" | "require_approval" | "audit_only";
  /** Notification settings */
  notify?: {
    channel?: string;
    recipient?: string;
    template?: string;
  };
};

// ============================================================================
// Configuration
// ============================================================================

export type SecurityConfig = {
  /** Enable security system */
  enabled?: boolean;
  /** RBAC configuration */
  rbac?: {
    /** Enable RBAC */
    enabled?: boolean;
    /** Default role for new principals */
    defaultRole?: RoleId;
    /** Custom roles */
    roles?: Role[];
    /** Principal assignments */
    principals?: Principal[];
  };
  /** Audit configuration */
  audit?: {
    /** Enable audit logging */
    enabled?: boolean;
    /** Actions to audit (empty = all) */
    actions?: AuditAction[];
    /** Minimum severity to log */
    minSeverity?: AuditSeverity;
    /** Retention days */
    retentionDays?: number;
    /** Backend (file, database, external) */
    backend?: "file" | "database" | "external";
    /** External webhook URL */
    webhookUrl?: string;
    /** Log file path */
    logPath?: string;
  };
  /** Rate limiting configuration */
  rateLimit?: {
    /** Enable rate limiting */
    enabled?: boolean;
    /** Default rules */
    rules?: RateLimitRule[];
    /** Backend (memory, redis) */
    backend?: "memory" | "redis";
    /** Redis URL if using redis backend */
    redisUrl?: string;
  };
  /** Security rules */
  rules?: SecurityRule[];
  /** Auto-approval configuration */
  autoApproval?: {
    /** Enable auto-approval */
    enabled?: boolean;
    /** Patterns for auto-approval */
    patterns?: Array<{
      /** Pattern type */
      type: "email_domain" | "phone_prefix" | "principal_id";
      /** Pattern value */
      pattern: string;
      /** Roles to auto-assign */
      roles?: RoleId[];
    }>;
  };
};

// ============================================================================
// Events
// ============================================================================

export type SecurityEvents = {
  "auth:success": { principalId: string; method: string };
  "auth:failure": { principalId?: string; reason: string };
  "authz:granted": { principalId: string; permission: Permission; resource?: string };
  "authz:denied": { principalId: string; permission: Permission; resource?: string };
  "rate_limit:exceeded": { ruleId: string; key: string; limit: number };
  "audit:entry": { entry: AuditEntry };
  "security:rule_triggered": { ruleId: string; effect: SecurityRule["effect"] };
};
