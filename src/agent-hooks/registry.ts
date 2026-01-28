/**
 * Agent Hooks Registry
 *
 * Manages registration and execution of agent hooks.
 */

import { EventEmitter } from "node:events";

import type {
  AgentHookConfig,
  AgentHookEvent,
  AgentHookEventType,
  AgentHookHandler,
  AgentHookResult,
  AgentHooksConfig,
  RegisteredAgentHook,
} from "./types.js";

export class AgentHooksRegistry extends EventEmitter {
  private hooks: Map<AgentHookEventType, RegisteredAgentHook[]> = new Map();
  private config: AgentHooksConfig;
  private notificationCounts: Map<string, number[]> = new Map();

  constructor(config: AgentHooksConfig = {}) {
    super();
    this.config = config;
    this.initializeFromConfig();
  }

  /**
   * Initialize hooks from configuration
   */
  private initializeFromConfig(): void {
    if (!this.config.enabled || !this.config.hooks) {
      return;
    }

    for (const hookConfig of this.config.hooks) {
      if (hookConfig.enabled === false) {
        continue;
      }

      const handler = this.createHandlerFromConfig(hookConfig);
      this.register(hookConfig, handler);
    }
  }

  /**
   * Create a handler function from hook configuration
   */
  private createHandlerFromConfig(config: AgentHookConfig): AgentHookHandler {
    return async (event: AgentHookEvent): Promise<AgentHookResult> => {
      // Check match conditions
      if (!this.matchesConditions(event, config)) {
        return { proceed: true };
      }

      // Execute action
      switch (config.action) {
        case "deny":
          return {
            proceed: false,
            blockReason: config.message ?? "Blocked by agent hook",
          };

        case "require_approval":
          // In a full implementation, this would trigger an approval workflow
          this.emit("approval_required", { event, config });
          return {
            proceed: false,
            blockReason: "Awaiting approval",
          };

        case "alert":
          await this.sendNotification(event, config);
          return { proceed: true };

        case "log":
          console.log(`[AgentHook:${config.name ?? config.id}]`, this.formatMessage(event, config));
          return { proceed: true };

        case "transform":
          // Transform hooks modify the event data
          return {
            proceed: true,
            transformed: event,
          };

        case "custom":
          // Custom handlers are loaded dynamically
          if (config.handler) {
            return await this.executeCustomHandler(event, config);
          }
          return { proceed: true };

        case "allow":
        default:
          return { proceed: true };
      }
    };
  }

  /**
   * Check if event matches hook conditions
   */
  private matchesConditions(event: AgentHookEvent, config: AgentHookConfig): boolean {
    const match = config.match;
    if (!match) {
      return true;
    }

    // Check tool name
    if (match.tool && "toolName" in event) {
      const toolNames = Array.isArray(match.tool) ? match.tool : [match.tool];
      if (!toolNames.some((t) => this.matchesPattern(event.toolName, t))) {
        return false;
      }
    }

    // Check channel
    if (match.channel && event.context.channel) {
      const channels = Array.isArray(match.channel) ? match.channel : [match.channel];
      if (!channels.includes(event.context.channel)) {
        return false;
      }
    }

    // Check agent ID
    if (match.agentId) {
      const agentIds = Array.isArray(match.agentId) ? match.agentId : [match.agentId];
      if (!agentIds.includes(event.context.agentId)) {
        return false;
      }
    }

    // Check time window
    if (match.timeWindow) {
      if (!this.isWithinTimeWindow(event.context.timestamp, match.timeWindow)) {
        return false;
      }
    }

    // Check token threshold
    if (match.tokenThreshold && event.type === "token:threshold") {
      if (event.tokensUsed < match.tokenThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match a value against a pattern (supports wildcards)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(value);
    }
    return value === pattern;
  }

  /**
   * Check if timestamp is within time window
   */
  private isWithinTimeWindow(
    timestamp: Date,
    window: NonNullable<AgentHookConfig["match"]>["timeWindow"],
  ): boolean {
    if (!window) return true;

    const now = timestamp;
    const day = now.getDay();

    // Check day of week
    if (window.days && !window.days.includes(day)) {
      return false;
    }

    // Check time range
    if (window.start || window.end) {
      const timeStr = now.toTimeString().slice(0, 5); // HH:MM
      if (window.start && timeStr < window.start) return false;
      if (window.end && timeStr > window.end) return false;
    }

    return true;
  }

  /**
   * Send notification for alert action
   */
  private async sendNotification(event: AgentHookEvent, config: AgentHookConfig): Promise<void> {
    const notify = config.notify ?? {
      channel: this.config.notifications?.defaultChannel ?? "webhook",
      to: this.config.notifications?.defaultTo ?? "",
    };

    // Rate limiting
    if (this.config.notifications?.rateLimitPerMinute) {
      const key = `${notify.channel}:${notify.to}`;
      const now = Date.now();
      const counts = this.notificationCounts.get(key) ?? [];
      const recentCounts = counts.filter((t) => now - t < 60000);

      if (recentCounts.length >= this.config.notifications.rateLimitPerMinute) {
        console.warn(`[AgentHook] Rate limit exceeded for ${key}`);
        return;
      }

      recentCounts.push(now);
      this.notificationCounts.set(key, recentCounts);
    }

    const message = this.formatMessage(event, config);

    // Emit notification event for external handling
    this.emit("notification", {
      channel: notify.channel,
      to: notify.to,
      message,
      event,
      config,
    });
  }

  /**
   * Format message template with event data
   */
  private formatMessage(event: AgentHookEvent, config: AgentHookConfig): string {
    let message = config.message ?? `Agent hook triggered: ${event.type}`;

    // Replace template variables
    message = message.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      switch (key) {
        case "eventType":
          return event.type;
        case "agentId":
          return event.context.agentId;
        case "sessionKey":
          return event.context.sessionKey;
        case "channel":
          return event.context.channel ?? "unknown";
        case "timestamp":
          return event.context.timestamp.toISOString();
        case "tokensUsed":
          if (event.type === "token:threshold") {
            return String(event.tokensUsed);
          }
          return "";
        case "toolName":
          if ("toolName" in event) {
            return event.toolName;
          }
          return "";
        default:
          return `{{${key}}}`;
      }
    });

