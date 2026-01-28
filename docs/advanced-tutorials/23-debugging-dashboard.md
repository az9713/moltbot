---
summary: "Debugging Dashboard: real-time agent observability, token tracking, and decision tracing"
read_when:
  - You want to debug agent behavior
  - You need to track token usage and costs
  - You want visibility into agent decision-making
---

# Agent Debugging & Observability Dashboard

The Debugging Dashboard provides real-time visibility into agent execution, token usage, tool invocations, and decision-making. Debug issues, optimize performance, and understand exactly what your agents are doing.

## Overview

The Dashboard provides:

- **Live Execution View**: Watch agents think in real-time
- **Token Budget Tracker**: Visualize context window usage
- **Tool Invocation Log**: See all tool calls with inputs/outputs
- **Decision Tree**: Understand agent reasoning paths
- **Cost Dashboard**: Track spend by agent/channel/time

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Observability System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Collector  │  │   Metrics   │  │   Traces    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│                 ┌─────────────────┐                             │
│                 │  Debug Manager  │                             │
│                 └────────┬────────┘                             │
│                          │                                      │
│          ┌───────────────┼───────────────┐                      │
│          │               │               │                      │
│          ▼               ▼               ▼                      │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│   │  Web UI    │  │    CLI     │  │   Export   │               │
│   └────────────┘  └────────────┘  └────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Dashboard Views

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent: main │ Session: telegram:123456 │ Status: Running       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Context Window                    Token Usage (24h)            │
│  ████████████░░░░░░░░ 62%          ┌─────────────────┐          │
│  124,000 / 200,000 tokens          │ Input:  45,231  │          │
│                                    │ Output: 12,847  │          │
│  Recent Tools                      │ Cost:   $0.82   │          │
│  ┌─────────────────────────────┐   └─────────────────┘          │
│  │ 14:32 web_search "AI news"  │                                │
│  │ 14:31 memory_search "prev"  │   Active Sub-Agents            │
│  │ 14:30 bash "git status"     │   ├─ research-agent (busy)     │
│  └─────────────────────────────┘   └─ code-agent (idle)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Token Usage View

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token Usage Breakdown                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Context:                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ System Prompt      ██████████░░░░░░░░░░░░░░░░░  12,450    │  │
│  │ Conversation       ████████████████████░░░░░░░  68,320    │  │
│  │ Tool Results       ████████████░░░░░░░░░░░░░░░  38,120    │  │
│  │ Memory Context     ███░░░░░░░░░░░░░░░░░░░░░░░░   5,110    │  │
│  │ ───────────────────────────────────────────────────────── │  │
│  │ Total              ████████████████████████░░░ 124,000    │  │
│  │ Available          ░░░░░░░░░░░░░░░░░░░░░░░░░░░  76,000    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Token Rate:  ~2,400 tokens/min                                 │
│  Est. Remaining: ~31 minutes at current rate                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Invocation Log

