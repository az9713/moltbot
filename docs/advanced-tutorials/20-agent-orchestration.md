---
summary: "Agent Orchestration: coordinate multiple specialized agents for complex tasks"
read_when:
  - You want to decompose tasks across multiple agents
  - You want parallel execution with dependency tracking
  - You need to coordinate specialist agents
---

# Intelligent Agent Orchestrator

The Agent Orchestrator coordinates multiple specialized agents to accomplish complex tasks. It automatically decomposes work, selects appropriate agents, manages parallel execution, and synthesizes results.

## Overview

The Orchestrator provides:

- **Task Decomposition**: Break complex requests into subtasks
- **Agent Selection**: Match subtasks to specialist agents
- **Parallel Execution**: Run independent tasks concurrently
- **Dependency Tracking**: Handle task dependencies correctly
- **Result Aggregation**: Combine outputs into coherent responses

## Architecture

```
                    User Request
                         │
                         ▼
              ┌─────────────────────┐
              │    Orchestrator     │
              │   (main agent)      │
              └──────────┬──────────┘
                         │ Decompose task
                         ▼
              ┌─────────────────────────────────────┐
              │            Task Queue               │
              │  [research] [code] [review] [docs]  │
              └─────────────────────────────────────┘
                         │ Dispatch to specialists
                         ▼
     ┌─────────┬─────────┬─────────┬─────────┐
     │Research │  Code   │ Review  │  Docs   │
     │ Agent   │  Agent  │  Agent  │  Agent  │
     └────┬────┴────┬────┴────┬────┴────┬────┘
          │         │         │         │
          └─────────┴─────────┴─────────┘
                         │
                         ▼
                   Final Result
```

## Configuration

### Basic Orchestrator Setup

```json5
{
  "agents": {
    "list": [
      {
        "id": "orchestrator",
        "role": "coordinator",
        "model": "claude-opus-4-20250514",
        "orchestration": {
          "enabled": true,
          "canSpawn": ["research", "code", "review", "docs"],
          "maxConcurrent": 4,
          "timeout": 600000
        }
      },
      {
        "id": "research",
        "role": "specialist",
        "model": "claude-sonnet-4-20250514",
        "skills": ["web-research", "summarization"]
      },
      {
        "id": "code",
        "role": "specialist",
        "model": "claude-sonnet-4-20250514",
        "skills": ["coding", "testing"]
      },
      {
        "id": "review",
        "role": "specialist",
        "model": "claude-sonnet-4-20250514",
        "skills": ["code-review", "security-analysis"]
      },
      {
        "id": "docs",
        "role": "specialist",
        "model": "claude-sonnet-4-20250514",
        "skills": ["documentation", "writing"]
      }
    ]
  }
}
```

### Agent Capabilities

Define what each agent can do:

```json5
{
  "agents": {
    "list": [
      {
        "id": "research",
        "capabilities": {
          "keywords": ["research", "search", "find", "investigate"],
          "tools": ["web_search", "memory_search"],
          "domains": ["information gathering", "fact checking"]
        }
      },
      {
        "id": "code",
        "capabilities": {
          "keywords": ["implement", "code", "build", "fix", "debug"],
          "tools": ["bash", "write", "edit", "read"],
          "domains": ["software development", "bug fixing"]
        }
      }
    ]
  }
}
```

## Task Decomposition

### Automatic Decomposition

The orchestrator analyzes requests and creates subtasks:

```typescript
// User request: "Research AI safety, implement a demo, review the code, and document it"

// Orchestrator creates:
const tasks = [
  {
    id: "task-1",
    type: "research",
    description: "Research AI safety developments",
    agent: "research",
    dependencies: [],
  },
  {
    id: "task-2",
    type: "implementation",
    description: "Implement a demo based on research",
    agent: "code",
    dependencies: ["task-1"], // Depends on research
  },
  {
    id: "task-3",
    type: "review",
    description: "Review the implementation code",
    agent: "review",
    dependencies: ["task-2"], // Depends on code
  },
  {
    id: "task-4",
    type: "documentation",
    description: "Document the implementation",
    agent: "docs",
    dependencies: ["task-2"], // Depends on code
  },
];
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Task Execution                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Phase 1: [research]                                     │
│           └─► Research AI safety                         │
│                                                          │
│  Phase 2: [code]                                         │
│           └─► Implement demo (waits for research)        │
│                                                          │
│  Phase 3: [review, docs] (parallel)                      │
│           ├─► Review code                                │
│           └─► Write documentation                        │
│                                                          │
│  Final: Aggregate all results                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Programmatic Usage

### OrchestrationManager API

```typescript
import { OrchestrationManager } from "./orchestration/index.js";

// Initialize orchestrator
const orchestrator = new OrchestrationManager({
  agents: {
    research: researchAgent,
    code: codeAgent,
    review: reviewAgent,
    docs: docsAgent,
  },
  maxConcurrent: 4,
});

// Execute complex task
const result = await orchestrator.execute({
  prompt: "Build a REST API with authentication, tests, and documentation",
  decompose: true,
  aggregateResults: true,
});

console.log("Final result:", result.aggregated);
console.log("Task results:", result.tasks);
```

### Manual Task Definition

```typescript
// Define tasks explicitly
const tasks = [
  {
    id: "design",
    agent: "code",
    prompt: "Design the API structure",
  },
  {
    id: "implement",
    agent: "code",
    prompt: "Implement the API endpoints",
    dependencies: ["design"],
  },
  {
    id: "test",
    agent: "code",
    prompt: "Write tests for the API",
    dependencies: ["implement"],
  },
  {
    id: "review",
    agent: "review",
    prompt: "Review the implementation",
    dependencies: ["implement"],
  },
  {
    id: "docs",
    agent: "docs",
    prompt: "Write API documentation",
    dependencies: ["implement"],
  },
];

