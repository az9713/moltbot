# Tutorial 15 - Power User Features

This tutorial covers advanced features for experienced Moltbot users. You'll learn about CLI tricks, debugging techniques, and optimization strategies.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Completed tutorials 00-14
- [ ] Moltbot running in production
- [ ] Comfort with command-line tools
- [ ] Understanding of the configuration system

---

## CLI Power Commands

### Gateway Management

```bash
# Start gateway with verbose logging
moltbot gateway run --log-level debug

# Start with specific config
CLAWDBOT_CONFIG_PATH=~/custom-config.json moltbot gateway run

# Start in foreground (useful for systemd)
moltbot gateway run --foreground

# Check gateway status
moltbot gateway status

# Stop gateway
moltbot gateway stop

# Restart gateway (graceful)
moltbot gateway restart
```

### Channel Management

```bash
# List all channels and their status
moltbot channels list

# Login to a specific channel
moltbot channels login whatsapp
moltbot channels login telegram

# Check channel health
moltbot channels status telegram

# Disconnect a channel
moltbot channels disconnect whatsapp
```

### Session Management

```bash
# List active sessions
moltbot sessions list

# View session details
moltbot sessions show agent:main:main

# Reset a session (clear history)
moltbot sessions reset agent:main:main

# Export session transcript
moltbot sessions export agent:main:main > transcript.json
```

### Configuration

```bash
# View current config (sanitized)
moltbot config show

# Get specific config value
moltbot config get channels.telegram.enabled

# Set config value
moltbot config set channels.telegram.dmPolicy allowlist

# Validate config file
moltbot config validate

# Backup config
moltbot config backup

# Open config in editor
moltbot config edit
```

---

## Debugging Techniques

### Log Filtering

```bash
# Follow logs in real-time
moltbot logs --follow

# Filter by component
moltbot logs --follow --filter telegram
moltbot logs --follow --filter routing
moltbot logs --follow --filter agent

# Filter by log level
moltbot logs --follow --level debug
moltbot logs --follow --level error

# Combine filters
moltbot logs --follow --filter telegram --level debug
```

### Diagnostic Flags

Enable targeted diagnostics in config:

```json5
{
  "diagnostics": {
    "enabled": true,
    "flags": [
      "telegram.http",       // Telegram API calls
      "routing.*",           // All routing decisions
      "agent.tools",         // Tool executions
      "session.*",           // Session management
      "*"                    // Everything (very verbose!)
    ]
  }
}
```

### Cache Tracing

Track prompt caching behavior:

```json5
{
  "diagnostics": {
    "cacheTrace": {
      "enabled": true,
      "filePath": "~/.clawdbot/logs/cache-trace.jsonl",
      "includeMessages": true,
      "includePrompt": true,
      "includeSystem": false
    }
  }
}
```

Analyze traces:
```bash
# View recent cache traces
tail -100 ~/.clawdbot/logs/cache-trace.jsonl | jq .

# Count cache hits
cat ~/.clawdbot/logs/cache-trace.jsonl | jq '.cacheHit' | sort | uniq -c
```

### OpenTelemetry Integration

```json5
{
  "diagnostics": {
    "otel": {
      "enabled": true,
      "endpoint": "https://otel.example.com:4317",
      "protocol": "grpc",
      "serviceName": "moltbot",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.1,
      "flushIntervalMs": 5000
    }
  }
}
```

---

## Performance Optimization

### Context Pruning

Reduce token usage with intelligent pruning:

```json5
{
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "15m",                    // Remove after 15 minutes
        "keepLastAssistants": 3,         // Always keep last 3 responses
        "softTrimRatio": 0.7,            // Soft trim at 70% context
        "hardClearRatio": 0.9,           // Hard clear at 90% context
        "minPrunableToolChars": 1000,    // Min chars to prune

        "tools": {
          "allow": ["read", "bash"],     // Prune output from these tools
          "deny": ["search"]             // Never prune search results
        },

        "softTrim": {
          "maxChars": 5000,              // Max chars to keep
          "headChars": 500,              // Keep first N chars
          "tailChars": 500               // Keep last N chars
        },

        "hardClear": {
          "enabled": true,
          "placeholder": "[Content cleared for space]"
        }
      }
    }
  }
}
```

### Compaction Settings

Control automatic summarization:

```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "default",               // default | safeguard
        "reserveTokensFloor": 8000,      // Minimum reserve
        "maxHistoryShare": 0.5,          // Max context for history

        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 20000,
          "prompt": "Save important context to MEMORY.md",
          "systemPrompt": "Focus on key facts and decisions"
        }
      }
    }
  }
}
```

### Model Fallback Chain

