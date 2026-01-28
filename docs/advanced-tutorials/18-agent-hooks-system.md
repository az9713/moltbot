---
summary: "Agent Hooks: event-driven lifecycle interception for security, logging, and customization"
read_when:
  - You want to intercept agent events for security validation
  - You want to log tool invocations or agent activity
  - You want custom behavior at agent lifecycle points
---

# Agent Hooks System

The Agent Hooks System provides event-driven interception points throughout the agent lifecycle. Use hooks to validate security, log activity, transform results, manage costs, and customize behavior.

## Overview

Agent Hooks enable:

- **Security Validation**: Block dangerous operations before execution
- **Audit Logging**: Track all tool invocations and agent decisions
- **Cost Management**: Alert on token thresholds, auto-compact sessions
- **Result Transformation**: Modify tool outputs before agent sees them
- **Custom Automation**: Trigger workflows based on agent events

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Execution                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ onAgentStart │───▶│ onToolInvoke │───▶│ onToolResult │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         │                   │                   │                │
│         │                   ▼                   │                │
│         │           ┌──────────────┐            │                │
│         │           │ Tool Blocked │            │                │
│         │           │  (if denied) │            │                │
│         │           └──────────────┘            │                │
│         │                                       │                │
│         │            ┌──────────────┐           │                │
│         └───────────▶│ onAgentStop  │◀──────────┘                │
│                      └──────────────┘                            │
│                             │                                    │
│                      ┌──────────────┐                            │
│                      │   onError    │                            │
│                      └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Hook Events

| Event | Description | Use Cases |
|-------|-------------|-----------|
| `onAgentStart` | Agent begins processing | Initialize context, load preferences |
| `onToolInvoke` | Before tool execution | Security validation, logging, rate limiting |
| `onToolResult` | After tool execution | Result transformation, caching, metrics |
| `onAgentStop` | Agent completes | Cleanup, notifications, summaries |
| `onTokenThreshold` | Token usage exceeds limit | Cost alerts, auto-compaction |
| `onError` | Agent encounters error | Error recovery, escalation, alerts |

## Configuration

### Basic Hook Configuration

```json5
{
  "hooks": {
    "agent": {
      "enabled": true,
      "onToolInvoke": [
        {
          "id": "log-all-tools",
          "action": "log",
          "level": "info"
        }
      ]
    }
  }
}
```

### Security Validation

Block dangerous commands:

```json5
{
  "hooks": {
    "agent": {
      "onToolInvoke": [
        {
          "id": "block-dangerous-bash",
          "match": {
            "tool": "bash",
            "args.command": ["*rm -rf*", "*sudo*", "*chmod 777*"]
          },
          "action": "deny",
          "message": "This command is not allowed for security reasons"
        },
        {
          "id": "require-approval-for-writes",
          "match": {
            "tool": ["write", "edit"],
            "args.file_path": ["/etc/*", "/usr/*", "/var/*"]
          },
          "action": "require_approval",
          "notify": "telegram:123456789"
        }
      ]
    }
  }
}
```

### Token Threshold Alerts

```json5
{
  "hooks": {
    "agent": {
      "onTokenThreshold": [
        {
          "id": "warn-at-50k",
          "threshold": 50000,
          "action": "alert",
          "message": "High token usage: {{tokensUsed}} tokens"
        },
        {
          "id": "compact-at-80k",
          "threshold": 80000,
          "action": "compact",
          "message": "Auto-compacting session due to high token usage"
        },
        {
          "id": "stop-at-95k",
          "threshold": 95000,
          "action": "stop",
          "message": "Session stopped: token limit reached"
        }
      ]
    }
  }
}
```

### Result Transformation

```json5
{
  "hooks": {
    "agent": {
      "onToolResult": [
        {
          "id": "redact-secrets",
          "match": { "tool": "bash" },
          "transform": {
            "pattern": "(api_key|password|secret)=[^\\s]+",
            "replace": "$1=[REDACTED]"
          }
        },
        {
          "id": "truncate-large-output",
          "match": { "result.length": { "$gt": 50000 } },
          "transform": {
            "truncate": 50000,
            "message": "\n... (output truncated)"
          }
        }
      ]
    }
  }
}
```

### Error Recovery

```json5
{
  "hooks": {
    "agent": {
      "onError": [
        {
          "id": "retry-on-rate-limit",
          "match": { "error.type": "rate_limit" },
          "action": "retry",
          "delay": 5000,
          "maxRetries": 3
        },
        {
          "id": "escalate-critical",
          "match": { "error.severity": "critical" },
          "action": "notify",
          "notify": {
            "channel": "slack",
            "recipient": "#alerts",
            "template": "Critical error in agent {{agentId}}: {{error.message}}"
          }
        }
      ]
    }
  }
}
```

## Match Patterns

### Tool Matching

```json5
{
  "match": {
    // Exact tool name
    "tool": "bash",

    // Multiple tools
    "tool": ["bash", "write", "edit"],

    // Wildcard pattern
    "tool": "web_*"
  }
}
```

### Argument Matching

```json5
{
  "match": {
    "tool": "bash",
    "args.command": "*rm*",           // Contains
    "args.command": "git *",          // Starts with
    "args.timeout": { "$gt": 60000 }  // Greater than
  }
}
```

### Context Matching

```json5
{
  "match": {
    "channel": "telegram",
    "agentId": "main",
    "principal.roles": { "$contains": "admin" }
  }
}
```

