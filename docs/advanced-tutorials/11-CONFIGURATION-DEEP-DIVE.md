# Tutorial 11 - Configuration Deep Dive

This tutorial provides a complete reference for Moltbot's configuration system. You'll learn how configuration files are loaded, validated, and applied at runtime.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Completed [Tutorial 00 - Moltbot Overview](00-INDEX.md)
- [ ] Moltbot installed and running
- [ ] Basic familiarity with JSON/JSON5 syntax

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION SYSTEM OVERVIEW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │  config.json   │───►│   JSON5 Parse  │───►│  Zod Validate  │             │
│  │  (on disk)     │    │                │    │                │             │
│  └────────────────┘    └────────────────┘    └───────┬────────┘             │
│                                                      │                      │
│                        ┌─────────────────────────────┴─────────────────┐    │
│                        │              Apply Defaults                   │    │
│                        │  • Session defaults                           │    │
│                        │  • Message defaults                           │    │
│                        │  • Agent defaults                             │    │
│                        │  • Model defaults                             │    │
│                        │  • Compaction defaults                        │    │
│                        └─────────────────────────────┬─────────────────┘    │
│                                                      ▼                      │
│                                              ┌────────────────┐             │
│                                              │ MoltbotConfig  │             │
│                                              │   (runtime)    │             │
│                                              └────────────────┘             │
│                                                                             │
│  Location: ~/.clawdbot/config.json                                         │
│  Format: JSON5 (JSON with comments + trailing commas)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration File Location