Optimize model selection:

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-20250514",
        "fallbacks": [
          "anthropic/claude-sonnet-4-20250514",
          "openai/gpt-4o",
          "anthropic/claude-haiku-3-20240307"  // Fast fallback
        ]
      }
    }
  },

  "auth": {
    "profiles": {
      "anthropic-1": { "provider": "anthropic", "mode": "api-key" },
      "anthropic-2": { "provider": "anthropic", "mode": "api-key" },
      "openai-1": { "provider": "openai", "mode": "api-key" }
    },
    "order": {
      "anthropic": ["anthropic-1", "anthropic-2"],
      "openai": ["openai-1"]
    },
    "cooldowns": {
      "billingBackoffHours": 2,
      "billingMaxHours": 12
    }
  }
}
```

### Message Debouncing

Batch rapid messages:

```json5
{
  "messages": {
    "inbound": {
      "debounceMs": 2000,            // Wait 2s for more messages
      "byChannel": {
        "whatsapp": 3000,            // WhatsApp needs more time
        "telegram": 1500,
        "discord": 1000
      }
    }
  }
}
```

---

## Advanced Agent Configuration

### Per-Sender Custom Agents

Route specific users to specialized agents:

```json5
{
  "bindings": [
    {
      "agentId": "vip-agent",
      "match": {
        "channel": "telegram",
        "peer": { "kind": "dm", "id": "123456789" }
      }
    },
    {
      "agentId": "work-agent",
      "match": {
        "channel": "slack",
        "teamId": "T12345678"
      }
    }
  ],

  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "model": "anthropic/claude-sonnet-4-20250514"
      },
      {
        "id": "vip-agent",
        "model": {
          "primary": "anthropic/claude-opus-4-20250514"
        },
        "tools": { "profile": "elevated" }
      },
      {
        "id": "work-agent",
        "workspace": "~/work",
        "tools": {
          "profile": "default",
          "deny": ["browser"]
        }
      }
    ]
  }
}
```

### Identity Linking

Cross-channel identity for consistent sessions:

```json5
{
  "session": {
    "dmScope": "per-peer",
    "identityLinks": {
      "alice": [
        "telegram:123456",
        "whatsapp:+15555550123",
        "discord:456789012345678",
        "slack:U12345678"
      ],
      "bob": [
        "telegram:654321",
        "signal:+14445556666"
      ],
      "team-lead": [
        "slack:U87654321",
        "msteams:user@company.com"
      ]
    }
  }
}
```

### Heartbeat for Proactive Tasks

```json5
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "1h",
        "activeHours": {
          "start": "08:00",
          "end": "22:00",
          "timezone": "America/New_York"
        },
        "model": "anthropic/claude-haiku-3-20240307",
        "target": "telegram",
        "to": "123456789",
        "prompt": `Read HEARTBEAT.md and execute pending tasks.
                   If no tasks, reply with HEARTBEAT_OK.`,
        "ackMaxChars": 30,
        "includeReasoning": false
      }
    }
  }
}
```

---

## Multi-Account Setups

### Multiple Accounts Per Channel

```json5
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN_MAIN}",

      "accounts": {
        "personal": {
          "enabled": true,
          "botToken": "${TELEGRAM_BOT_TOKEN_PERSONAL}",
          "dmPolicy": "allowlist",
          "allowFrom": ["123456789"]
        },
        "work": {
          "enabled": true,
          "botToken": "${TELEGRAM_BOT_TOKEN_WORK}",
          "dmPolicy": "pairing"
        }
      }
    },

    "whatsapp": {
      "enabled": true,

      "accounts": {
        "default": {
          "enabled": true,
          "dmPolicy": "allowlist",
          "selfChatMode": true
        },
        "business": {
          "enabled": true,
          "dmPolicy": "pairing",
          "selfChatMode": false
        }
      }
    }
  }
}
```

### Account-Specific Agent Bindings

```json5
{
  "bindings": [
    {
      "agentId": "personal",
      "match": {
        "channel": "telegram",
        "accountId": "personal"
      }
    },
    {
      "agentId": "work",
      "match": {
        "channel": "telegram",
        "accountId": "work"
      }
    }
  ]
}
```

---

## Skills and Commands

### Custom Slash Commands

```json5
{
  "commands": {
    "native": true,                // Register with channels
    "nativeSkills": true,          // Register skill commands
    "text": true,                  // Parse /commands in text

    // Allow dangerous commands (careful!)
    "bash": false,
    "config": false,
    "debug": false,
    "restart": false
  },

  "channels": {
    "telegram": {
      "customCommands": [
        { "command": "status", "description": "Show system status" },
        { "command": "help", "description": "Show help message" },
        { "command": "clear", "description": "Clear conversation" }
      ]
    }
  }
}
```

### Skills Configuration

```json5
{
  "skills": {
    "load": {
      "watch": true,               // Hot reload skills
      "watchDebounceMs": 1000
    }
  }
}
```

---

## Remote Gateway Access

### SSH Tunnel Setup

```bash
# On remote server, start gateway
moltbot gateway run

# On local machine, connect via SSH
ssh -L 18789:localhost:18789 user@server

