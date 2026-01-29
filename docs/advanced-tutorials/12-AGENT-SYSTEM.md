# Tutorial 12 - Agent System

This tutorial explains Moltbot's multi-agent architecture. You'll learn how agents are defined, routed, and how sessions maintain conversation context.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Completed [Tutorial 11 - Configuration Deep Dive](11-CONFIGURATION-DEEP-DIVE.md)
- [ ] Moltbot installed with at least one AI provider configured
- [ ] Basic understanding of the gateway system

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGENT SYSTEM OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           Gateway                                    │    │
│  │                                                                      │    │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐                   │    │
│  │  │  Telegram  │   │  WhatsApp  │   │  Discord   │   ...             │    │
│  │  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘                   │    │
│  │        │                │                │                          │    │
│  │        └────────────────┼────────────────┘                          │    │
│  │                         ▼                                            │    │
│  │                 ┌───────────────┐                                    │    │
│  │                 │    Router     │                                    │    │
│  │                 │  (bindings)   │                                    │    │
│  │                 └───────┬───────┘                                    │    │
│  │                         │                                            │    │
│  │         ┌───────────────┼───────────────┐                           │    │
│  │         ▼               ▼               ▼                            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │    │
│  │  │ Agent:main │  │ Agent:work │  │Agent:hobby │  ...                │    │
│  │  └────────────┘  └────────────┘  └────────────┘                     │    │
│  │         │               │               │                            │    │
│  │         ▼               ▼               ▼                            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │    │
│  │  │  Sessions  │  │  Sessions  │  │  Sessions  │                     │    │
│  │  │ (per agent)│  │ (per agent)│  │ (per agent)│                     │    │
│  │  └────────────┘  └────────────┘  └────────────┘                     │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Key Concepts:                                                              │
│  • Agent = AI persona with specific config (model, workspace, identity)     │
│  • Session = Conversation context persisted per agent                       │
│  • Router = Maps incoming messages to the right agent                       │
│  • Binding = Rule for routing messages to specific agents                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What is an Agent?

An agent is a configured AI persona with:

| Component | Description |
|-----------|-------------|
| `id` | Unique identifier (e.g., "main", "work", "hobby") |
| `workspace` | File system directory for tools |
| `model` | Primary AI model + fallbacks |
| `identity` | Name, avatar, theme |
| `sandbox` | Isolation settings for sub-agents |
| `tools` | Tool permissions and configurations |

---

## Agent Configuration

### Single Agent (Default)

If no agents are defined, Moltbot uses a default "main" agent:

```json5
{
  "agents": {
    "defaults": {
      "workspace": "~/clawd",
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514"
      }
    }
    // No list = implicit single "main" agent
  }
}
```

### Multiple Agents