    return message;
  }

  /**
   * Execute a custom handler
   */
  private async executeCustomHandler(
    event: AgentHookEvent,
    config: AgentHookConfig,
  ): Promise<AgentHookResult> {
    if (!config.handler) {
      return { proceed: true };
    }

    try {
      const mod = (await import(config.handler)) as Record<string, unknown>;
      const exportName = config.handlerExport ?? "default";
      const handler = mod[exportName] as AgentHookHandler | undefined;

      if (typeof handler === "function") {
        return await handler(event, config);
      }

      console.warn(`[AgentHook] Handler export not found: ${config.handler}#${exportName}`);
      return { proceed: true };
    } catch (error) {
      console.error(`[AgentHook] Failed to execute custom handler:`, error);
      return { proceed: true };
    }
  }

  /**
   * Register a hook
   */
  register(config: AgentHookConfig, handler: AgentHookHandler): void {
    for (const eventType of config.events) {
      const existing = this.hooks.get(eventType) ?? [];
      existing.push({ config, handler });

      // Sort by priority
      existing.sort((a, b) => (a.config.priority ?? 0) - (b.config.priority ?? 0));

      this.hooks.set(eventType, existing);
    }
  }

  /**
   * Unregister a hook by ID
   */
  unregister(hookId: string): void {
    for (const [eventType, hooks] of this.hooks.entries()) {
      const filtered = hooks.filter((h) => h.config.id !== hookId);
      if (filtered.length !== hooks.length) {
        this.hooks.set(eventType, filtered);
      }
    }
  }

  /**
   * Trigger hooks for an event
   */
  async trigger(event: AgentHookEvent): Promise<AgentHookResult> {
    const hooks = this.hooks.get(event.type) ?? [];

    for (const { config, handler } of hooks) {
      try {
        const result = await handler(event, config);

        if (!result.proceed) {
          return result;
        }

        // Apply transformations
        if (result.transformed) {
          Object.assign(event, result.transformed);
        }
      } catch (error) {
        console.error(`[AgentHook] Error in hook ${config.name ?? config.id}:`, error);
      }
    }

    return { proceed: true };
  }

  /**
   * Get all registered hooks for an event type
   */
  getHooks(eventType: AgentHookEventType): RegisteredAgentHook[] {
    return this.hooks.get(eventType) ?? [];
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): Map<AgentHookEventType, RegisteredAgentHook[]> {
    return new Map(this.hooks);
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: AgentHooksConfig): void {
    this.config = config;
    this.clear();
    this.initializeFromConfig();
  }
}

// Singleton instance
let registryInstance: AgentHooksRegistry | null = null;

/**
 * Get the global agent hooks registry
 */
export function getAgentHooksRegistry(config?: AgentHooksConfig): AgentHooksRegistry {
  if (!registryInstance) {
    registryInstance = new AgentHooksRegistry(config);
  } else if (config) {
    registryInstance.updateConfig(config);
  }
  return registryInstance;
}

/**
 * Trigger an agent hook event
 */
export async function triggerAgentHook(event: AgentHookEvent): Promise<AgentHookResult> {
  return getAgentHooksRegistry().trigger(event);
}
