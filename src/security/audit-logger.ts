/**
 * Audit Logging System
 *
 * Comprehensive audit logging for security, compliance, and debugging.
 */

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  AuditAction,
  AuditEntry,
  AuditQuery,
  AuditSeverity,
  Principal,
  SecurityEvents,
} from "./types.js";

// ============================================================================
// Audit Logger
// ============================================================================

export type AuditLoggerOptions = {
  /** Enable audit logging */
  enabled?: boolean;
  /** Actions to audit (empty = all) */
  actions?: AuditAction[];
  /** Minimum severity to log */
  minSeverity?: AuditSeverity;
  /** Retention days */
  retentionDays?: number;
  /** Backend type */
  backend?: "memory" | "file" | "external";
  /** Log file path (for file backend) */
  logPath?: string;
  /** Webhook URL (for external backend) */
  webhookUrl?: string;
  /** Maximum entries to keep in memory */
  maxMemoryEntries?: number;
};

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

export class AuditLogger extends EventEmitter {
  private enabled: boolean;
  private actions?: Set<AuditAction>;
  private minSeverity: AuditSeverity;
  private retentionDays: number;
  private backend: "memory" | "file" | "external";
  private logPath?: string;
  private webhookUrl?: string;
  private maxMemoryEntries: number;

  private entries: AuditEntry[] = [];