const result = await orchestrator.executeTasks(tasks);
```

### Event Handling

```typescript
orchestrator.on("task:started", ({ taskId, agent }) => {
  console.log(`Task ${taskId} started on ${agent}`);
});

orchestrator.on("task:completed", ({ taskId, result, duration }) => {
  console.log(`Task ${taskId} completed in ${duration}ms`);
});

orchestrator.on("task:failed", ({ taskId, error }) => {
  console.error(`Task ${taskId} failed:`, error.message);
});

orchestrator.on("orchestration:complete", ({ results, totalDuration }) => {
  console.log(`All tasks completed in ${totalDuration}ms`);
});
```

## Advanced Features

### Dynamic Agent Selection

```json5
{
  "orchestration": {
    "agentSelection": {
      "strategy": "capability-match",
      "fallback": "round-robin",
      "scoring": {
        "keywordMatch": 0.4,
        "toolMatch": 0.3,
        "domainMatch": 0.3
      }
    }
  }
}
```

### Load Balancing

```json5
{
  "orchestration": {
    "loadBalancing": {
      "enabled": true,
      "strategy": "least-busy",
      "maxTasksPerAgent": 3,
      "queueTimeout": 30000
    }
  }
}
```

### Retry Policies

```json5
{
  "orchestration": {
    "retry": {
      "enabled": true,
      "maxRetries": 3,
      "backoff": "exponential",
      "initialDelay": 1000
    }
  }
}
```

### Result Aggregation

```json5
{
  "orchestration": {
    "aggregation": {
      "strategy": "llm-synthesis",
      "model": "claude-sonnet-4-20250514",
      "template": "Synthesize these results into a coherent response: {{results}}"
    }
  }
}
```

## Workflows

### Sequential Workflow

```json5
{
  "workflows": {
    "feature-development": {
      "type": "sequential",
      "steps": [
        { "agent": "research", "prompt": "Research requirements" },
        { "agent": "code", "prompt": "Implement feature" },
        { "agent": "review", "prompt": "Review implementation" },
        { "agent": "docs", "prompt": "Update documentation" }
      ]
    }
  }
}
```

### Parallel Workflow

```json5
{
  "workflows": {
    "multi-research": {
      "type": "parallel",
      "steps": [
        { "agent": "research", "prompt": "Research topic A" },
        { "agent": "research", "prompt": "Research topic B" },
        { "agent": "research", "prompt": "Research topic C" }
      ],
      "aggregation": "merge"
    }
  }
}
```

### DAG Workflow

```json5
{
  "workflows": {
    "complex-task": {
      "type": "dag",
      "tasks": {
        "A": { "agent": "research", "prompt": "..." },
        "B": { "agent": "code", "prompt": "...", "depends": ["A"] },
        "C": { "agent": "code", "prompt": "...", "depends": ["A"] },
        "D": { "agent": "review", "prompt": "...", "depends": ["B", "C"] }
      }
    }
  }
}
```

## Monitoring

### Dashboard View

```
┌─────────────────────────────────────────────────────────────┐
│            Orchestration Status: In Progress                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tasks: 4 total │ 1 running │ 2 completed │ 1 pending      │
│                                                             │
│  ┌─────────────┬─────────┬──────────┬─────────────────┐    │
│  │ Task        │ Agent   │ Status   │ Duration        │    │
│  ├─────────────┼─────────┼──────────┼─────────────────┤    │
│  │ research    │ research│ ✓ Done   │ 45s             │    │
│  │ implement   │ code    │ ▶ Running│ 23s...          │    │
│  │ review      │ review  │ ○ Pending│ waiting         │    │
│  │ docs        │ docs    │ ○ Pending│ waiting         │    │
│  └─────────────┴─────────┴──────────┴─────────────────┘    │
│                                                             │
│  Dependency Graph:                                          │
│  research ──► implement ──► review                          │
│                        └──► docs                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CLI Commands

```bash
# View orchestration status
moltbot orchestration status

# List running workflows
moltbot orchestration list

# Cancel a workflow
moltbot orchestration cancel <workflow-id>

# View workflow history
moltbot orchestration history --last 10
```

## Error Handling

### Task Failure Handling

```json5
{
  "orchestration": {
    "errorHandling": {
      "onTaskFailure": "continue", // or "abort", "retry"
      "failureThreshold": 2,       // Abort after 2 failures
      "notifyOnFailure": true
    }
  }
}
```

### Rollback Support

```json5
{
  "orchestration": {
    "rollback": {
      "enabled": true,
      "onFailure": "full",  // or "partial", "none"
      "checkpoint": true     // Save checkpoints for recovery
    }
  }
}
```

## Troubleshooting

### Tasks Not Executing

1. Check agent availability:
   ```bash
   moltbot agents status
   ```

2. Verify orchestration is enabled

3. Check task dependencies are satisfied

### Slow Execution

1. Increase concurrency:
   ```json5
   { "orchestration": { "maxConcurrent": 6 } }
   ```

2. Check for bottleneck agents

3. Review dependency graph for serialization

### Result Aggregation Issues

1. Check aggregation model is available

2. Verify result format compatibility

3. Review aggregation template

## See Also

- [Skills Marketplace](/advanced-tutorials/19-skills-marketplace)
- [Proactive Agents](/advanced-tutorials/21-proactive-agents)
- [Agent Configuration](/concepts/agent)
