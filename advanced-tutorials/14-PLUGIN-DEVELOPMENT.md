# Tutorial 14 - Plugin Development

This tutorial shows how to create custom plugins for Moltbot. Plugins can add new tools, extend functionality, and integrate with external services.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Completed [Tutorial 13 - Security and Routing](13-SECURITY-AND-ROUTING.md)
- [ ] Node.js 18+ installed
- [ ] Basic TypeScript knowledge
- [ ] Understanding of Moltbot's architecture

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLUGIN ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                      Moltbot Gateway                             │       │
│  │                                                                  │       │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐              │       │
│  │  │  Plugin A  │   │  Plugin B  │   │  Plugin C  │              │       │
│  │  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘              │       │
│  │        │                │                │                      │       │
│  │        └────────────────┼────────────────┘                      │       │
│  │                         ▼                                        │       │
│  │              ┌────────────────────┐                              │       │
│  │              │   Plugin Manager   │                              │       │
│  │              │                    │                              │       │
│  │              │  • Load plugins    │                              │       │
│  │              │  • Register tools  │                              │       │
│  │              │  • Handle events   │                              │       │
│  │              │  • Manage slots    │                              │       │
│  │              └────────────────────┘                              │       │
│  │                                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Plugin Types:                                                              │
│  • Tool plugins     → Add new tools for the AI                              │
│  • Memory plugins   → Custom memory/storage backends                        │
│  • Channel plugins  → Add new messaging channels                            │
│  • Skill plugins    → Add new slash commands                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plugin Structure

```
my-plugin/
├── package.json          # NPM package metadata
├── tsconfig.json         # TypeScript config
├── src/
│   └── index.ts          # Plugin entry point
├── dist/                 # Compiled output
│   └── index.js
└── README.md
```

### package.json

```json
{
  "name": "moltbot-plugin-example",
  "version": "1.0.0",
  "description": "Example Moltbot plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "keywords": ["moltbot", "plugin"],
  "peerDependencies": {
    "moltbot": ">=0.7.0"
  },
  "devDependencies": {
    "moltbot": "^0.7.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

---

## Basic Plugin Template

```typescript
// src/index.ts
import type { MoltbotPlugin, PluginContext } from "moltbot";

export const plugin: MoltbotPlugin = {
  // Required metadata
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  description: "An example Moltbot plugin",

  // Optional: Plugin configuration schema
  configSchema: {
    type: "object",
    properties: {
      apiKey: { type: "string" },
      enabled: { type: "boolean", default: true }
    }
  },

  // Optional: Plugin-specific UI hints
  configUiHints: {
    "apiKey": {
      label: "API Key",
      help: "Your service API key",
      sensitive: true
    }
  },

  // Called when plugin is loaded
  async onLoad(ctx: PluginContext) {
    ctx.log.info("Plugin loaded!");

    // Access plugin config
    const config = ctx.getConfig();
    ctx.log.debug("Config:", config);

    // Register tools
    ctx.registerTools([
      {
        name: "my_tool",
        description: "Does something useful",
        inputSchema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Input value" }
          },
          required: ["input"]
        },
        execute: async (params, toolCtx) => {
          return { result: `Processed: ${params.input}` };
        }
      }
    ]);
  },

  // Called when plugin is unloaded
  async onUnload(ctx: PluginContext) {
    ctx.log.info("Plugin unloaded!");
  }
};