  constructor(options: AuditLoggerOptions = {}) {
    super();
    this.enabled = options.enabled ?? true;
    this.actions = options.actions ? new Set(options.actions) : undefined;
    this.minSeverity = options.minSeverity ?? "info";
    this.retentionDays = options.retentionDays ?? 90;
    this.backend = options.backend ?? "memory";
    this.logPath = options.logPath;
    this.webhookUrl = options.webhookUrl;
    this.maxMemoryEntries = options.maxMemoryEntries ?? 10000;
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Log an audit entry
   */
  async log(params: {
    action: AuditAction;
    severity?: AuditSeverity;
    principal?: { id: string; type: Principal["type"]; name?: string };
    resource?: { type: string; id: string; name?: string };
    channel?: string;
    agentId?: string;
    sessionId?: string;
    outcome: AuditEntry["outcome"];
    details?: Record<string, unknown>;
    error?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<AuditEntry | null> {
    if (!this.enabled) return null;

    const severity = params.severity ?? this.getSeverityForAction(params.action, params.outcome);

    // Check if action should be logged
    if (this.actions && !this.actions.has(params.action)) {
      return null;
    }

    // Check minimum severity
    if (SEVERITY_ORDER[severity] < SEVERITY_ORDER[this.minSeverity]) {
      return null;
    }

    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      action: params.action,
      severity,
      principal: params.principal,
      resource: params.resource,
      channel: params.channel,
      agentId: params.agentId,
      sessionId: params.sessionId,
      outcome: params.outcome,
      details: params.details,
      error: params.error,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
    };

    await this.persist(entry);
    this.emit("audit:entry", { entry });

    return entry;
  }

  /**
   * Log authentication success
   */
  async logAuthSuccess(params: {
    principal: { id: string; type: Principal["type"]; name?: string };
    method: string;
    channel?: string;
    ipAddress?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "auth.login",
      principal: params.principal,
      channel: params.channel,
      outcome: "success",
      details: { method: params.method },
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log authentication failure
   */
  async logAuthFailure(params: {
    principalId?: string;
    reason: string;
    channel?: string;
    ipAddress?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "auth.failed",
      severity: "warning",
      principal: params.principalId ? { id: params.principalId, type: "user" } : undefined,
      channel: params.channel,
      outcome: "failure",
      error: params.reason,
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log authorization granted
   */
  async logAuthzGranted(params: {
    principal: { id: string; type: Principal["type"] };
    permission: string;
    resource?: { type: string; id: string };
    channel?: string;
    agentId?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "authz.granted",
      principal: params.principal,
      resource: params.resource,
      channel: params.channel,
      agentId: params.agentId,
      outcome: "success",
      details: { permission: params.permission },
    });
  }

  /**
   * Log authorization denied
   */
  async logAuthzDenied(params: {
    principal: { id: string; type: Principal["type"] };
    permission: string;
    resource?: { type: string; id: string };
    channel?: string;
    agentId?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "authz.denied",
      severity: "warning",
      principal: params.principal,
      resource: params.resource,
      channel: params.channel,
      agentId: params.agentId,
      outcome: "denied",
      details: { permission: params.permission },
    });
  }

  /**
   * Log tool invocation
   */
  async logToolInvoked(params: {
    principal: { id: string; type: Principal["type"] };
    toolName: string;
    agentId?: string;
    sessionId?: string;
    channel?: string;
    input?: unknown;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "tool.invoked",
      principal: params.principal,
      resource: { type: "tool", id: params.toolName },
      agentId: params.agentId,
      sessionId: params.sessionId,
      channel: params.channel,
      outcome: "success",
      details: { input: params.input },
    });
  }

  /**
   * Log tool blocked
   */
  async logToolBlocked(params: {
    principal: { id: string; type: Principal["type"] };
    toolName: string;
    reason: string;
    agentId?: string;
    sessionId?: string;
    channel?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "tool.blocked",
      severity: "warning",
      principal: params.principal,
      resource: { type: "tool", id: params.toolName },
      agentId: params.agentId,
      sessionId: params.sessionId,
      channel: params.channel,
      outcome: "denied",
      error: params.reason,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(params: {
    principal?: { id: string; type: Principal["type"] };
    ruleId: string;
    resource: string;
    limit: number;
    count: number;
    channel?: string;
    ipAddress?: string;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: "security.rate_limit_exceeded",
      severity: "warning",
      principal: params.principal,
      resource: { type: "rate_limit_rule", id: params.ruleId },
      channel: params.channel,
      outcome: "denied",
      details: {
        resource: params.resource,
        limit: params.limit,
        count: params.count,
      },
      ipAddress: params.ipAddress,
    });
  }

  // ============================================================================
  // Querying
  // ============================================================================

  /**
   * Query audit entries
   */
  async query(query: AuditQuery): Promise<AuditEntry[]> {
    let results = [...this.entries];

    // Apply filters
    if (query.actions?.length) {
      const actionSet = new Set(query.actions);
      results = results.filter((e) => actionSet.has(e.action));
    }

    if (query.severity?.length) {
      const severitySet = new Set(query.severity);
      results = results.filter((e) => severitySet.has(e.severity));
    }

    if (query.principalId) {
      results = results.filter((e) => e.principal?.id === query.principalId);
    }

    if (query.principalType) {
      results = results.filter((e) => e.principal?.type === query.principalType);
    }

    if (query.resourceType) {
      results = results.filter((e) => e.resource?.type === query.resourceType);
    }

    if (query.resourceId) {
      results = results.filter((e) => e.resource?.id === query.resourceId);
    }

    if (query.channel) {
      results = results.filter((e) => e.channel === query.channel);
    }

    if (query.agentId) {
      results = results.filter((e) => e.agentId === query.agentId);
    }

    if (query.outcome) {
      results = results.filter((e) => e.outcome === query.outcome);
    }

    if (query.startTime) {
      results = results.filter((e) => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter((e) => e.timestamp <= query.endTime!);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get entries for a specific principal
   */
  async getEntriesForPrincipal(principalId: string, limit = 100): Promise<AuditEntry[]> {
    return this.query({ principalId, limit });
  }

  /**
   * Get entries for a specific resource
   */
  async getEntriesForResource(resourceType: string, resourceId: string, limit = 100): Promise<AuditEntry[]> {
    return this.query({ resourceType, resourceId, limit });
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit = 50): Promise<AuditEntry[]> {
    return this.query({
      actions: [
        "auth.failed",
        "authz.denied",
        "tool.blocked",
        "security.rate_limit_exceeded",
      ],
      limit,
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesBySeverity: Record<string, number>;
    entriesByOutcome: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entriesByAction: Record<string, number> = {};
    const entriesBySeverity: Record<string, number> = {};
    const entriesByOutcome: Record<string, number> = {};

    for (const entry of this.entries) {
      entriesByAction[entry.action] = (entriesByAction[entry.action] ?? 0) + 1;
      entriesBySeverity[entry.severity] = (entriesBySeverity[entry.severity] ?? 0) + 1;
      entriesByOutcome[entry.outcome] = (entriesByOutcome[entry.outcome] ?? 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      entriesByAction,
      entriesBySeverity,
      entriesByOutcome,
      oldestEntry: this.entries[this.entries.length - 1]?.timestamp,
      newestEntry: this.entries[0]?.timestamp,
    };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Persist an entry to the configured backend
   */
  private async persist(entry: AuditEntry): Promise<void> {
    // Always keep in memory for querying
    this.entries.unshift(entry);

    // Trim memory entries
    if (this.entries.length > this.maxMemoryEntries) {
      this.entries = this.entries.slice(0, this.maxMemoryEntries);
    }

    // Persist based on backend
    switch (this.backend) {
      case "file":
        await this.persistToFile(entry);
        break;
      case "external":
        await this.persistToWebhook(entry);
        break;
      case "memory":
      default:
        // Already in memory
        break;
    }
  }

  /**
   * Persist entry to file
   */
  private async persistToFile(entry: AuditEntry): Promise<void> {
    if (!this.logPath) return;

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });

      // Append to file
      const line = JSON.stringify(entry) + "\n";
      await fs.appendFile(this.logPath, line, "utf-8");
    } catch (error) {
      // Log error but don't throw
      console.error("Failed to persist audit entry to file:", error);
    }
  }

  /**
   * Persist entry to external webhook
   */
  private async persistToWebhook(entry: AuditEntry): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Log error but don't throw
      console.error("Failed to persist audit entry to webhook:", error);
    }
  }

  /**
   * Get severity for an action based on outcome
   */
  private getSeverityForAction(action: AuditAction, outcome: AuditEntry["outcome"]): AuditSeverity {
    // Critical actions
    if (action.startsWith("security.") || action === "admin.gateway_stopped") {
      return outcome === "failure" ? "critical" : "warning";
    }

    // Warning actions
    if (
      action === "auth.failed" ||
      action === "authz.denied" ||
      action === "tool.blocked" ||
      action === "tool.failed"
    ) {
      return "warning";
    }

    // Error for failures
    if (outcome === "failure") {
      return "error";
    }

    // Default
    return "info";
  }

  /**
   * Clean up old entries based on retention policy
   */
  async cleanup(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp >= cutoff);
    return before - this.entries.length;
  }

  /**
   * Load entries from file (for file backend)
   */
  async loadFromFile(): Promise<number> {
    if (!this.logPath || this.backend !== "file") return 0;

    try {
      const content = await fs.readFile(this.logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          entry.timestamp = new Date(entry.timestamp);
          this.entries.push(entry);
        } catch {
          // Skip invalid lines
        }
      }

      // Sort by timestamp descending
      this.entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return lines.length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to load audit entries from file:", error);
      }
      return 0;
    }
  }
}

// Type augmentation for EventEmitter
export interface AuditLogger {
  on<K extends keyof SecurityEvents>(event: K, listener: (data: SecurityEvents[K]) => void): this;
  emit<K extends keyof SecurityEvents>(event: K, data: SecurityEvents[K]): boolean;
}
