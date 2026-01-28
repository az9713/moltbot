---
summary: "Proactive Agents: autonomous agents triggered by schedules, webhooks, and events"
read_when:
  - You want agents that act autonomously on schedules
  - You want to trigger agents from external events
  - You need background task automation
---

# Proactive Agent System

The Proactive Agent System enables agents to act autonomously based on triggers, schedules, and external events. Instead of waiting for user messages, proactive agents monitor conditions and take action when needed.

## Overview

Proactive Agents provide:

- **Scheduled Tasks**: Cron-based execution for regular tasks
- **Webhook Triggers**: Respond to external events (GitHub, Slack, etc.)
- **Event Monitoring**: React to file changes, metrics, patterns
- **Background Execution**: Run tasks without blocking user interaction
- **Delivery Options**: Send results to any channel

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Proactive Agent System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Schedule   │  │   Webhook   │  │   Event     │              │
│  │  Trigger    │  │   Trigger   │  │   Trigger   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │  Task Scheduler │                              │
│                 └────────┬────────┘                              │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │  Agent Runner   │                              │
│                 └────────┬────────┘                              │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │ Delivery System │                              │
│                 └─────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Trigger Types

### Schedule Trigger

Cron-based scheduling:

```json5
{
  "proactive": {
    "tasks": [
      {
        "id": "morning-briefing",
        "trigger": {
          "type": "schedule",
          "schedule": "0 9 * * 1-5"  // 9am weekdays
        },
        "agent": "main",
        "prompt": "Generate my morning briefing from calendar, email, and news",
        "deliver": {
          "channel": "telegram",
          "to": "123456789"
        }
      }
    ]
  }
}
```

### Webhook Trigger

External event triggers:

```json5
{
  "proactive": {
    "tasks": [
      {
        "id": "pr-review",
        "trigger": {
          "type": "webhook",
          "path": "/github",
          "event": "pull_request.opened"
        },
        "agent": "code-reviewer",
        "prompt": "Review this PR: {{payload.pull_request.html_url}}",
        "deliver": {
          "channel": "slack",
          "to": "#code-review"
        }
      }
    ]
  }
}
```

### File Watch Trigger

React to file changes:

```json5
{
  "proactive": {
    "tasks": [
      {
        "id": "task-processor",
        "trigger": {
          "type": "file",
          "path": "~/TASKS.md",
          "event": "change"
        },
        "agent": "main",
        "prompt": "Process any new tasks in TASKS.md",
        "deliver": {
          "channel": "telegram",
          "to": "123456789"
        }
      }
    ]
  }
}
```

### Threshold Trigger

Metric-based triggers:

```json5
{
  "proactive": {
    "tasks": [
      {
        "id": "inbox-alert",
        "trigger": {
          "type": "threshold",
          "metric": "email.unread",
          "condition": "> 50",
          "checkInterval": 300000  // 5 minutes
        },
        "agent": "main",
        "prompt": "I have too many unread emails. Help me triage them.",
        "deliver": {
          "channel": "slack",
          "to": "@me"
        }
      }
    ]
  }
}
```

### Channel Event Trigger

Message pattern matching:

```json5
{
  "proactive": {
    "tasks": [
      {
        "id": "support-responder",
        "trigger": {
          "type": "channel",
          "channel": "slack",
          "pattern": "#support",
          "match": "@bot help"
        },
        "agent": "support",
        "prompt": "Respond to this support request: {{message}}",
        "deliver": {
          "channel": "slack",
          "to": "{{thread}}"
        }
      }
    ]
  }
}
```

## Configuration

### Basic Setup

```json5
{
  "proactive": {
    "enabled": true,
    "tasks": [
      // Task definitions...
    ],
    "defaults": {
      "timeout": 300000,
      "retries": 3,
      "notifyOnError": true
    }
  }
}
```

### Task Definition

