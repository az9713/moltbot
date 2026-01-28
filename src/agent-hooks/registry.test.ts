import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { AgentHooksRegistry, getAgentHooksRegistry, triggerAgentHook } from "./registry.js";
import type { AgentHookContext, ToolInvokeEvent, AgentHooksConfig } from "./types.js";

describe("AgentHooksRegistry", () => {
  let registry: AgentHooksRegistry;

  const createContext = (): AgentHookContext => ({
    agentId: "test-agent",
    sessionKey: "test-session",
    channel: "telegram",
    accountId: "123",
    timestamp: new Date(),
  });

  beforeEach(() => {
    registry = new AgentHooksRegistry();
  });

  describe("register", () => {
    it("should register a hook for an event type", () => {
      registry.register(
        {
          id: "test-hook",
          events: ["tool:invoke"],
          action: "allow",
        },
        async () => ({ proceed: true }),
      );

      const hooks = registry.getHooks("tool:invoke");
      expect(hooks).toHaveLength(1);
      expect(hooks[0].config.id).toBe("test-hook");
    });

    it("should register a hook for multiple event types", () => {
      registry.register(
        {
          id: "test-hook",
          events: ["tool:invoke", "tool:result"],
          action: "allow",
        },
        async () => ({ proceed: true }),
      );

      expect(registry.getHooks("tool:invoke")).toHaveLength(1);
      expect(registry.getHooks("tool:result")).toHaveLength(1);
    });

    it("should sort hooks by priority", () => {
      registry.register(
        { id: "low", events: ["tool:invoke"], action: "allow", priority: 10 },
        async () => ({ proceed: true }),
      );
      registry.register(
        { id: "high", events: ["tool:invoke"], action: "allow", priority: 1 },
        async () => ({ proceed: true }),
      );

      const hooks = registry.getHooks("tool:invoke");
      expect(hooks[0].config.id).toBe("high");
      expect(hooks[1].config.id).toBe("low");
    });
  });

  describe("unregister", () => {
    it("should remove a hook by id", () => {
      registry.register(
        { id: "test-hook", events: ["tool:invoke"], action: "allow" },
        async () => ({ proceed: true }),
      );

      expect(registry.getHooks("tool:invoke")).toHaveLength(1);

      registry.unregister("test-hook");

      expect(registry.getHooks("tool:invoke")).toHaveLength(0);
    });
  });

  describe("trigger", () => {
    it("should trigger hooks and return proceed=true when allowed", async () => {
      registry.register(
        { id: "allow-hook", events: ["tool:invoke"], action: "allow" },
        async () => ({ proceed: true }),
      );

      const event: ToolInvokeEvent = {
        type: "tool:invoke",
        context: createContext(),
        toolName: "bash",
        toolArgs: { command: "ls" },
      };

      const result = await registry.trigger(event);
      expect(result.proceed).toBe(true);
    });

    it("should return proceed=false when denied", async () => {
      registry.register(
        { id: "deny-hook", events: ["tool:invoke"], action: "deny", message: "Denied!" },
        async () => ({ proceed: false, blockReason: "Denied!" }),
      );

      const event: ToolInvokeEvent = {
        type: "tool:invoke",
        context: createContext(),
        toolName: "bash",
        toolArgs: { command: "rm -rf /" },
      };

      const result = await registry.trigger(event);
      expect(result.proceed).toBe(false);
      expect(result.blockReason).toBe("Denied!");
    });

    it("should stop at first denying hook", async () => {
      const handler1 = vi.fn().mockResolvedValue({ proceed: false, blockReason: "First" });
      const handler2 = vi.fn().mockResolvedValue({ proceed: true });

      registry.register(
        { id: "deny-hook", events: ["tool:invoke"], action: "deny", priority: 1 },
        handler1,
      );
      registry.register(
        { id: "allow-hook", events: ["tool:invoke"], action: "allow", priority: 2 },
        handler2,
      );

      const event: ToolInvokeEvent = {
        type: "tool:invoke",
        context: createContext(),
        toolName: "bash",
        toolArgs: {},
      };

      const result = await registry.trigger(event);
      expect(result.proceed).toBe(false);
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it("should return proceed=true when no hooks registered", async () => {
      const event: ToolInvokeEvent = {
        type: "tool:invoke",
        context: createContext(),
        toolName: "bash",
        toolArgs: {},
      };

      const result = await registry.trigger(event);
      expect(result.proceed).toBe(true);
    });
  });

  describe("initialization from config", () => {
    it("should register hooks from config", () => {
      const config: AgentHooksConfig = {
        enabled: true,
        hooks: [
          {
            id: "config-hook",
            events: ["tool:invoke"],
            action: "allow",
          },
        ],
      };

      const configuredRegistry = new AgentHooksRegistry(config);
      const hooks = configuredRegistry.getHooks("tool:invoke");
      expect(hooks).toHaveLength(1);
    });

    it("should skip disabled hooks", () => {
      const config: AgentHooksConfig = {
        enabled: true,
        hooks: [
          {
            id: "disabled-hook",
            events: ["tool:invoke"],
            action: "allow",
            enabled: false,
          },
        ],
      };

      const configuredRegistry = new AgentHooksRegistry(config);
      const hooks = configuredRegistry.getHooks("tool:invoke");
      expect(hooks).toHaveLength(0);
    });

    it("should not register hooks when disabled globally", () => {
      const config: AgentHooksConfig = {
        enabled: false,
        hooks: [
          {
            id: "hook",
            events: ["tool:invoke"],
            action: "allow",
          },
        ],
      };

      const configuredRegistry = new AgentHooksRegistry(config);
      const hooks = configuredRegistry.getHooks("tool:invoke");
      expect(hooks).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("should remove all hooks", () => {
      registry.register(
        { id: "hook1", events: ["tool:invoke"], action: "allow" },
        async () => ({ proceed: true }),
      );
      registry.register(
        { id: "hook2", events: ["agent:start"], action: "allow" },
        async () => ({ proceed: true }),
      );

      registry.clear();

      expect(registry.getHooks("tool:invoke")).toHaveLength(0);
      expect(registry.getHooks("agent:start")).toHaveLength(0);
    });
  });

  describe("getAllHooks", () => {
    it("should return all registered hooks", () => {
      registry.register(
        { id: "hook1", events: ["tool:invoke"], action: "allow" },
        async () => ({ proceed: true }),
      );
      registry.register(
        { id: "hook2", events: ["agent:start"], action: "allow" },
        async () => ({ proceed: true }),
      );

      const allHooks = registry.getAllHooks();
      expect(allHooks.size).toBe(2);
      expect(allHooks.has("tool:invoke")).toBe(true);
      expect(allHooks.has("agent:start")).toBe(true);
    });
  });
});