```
┌─────────────────────────────────────────────────────────────────┐
│                     Tool Invocation Log                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┬────────────┬──────────────────┬──────────┬──────┐  │
│  │ Time    │ Tool       │ Input            │ Duration │ Size │  │
│  ├─────────┼────────────┼──────────────────┼──────────┼──────┤  │
│  │ 14:32:15│ web_search │ "AI safety 2024" │ 1.2s     │ 4.2k │  │
│  │ 14:31:45│ memory     │ query: "prev..."│ 0.3s     │ 1.1k │  │
│  │ 14:31:22│ bash       │ git status       │ 0.1s     │ 0.5k │  │
│  │ 14:30:58│ read_file  │ src/main.ts      │ 0.05s    │ 2.8k │  │
│  │ 14:30:15│ write_file │ output.md        │ 0.02s    │ 1.2k │  │
│  └─────────┴────────────┴──────────────────┴──────────┴──────┘  │
│                                                                 │
│  [Click any row for full input/output details]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cost Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cost Dashboard                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Today: $3.42                    This Month: $87.23             │
│                                                                 │
│  By Agent:                       By Channel:                    │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   │
│  │ main        $2.18  64%  │     │ telegram    $1.89  55%  │   │
│  │ research    $0.82  24%  │     │ slack       $0.95  28%  │   │
│  │ code        $0.42  12%  │     │ discord     $0.58  17%  │   │
│  └─────────────────────────┘     └─────────────────────────┘   │
│                                                                 │
│  Daily Trend (Last 7 Days):                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     *                                                    │   │
│  │    * *     *                                            │   │
│  │   *   *   * *     *                                     │   │
│  │  *     * *   *   * *                                    │   │
│  │ *       *     * *   *                                   │   │
│  │ Mon Tue Wed Thu Fri Sat Sun                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Enable Debugging

```json5
{
  "debug": {
    "enabled": true,
    "dashboard": {
      "enabled": true,
      "port": 3030,
      "auth": {
        "enabled": true,
        "password": "${DEBUG_DASHBOARD_PASSWORD}"
      }
    },
    "tracing": {
      "enabled": true,
      "level": "detailed",  // "minimal", "standard", "detailed"
      "captureToolInputs": true,
      "captureToolOutputs": true
    },
    "metrics": {
      "enabled": true,
      "interval": 5000,     // Collection interval (ms)
      "retention": 86400    // Keep metrics for 24 hours
    }
  }
}
```

### Cost Tracking

```json5
{
  "debug": {
    "costs": {
      "enabled": true,
      "trackByAgent": true,
      "trackByChannel": true,
      "trackBySession": true,
      "alertThreshold": {
        "daily": 10.00,
        "monthly": 100.00
      },
      "notify": {
        "channel": "slack",
        "to": "#ops-alerts"
      }
    }
  }
}
```

### Checkpointing

```json5
{
  "debug": {
    "checkpoints": {
      "enabled": true,
      "interval": 10,           // Every N turns
      "maxCheckpoints": 100,    // Per session
      "savePath": "~/.clawdbot/checkpoints"
    }
  }
}
```

## Programmatic Usage

### DebugManager API

```typescript
import { DebugManager } from "./debug/index.js";

// Initialize
const debug = new DebugManager({
  tracing: { enabled: true },
  metrics: { enabled: true },
  costs: { enabled: true },
});

// Attach to agent
agent.use(debug);

// Get current metrics
const metrics = debug.getMetrics();
console.log("Token usage:", metrics.tokenUsage);
console.log("Tool calls:", metrics.toolCalls);
console.log("Cost:", metrics.cost);

// Get session trace
const trace = await debug.getTrace(sessionId);
console.log("Trace:", trace);

// Export data
const exportData = await debug.export({
  format: "json",
  includeTraces: true,
  includeCosts: true,
});
```

### Event Handling

```typescript
debug.on("tool:invoked", ({ tool, input, duration }) => {
  console.log(`Tool ${tool} called, took ${duration}ms`);
});

debug.on("token:threshold", ({ current, limit, percentage }) => {
  console.log(`Token usage at ${percentage}% (${current}/${limit})`);
});

debug.on("cost:alert", ({ current, threshold, period }) => {
  console.log(`Cost alert: $${current} exceeds ${period} threshold`);
});

debug.on("checkpoint:created", ({ sessionId, checkpoint }) => {
  console.log(`Checkpoint created for session ${sessionId}`);
});
```

### Trace Analysis

```typescript
// Get detailed trace
const trace = await debug.getTrace(sessionId);

// Analyze tool usage
const toolStats = trace.tools.reduce((acc, t) => {
  acc[t.name] = (acc[t.name] || 0) + 1;
  return acc;
}, {});

// Find slowest tools
const slowest = trace.tools
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5);