Define multiple agents with different configurations:

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514"
      }
    },

    "list": [
      {
        "id": "main",
        "default": true,             // Default agent for unmatched routes
        "name": "Claude",
        "workspace": "~/clawd",
        "identity": {
          "name": "Claude",
          "avatar": "avatars/claude.png"
        }
      },
      {
        "id": "work",
        "name": "Work Assistant",
        "workspace": "~/work-projects",
        "model": "openai/gpt-4o",    // Override model
        "identity": {
          "name": "Work Bot",
          "avatar": "avatars/work.png"
        }
      },
      {
        "id": "research",
        "name": "Research Agent",
        "workspace": "~/research",
        "model": {
          "primary": "anthropic/claude-opus-4-20250514",
          "fallbacks": ["anthropic/claude-sonnet-4-20250514"]
        }
      }
    ]
  }
}
```

---

## Agent Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGENT RESOLUTION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Incoming Message                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  1. Extract routing context:                                     │       │
│  │     • channel (telegram, discord, etc.)                          │       │
│  │     • accountId (for multi-account setups)                       │       │
│  │     • peer (dm/group/channel + id)                               │       │
│  │     • guildId (Discord server)                                   │       │
│  │     • teamId (Slack workspace)                                   │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│                                                                   ▼         │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  2. Check bindings (in order):                                   │       │
│  │     • binding.peer    → specific DM/group match                  │       │
│  │     • binding.guild   → Discord server match                     │       │
│  │     • binding.team    → Slack workspace match                    │       │
│  │     • binding.account → channel account match                    │       │
│  │     • binding.channel → channel-wide match                       │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│                         Match found?                              │         │
│                              │                                    │         │
│                    ┌─────────┴─────────┐                         │         │
│                    │                   │                         │         │
│                   Yes                  No                        │         │
│                    │                   │                         │         │
│                    ▼                   ▼                         │         │
│            ┌───────────────┐   ┌───────────────┐                │         │
│            │ Use binding's │   │ Use default   │                │         │
│            │    agentId    │   │    agent      │                │         │
│            └───────────────┘   └───────────────┘                │         │
│                    │                   │                         │         │
│                    └─────────┬─────────┘                         │         │
│                              ▼                                   │         │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  3. Build session key based on:                                  │       │
│  │     • agentId                                                    │       │
│  │     • dmScope (main | per-peer | per-channel-peer)               │       │
│  │     • identityLinks (cross-channel identity mapping)             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Source: src/routing/resolve-route.ts                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Bindings

Bindings route messages to specific agents:

```json5
{
  "bindings": [
    // Route this Discord server to work agent
    {
      "agentId": "work",
      "match": {
        "channel": "discord",
        "guildId": "123456789012345678"
      }
    },

    // Route this Slack workspace to work agent
    {
      "agentId": "work",
      "match": {
        "channel": "slack",
        "teamId": "T12345678"
      }
    },

    // Route specific Telegram group to research agent
    {
      "agentId": "research",
      "match": {
        "channel": "telegram",
        "peer": {
          "kind": "group",
          "id": "-1001234567890"
        }
      }
    },

    // Route specific DM to hobby agent
    {
      "agentId": "hobby",
      "match": {
        "channel": "telegram",
        "peer": {
          "kind": "dm",
          "id": "987654321"
        }
      }
    },

    // Route all Telegram messages from this account to main
    {
      "agentId": "main",
      "match": {
        "channel": "telegram",
        "accountId": "default"
      }
    },

    // Wildcard: route all messages from any account on a channel
    {
      "agentId": "main",
      "match": {
        "channel": "whatsapp",
        "accountId": "*"
      }
    }
  ]
}
```

### Binding Match Priority

1. **Peer match** (most specific) - exact DM/group/channel
2. **Guild match** - Discord server
3. **Team match** - Slack workspace
4. **Account match** - specific account on channel
5. **Channel match** - any message on channel (accountId: "*")
6. **Default agent** - fallback when nothing matches

---

## Sessions

Sessions maintain conversation context per agent.

### Session Keys

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SESSION KEY FORMAT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  agent:{agentId}:{rest}                                                     │
│                                                                             │
│  Examples:                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  agent:main:main                                                            │
│  └──┬──┘ └──┬─┘ └─┬─┘                                                       │
│     │      │     │                                                          │
│  prefix  agent  main session (dmScope=main)                                 │
│                                                                             │
│  agent:main:dm:alice                                                        │
│  └──┬──┘ └──┬─┘ └─┬─┘ └──┬──┘                                               │
│     │      │     │      │                                                   │
│  prefix  agent   dm   peer id (dmScope=per-peer)                            │
│                                                                             │
│  agent:main:telegram:dm:123456                                              │
│  └──┬──┘ └──┬─┘ └───┬──┘ └┬┘ └──┬──┘                                        │
│     │      │       │     │     │                                            │
│  prefix  agent  channel  dm   peer id (dmScope=per-channel-peer)            │
│                                                                             │
│  agent:main:telegram:group:-1001234567890                                   │
│  └──┬──┘ └──┬─┘ └───┬──┘ └──┬─┘ └───────┬───────┘                           │
│     │      │       │       │            │                                   │
│  prefix  agent  channel  group        group id                              │
│                                                                             │
│  agent:work:discord:channel:C12345678:thread:T98765                         │
│  └──┬──┘ └──┬┘ └──┬──┘ └──┬──┘ └───┬───┘ └──┬──┘ └──┬──┘                    │
│     │      │      │       │        │        │       │                       │
│  prefix  agent channel  type    channel  thread  thread id                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DM Scope Options

Control how DM sessions are scoped:

```json5
{
  "session": {
    "dmScope": "main"  // main | per-peer | per-channel-peer
  }
}
```

| Scope | Session Key | Behavior |
|-------|-------------|----------|
| `main` | `agent:main:main` | All DMs share one session |
| `per-peer` | `agent:main:dm:alice` | Separate per person (cross-channel) |
| `per-channel-peer` | `agent:main:telegram:dm:123` | Separate per channel+person |

### Identity Links

Link identities across channels for session continuity:

```json5
{
  "session": {
    "dmScope": "per-peer",
    "identityLinks": {
      "alice": [
        "telegram:123456",
        "whatsapp:+15555550123",
        "discord:456789012345678912"
      ],
      "bob": [
        "telegram:654321",
        "slack:U12345678"
      ]
    }
  }
}
```

With this config:
- Messages from Telegram user 123456 → session `agent:main:dm:alice`
- Messages from WhatsApp +15555550123 → session `agent:main:dm:alice`
- Same conversation context across channels!

---

## Sub-Agents

Agents can spawn sub-agents for delegated tasks:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUB-AGENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                      Main Session                                │       │
│  │                   agent:main:main                                │       │
│  │                                                                  │       │
│  │  User: Research the latest AI papers and summarize               │       │
│  │                         │                                        │       │
│  │                         ▼                                        │       │
│  │  Main Agent spawns sub-agent via sessions_spawn tool             │       │
│  │                         │                                        │       │
│  └─────────────────────────┼────────────────────────────────────────┘       │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Sub-Agent Session                             │       │
│  │           agent:main:subagent:abc123:research                    │       │
│  │                                                                  │       │
│  │  • Runs in sandboxed environment (optional)                      │       │
│  │  • Has own context window                                        │       │
│  │  • Can access limited set of tools                               │       │
│  │  • Reports results back to main session                          │       │
│  │                                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Configuration:                                                             │
│  {                                                                          │
│    "agents": {                                                              │
│      "defaults": {                                                          │
│        "subagents": {                                                       │
│          "maxConcurrent": 1,                                                │
│          "archiveAfterMinutes": 60,                                         │
│          "model": "anthropic/claude-haiku-3-20240307"                       │
│        }                                                                    │
│      },                                                                     │
│      "list": [                                                              │
│        {                                                                    │
│          "id": "main",                                                      │
│          "subagents": {                                                     │
│            "allowAgents": ["*"]  // Can spawn as any agent                  │
│          }                                                                  │
│        }                                                                    │
│      ]                                                                      │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sub-Agent Tools

Available session management tools:

| Tool | Description |
|------|-------------|
| `sessions_spawn` | Create new sub-agent session |
| `sessions_send` | Send message to another session |
| `sessions_status` | Check session status |
| `agents_list` | List available agents |

---

## Sandboxing

Control tool access for sub-agents:

```json5
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",          // off | non-main | all
        "workspaceAccess": "ro",     // none | ro | rw
        "sessionToolsVisibility": "spawned",  // spawned | all
        "scope": "session",          // session | agent | shared

        "docker": {
          "image": "moltbot-sandbox",
          "memory": "2g",
          "cpus": "2"
        },

        "browser": {
          "enabled": true,
          "profiles": ["sandbox"]
        },

        "prune": {
          "enabled": true,
          "maxAgeMinutes": 60
        }
      }
    },

    "list": [
      {
        "id": "main",
        "sandbox": {
          "mode": "off"              // Main agent not sandboxed
        }
      },
      {
        "id": "research",
        "sandbox": {
          "mode": "all",             // Always sandbox
          "workspaceAccess": "none"  // No workspace access
        }
      }
    ]
  }
}
```

### Sandbox Modes

| Mode | Description |
|------|-------------|
| `off` | No sandboxing, full access |
| `non-main` | Sandbox sub-agents but not main session |
| `all` | Sandbox all sessions including main |

### Workspace Access

| Access | Description |
|--------|-------------|
| `none` | No agent workspace mounted |
| `ro` | Read-only workspace access |
| `rw` | Read-write workspace access |

---

## Agent Workspace

Each agent has its own workspace directory:

```
~/clawd/                    # Default agent workspace
├── CLAUDE.md               # Instructions for the AI
├── BOOTSTRAP.md            # Auto-generated context
├── MEMORY.md               # Long-term memory
├── memory/                 # Additional memory files
│   ├── projects.md
│   └── preferences.md
├── HEARTBEAT.md            # Periodic task instructions
└── .clawdbot/              # Agent-specific state
    └── sessions/