## Actions

### Deny

Block the operation:

```json5
{
  "action": "deny",
  "message": "Operation not allowed"
}
```

### Require Approval

Request human approval:

```json5
{
  "action": "require_approval",
  "timeout": 300,
  "notify": "telegram:123456789"
}
```

### Log

Log the event:

```json5
{
  "action": "log",
  "level": "info",    // debug, info, warn, error
  "template": "Tool {{tool}} invoked with {{args}}"
}
```

### Alert

Send notification:

```json5
{
  "action": "alert",
  "notify": {
    "channel": "slack",
    "recipient": "#monitoring"
  }
}
```

### Transform

Modify the result:

```json5
{
  "action": "transform",
  "transform": {
    "pattern": "secret=\\w+",
    "replace": "secret=[HIDDEN]"
  }
}
```

### Retry

Retry on failure:

```json5
{
  "action": "retry",
  "delay": 1000,
  "maxRetries": 3
}
```

## Programmatic Usage

### AgentHooksManager API

```typescript
import { AgentHooksManager } from "./agent-hooks/index.js";

// Initialize manager
const hooks = new AgentHooksManager({
  onToolInvoke: [
    {
      id: "custom-validation",
      match: { tool: "bash" },
      handler: async (event) => {
        if (event.args.command.includes("dangerous")) {
          return { action: "deny", message: "Dangerous command blocked" };
        }
        return { action: "allow" };
      },
    },
  ],
});

// Register with agent
agent.use(hooks);
```

### Custom Hook Handlers

```typescript
import type { HookHandler, ToolInvokeEvent } from "./agent-hooks/types.js";

const customSecurityCheck: HookHandler<ToolInvokeEvent> = async (event) => {
  const { tool, args, context } = event;

  // Check if user has permission
  if (!context.principal.permissions.includes(`tool:${tool}`)) {
    return {
      action: "deny",
      message: `You don't have permission to use ${tool}`,
    };
  }

  // Log the invocation
  console.log(`[audit] ${context.principal.id} invoked ${tool}`);

  return { action: "allow" };
};

hooks.register("onToolInvoke", customSecurityCheck);
```

### Event Listeners

```typescript
hooks.on("tool:blocked", ({ tool, reason, principal }) => {
  console.log(`Tool ${tool} blocked for ${principal.id}: ${reason}`);
});

hooks.on("threshold:exceeded", ({ threshold, current, action }) => {
  console.log(`Token threshold ${threshold} exceeded (${current}), action: ${action}`);
});

hooks.on("error:recovered", ({ error, retries }) => {
  console.log(`Error recovered after ${retries} retries: ${error.message}`);
});
```

## Per-Agent Hooks

Configure hooks for specific agents:

```json5
{
  "agents": {
    "list": [
      {
        "id": "code-agent",
        "hooks": {
          "onToolInvoke": [
            {
              "id": "allow-bash",
              "match": { "tool": "bash" },
              "action": "allow"
            }
          ]
        }
      },
      {
        "id": "research-agent",
        "hooks": {
          "onToolInvoke": [
            {
              "id": "block-bash",
              "match": { "tool": "bash" },
              "action": "deny",
              "message": "Research agent cannot use bash"
            }
          ]
        }
      }
    ]
  }
}
```

## Built-in Hooks

### security-validator

Validates tool invocations against security policies:

```json5
{
  "hooks": {
    "agent": {
      "onToolInvoke": [
        { "use": "security-validator" }
      ]
    }
  }
}
```

### audit-logger

Logs all agent activity:

```json5
{
  "hooks": {
    "agent": {
      "onToolInvoke": [{ "use": "audit-logger" }],
      "onToolResult": [{ "use": "audit-logger" }],
      "onAgentStart": [{ "use": "audit-logger" }],
      "onAgentStop": [{ "use": "audit-logger" }]
    }
  }
}
```

### cost-tracker

Tracks token usage and costs:

```json5
{
  "hooks": {
    "agent": {
      "onAgentStop": [
        {
          "use": "cost-tracker",
          "config": {
            "notify": "daily",
            "budget": { "daily": 10.00, "monthly": 100.00 }
          }
        }
      ]
    }
  }
}
```

## Troubleshooting

### Hook Not Triggering

1. Verify hook is enabled:
   ```json5
   {
     "hooks": {
       "agent": {
         "enabled": true  // Must be true
       }
     }
   }
   ```

2. Check match patterns are correct

3. Review gateway logs:
   ```bash
   moltbot logs --filter hooks
   ```

### Approval Timeout

1. Increase timeout:
   ```json5
   {
     "action": "require_approval",
     "timeout": 600  // 10 minutes
   }
   ```

2. Check notification channel is configured

3. Verify approver has access

### Performance Issues

1. Move expensive operations to `onToolResult` instead of `onToolInvoke`

2. Use specific match patterns instead of wildcards

3. Consider async processing for logging

## CLI Commands

```bash
# List configured hooks
moltbot hooks agent list

# Test a hook pattern
moltbot hooks agent test --tool bash --command "rm -rf /"

# View hook execution log
moltbot hooks agent log --last 50

# Disable a specific hook
moltbot hooks agent disable block-dangerous-bash
```

## See Also

- [Hooks](/hooks) - Gateway lifecycle hooks
- [Security Enhancements](/advanced-tutorials/25-security-enhancements)
- [Audit Logging](/advanced-tutorials/25-security-enhancements#audit-logging)