# Configure remote connection
moltbot config set gateway.remote.sshTarget "user@server"
moltbot config set gateway.remote.sshIdentity "~/.ssh/id_ed25519"
```

### Tailscale Integration

```json5
{
  "gateway": {
    "auth": {
      "token": "${CLAWDBOT_GATEWAY_TOKEN}",
      "password": "${CLAWDBOT_GATEWAY_PASSWORD}"  // For funnel
    }
  }
}
```

```bash
# Expose via Tailscale serve
tailscale serve --bg localhost:18789

# Or via funnel (public)
tailscale funnel --bg localhost:18789
```

### TLS Certificate Pinning

```json5
{
  "gateway": {
    "remote": {
      "url": "wss://gateway.example.com:18789",
      "tlsFingerprint": "sha256:ab12cd34ef56..."
    }
  }
}
```

---

## Automation and Cron

### Scheduled Tasks

```json5
{
  "cron": {
    "enabled": true,
    "jobs": [
      {
        "id": "daily-summary",
        "schedule": "0 9 * * *",        // 9 AM daily
        "action": {
          "type": "heartbeat",
          "agent": "main",
          "prompt": "Generate daily summary"
        }
      },
      {
        "id": "hourly-check",
        "schedule": "0 * * * *",        // Every hour
        "action": {
          "type": "heartbeat",
          "agent": "monitor",
          "prompt": "Check system health"
        }
      }
    ]
  }
}
```

### Hooks

React to system events:

```json5
{
  "hooks": {
    "onSessionStart": [
      {
        "command": "notify-send",
        "args": ["Moltbot", "New session started"]
      }
    ],
    "onMessage": [
      {
        "command": "/path/to/script.sh",
        "args": ["${channel}", "${sender}"]
      }
    ]
  }
}
```

---

## Browser Automation

### Browser Configuration

```json5
{
  "browser": {
    "evaluateEnabled": true,
    "snapshotDefaults": {
      "mode": "a11y"                 // a11y | dom | full
    },
    "remoteCdpTimeoutMs": 30000,
    "remoteCdpHandshakeTimeoutMs": 10000
  },

  "nodeHost": {
    "browserProxy": {
      "enabled": true,
      "allowProfiles": ["default", "work"]
    }
  }
}
```

### Node Browser Routing

```json5
{
  "gateway": {
    "nodes": {
      "browser": {
        "mode": "auto",              // auto | manual | off
        "node": "browser-node-1"     // Pin to specific node
      },
      "allowCommands": ["screenshot", "evaluate"],
      "denyCommands": ["dangerous-cmd"]
    }
  }
}
```

---

## Backup and Recovery

### Config Backup

```bash
# Manual backup
cp ~/.clawdbot/config.json ~/.clawdbot/config.backup.json

# Automatic backups are kept
ls ~/.clawdbot/config.json.bak*
# config.json.bak
# config.json.bak.1
# config.json.bak.2
# config.json.bak.3
# config.json.bak.4
```

### Session Backup

```bash
# Export all sessions
moltbot sessions export --all > sessions-backup.jsonl

# Export specific session
moltbot sessions export agent:main:main > main-session.json
```

### Full Backup Script

```bash
#!/bin/bash
BACKUP_DIR=~/moltbot-backups/$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"

# Config
cp ~/.clawdbot/config.json "$BACKUP_DIR/"

# Sessions
cp -r ~/.clawdbot/sessions "$BACKUP_DIR/"

# Memory indices
cp -r ~/.clawdbot/memory "$BACKUP_DIR/"

# Compress
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup created: $BACKUP_DIR.tar.gz"
```

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `CLAWDBOT_CONFIG_PATH` | Custom config file path |
| `CLAWDBOT_STATE_DIR` | State directory (default: ~/.clawdbot) |
| `CLAWDBOT_LOG_LEVEL` | Log level (debug/info/warn/error) |
| `CLAWDBOT_GATEWAY_TOKEN` | Gateway authentication token |
| `CLAWDBOT_GATEWAY_PASSWORD` | Gateway password (for Tailscale) |
| `CLAWDBOT_CONFIG_CACHE_MS` | Config cache TTL |
| `CLAWDBOT_DISABLE_CONFIG_CACHE` | Disable config caching |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `TELEGRAM_BOT_TOKEN` | Default Telegram bot token |
| `DISCORD_BOT_TOKEN` | Default Discord bot token |
| `SLACK_BOT_TOKEN` | Default Slack bot token |
| `SLACK_APP_TOKEN` | Default Slack app token |

---

## Summary

You've learned:

1. ✅ CLI power commands
2. ✅ Debugging and log filtering
3. ✅ Cache tracing and OpenTelemetry
4. ✅ Performance optimization
5. ✅ Context pruning and compaction
6. ✅ Advanced agent configuration
7. ✅ Multi-account setups
8. ✅ Skills and commands
9. ✅ Remote gateway access
10. ✅ Automation and cron
11. ✅ Browser automation
12. ✅ Backup and recovery
13. ✅ Environment variables

---

**Next Tutorial:** [16 - Troubleshooting Guide](16-TROUBLESHOOTING-GUIDE.md) - Common issues and solutions