Moltbot looks for configuration in these locations (in order):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIG FILE SEARCH ORDER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. $CLAWDBOT_CONFIG_PATH     (env var override)                            │
│  2. ~/.clawdbot/config.json   (default location)                            │
│  3. (empty config)            (if no file found)                            │
│                                                                             │
│  State directory: ~/.clawdbot/                                              │
│  Override via: $CLAWDBOT_STATE_DIR                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAWDBOT_CONFIG_PATH` | Override config file path |
| `CLAWDBOT_STATE_DIR` | Override state directory (default: `~/.clawdbot`) |
| `CLAWDBOT_CONFIG_CACHE_MS` | Config cache TTL in ms (default: 200) |
| `CLAWDBOT_DISABLE_CONFIG_CACHE` | Disable config caching |

---

## JSON5 Format

Moltbot uses JSON5, which extends JSON with:

```json5
{
  // Comments are allowed
  "key": "value",

  // Trailing commas are OK
  "channels": {
    "telegram": {
      "enabled": true,
    },
  },

  // Unquoted keys work
  unquotedKey: "value",

  // Multi-line strings
  "prompt": `This is a
    multi-line string`,
}
```

---

## Configuration Loading Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION LOADING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Read File                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Parse JSON5                                                        │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Resolve $include Directives                                        │
│         │  (merge external config files)                                    │
│         ▼                                                                   │
│  Step 4: Apply config.env to process.env                                    │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Resolve ${VAR} Environment Variable References                     │
│         │                                                                   │
│         ▼                                                                   │
│  Step 6: Validate Against Zod Schema                                        │
│         │                                                                   │
│         ▼                                                                   │
│  Step 7: Apply Default Values                                               │
│         │  • applyMessageDefaults()                                         │
│         │  • applyLoggingDefaults()                                         │
│         │  • applySessionDefaults()                                         │
│         │  • applyAgentDefaults()                                           │
│         │  • applyContextPruningDefaults()                                  │
│         │  • applyCompactionDefaults()                                      │
│         │  • applyModelDefaults()                                           │
│         ▼                                                                   │
│  Step 8: Normalize Paths                                                    │
│         │  (expand ~ and relative paths)                                    │
│         ▼                                                                   │
│  Step 9: Return MoltbotConfig                                               │
│                                                                             │
│  Source: src/config/io.ts                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Including External Config Files

Split your config into multiple files using `$include`:

```json5
{
  // Main config.json
  "$include": ["./channels.json", "./agents.json"],

  "gateway": {
    "auth": {
      "token": "${CLAWDBOT_GATEWAY_TOKEN}"
    }
  }
}
```

```json5
// channels.json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}"
    }
  }
}
```

```json5
// agents.json
{
  "agents": {
    "list": [
      { "id": "main", "workspace": "~/clawd" }
    ]
  }
}
```

Include resolution:
- Paths are relative to the including file
- Arrays merge (later values override earlier)
- Objects deep merge
- Circular includes are detected and error

---

## Environment Variable Substitution

Reference environment variables with `${VAR}` syntax:

```json5
{
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}"
    },
    "discord": {
      "token": "${DISCORD_BOT_TOKEN}"
    }
  },

  "gateway": {
    "auth": {
      "token": "${CLAWDBOT_GATEWAY_TOKEN}"
    }
  }
}
```

### Config-Defined Environment Variables

You can define environment variables within config:

```json5
{
  "env": {
    "CUSTOM_VAR": "my-value",
    "API_KEY": "secret123"
  },

  // Now use them
  "tools": {
    "web": {
      "search": {
        "apiKey": "${API_KEY}"
      }
    }
  }
}
```

The `env` block is applied to `process.env` before substitution.

---

## Configuration Schema

The complete schema is validated using Zod. Here's the top-level structure:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TOP-LEVEL CONFIG STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MoltbotConfig {                                                            │
│    meta?: { lastTouchedVersion, lastTouchedAt }                             │
│    env?: { shellEnv, ... }                                                  │
│    update?: { channel, checkOnStart }                                       │
│    diagnostics?: { enabled, flags, otel, cacheTrace }                       │
│    gateway?: { auth, http, controlUi, reload, nodes, remote }               │
│    nodeHost?: { browserProxy }                                              │
│    agents?: { defaults, list }                                              │
│    bindings?: AgentBinding[]                                                │
│    tools?: { media, links, web, exec, message, ... }                        │
│    auth?: { profiles, order, cooldowns }                                    │
│    commands?: { native, text, bash, config, debug }                         │
│    session?: { dmScope, identityLinks, agentToAgent }                       │
│    messages?: { ackReaction, ackReactionScope, inbound }                    │
│    ui?: { seamColor, assistant }                                            │
│    browser?: { evaluateEnabled, snapshotDefaults }                          │
│    talk?: { apiKey }                                                        │
│    channels?: { telegram, whatsapp, discord, slack, signal, ... }           │
│    skills?: { load }                                                        │
│    plugins?: { enabled, allow, deny, load, slots, entries }                 │
│    discovery?: { mdns }                                                     │
│    cron?: { ... }                                                           │
│    hooks?: { ... }                                                          │
│  }                                                                          │
│                                                                             │
│  Source: src/config/zod-schema.ts                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Gateway Configuration

```json5
{
  "gateway": {
    // Authentication
    "auth": {
      "token": "your-gateway-token",   // Required for remote access
      "password": "your-password"       // Required for Tailscale funnel
    },

    // HTTP server settings
    "http": {
      "port": 18789,                    // Default port
      "host": "127.0.0.1",              // Bind address
      "endpoints": {
        "chatCompletions": {
          "enabled": false              // OpenAI-compatible endpoint
        }
      }
    },

    // Control UI
    "controlUi": {
      "basePath": "/moltbot",           // URL prefix
      "allowInsecureAuth": false        // Don't allow HTTP auth
    },

    // Hot reload
    "reload": {
      "mode": "hybrid",                 // hybrid | full | off
      "debounceMs": 500                 // Wait before reloading
    },

    // Node routing
    "nodes": {
      "browser": {
        "mode": "auto"                  // auto | manual | off
      },
      "allowCommands": [],              // Extra allowed commands
      "denyCommands": []                // Blocked commands
    },

    // Remote gateway connection
    "remote": {
      "url": "ws://gateway-host:18789",
      "token": "${CLAWDBOT_GATEWAY_TOKEN}",
      "sshTarget": "user@host",         // SSH tunnel
      "sshIdentity": "~/.ssh/id_rsa"
    }
  }
}
```

---

## Agents Configuration

```json5
{
  "agents": {
    // Defaults applied to all agents
    "defaults": {
      "workspace": "~/clawd",
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o"]
      },
      "imageModel": {
        "primary": "anthropic/claude-sonnet-4-20250514"
      },

      // Human-like response delays
      "humanDelay": {
        "mode": "natural",              // off | natural | custom
        "minMs": 800,
        "maxMs": 2500
      },

      // Thinking mode
      "thinkingDefault": "off",         // off | minimal | low | medium | high

      // Block streaming
      "blockStreamingDefault": "off",
      "blockStreamingChunk": {
        "minChars": 200,
        "maxChars": 800,
        "breakPreference": "paragraph"
      },

      // Heartbeat (periodic background runs)
      "heartbeat": {
        "every": "30m",
        "target": "last",               // Deliver to last-used channel
        "prompt": "Check HEARTBEAT.md and execute tasks"
      },

      // Concurrency
      "maxConcurrent": 1,               // Sequential by default

      // Sub-agents
      "subagents": {
        "maxConcurrent": 1,
        "archiveAfterMinutes": 60
      },

      // Context pruning
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "15m",
        "keepLastAssistants": 3
      },

      // Memory search
      "memorySearch": {
        "enabled": true,
        "provider": "openai",           // openai | gemini | local
        "sources": ["memory"]           // Add "sessions" for transcript search
      }
    },

    // Agent definitions
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Main Assistant",
        "workspace": "~/clawd",

        // Per-agent model override
        "model": {
          "primary": "anthropic/claude-opus-4-20250514",
          "fallbacks": []
        },

        // Identity
        "identity": {
          "name": "Claude",
          "avatar": "avatars/claude.png"
        },

        // Sandbox settings
        "sandbox": {
          "mode": "non-main",           // off | non-main | all
          "workspaceAccess": "rw"
        },

        // Sub-agent spawning permissions
        "subagents": {
          "allowAgents": ["*"]          // Allow spawning any agent
        }
      },
      {
        "id": "research",
        "name": "Research Agent",
        "workspace": "~/clawd-research",
        "model": "openai/gpt-4o"        // Shorthand for primary-only
      }
    ]
  }
}
```

---

## Channel Configuration

Each channel has its own configuration section:

```json5
{
  "channels": {
    // Telegram
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "allowlist",          // pairing | allowlist | open | disabled
      "allowFrom": ["123456789"],
      "groupPolicy": "allowlist",
      "groups": {
        "-1001234567890": { "allow": true }
      }
    },

    // WhatsApp
    "whatsapp": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["+15555550123"],
      "selfChatMode": true,             // Message yourself to chat
      "debounceMs": 1000
    },

    // Discord
    "discord": {
      "enabled": true,
      "token": "${DISCORD_BOT_TOKEN}",
      "dm": {
        "policy": "allowlist",
        "allowFrom": ["user-id-here"]
      },
      "groupPolicy": "allowlist",
      "guilds": {
        "guild-id": {
          "channels": {
            "channel-id": { "allow": true }
          }
        }
      }
    },

    // Slack
    "slack": {
      "enabled": true,
      "appToken": "${SLACK_APP_TOKEN}",
      "botToken": "${SLACK_BOT_TOKEN}",
      "dm": {
        "policy": "allowlist",
        "allowFrom": ["U12345678"]
      },
      "groupPolicy": "allowlist",
      "channels": {
        "C12345678": { "allow": true }
      }
    },

    // Signal
    "signal": {
      "enabled": true,
      "account": "+15555550123",
      "dmPolicy": "allowlist",
      "allowFrom": ["+14445556666"]
    },

    // iMessage (macOS only)
    "imessage": {
      "enabled": true,
      "cliPath": "imsg",
      "dmPolicy": "allowlist",
      "allowFrom": ["+15555550123"]
    }
  }
}
```

---

## DM Policy Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DM POLICY OPTIONS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  pairing    │ User must complete pairing via /pair command first            │
│             │ Most secure for shared bot numbers                            │
│             │                                                               │
│  allowlist  │ Only senders in allowFrom[] can message                       │
│             │ Good for personal use with known contacts                     │
│             │                                                               │
│  open       │ Anyone can message (requires allowFrom=["*"])                 │
│             │ Use with caution - high API cost risk                         │
│             │                                                               │
│  disabled   │ DMs are completely ignored                                    │
│             │ For group-only bots                                           │
│                                                                             │
│  Default: pairing                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tools Configuration

```json5
{
  "tools": {
    // Tool profiles
    "profile": "default",               // default | elevated | minimal
    "alsoAllow": ["custom_tool"],       // Additional allowed tools

    // Per-provider tool policies
    "byProvider": {
      "openai": {
        "allow": ["read", "write", "bash"]
      }
    },

    // Media understanding
    "media": {
      "concurrency": 2,
      "image": {
        "enabled": true,
        "maxBytes": 10485760,           // 10MB
        "timeoutSeconds": 30
      },
      "audio": {
        "enabled": true,
        "language": "en"
      }
    },

    // Web tools
    "web": {
      "search": {
        "enabled": true,
        "provider": "brave",            // brave | perplexity
        "apiKey": "${BRAVE_API_KEY}",
        "maxResults": 10,
        "cacheTtlMinutes": 60
      },
      "fetch": {
        "enabled": true,
        "maxChars": 100000,
        "timeoutSeconds": 30
      }
    },

    // Exec settings
    "exec": {
      "host": "docker",                 // docker | native
      "security": "sandbox",
      "pathPrepend": ["/usr/local/bin"],
      "notifyOnExit": true
    },

    // Cross-context messaging
    "message": {
      "crossContext": {
        "allowWithinProvider": true,
        "allowAcrossProviders": false
      },
      "broadcast": {
        "enabled": true
      }
    }
  }
}
```

---

## Authentication Profiles

Manage multiple API keys with failover:

```json5
{
  "auth": {
    "profiles": {
      "anthropic-main": {
        "provider": "anthropic",
        "mode": "api-key"
      },
      "anthropic-backup": {
        "provider": "anthropic",
        "mode": "api-key"
      },
      "openai-main": {
        "provider": "openai",
        "mode": "api-key"
      }
    },

    // Failover order per provider
    "order": {
      "anthropic": ["anthropic-main", "anthropic-backup"],
      "openai": ["openai-main"]
    },

    // Cooldown settings
    "cooldowns": {
      "billingBackoffHours": 5,         // Wait after billing failure
      "billingMaxHours": 24,            // Max backoff cap
      "failureWindowHours": 24          // Failure tracking window
    }
  }
}
```

---

## Session Configuration

```json5
{
  "session": {
    // DM session scoping
    "dmScope": "main",                  // main | per-peer | per-channel-peer

    // Identity linking (for cross-channel session continuity)
    "identityLinks": {
      "alice": [
        "telegram:123456",
        "whatsapp:+15555550123"
      ]
    },

    // Agent-to-agent messaging
    "agentToAgent": {
      "maxPingPongTurns": 3
    }
  }
}
```

### DM Scope Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DM SCOPE OPTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  main             │ All DMs share the main session                          │
│                   │ Full conversation continuity                            │
│                   │ Session key: agent:main:main                            │
│                   │                                                         │
│  per-peer         │ Separate session per sender                             │
│                   │ Cross-channel continuity for same person                │
│                   │ Session key: agent:main:dm:alice                        │
│                   │                                                         │
│  per-channel-peer │ Separate session per channel + sender                   │
│                   │ Full isolation                                          │
│                   │ Session key: agent:main:telegram:dm:123456              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plugins Configuration

```json5
{
  "plugins": {
    "enabled": true,

    // Allowlist/denylist
    "allow": ["my-plugin"],             // Only load these
    "deny": ["unwanted-plugin"],        // Never load these

    // Additional load paths
    "load": {
      "paths": [
        "~/.clawdbot/extensions",
        "/opt/moltbot-plugins"
      ]
    },

    // Exclusive slot assignments
    "slots": {
      "memory": "mem0-memory"           // Which plugin owns memory slot
    },

    // Per-plugin settings
    "entries": {
      "my-plugin": {
        "enabled": true,
        "config": {
          "customSetting": "value"
        }
      }
    },

    // Install records (managed by CLI)
    "installs": {
      "my-plugin": {
        "source": "npm",
        "spec": "moltbot-plugin-example@1.0.0",
        "installPath": "~/.clawdbot/extensions/moltbot-plugin-example"
      }
    }
  }
}
```

---

## Commands Configuration

```json5
{
  "commands": {
    // Register slash commands with channels
    "native": true,
    "nativeSkills": true,

    // Allow text parsing of /commands
    "text": true,

    // Allow !command bash execution (dangerous!)
    "bash": false,
    "bashForegroundMs": 2000,

    // Allow /config command
    "config": false,

    // Allow /debug command
    "debug": false,

    // Allow /restart command
    "restart": false,

    // Access group enforcement
    "useAccessGroups": false
  }
}
```

---

## Hot Reload

Moltbot supports hot reloading config changes:

```json5
{
  "gateway": {
    "reload": {
      "mode": "hybrid",                 // hybrid | full | off
      "debounceMs": 500
    }
  }
}
```

### Reload Modes

| Mode | Description |
|------|-------------|
| `hybrid` | Reload most settings without restart; restart for major changes |
| `full` | Full gateway restart on any config change |
| `off` | Never auto-reload; require manual restart |

### What Reloads Without Restart

- Agent settings (model, delays, identity)
- Channel settings (tokens, allowlists)
- Tool settings (web search, media)
- Session settings (dmScope, identityLinks)

### What Requires Restart

- Gateway port/host changes
- Plugin load paths
- Major schema changes

---

## Configuration Backup

Moltbot automatically rotates config backups:

```
~/.clawdbot/
├── config.json           # Current config
├── config.json.bak       # Most recent backup
├── config.json.bak.1     # Second most recent
├── config.json.bak.2     # Third most recent
├── config.json.bak.3     # Fourth most recent
└── config.json.bak.4     # Fifth most recent (oldest kept)
```

Backups are created before each config write.

---

## Validation Errors

When config validation fails, you'll see errors like:

```
Invalid config at ~/.clawdbot/config.json:
- channels.telegram.dmPolicy: Expected 'pairing' | 'allowlist' | 'open' | 'disabled', received 'invalid'
- agents.list.0.model.primary: Required
```

Common fixes:

| Error | Solution |
|-------|----------|
| Unknown key | Check spelling, remove deprecated keys |
| Invalid enum | Use one of the allowed values |
| Required field | Add the missing field |
| Type mismatch | Check expected type (string, number, boolean) |

---

## Complete Example Configuration

```json5
{
  // Metadata (auto-managed)
  "meta": {
    "lastTouchedVersion": "0.7.0",
    "lastTouchedAt": "2025-01-27T12:00:00Z"
  },

  // Gateway settings
  "gateway": {
    "auth": {
      "token": "${CLAWDBOT_GATEWAY_TOKEN}"
    },
    "reload": {
      "mode": "hybrid"
    }
  },

  // Agents
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514"
      },
      "humanDelay": {
        "mode": "natural"
      }
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/clawd"
      }
    ]
  },

  // Channels
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "allowlist",
      "allowFrom": ["123456789"]
    }
  },

  // Tools
  "tools": {
    "web": {
      "search": {
        "enabled": true,
        "provider": "brave"
      }
    }
  },

  // Session
  "session": {
    "dmScope": "main"
  }
}
```

---

## Summary

You've learned:

1. ✅ Where config files are located
2. ✅ JSON5 format features
3. ✅ Config loading pipeline
4. ✅ $include for modular configs
5. ✅ Environment variable substitution
6. ✅ Gateway configuration
7. ✅ Agents configuration
8. ✅ Channel configuration
9. ✅ Tools configuration
10. ✅ Authentication profiles
11. ✅ Session configuration
12. ✅ Plugins configuration
13. ✅ Hot reload behavior
14. ✅ Backup rotation

---

**Next Tutorial:** [12 - Agent System](12-AGENT-SYSTEM.md) - Multi-agent architecture and session management
