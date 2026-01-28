/**
 * Security Module
 *
 * Comprehensive security system for Moltbot including:
 * - Role-Based Access Control (RBAC)
 * - Audit Logging
 * - Rate Limiting
 * - Security Policy Evaluation
 *
 * @example
 * ```typescript
 * import {
 *   RBACManager,
 *   AuditLogger,
 *   RateLimiter,
 *   SecurityManager,
 *   BUILTIN_ROLES,
 *   DEFAULT_RATE_LIMIT_RULES,
 * } from "./security/index.js";
 *
 * // Initialize RBAC
 * const rbac = new RBACManager({
 *   defaultRole: "user",
 *   principals: [
 *     { id: "admin@example.com", type: "user", roles: ["admin"] },
 *   ],
 * });
 *
 * // Check permissions
 * if (rbac.hasPermission("admin@example.com", "tool:bash")) {
 *   // Execute bash command
 * }
 *
 * // Initialize Audit Logger
 * const audit = new AuditLogger({
 *   enabled: true,
 *   backend: "file",
 *   logPath: "./logs/audit.log",
 * });
 *
 * // Log security events
 * await audit.logAuthSuccess({
 *   principal: { id: "user@example.com", type: "user" },
 *   method: "telegram",
 * });
 *
 * // Initialize Rate Limiter
 * const rateLimiter = new RateLimiter({
 *   rules: DEFAULT_RATE_LIMIT_RULES,
 * });
 *
 * // Check rate limits
 * const result = rateLimiter.checkAndRecord({
 *   resource: "tool:bash",
 *   scope: { agentId: "main" },
 * });
 * if (!result.allowed) {
 *   console.log(`Rate limited. Retry after ${result.retryAfter}s`);
 * }
 * ```
 */

// Types
export * from "./types.js";

// RBAC
export { RBACManager, BUILTIN_ROLES } from "./rbac.js";
export type { RBACOptions } from "./rbac.js";

// Rate Limiting
export { RateLimiter, DEFAULT_RATE_LIMIT_RULES } from "./rate-limiter.js";
export type { RateLimiterOptions } from "./rate-limiter.js";

// Audit Logging
export { AuditLogger } from "./audit-logger.js";
export type { AuditLoggerOptions } from "./audit-logger.js";

// ============================================================================
// Security Manager
// ============================================================================

import { EventEmitter } from "node:events";
import type {
  Permission,
  Principal,
  SecurityConfig,
  SecurityEvents,
  SecurityRule,
  TimeCondition,
  ContextCondition,
} from "./types.js";
import { RBACManager } from "./rbac.js";
import { RateLimiter, DEFAULT_RATE_LIMIT_RULES } from "./rate-limiter.js";
import { AuditLogger } from "./audit-logger.js";

export type SecurityManagerOptions = SecurityConfig;

/**
 * Unified security manager coordinating RBAC, audit, and rate limiting
 */
export class SecurityManager extends EventEmitter {
  private enabled: boolean;
  public readonly rbac: RBACManager;
  public readonly rateLimiter: RateLimiter;
  public readonly audit: AuditLogger;
  private rules: Map<string, SecurityRule> = new Map();

  constructor(options: SecurityManagerOptions = {}) {
    super();
    this.enabled = options.enabled ?? true;

    // Initialize RBAC
    this.rbac = new RBACManager({
      defaultRole: options.rbac?.defaultRole,
      customRoles: options.rbac?.roles,
      principals: options.rbac?.principals?.map((p) => ({
        ...p,
        createdAt: new Date(),
      })),
    });

    // Initialize Rate Limiter
    this.rateLimiter = new RateLimiter({
      enabled: options.rateLimit?.enabled,
      rules: options.rateLimit?.rules ?? DEFAULT_RATE_LIMIT_RULES,
      cleanupInterval: options.rateLimit?.cleanupInterval,
    });

    // Initialize Audit Logger
    this.audit = new AuditLogger({
      enabled: options.audit?.enabled,
      actions: options.audit?.actions,
      minSeverity: options.audit?.minSeverity,
      retentionDays: options.audit?.retentionDays,
      backend: options.audit?.backend === "external" ? "external" :
               options.audit?.backend === "file" ? "file" : "memory",
      logPath: options.audit?.logPath,
      webhookUrl: options.audit?.webhookUrl,
      maxMemoryEntries: options.audit?.maxMemoryEntries,
    });

    // Register security rules
    if (options.rules) {
      for (const rule of options.rules) {
        this.rules.set(rule.id, rule);
      }
    }

    // Forward events
    this.rbac.on("authz:granted", (data) => this.emit("authz:granted", data));
    this.rbac.on("authz:denied", (data) => this.emit("authz:denied", data));
    this.rateLimiter.on("rate_limit:exceeded", (data) => this.emit("rate_limit:exceeded", data));
    this.audit.on("audit:entry", (data) => this.emit("audit:entry", data));
  }