```json5
{
  "id": "task-id",
  "name": "Human readable name",
  "description": "What this task does",
  "enabled": true,
  "trigger": {
    // Trigger configuration
  },
  "agent": "agent-id",
  "prompt": "The prompt to send to the agent",
  "context": {
    // Additional context to inject
  },
  "deliver": {
    // Delivery configuration
  },
  "options": {
    "timeout": 300000,
    "retries": 3,
    "runOnStartup": false
  }
}
```

### Delivery Options

```json5
{
  "deliver": {
    // Single channel delivery
    "channel": "telegram",
    "to": "123456789",

    // Multi-channel delivery
    "channels": [
      { "channel": "telegram", "to": "123456789" },
      { "channel": "slack", "to": "#notifications" }
    ],

    // Conditional delivery
    "condition": "{{result.priority}} === 'high'",
    "fallback": {
      "channel": "email",
      "to": "user@example.com"
    }
  }
}
```

## Use Cases

### Morning Briefing

```json5
{
  "id": "morning-briefing",
  "trigger": { "type": "schedule", "schedule": "0 8 * * 1-5" },
  "agent": "main",
  "prompt": `
    Generate my morning briefing:
    1. Check my calendar for today
    2. Summarize important emails
    3. Check news headlines
    4. List my top 3 priorities
  `,
  "deliver": { "channel": "telegram", "to": "me" }
}
```

### Code Review on PR

```json5
{
  "id": "auto-review",
  "trigger": {
    "type": "webhook",
    "path": "/github",
    "event": "pull_request.opened",
    "filter": "payload.repository.full_name === 'myorg/myrepo'"
  },
  "agent": "code-reviewer",
  "prompt": "Review PR #{{payload.number}}: {{payload.pull_request.title}}",
  "deliver": {
    "channel": "github",
    "to": "pr:{{payload.number}}"
  }
}
```

### Document Sync

```json5
{
  "id": "doc-sync",
  "trigger": {
    "type": "file",
    "path": "~/notes/**/*.md",
    "event": "change"
  },
  "agent": "main",
  "prompt": "Index this updated document for memory search: {{file.path}}",
  "options": { "silent": true }  // No delivery, just process
}
```

### Daily Report

```json5
{
  "id": "daily-report",
  "trigger": { "type": "schedule", "schedule": "0 18 * * 1-5" },
  "agent": "main",
  "prompt": `
    Generate my daily report:
    1. What I accomplished today
    2. What's pending for tomorrow
    3. Any blockers or issues
  `,
  "deliver": {
    "channels": [
      { "channel": "slack", "to": "#team-updates" },
      { "channel": "email", "to": "manager@company.com" }
    ]
  }
}
```

### Health Check

```json5
{
  "id": "health-check",
  "trigger": { "type": "schedule", "schedule": "*/15 * * * *" },
  "agent": "devops",
  "prompt": "Check the health of production services and report any issues",
  "deliver": {
    "condition": "{{result.hasIssues}}",
    "channel": "slack",
    "to": "#ops-alerts"
  }
}
```

## Programmatic Usage

### ProactiveManager API

```typescript
import { ProactiveManager } from "./proactive/index.js";

// Initialize manager
const proactive = new ProactiveManager({
  tasks: [
    {
      id: "custom-task",
      trigger: { type: "schedule", schedule: "0 * * * *" },
      handler: async (context) => {
        const result = await someOperation();
        return { message: `Processed: ${result}` };
      },
    },
  ],
});

// Start the manager
await proactive.start();

// Manually trigger a task
await proactive.trigger("custom-task", { reason: "manual" });

// List scheduled tasks
const tasks = proactive.listTasks();

// Stop the manager
await proactive.stop();
```

### Custom Trigger Handlers

```typescript
import { defineTrigger } from "./proactive/triggers.js";

// Custom trigger type
const customTrigger = defineTrigger({
  type: "api-check",
  handler: async (config, callback) => {
    const interval = setInterval(async () => {
      const response = await fetch(config.url);
      if (response.status !== 200) {
        callback({ status: response.status });
      }
    }, config.interval);

    return () => clearInterval(interval); // Cleanup function
  },
});

// Use the custom trigger
proactive.registerTrigger(customTrigger);
```