// Analyze token flow
const tokenFlow = trace.turns.map((t) => ({
  turn: t.number,
  input: t.inputTokens,
  output: t.outputTokens,
  cumulative: t.cumulativeTokens,
}));
```

## CLI Commands

```bash
# Open dashboard
moltbot debug dashboard

# View current sessions
moltbot debug sessions

# Get session details
moltbot debug session <session-id>

# View token usage
moltbot debug tokens --session <session-id>

# View tool log
moltbot debug tools --last 50

# View costs
moltbot debug costs --period today

# Export trace
moltbot debug export <session-id> --format json > trace.json

# Create checkpoint
moltbot debug checkpoint <session-id>

# Restore from checkpoint
moltbot debug restore <checkpoint-id>
```

## Checkpointing

### Creating Checkpoints

```bash
# Manual checkpoint
moltbot debug checkpoint <session-id>

# Auto-checkpoint configuration
{
  "debug": {
    "checkpoints": {
      "enabled": true,
      "interval": 10,
      "triggers": ["tool:error", "token:threshold"]
    }
  }
}
```

### Restoring from Checkpoint

```bash
# List checkpoints
moltbot debug checkpoints --session <session-id>

# Restore
moltbot debug restore <checkpoint-id>
```

### Checkpoint Structure

```json5
{
  "id": "chk_abc123",
  "sessionId": "session-123",
  "timestamp": "2024-01-15T14:30:00Z",
  "turn": 42,
  "state": {
    "context": [...],
    "memory": {...},
    "tools": {...}
  },
  "metrics": {
    "tokens": 85000,
    "cost": 1.23
  }
}
```

## Session Inspection

### View Session State

```typescript
const state = await debug.inspectSession(sessionId);

console.log("Messages:", state.messages.length);
console.log("Tool calls:", state.toolCalls);
console.log("Context size:", state.contextSize);
console.log("Active tools:", state.activeTools);
```

### Replay Session

```typescript
// Replay session to specific turn
await debug.replay(sessionId, {
  toTurn: 25,
  stepByStep: true,
  onTurn: (turn) => {
    console.log(`Turn ${turn.number}: ${turn.summary}`);
  },
});
```

## Metrics Export

### Prometheus Format

```json5
{
  "debug": {
    "metrics": {
      "export": {
        "prometheus": {
          "enabled": true,
          "port": 9090,
          "path": "/metrics"
        }
      }
    }
  }
}
```

### JSON Export

```bash
# Export metrics
moltbot debug metrics export --format json > metrics.json

# Export with date range
moltbot debug metrics export \
  --from 2024-01-01 \
  --to 2024-01-15 \
  --format json > metrics.json
```

## Troubleshooting

### High Token Usage

1. Check context breakdown:
   ```bash
   moltbot debug tokens --breakdown
   ```

2. Review tool output sizes

3. Consider enabling compaction

### Slow Tool Execution

1. View tool timing:
   ```bash
   moltbot debug tools --sort duration
   ```

2. Check for network issues

3. Review tool configuration

### Cost Spikes

1. Analyze by agent/channel:
   ```bash
   moltbot debug costs --group-by agent
   ```

2. Check for runaway sessions

3. Review token efficiency

### Missing Traces

1. Verify tracing is enabled

2. Check retention settings

3. Ensure sufficient disk space

## Integration

### Grafana

```json5
{
  "debug": {
    "metrics": {
      "export": {
        "prometheus": { "enabled": true }
      }
    }
  }
}
```

Then add Prometheus datasource in Grafana pointing to `:9090/metrics`.

### OpenTelemetry

```json5
{
  "debug": {
    "tracing": {
      "export": {
        "otlp": {
          "enabled": true,
          "endpoint": "http://otel-collector:4317"
        }
      }
    }
  }
}
```

## See Also

- [Agent Hooks](/advanced-tutorials/18-agent-hooks-system)
- [Memory System](/advanced-tutorials/22-memory-knowledge-graph)
- [Logging](/logging)