// Default export for ESM
export default plugin;
```

---

## Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLUGIN LIFECYCLE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Gateway Start                                                              │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  1. Discover plugins                                             │       │
│  │     • ~/.clawdbot/extensions/                                    │       │
│  │     • plugins.load.paths                                         │       │
│  │     • Built-in plugins                                           │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴─┐       │
│  │  2. Check allow/deny lists                                       │       │
│  │     • plugins.allow: ["my-plugin"]                               │       │
│  │     • plugins.deny: ["blocked-plugin"]                           │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴─┐       │
│  │  3. Load plugin modules                                          │       │
│  │     • import() ESM modules                                       │       │
│  │     • Validate plugin structure                                  │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴─┐       │
│  │  4. Call onLoad(ctx)                                             │       │
│  │     • Register tools                                             │       │
│  │     • Subscribe to events                                        │       │
│  │     • Initialize resources                                       │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴─┐       │
│  │  5. Plugin active                                                │       │
│  │     • Tools available to agents                                  │       │
│  │     • Event handlers running                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Gateway Stop                                                               │
│       │                                                                     │
│  ┌────┴────────────────────────────────────────────────────────────┐       │
│  │  6. Call onUnload(ctx)                                           │       │
│  │     • Cleanup resources                                          │       │
│  │     • Close connections                                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plugin Context API

```typescript
interface PluginContext {
  // Logging
  log: {
    debug(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
  };

  // Configuration
  getConfig<T>(): T;
  getMoltbotConfig(): MoltbotConfig;

  // Tool registration
  registerTools(tools: PluginTool[]): void;

  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;

  // State management
  getState<T>(key: string): T | undefined;
  setState<T>(key: string, value: T): void;

  // Paths
  getPluginDataPath(): string;
  getWorkspacePath(): string;
}
```

---

## Creating Tools

### Simple Tool

```typescript
ctx.registerTools([
  {
    name: "hello_world",
    description: "Says hello to the user",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name to greet"
        }
      },
      required: ["name"]
    },
    execute: async (params) => {
      return { message: `Hello, ${params.name}!` };
    }
  }
]);
```

### Tool with External API

```typescript
ctx.registerTools([
  {
    name: "fetch_weather",
    description: "Get current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        units: {
          type: "string",
          enum: ["metric", "imperial"],
          default: "metric"
        }
      },
      required: ["city"]
    },
    execute: async (params, toolCtx) => {
      const config = ctx.getConfig<{ apiKey: string }>();

      const response = await fetch(
        `https://api.weather.example/v1/current?` +
        `city=${encodeURIComponent(params.city)}&` +
        `units=${params.units || "metric"}&` +
        `apiKey=${config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        city: params.city,
        temperature: data.temp,
        conditions: data.conditions,
        humidity: data.humidity
      };
    }
  }
]);
```

### Tool with File Access

```typescript
import fs from "node:fs/promises";
import path from "node:path";

ctx.registerTools([
  {
    name: "save_note",
    description: "Save a note to the notes directory",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" }
      },
      required: ["title", "content"]
    },
    execute: async (params, toolCtx) => {
      const notesDir = path.join(ctx.getPluginDataPath(), "notes");
      await fs.mkdir(notesDir, { recursive: true });

      const filename = `${params.title.replace(/[^a-z0-9]/gi, "_")}.md`;
      const filepath = path.join(notesDir, filename);

      await fs.writeFile(filepath, params.content, "utf-8");

      return { saved: true, path: filepath };
    }
  }
]);
```

---

## Handling Events

```typescript
export const plugin: MoltbotPlugin = {
  id: "event-handler",
  name: "Event Handler Plugin",
  version: "1.0.0",

  async onLoad(ctx) {
    // Listen for incoming messages
    ctx.on("message:received", async (event) => {
      ctx.log.info(`Message from ${event.sender}: ${event.text}`);
    });

    // Listen for agent responses
    ctx.on("message:sent", async (event) => {
      ctx.log.info(`Sent response to ${event.recipient}`);
    });

    // Listen for tool executions
    ctx.on("tool:executed", async (event) => {
      ctx.log.info(`Tool ${event.toolName} executed`);
    });

    // Listen for session events
    ctx.on("session:started", async (event) => {
      ctx.log.info(`Session started: ${event.sessionKey}`);
    });

    ctx.on("session:ended", async (event) => {
      ctx.log.info(`Session ended: ${event.sessionKey}`);
    });
  }
};
```

---

## Memory Plugin (Slot Plugin)

Memory plugins implement a specific interface to replace the default memory system:

```typescript
import type { MemoryPlugin, MemoryEntry } from "moltbot";

export const plugin: MemoryPlugin = {
  id: "custom-memory",
  name: "Custom Memory Backend",
  version: "1.0.0",
  slot: "memory",  // Claim the memory slot

  configSchema: {
    type: "object",
    properties: {
      connectionString: { type: "string" }
    }
  },

  async onLoad(ctx) {
    // Initialize your memory backend
    const config = ctx.getConfig<{ connectionString: string }>();
    await this.connect(config.connectionString);
  },

  async onUnload(ctx) {
    await this.disconnect();
  },

  // Memory interface methods
  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    // Implement vector search
    const results = await this.vectorDb.search(query, options?.limit || 10);
    return results.map(r => ({
      content: r.text,
      score: r.similarity,
      metadata: r.metadata
    }));
  },

  async store(entries: MemoryEntry[]): Promise<void> {
    // Store entries in your backend
    for (const entry of entries) {
      await this.vectorDb.upsert({
        id: entry.id,
        text: entry.content,
        embedding: await this.embed(entry.content),
        metadata: entry.metadata
      });
    }
  },

  async delete(ids: string[]): Promise<void> {
    await this.vectorDb.delete(ids);
  }
};
```

Configure the slot:

```json5
{
  "plugins": {
    "slots": {
      "memory": "custom-memory"  // Use this plugin for memory
    }
  }
}
```

---

## Plugin Configuration

### Schema Definition

```typescript
export const plugin: MoltbotPlugin = {
  id: "configurable-plugin",
  name: "Configurable Plugin",
  version: "1.0.0",

  // JSON Schema for config validation
  configSchema: {
    type: "object",
    properties: {
      apiKey: {
        type: "string",
        description: "API key for the service"
      },
      endpoint: {
        type: "string",
        default: "https://api.example.com"
      },
      timeout: {
        type: "number",
        minimum: 1000,
        maximum: 60000,
        default: 10000
      },
      features: {
        type: "object",
        properties: {
          caching: { type: "boolean", default: true },
          retries: { type: "number", default: 3 }
        }
      }
    },
    required: ["apiKey"]
  },

  // UI hints for config editor
  configUiHints: {
    "apiKey": {
      label: "API Key",
      help: "Get your API key from https://example.com/settings",
      sensitive: true,
      placeholder: "sk-..."
    },
    "endpoint": {
      label: "API Endpoint",
      help: "Override for self-hosted instances"
    },
    "timeout": {
      label: "Request Timeout",
      help: "Milliseconds to wait before timing out"
    }
  },

  async onLoad(ctx) {
    // Access typed config
    interface PluginConfig {
      apiKey: string;
      endpoint: string;
      timeout: number;
      features: {
        caching: boolean;
        retries: number;
      };
    }

    const config = ctx.getConfig<PluginConfig>();
    ctx.log.info(`Connecting to ${config.endpoint}`);
  }
};
```

### Config in config.json

```json5
{
  "plugins": {
    "entries": {
      "configurable-plugin": {
        "enabled": true,
        "config": {
          "apiKey": "${MY_API_KEY}",
          "endpoint": "https://custom.api.com",
          "timeout": 30000,
          "features": {
            "caching": true,
            "retries": 5
          }
        }
      }
    }
  }
}
```

---

## Installing Plugins

### From NPM

```bash
moltbot plugins install moltbot-plugin-example
```

### From Local Path

```bash
moltbot plugins install ./path/to/my-plugin
```

### From Archive

```bash
moltbot plugins install https://example.com/plugin.tar.gz
```

### Manual Installation

1. Build the plugin:
   ```bash
   cd my-plugin
   npm run build
   ```

2. Copy to extensions directory:
   ```bash
   cp -r my-plugin ~/.clawdbot/extensions/
   ```

3. Enable in config:
   ```json5
   {
     "plugins": {
       "load": {
         "paths": ["~/.clawdbot/extensions/my-plugin"]
       }
     }
   }
   ```

---

## Plugin Management

### List Installed Plugins

```bash
moltbot plugins list
```

### Update Plugins

```bash
moltbot plugins update my-plugin
moltbot plugins update --all
```

### Uninstall Plugins

```bash
moltbot plugins uninstall my-plugin
```

### Enable/Disable Plugins

```json5
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "enabled": false  // Disable without uninstalling
      }
    }
  }
}
```

---

## Testing Plugins

### Unit Tests

```typescript
// src/index.test.ts
import { describe, it, expect, vi } from "vitest";
import { plugin } from "./index";

describe("my-plugin", () => {
  it("should have correct metadata", () => {
    expect(plugin.id).toBe("my-plugin");
    expect(plugin.version).toBe("1.0.0");
  });

  it("should register tools on load", async () => {
    const mockCtx = {
      log: { info: vi.fn(), debug: vi.fn() },
      getConfig: () => ({ apiKey: "test" }),
      registerTools: vi.fn()
    };

    await plugin.onLoad(mockCtx as any);

    expect(mockCtx.registerTools).toHaveBeenCalled();
    expect(mockCtx.registerTools.mock.calls[0][0]).toHaveLength(1);
  });

  it("should execute tool correctly", async () => {
    const mockCtx = {
      log: { info: vi.fn(), debug: vi.fn() },
      getConfig: () => ({ apiKey: "test" }),
      registerTools: vi.fn()
    };

    await plugin.onLoad(mockCtx as any);

    const tool = mockCtx.registerTools.mock.calls[0][0][0];
    const result = await tool.execute({ input: "test" }, {});

    expect(result).toEqual({ result: "Processed: test" });
  });
});
```

### Integration Tests

```typescript
import { createTestGateway } from "moltbot/testing";

describe("my-plugin integration", () => {
  it("should work with gateway", async () => {
    const gateway = await createTestGateway({
      plugins: {
        load: {
          paths: ["./dist"]
        }
      }
    });

    try {
      // Test tool via API
      const result = await gateway.invoke("my_tool", {
        input: "hello"
      });

      expect(result.result).toBe("Processed: hello");
    } finally {
      await gateway.stop();
    }
  });
});
```

---

## Best Practices

### 1. Use Typed Configurations

```typescript
interface MyPluginConfig {
  apiKey: string;
  maxRetries: number;
}

const config = ctx.getConfig<MyPluginConfig>();
```

### 2. Handle Errors Gracefully

```typescript
execute: async (params, toolCtx) => {
  try {
    const result = await riskyOperation(params);
    return { success: true, data: result };
  } catch (error) {
    ctx.log.error("Operation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

### 3. Clean Up Resources

```typescript
let client: SomeClient | null = null;

async onLoad(ctx) {
  client = new SomeClient(config);
  await client.connect();
}

async onUnload(ctx) {
  if (client) {
    await client.disconnect();
    client = null;
  }
}
```

### 4. Log Appropriately

```typescript
ctx.log.debug("Detailed info for debugging");
ctx.log.info("Normal operational messages");
ctx.log.warn("Potential issues");
ctx.log.error("Errors that need attention");
```

### 5. Document Your Plugin

Create a comprehensive README.md with:
- Installation instructions
- Configuration options
- Available tools
- Example usage
- Troubleshooting

---

## Summary

You've learned:

1. ✅ Plugin architecture overview
2. ✅ Plugin structure and files
3. ✅ Basic plugin template
4. ✅ Plugin lifecycle
5. ✅ Plugin Context API
6. ✅ Creating custom tools
7. ✅ Handling events
8. ✅ Memory slot plugins
9. ✅ Plugin configuration
10. ✅ Installing and managing plugins
11. ✅ Testing plugins
12. ✅ Best practices

---

**Next Tutorial:** [15 - Power User Features](15-POWER-USER-FEATURES.md) - Advanced features for experienced users