### Event Handling

```typescript
proactive.on("task:triggered", ({ taskId, trigger, context }) => {
  console.log(`Task ${taskId} triggered by ${trigger.type}`);
});

proactive.on("task:completed", ({ taskId, result, duration }) => {
  console.log(`Task ${taskId} completed in ${duration}ms`);
});

proactive.on("task:failed", ({ taskId, error }) => {
  console.error(`Task ${taskId} failed:`, error.message);
});

proactive.on("delivery:sent", ({ taskId, channel, to }) => {
  console.log(`Result delivered to ${channel}:${to}`);
});
```

## Webhook Configuration

### Setting Up Webhooks

```bash
# Get your webhook URL
moltbot webhooks url

# Configure webhook secret
moltbot webhooks secret --generate
```

### GitHub Webhook

```json5
{
  "trigger": {
    "type": "webhook",
    "path": "/github",
    "secret": "${GITHUB_WEBHOOK_SECRET}",
    "events": ["pull_request", "issues", "push"]
  }
}
```

### Slack Events

```json5
{
  "trigger": {
    "type": "webhook",
    "path": "/slack",
    "verificationToken": "${SLACK_VERIFICATION_TOKEN}",
    "events": ["message", "app_mention"]
  }
}
```

## Monitoring

### Task Status

```bash
# List all proactive tasks
moltbot proactive list

# Show task details
moltbot proactive info morning-briefing

# View task history
moltbot proactive history --task morning-briefing --last 10

# Manually trigger a task
moltbot proactive trigger morning-briefing
```

### Dashboard View

```
┌─────────────────────────────────────────────────────────────┐
│                 Proactive Tasks Dashboard                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Active Tasks: 5                                            │
│                                                             │
│  ┌───────────────────┬─────────┬──────────────┬──────────┐ │
│  │ Task              │ Trigger │ Next Run     │ Status   │ │
│  ├───────────────────┼─────────┼──────────────┼──────────┤ │
│  │ morning-briefing  │ cron    │ Tomorrow 9am │ ✓ Ready  │ │
│  │ pr-review         │ webhook │ On event     │ ✓ Ready  │ │
│  │ doc-sync          │ file    │ On change    │ ✓ Ready  │ │
│  │ daily-report      │ cron    │ Today 6pm    │ ✓ Ready  │ │
│  │ health-check      │ cron    │ In 8 mins    │ ▶ Running│ │
│  └───────────────────┴─────────┴──────────────┴──────────┘ │
│                                                             │
│  Recent Executions:                                         │
│  • health-check (5 min ago) - Success                       │
│  • pr-review (2 hours ago) - Success                        │
│  • morning-briefing (8 hours ago) - Success                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

### Retry Configuration

```json5
{
  "proactive": {
    "defaults": {
      "retries": 3,
      "retryDelay": 5000,
      "retryBackoff": "exponential"
    }
  }
}
```

### Error Notifications

```json5
{
  "proactive": {
    "errorHandling": {
      "notifyOnError": true,
      "notifyChannel": "slack",
      "notifyTo": "#ops-alerts",
      "errorTemplate": "Proactive task '{{task.id}}' failed: {{error.message}}"
    }
  }
}
```

## Troubleshooting

### Task Not Running

1. Verify task is enabled:
   ```bash
   moltbot proactive info <task-id>
   ```

2. Check cron expression:
   ```bash
   moltbot proactive next <task-id>
   ```

3. Review gateway logs:
   ```bash
   moltbot logs --filter proactive
   ```

### Webhook Not Triggering

1. Verify webhook URL:
   ```bash
   moltbot webhooks test <path>
   ```

2. Check webhook secret matches

3. Review incoming webhook logs

### Delivery Failing

1. Verify channel is connected:
   ```bash
   moltbot channels status
   ```

2. Check delivery target exists

3. Review delivery logs

## See Also

- [Cron Jobs](/automation/cron-jobs)
- [Webhooks](/automation/webhook)
- [Agent Orchestration](/advanced-tutorials/20-agent-orchestration)
