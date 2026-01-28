/**
 * Rate Limiting System
 *
 * Provides configurable rate limiting with multiple scopes and window types.
 */

import { EventEmitter } from "node:events";

import type {
  RateLimitResult,
  RateLimitRule,
  RateLimitState,
  RateLimitWindow,
  SecurityEvents,
} from "./types.js";

// ============================================================================
// Window Duration Helpers
// ============================================================================

const WINDOW_DURATIONS: Record<RateLimitWindow, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

function getWindowDuration(window: RateLimitWindow, size = 1): number {
  return WINDOW_DURATIONS[window] * size;
}

// ============================================================================
// Rate Limiter
// ============================================================================

export type RateLimiterOptions = {
  /** Enable rate limiting */
  enabled?: boolean;
  /** Rate limit rules */
  rules?: RateLimitRule[];
  /** Cleanup interval (ms) */
  cleanupInterval?: number;
};

export class RateLimiter extends EventEmitter {
  private enabled: boolean;
  private rules: Map<string, RateLimitRule> = new Map();
  private state: Map<string, RateLimitState> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: RateLimiterOptions = {}) {
    super();
    this.enabled = options.enabled ?? true;

    // Register rules
    if (options.rules) {
      for (const rule of options.rules) {
        this.rules.set(rule.id, rule);
      }
    }

    // Start cleanup timer
    const cleanupInterval = options.cleanupInterval ?? 60000;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
    this.cleanupTimer.unref();
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Add or update a rate limit rule
   */
  upsertRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rate limit rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  // ============================================================================
  // Rate Checking
  // ============================================================================

  /**
   * Check if a request should be allowed
   */
  check(params: {
    resource: string;
    scope?: {
      channel?: string;
      agentId?: string;
      principalId?: string;
      ip?: string;
    };
  }): RateLimitResult {
    if (!this.enabled) {
      return {
        allowed: true,
        count: 0,
        limit: Infinity,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }

    // Find matching rules
    const matchingRules = this.findMatchingRules(params.resource);

    // Sort by priority (higher first)
    matchingRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Check each rule
    for (const rule of matchingRules) {
      const key = this.buildStateKey(rule, params.scope ?? {});
      const result = this.checkRule(rule, key);

      if (!result.allowed) {
        this.emit("rate_limit:exceeded", {
          ruleId: rule.id,
          key,
          limit: rule.limit,
        });
        return result;
      }
    }

    // All rules passed, return the most restrictive state
    let mostRestrictive: RateLimitResult | null = null;

    for (const rule of matchingRules) {
      const key = this.buildStateKey(rule, params.scope ?? {});
      const state = this.getOrCreateState(rule, key);

      const result: RateLimitResult = {
        allowed: true,
        count: state.count,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - state.count),
        resetAt: state.resetAt,
      };

      if (!mostRestrictive || result.remaining < mostRestrictive.remaining) {
        mostRestrictive = result;
      }
    }

    return mostRestrictive ?? {
      allowed: true,
      count: 0,
      limit: Infinity,
      remaining: Infinity,
      resetAt: new Date(),
    };
  }

  /**
   * Record a request (increment counter)
   */
  record(params: {
    resource: string;
    scope?: {
      channel?: string;
      agentId?: string;
      principalId?: string;
      ip?: string;
    };
    count?: number;
  }): RateLimitResult {
    if (!this.enabled) {
      return {
        allowed: true,
        count: 0,
        limit: Infinity,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }

    const matchingRules = this.findMatchingRules(params.resource);
    const incrementCount = params.count ?? 1;

    // Increment counters for all matching rules
    for (const rule of matchingRules) {
      const key = this.buildStateKey(rule, params.scope ?? {});
      const state = this.getOrCreateState(rule, key);
      state.count += incrementCount;
    }

    // Return current state
    return this.check(params);
  }

  /**
   * Check and record in one operation
   */
  checkAndRecord(params: {
    resource: string;
    scope?: {
      channel?: string;
      agentId?: string;
      principalId?: string;
      ip?: string;
    };
  }): RateLimitResult {
    const checkResult = this.check(params);

    if (checkResult.allowed) {
      return this.record(params);
    }

    return checkResult;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current state for a rule/key combination
   */
  getState(ruleId: string, key: string): RateLimitState | undefined {
    const fullKey = `${ruleId}:${key}`;
    return this.state.get(fullKey);
  }

  /**
   * Reset state for a rule/key combination
   */
  resetState(ruleId: string, key: string): void {
    const fullKey = `${ruleId}:${key}`;
    this.state.delete(fullKey);
  }

  /**
   * Reset all state for a rule
   */
  resetRule(ruleId: string): void {
    const prefix = `${ruleId}:`;
    for (const key of this.state.keys()) {
      if (key.startsWith(prefix)) {
        this.state.delete(key);
      }
    }
  }

  /**
   * Reset all state
   */
  resetAll(): void {
    this.state.clear();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Find rules matching a resource
   */
  private findMatchingRules(resource: string): RateLimitRule[] {
    const matching: RateLimitRule[] = [];

    for (const rule of this.rules.values()) {
      if (rule.enabled === false) continue;

      if (this.matchesResource(rule.resource, resource)) {
        matching.push(rule);
      }
    }

    return matching;
  }

  /**
   * Check if a resource pattern matches a resource
   */
  private matchesResource(pattern: string, resource: string): boolean {
    // Exact match
    if (pattern === resource) return true;

    // Wildcard match
    if (pattern === "*") return true;

    // Prefix match (e.g., "tool:*" matches "tool:bash")
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return resource.startsWith(prefix);
    }

    return false;
  }

  /**
   * Build a state key based on rule scope
   */
  private buildStateKey(rule: RateLimitRule, scope: {
    channel?: string;
    agentId?: string;
    principalId?: string;
    ip?: string;
  }): string {
    switch (rule.scope) {
      case "global":
        return "global";
      case "channel":
        return `channel:${scope.channel ?? "unknown"}`;
      case "agent":
        return `agent:${scope.agentId ?? "unknown"}`;
      case "principal":
        return `principal:${scope.principalId ?? "unknown"}`;
      case "ip":
        return `ip:${scope.ip ?? "unknown"}`;
      default:
        return "default";
    }
  }

  /**
   * Get or create state for a rule/key
   */
  private getOrCreateState(rule: RateLimitRule, key: string): RateLimitState {
    const fullKey = `${rule.id}:${key}`;
    const existing = this.state.get(fullKey);

    const now = new Date();
    const windowDuration = getWindowDuration(rule.window, rule.windowSize);

    // Check if existing state is still valid
    if (existing) {
      if (now < existing.windowEnd) {
        return existing;
      }
      // Window expired, create new state
    }

    // Create new state
    const newState: RateLimitState = {
      ruleId: rule.id,
      key,
      count: 0,
      windowStart: now,
      windowEnd: new Date(now.getTime() + windowDuration),
      isLimited: false,
      resetAt: new Date(now.getTime() + windowDuration),
    };

    this.state.set(fullKey, newState);
    return newState;
  }

  /**
   * Check a single rule
   */
  private checkRule(rule: RateLimitRule, key: string): RateLimitResult {
    const state = this.getOrCreateState(rule, key);
    const now = new Date();

    // Check if window expired
    if (now >= state.windowEnd) {
      // Reset state
      const windowDuration = getWindowDuration(rule.window, rule.windowSize);
      state.count = 0;
      state.windowStart = now;
      state.windowEnd = new Date(now.getTime() + windowDuration);
      state.isLimited = false;
      state.resetAt = state.windowEnd;
    }

    const allowed = state.count < rule.limit;
    const remaining = Math.max(0, rule.limit - state.count);
    const retryAfter = allowed ? undefined : Math.ceil((state.resetAt.getTime() - now.getTime()) / 1000);

    state.isLimited = !allowed;

    return {
      allowed,
      rule: allowed ? undefined : rule,
      count: state.count,
      limit: rule.limit,
      remaining,
      resetAt: state.resetAt,
      retryAfter,
    };
  }

  /**
   * Clean up expired state entries
   */
  private cleanup(): void {
    const now = new Date();

    for (const [key, state] of this.state.entries()) {
      if (now >= state.windowEnd) {
        this.state.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    rulesCount: number;
    activeStates: number;
    limitedStates: number;
  } {
    let limitedStates = 0;
    for (const state of this.state.values()) {
      if (state.isLimited) limitedStates++;
    }

    return {
      rulesCount: this.rules.size,
      activeStates: this.state.size,
      limitedStates,
    };
  }
}

// Type augmentation for EventEmitter
export interface RateLimiter {
  on<K extends keyof SecurityEvents>(event: K, listener: (data: SecurityEvents[K]) => void): this;
  emit<K extends keyof SecurityEvents>(event: K, data: SecurityEvents[K]): boolean;
}

// ============================================================================
// Default Rules
// ============================================================================

export const DEFAULT_RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: "global_requests",
    name: "Global request limit",
    description: "Maximum requests per minute globally",
    scope: "global",
    resource: "*",
    limit: 1000,
    window: "minute",
    action: "block",
    enabled: true,
    priority: 0,
  },
  {
    id: "bash_per_agent",
    name: "Bash commands per agent",
    description: "Maximum bash commands per agent per minute",
    scope: "agent",
    resource: "tool:bash",
    limit: 30,
    window: "minute",
    action: "block",
    enabled: true,
    priority: 10,
  },
  {
    id: "web_search_per_agent",
    name: "Web searches per agent",
    description: "Maximum web searches per agent per minute",
    scope: "agent",
    resource: "tool:web_search",
    limit: 20,
    window: "minute",
    action: "block",
    enabled: true,
    priority: 10,
  },
  {
    id: "messages_per_channel",
    name: "Messages per channel",
    description: "Maximum messages per channel per minute",
    scope: "channel",
    resource: "channel:*",
    limit: 60,
    window: "minute",
    action: "throttle",
    enabled: true,
    priority: 5,
  },
  {
    id: "tokens_per_day",
    name: "Tokens per day",
    description: "Maximum tokens per day globally",
    scope: "global",
    resource: "tokens",
    limit: 1000000,
    window: "day",
    action: "block",
    enabled: false,
    priority: 0,
  },
];