  // ============================================================================
  // Authorization
  // ============================================================================

  /**
   * Check if an action is allowed for a principal
   */
  async checkAccess(params: {
    principalId: string;
    permission: Permission;
    resource?: string;
    channel?: string;
    agentId?: string;
    ip?: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
  }> {
    if (!this.enabled) {
      return { allowed: true };
    }

    // Check RBAC
    const hasPermission = this.rbac.hasPermission(
      params.principalId,
      params.permission,
      { channel: params.channel, agentId: params.agentId, resource: params.resource },
    );

    if (!hasPermission) {
      await this.audit.logAuthzDenied({
        principal: { id: params.principalId, type: "user" },
        permission: params.permission,
        resource: params.resource ? { type: "resource", id: params.resource } : undefined,
        channel: params.channel,
        agentId: params.agentId,
      });
      return { allowed: false, reason: "Permission denied" };
    }

    // Check rate limits
    const rateLimitResult = this.rateLimiter.check({
      resource: params.resource ?? params.permission,
      scope: {
        channel: params.channel,
        agentId: params.agentId,
        principalId: params.principalId,
        ip: params.ip,
      },
    });

    if (!rateLimitResult.allowed) {
      await this.audit.logRateLimitExceeded({
        principal: { id: params.principalId, type: "user" },
        ruleId: rateLimitResult.rule?.id ?? "unknown",
        resource: params.resource ?? params.permission,
        limit: rateLimitResult.limit,
        count: rateLimitResult.count,
        channel: params.channel,
        ipAddress: params.ip,
      });
      return {
        allowed: false,
        reason: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter}s`,
      };
    }

    // Check security rules
    const ruleResult = this.evaluateRules({
      principalId: params.principalId,
      permission: params.permission,
      resource: params.resource,
      channel: params.channel,
      agentId: params.agentId,
      ip: params.ip,
    });

    if (ruleResult.effect === "deny") {
      return { allowed: false, reason: ruleResult.reason };
    }

    if (ruleResult.effect === "require_approval") {
      return { allowed: false, requiresApproval: true, reason: "Approval required" };
    }

    // Record rate limit usage
    this.rateLimiter.record({
      resource: params.resource ?? params.permission,
      scope: {
        channel: params.channel,
        agentId: params.agentId,
        principalId: params.principalId,
        ip: params.ip,
      },
    });

    await this.audit.logAuthzGranted({
      principal: { id: params.principalId, type: "user" },
      permission: params.permission,
      resource: params.resource ? { type: "resource", id: params.resource } : undefined,
      channel: params.channel,
      agentId: params.agentId,
    });

    return { allowed: true };
  }

  // ============================================================================
  // Security Rules
  // ============================================================================

  /**
   * Evaluate security rules for a request
   */
  private evaluateRules(params: {
    principalId: string;
    permission: Permission;
    resource?: string;
    channel?: string;
    agentId?: string;
    ip?: string;
  }): { effect: SecurityRule["effect"]; reason?: string } {
    const matchingRules = this.findMatchingRules(params);

    // Sort by priority (higher first)
    matchingRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const rule of matchingRules) {
      // Check time condition
      if (rule.timeCondition && !this.checkTimeCondition(rule.timeCondition)) {
        continue;
      }

      // Check context condition
      if (rule.contextCondition && !this.checkContextCondition(rule.contextCondition, params)) {
        continue;
      }

      // Rule matches
      this.emit("security:rule_triggered", { ruleId: rule.id, effect: rule.effect });
      return { effect: rule.effect, reason: rule.description ?? rule.name };
    }

    // No matching rules, default allow
    return { effect: "allow" };
  }

  /**
   * Find rules matching a request
   */
  private findMatchingRules(params: {
    principalId: string;
    permission: Permission;
    resource?: string;
    channel?: string;
    agentId?: string;
  }): SecurityRule[] {
    const matching: SecurityRule[] = [];

    for (const rule of this.rules.values()) {
      if (rule.enabled === false) continue;

      // Check action match
      if (rule.action) {
        const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
        if (!actions.some((a) => this.matchPattern(a, params.permission))) {
          continue;
        }
      }

      // Check resource match
      if (rule.resource && params.resource) {
        const resources = Array.isArray(rule.resource) ? rule.resource : [rule.resource];
        if (!resources.some((r) => this.matchPattern(r, params.resource!))) {
          continue;
        }
      }

      // Check principal match
      if (rule.principals) {
        const principals = Array.isArray(rule.principals) ? rule.principals : [rule.principals];
        if (!principals.some((p) => this.matchPattern(p, params.principalId))) {
          continue;
        }
      }

      matching.push(rule);
    }

    return matching;
  }

  /**
   * Check if a pattern matches a value
   */
  private matchPattern(pattern: string, value: string): boolean {
    if (pattern === "*") return true;
    if (pattern === value) return true;
    if (pattern.endsWith("*")) {
      return value.startsWith(pattern.slice(0, -1));
    }
    return false;
  }

  /**
   * Check time condition
   */
  private checkTimeCondition(condition: TimeCondition): boolean {
    const now = new Date();

    // Check day of week
    if (condition.daysOfWeek && condition.daysOfWeek.length > 0) {
      if (!condition.daysOfWeek.includes(now.getDay())) {
        return false;
      }
    }

    // Check time range
    if (condition.startTime || condition.endTime) {
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = hours * 60 + minutes;

      if (condition.startTime) {
        const [startHours, startMinutes] = condition.startTime.split(":").map(Number);
        const startTime = startHours * 60 + startMinutes;
        if (currentTime < startTime) return false;
      }

      if (condition.endTime) {
        const [endHours, endMinutes] = condition.endTime.split(":").map(Number);
        const endTime = endHours * 60 + endMinutes;
        if (currentTime > endTime) return false;
      }
    }

    return true;
  }

  /**
   * Check context condition
   */
  private checkContextCondition(
    condition: ContextCondition,
    params: { channel?: string; agentId?: string; ip?: string },
  ): boolean {
    // Check channel
    if (condition.channel && condition.channel.length > 0) {
      if (!params.channel || !condition.channel.includes(params.channel)) {
        return false;
      }
    }

    // Check agent
    if (condition.agentId && condition.agentId.length > 0) {
      if (!params.agentId || !condition.agentId.includes(params.agentId)) {
        return false;
      }
    }

    // Check IP allowlist
    if (condition.ipAllowlist && condition.ipAllowlist.length > 0) {
      if (!params.ip || !condition.ipAllowlist.includes(params.ip)) {
        return false;
      }
    }

    // Check IP blocklist
    if (condition.ipBlocklist && condition.ipBlocklist.length > 0) {
      if (params.ip && condition.ipBlocklist.includes(params.ip)) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Stop security manager
   */
  stop(): void {
    this.rateLimiter.stop();
  }

  /**
   * Get statistics
   */
  getStats(): {
    rbac: { rolesCount: number; principalsCount: number };
    rateLimit: { rulesCount: number; activeStates: number; limitedStates: number };
    audit: ReturnType<AuditLogger["getStats"]>;
  } {
    return {
      rbac: {
        rolesCount: this.rbac.getAllRoles().length,
        principalsCount: this.rbac.getAllPrincipals().length,
      },
      rateLimit: this.rateLimiter.getStats(),
      audit: this.audit.getStats(),
    };
  }
}

// Type augmentation for EventEmitter
export interface SecurityManager {
  on<K extends keyof SecurityEvents>(event: K, listener: (data: SecurityEvents[K]) => void): this;
  emit<K extends keyof SecurityEvents>(event: K, data: SecurityEvents[K]): boolean;
}
