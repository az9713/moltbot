/**
 * Security Configuration Types
 *
 * TypeBox schemas for RBAC, audit logging, rate limiting, and security policies.
 */

import { Type, type Static } from "@sinclair/typebox";

// ============================================================================
// Role-Based Access Control (RBAC)
// ============================================================================

export const RoleIdSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("admin"),
  Type.Literal("operator"),
  Type.Literal("user"),
  Type.Literal("readonly"),
  Type.Literal("guest"),
  Type.String(), // Custom role IDs
]);

export type RoleIdConfig = Static<typeof RoleIdSchema>;

export const PermissionSchema = Type.String();

export const RoleSchema = Type.Object({
  /** Role ID */
  id: Type.String(),
  /** Display name */
  name: Type.String(),
  /** Description */
  description: Type.Optional(Type.String()),
  /** Permissions granted */
  permissions: Type.Array(PermissionSchema),
  /** Roles this role inherits from */
  inherits: Type.Optional(Type.Array(Type.String())),
});

export type RoleConfig = Static<typeof RoleSchema>;

export const PrincipalSchema = Type.Object({
  /** Principal ID */
  id: Type.String(),
  /** Principal type */
  type: Type.Union([
    Type.Literal("user"),
    Type.Literal("device"),
    Type.Literal("service"),
    Type.Literal("channel"),
  ]),
  /** Display name */
  name: Type.Optional(Type.String()),
  /** Roles assigned */
  roles: Type.Array(Type.String()),
  /** Custom permissions (additive) */
  permissions: Type.Optional(Type.Array(PermissionSchema)),
  /** Denied permissions (overrides role grants) */
  deniedPermissions: Type.Optional(Type.Array(PermissionSchema)),
  /** Channel-specific roles */
  channelRoles: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()))),
  /** Agent-specific roles */
  agentRoles: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()))),
  /** Metadata */
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type PrincipalConfig = Static<typeof PrincipalSchema>;

export const RBACConfigSchema = Type.Object({
  /** Enable RBAC */
  enabled: Type.Optional(Type.Boolean()),
  /** Default role for new principals */
  defaultRole: Type.Optional(Type.String()),
  /** Custom roles */
  roles: Type.Optional(Type.Array(RoleSchema)),
  /** Principal assignments */
  principals: Type.Optional(Type.Array(PrincipalSchema)),
});

export type RBACConfig = Static<typeof RBACConfigSchema>;

// ============================================================================
// Audit Logging
// ============================================================================

export const AuditSeveritySchema = Type.Union([
  Type.Literal("info"),
  Type.Literal("warning"),
  Type.Literal("error"),
  Type.Literal("critical"),
]);

export type AuditSeverityConfig = Static<typeof AuditSeveritySchema>;

export const AuditBackendSchema = Type.Union([
  Type.Literal("memory"),
  Type.Literal("file"),
  Type.Literal("external"),
]);

export type AuditBackendConfig = Static<typeof AuditBackendSchema>;

export const AuditConfigSchema = Type.Object({
  /** Enable audit logging */
  enabled: Type.Optional(Type.Boolean()),
  /** Actions to audit (empty = all) */
  actions: Type.Optional(Type.Array(Type.String())),
  /** Minimum severity to log */
  minSeverity: Type.Optional(AuditSeveritySchema),
  /** Retention days */
  retentionDays: Type.Optional(Type.Number()),
  /** Backend type */
  backend: Type.Optional(AuditBackendSchema),
  /** Log file path (for file backend) */
  logPath: Type.Optional(Type.String()),
  /** External webhook URL */
  webhookUrl: Type.Optional(Type.String()),
  /** Maximum entries to keep in memory */
  maxMemoryEntries: Type.Optional(Type.Number()),
});

export type AuditConfig = Static<typeof AuditConfigSchema>;

// ============================================================================
// Rate Limiting
// ============================================================================

export const RateLimitWindowSchema = Type.Union([
  Type.Literal("second"),
  Type.Literal("minute"),
  Type.Literal("hour"),
  Type.Literal("day"),
]);

export type RateLimitWindowConfig = Static<typeof RateLimitWindowSchema>;

export const RateLimitScopeSchema = Type.Union([
  Type.Literal("global"),
  Type.Literal("channel"),
  Type.Literal("agent"),
  Type.Literal("principal"),
  Type.Literal("ip"),
]);

export type RateLimitScopeConfig = Static<typeof RateLimitScopeSchema>;

export const RateLimitActionSchema = Type.Union([
  Type.Literal("block"),
  Type.Literal("throttle"),
  Type.Literal("warn"),
]);

export type RateLimitActionConfig = Static<typeof RateLimitActionSchema>;

export const RateLimitRuleSchema = Type.Object({
  /** Rule ID */
  id: Type.String(),
  /** Rule name */
  name: Type.String(),
  /** Description */
  description: Type.Optional(Type.String()),
  /** Scope of the limit */
  scope: RateLimitScopeSchema,
  /** Resource to limit (e.g., "tool:bash", "channel:telegram") */
  resource: Type.String(),
  /** Maximum requests */
  limit: Type.Number(),
  /** Time window */
  window: RateLimitWindowSchema,
  /** Window size (e.g., 5 for "5 minutes") */
  windowSize: Type.Optional(Type.Number()),
  /** Action when limit exceeded */
  action: RateLimitActionSchema,
  /** Custom message when blocked */
  message: Type.Optional(Type.String()),
  /** Whether rule is enabled */
  enabled: Type.Optional(Type.Boolean()),
  /** Priority (higher = checked first) */
  priority: Type.Optional(Type.Number()),
});