~/clawd-work/               # Work agent workspace
├── CLAUDE.md
├── MEMORY.md
└── projects/
```

### Workspace Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WORKSPACE RESOLUTION ORDER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Per-agent workspace                                                     │
│     agents.list[].workspace                                                 │
│     Example: "~/clawd-work"                                                 │
│                                                                             │
│  2. Defaults workspace                                                      │
│     agents.defaults.workspace                                               │
│     Example: "~/clawd"                                                      │
│                                                                             │
│  3. Fallback pattern                                                        │
│     ~/clawd-{agentId}                                                       │
│     Example: ~/clawd-research                                               │
│                                                                             │
│  Source: src/agents/agent-scope.ts                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Memory Search

Agents can search their memory files:

```json5
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "openai",        // openai | gemini | local
        "sources": ["memory"],       // Add "sessions" for transcript search

        "remote": {
          "baseUrl": "https://api.openai.com/v1",
          "batch": {
            "concurrency": 2
          }
        },

        "store": {
          "vector": {
            "enabled": true
          }
        },

        "chunking": {
          "tokens": 512,
          "overlap": 64
        },

        "query": {
          "maxResults": 10,
          "minScore": 0.7,
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3
          }
        },

        "sync": {
          "onSessionStart": true,
          "onSearch": true,
          "watch": true
        }
      }
    }
  }
}
```

---

## Heartbeat

Periodic background runs for proactive agents:

```json5
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "30m",              // Run every 30 minutes
        "activeHours": {
          "start": "09:00",
          "end": "18:00",
          "timezone": "America/New_York"
        },
        "model": "anthropic/claude-haiku-3-20240307",
        "session": "main",
        "target": "last",            // Deliver to last-used channel
        "prompt": "Check HEARTBEAT.md and execute any pending tasks"
      }
    }
  }
}
```

The agent reads `HEARTBEAT.md` in its workspace and executes tasks on schedule.

---

## Concurrency Control

Limit concurrent agent runs:

```json5
{
  "agents": {
    "defaults": {
      // Main session concurrency
      "maxConcurrent": 1,            // Sequential (default)

      // Sub-agent concurrency
      "subagents": {
        "maxConcurrent": 2           // Allow 2 concurrent sub-agents
      }
    }
  }
}
```

### Concurrency Modes

- `maxConcurrent: 1` - Sequential processing, guaranteed order
- `maxConcurrent: N` - Parallel processing, up to N concurrent runs
- Queue modes (`steer`, `followup`, `collect`) control message batching

---

## Agent Tools

Per-agent tool configuration:

```json5
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "profile": "elevated",     // default | elevated | minimal
          "alsoAllow": ["custom_tool"],
          "byProvider": {
            "openai": {
              "deny": ["bash"]
            }
          }
        }
      },
      {
        "id": "readonly",
        "tools": {
          "profile": "minimal",      // Read-only tools
          "alsoAllow": ["web_search"]
        }
      }
    ]
  }
}
```

---

## Model Configuration

Per-agent model settings:

```json5
{
  "agents": {
    "list": [
      {
        "id": "main",
        "model": {
          "primary": "anthropic/claude-opus-4-20250514",
          "fallbacks": [
            "anthropic/claude-sonnet-4-20250514",
            "openai/gpt-4o"
          ]
        }
      },
      {
        "id": "quick",
        "model": "anthropic/claude-haiku-3-20240307"  // Shorthand
      }
    ]
  }
}
```

Model fallback chain:
1. Try primary model
2. On failure, try each fallback in order
3. Track failures per auth profile for future routing

---

## Human Delay

Natural typing delays for more human-like responses:

```json5
{
  "agents": {
    "defaults": {
      "humanDelay": {
        "mode": "natural",           // off | natural | custom
        "minMs": 800,                // Minimum delay
        "maxMs": 2500                // Maximum delay
      }
    }
  }
}
```

| Mode | Description |
|------|-------------|
| `off` | Send immediately |
| `natural` | Calculate delay based on message length |
| `custom` | Random delay between minMs and maxMs |

---

## Summary

You've learned:

1. ✅ What agents are and how they're configured
2. ✅ How routing maps messages to agents
3. ✅ Using bindings for advanced routing
4. ✅ Session keys and scoping
5. ✅ Identity links for cross-channel continuity
6. ✅ Sub-agent spawning and management
7. ✅ Sandboxing for security
8. ✅ Workspace structure
9. ✅ Memory search configuration
10. ✅ Heartbeat for proactive agents
11. ✅ Concurrency control
12. ✅ Per-agent tool and model configuration

---

**Next Tutorial:** [13 - Security and Routing](13-SECURITY-AND-ROUTING.md) - Access control and message routing