export type RateLimitRuleConfig = Static<typeof RateLimitRuleSchema>;

export const RateLimitConfigSchema = Type.Object({
  /** Enable rate limiting */
  enabled: Type.Optional(Type.Boolean()),
  /** Rate limit rules */
  rules: Type.Optional(Type.Array(RateLimitRuleSchema)),
  /** Cleanup interval (ms) */
  cleanupInterval: Type.Optional(Type.Number()),
});

export type RateLimitConfig = Static<typeof RateLimitConfigSchema>;

// ============================================================================
// Security Rules
// ============================================================================

export const TimeConditionSchema = Type.Object({
  /** Days of week (0=Sunday) */
  daysOfWeek: Type.Optional(Type.Array(Type.Number())),
  /** Start time (HH:MM) */
  startTime: Type.Optional(Type.String()),
  /** End time (HH:MM) */
  endTime: Type.Optional(Type.String()),
  /** Timezone */
  timezone: Type.Optional(Type.String()),
});

export type TimeConditionConfig = Static<typeof TimeConditionSchema>;

export const ContextConditionSchema = Type.Object({
  /** Required channel */
  channel: Type.Optional(Type.Array(Type.String())),
  /** Required agent */
  agentId: Type.Optional(Type.Array(Type.String())),
  /** IP allowlist */
  ipAllowlist: Type.Optional(Type.Array(Type.String())),
  /** IP blocklist */
  ipBlocklist: Type.Optional(Type.Array(Type.String())),
  /** Require elevated mode */
  requireElevated: Type.Optional(Type.Boolean()),
  /** Require approval */
  requireApproval: Type.Optional(Type.Boolean()),
  /** Custom condition expression */
  expression: Type.Optional(Type.String()),
});

export type ContextConditionConfig = Static<typeof ContextConditionSchema>;

export const SecurityRuleEffectSchema = Type.Union([
  Type.Literal("allow"),
  Type.Literal("deny"),
  Type.Literal("require_approval"),
  Type.Literal("audit_only"),
]);

export type SecurityRuleEffectConfig = Static<typeof SecurityRuleEffectSchema>;

export const SecurityRuleNotifySchema = Type.Object({
  channel: Type.Optional(Type.String()),
  recipient: Type.Optional(Type.String()),
  template: Type.Optional(Type.String()),
});

export type SecurityRuleNotifyConfig = Static<typeof SecurityRuleNotifySchema>;

export const SecurityRuleSchema = Type.Object({
  /** Rule ID */
  id: Type.String(),
  /** Rule name */
  name: Type.String(),
  /** Description */
  description: Type.Optional(Type.String()),
  /** Whether rule is enabled */
  enabled: Type.Optional(Type.Boolean()),
  /** Priority (higher = checked first) */
  priority: Type.Optional(Type.Number()),
  /** Action type this rule applies to */
  action: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  /** Resource pattern this rule applies to */
  resource: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  /** Principals this rule applies to */
  principals: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  /** Time conditions */
  timeCondition: Type.Optional(TimeConditionSchema),
  /** Context conditions */
  contextCondition: Type.Optional(ContextConditionSchema),
  /** Effect of the rule */
  effect: SecurityRuleEffectSchema,
  /** Notification settings */
  notify: Type.Optional(SecurityRuleNotifySchema),
});

export type SecurityRuleConfig = Static<typeof SecurityRuleSchema>;

// ============================================================================
// Auto-Approval Configuration
// ============================================================================

export const AutoApprovalPatternSchema = Type.Object({
  /** Pattern type */
  type: Type.Union([
    Type.Literal("email_domain"),
    Type.Literal("phone_prefix"),
    Type.Literal("principal_id"),
  ]),
  /** Pattern value */
  pattern: Type.String(),
  /** Roles to auto-assign */
  roles: Type.Optional(Type.Array(Type.String())),
});

export type AutoApprovalPatternConfig = Static<typeof AutoApprovalPatternSchema>;

export const AutoApprovalConfigSchema = Type.Object({
  /** Enable auto-approval */
  enabled: Type.Optional(Type.Boolean()),
  /** Patterns for auto-approval */
  patterns: Type.Optional(Type.Array(AutoApprovalPatternSchema)),
});

export type AutoApprovalConfig = Static<typeof AutoApprovalConfigSchema>;

// ============================================================================
// Main Security Configuration
// ============================================================================

export const SecurityConfigSchema = Type.Object({
  /** Enable security system */
  enabled: Type.Optional(Type.Boolean()),
  /** RBAC configuration */
  rbac: Type.Optional(RBACConfigSchema),
  /** Audit configuration */
  audit: Type.Optional(AuditConfigSchema),
  /** Rate limiting configuration */
  rateLimit: Type.Optional(RateLimitConfigSchema),
  /** Security rules */
  rules: Type.Optional(Type.Array(SecurityRuleSchema)),
  /** Auto-approval configuration */
  autoApproval: Type.Optional(AutoApprovalConfigSchema),
});

export type SecurityConfig = Static<typeof SecurityConfigSchema>;
