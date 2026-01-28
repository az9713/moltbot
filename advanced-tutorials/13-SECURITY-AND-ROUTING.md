# Tutorial 13 - Security and Routing

This tutorial covers Moltbot's security model and message routing system. You'll learn how to protect your bot from unauthorized access and control who can use it.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Completed [Tutorial 12 - Agent System](12-AGENT-SYSTEM.md)
- [ ] Moltbot running with at least one channel
- [ ] Basic understanding of DM policies

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS OVERVIEW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Gateway Authentication                                            │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • Token/password required for remote access                    │       │
│  │  • TLS encryption for transport                                 │       │
│  │  • Device identity verification                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│         │                                                                   │
│         ▼                                                                   │
│  Layer 2: Channel Access Control                                            │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • DM policies (pairing, allowlist, open, disabled)             │       │
│  │  • Group policies (allowlist, open, disabled)                   │       │
│  │  • Per-sender allowlists                                        │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│         │                                                                   │
│         ▼                                                                   │
│  Layer 3: Message Routing                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • Agent bindings                                               │       │
│  │  • Session scoping                                              │       │
│  │  • Identity linking                                             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│         │                                                                   │
│         ▼                                                                   │
│  Layer 4: Tool Permissions                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  • Tool profiles (default, elevated, minimal)                   │       │
│  │  • Per-sender tool policies                                     │       │
│  │  • Sandboxing for sub-agents                                    │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Gateway Authentication

### Token Authentication

```json5
{
  "gateway": {
    "auth": {
      "token": "${CLAWDBOT_GATEWAY_TOKEN}",
      "password": "${CLAWDBOT_GATEWAY_PASSWORD}"  // For Tailscale funnel
    }
  }
}
```

**When is auth required?**
- Remote access via WebSocket
- Non-loopback HTTP bindings
- Control UI access

**When is auth optional?**
- Localhost access (127.0.0.1)
- Same-device connections

### Generating Secure Tokens

```bash
# Generate a random token
openssl rand -hex 32

# Or use any secure password generator
```

### TLS Configuration

For remote deployments, use TLS:

```json5
{
  "gateway": {
    "remote": {
      "url": "wss://your-gateway.example.com:18789",
      "token": "${CLAWDBOT_GATEWAY_TOKEN}",
      "tlsFingerprint": "sha256:ab12cd34..."  // Pin certificate
    }
  }
}
```

### SSH Tunneling

For secure remote access without exposing ports:

```json5
{
  "gateway": {
    "remote": {
      "sshTarget": "user@gateway-host",
      "sshIdentity": "~/.ssh/id_ed25519"
    }
  }
}
```

---

## Layer 2: Channel Access Control

### DM Policies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DM POLICY COMPARISON                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  pairing (Recommended Default)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  User must complete /pair command before chatting                │       │
│  │  Best for: shared bot numbers, unknown users                     │       │
│  │  Workflow:                                                       │       │
│  │    1. User sends message → Bot ignores                           │       │
│  │    2. User sends /pair → Bot sends pairing code                  │       │
│  │    3. User confirms code → Bot adds to allowlist                 │       │
│  │    4. User can now chat                                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  allowlist (Simple Access Control)                                          │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Only pre-approved senders can chat                              │       │
│  │  Best for: personal use, known contacts                          │       │
│  │  Config:                                                         │       │
│  │    dmPolicy: "allowlist"                                         │       │
│  │    allowFrom: ["123456", "+15555550123"]                         │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  open (Dangerous!)                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Anyone can message                                              │       │
│  │  Requires: allowFrom: ["*"]                                      │       │
│  │  Risk: High API costs from spam/abuse                            │       │
│  │  Use only for: public demo bots with rate limiting               │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  disabled                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  DMs completely ignored                                          │       │
│  │  Best for: group-only bots                                       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DM Policy Configuration by Channel

```json5
{
  "channels": {
    "telegram": {
      "dmPolicy": "allowlist",
      "allowFrom": ["123456789", "987654321"]
    },

    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15555550123"],
      "selfChatMode": true  // Allow messaging yourself
    },

    "discord": {
      "dm": {
        "policy": "pairing",
        "allowFrom": []  // Populated via /pair
      }
    },

    "slack": {
      "dm": {
        "policy": "allowlist",
        "allowFrom": ["U12345678"]
      }
    },

    "signal": {
      "dmPolicy": "allowlist",
      "allowFrom": [
        "+14445556666",
        "uuid:123e4567-e89b-12d3-a456-426614174000"
      ]
    }
  }
}
```

---

## Group Access Control

### Group Policies

```json5
{
  "channels": {
    "telegram": {
      "groupPolicy": "allowlist",  // open | disabled | allowlist
      "groups": {
        "-1001234567890": {
          "allow": true,
          "requireMention": true
        },
        "*": {
          // Default for all other groups
          "requireMention": true
        }
      }
    },

    "discord": {
      "groupPolicy": "allowlist",
      "guilds": {
        "guild-id": {
          "channels": {
            "channel-id": { "allow": true },
            "*": { "allow": false }  // Block other channels
          }
        }
      }
    },

    "slack": {
      "groupPolicy": "allowlist",
      "channels": {
        "C12345678": { "allow": true },
        "C87654321": {
          "allow": true,
          "tools": {
            "profile": "minimal"  // Restrict tools in this channel
          }
        }
      }
    }
  }
}
```

### Mention Requirements

Control whether the bot requires @mention:

```json5
{
  "channels": {
    "telegram": {
      "groups": {
        "-1001234567890": {
          "allow": true,
          "requireMention": false  // Respond to all messages
        },
        "-1009876543210": {
          "allow": true,
          "requireMention": true   // Only respond when @mentioned
        }
      }
    }
  }
}
```

---

## Per-Sender Tool Policies

Limit tool access based on who's messaging:

```json5
{
  "channels": {
    "telegram": {
      "groups": {
        "-1001234567890": {
          "allow": true,

          // Default tools for this group
          "tools": {
            "profile": "default"
          },

          // Per-sender overrides
          "toolsBySender": {
            // Admin gets full access
            "123456789": {
              "profile": "elevated"
            },

            // Guest gets minimal access
            "987654321": {
              "profile": "minimal",
              "deny": ["bash", "write"]
            },

            // Wildcard for everyone else
            "*": {
              "profile": "default",
              "deny": ["bash"]
            }
          }
        }
      }
    }
  }
}
```

### Sender Matching

Moltbot matches senders by:

1. Sender ID (platform-specific)
2. E.164 phone number (for phone-based platforms)
3. Username (without @ prefix)
4. Display name

```json5
{
  "toolsBySender": {
    // Match by Telegram user ID
    "123456789": { "profile": "elevated" },

    // Match by phone number
    "+15555550123": { "profile": "elevated" },

    // Match by username
    "alice_bot": { "profile": "default" },

    // Wildcard (applied last)
    "*": { "profile": "minimal" }
  }
}
```

---

## Layer 3: Message Routing

### Routing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE ROUTING FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Incoming Message                              │       │
│  │  from: telegram/dm/123456                                        │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴─┐       │
│  │  1. Channel Access Check                                         │       │
│  │     Is sender allowed? (DM policy / group policy)                │       │
│  └────────────────────────────────────────────────────────────────┬─┘       │
│                                                                   │         │
│                         Allowed?                                  │         │
│                            │                                      │         │
│                   ┌────────┴────────┐                            │         │
│                   │                 │                            │         │
│                  Yes               No ─────────────────────────► DROP      │
│                   │                                              │         │
│  ┌────────────────┴─────────────────────────────────────────────┐│         │
│  │  2. Agent Resolution                                         ││         │
│  │     Check bindings → find matching agent                     ││         │
│  └────────────────────────────────────────────────────────────┬─┘│         │
│                                                               │  │         │
│  ┌────────────────────────────────────────────────────────────┴─┐│         │
│  │  3. Session Key Building                                     ││         │
│  │     agent:{agentId}:{scope}:{peer}                           ││         │
│  │     Apply identity links if configured                       ││         │
│  └────────────────────────────────────────────────────────────┬─┘│         │
│                                                               │  │         │
│  ┌────────────────────────────────────────────────────────────┴─┐│         │
│  │  4. Tool Policy Resolution                                   ││         │
│  │     Apply per-sender policies if configured                  ││         │
│  └────────────────────────────────────────────────────────────┬─┘│         │
│                                                               │  │         │
│  ┌────────────────────────────────────────────────────────────┴─┐│         │
│  │  5. Route to Agent Session                                   ││         │
│  │     Enqueue message for processing                           ││         │
│  └──────────────────────────────────────────────────────────────┘│         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Bindings

Route specific conversations to specific agents:

```json5
{
  "bindings": [
    // All Discord messages go to work agent
    {
      "agentId": "work",
      "match": {
        "channel": "discord",
        "accountId": "*"
      }
    },

    // This Telegram group goes to research agent
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

    // This specific DM goes to personal agent
    {
      "agentId": "personal",
      "match": {
        "channel": "whatsapp",
        "peer": {
          "kind": "dm",
          "id": "+15555550123"
        }
      }
    }
  ],

  "agents": {
    "list": [
      { "id": "main", "default": true },
      { "id": "work" },
      { "id": "research" },
      { "id": "personal" }
    ]
  }
}
```

---

## Layer 4: Tool Permissions

### Tool Profiles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOOL PROFILES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  minimal                                                                    │
│  ├── read (file reading)                                                    │
│  ├── glob (file search)                                                     │
│  ├── grep (content search)                                                  │
│  └── web_search (if enabled)                                                │
│                                                                             │
│  default                                                                    │
│  ├── (all minimal tools)                                                    │
│  ├── write (file writing)                                                   │
│  ├── edit (file editing)                                                    │
│  ├── web_fetch                                                              │
│  └── sessions_* (session tools)                                             │
│                                                                             │
│  elevated                                                                   │
│  ├── (all default tools)                                                    │
│  ├── bash (shell commands)                                                  │
│  └── browser tools                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tool Configuration

```json5
{
  "tools": {
    "profile": "default",
    "alsoAllow": ["custom_tool"],  // Add specific tools

    // Per-provider overrides
    "byProvider": {
      "openai": {
        "allow": ["read", "write", "web_search"],
        "deny": ["bash"]
      }
    },

    // Execution settings
    "exec": {
      "host": "docker",           // docker | native
      "security": "sandbox",
      "pathPrepend": ["/usr/local/bin"]
    }
  }
}
```

---

## Sandboxing

Isolate sub-agents for security:

```json5
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",        // off | non-main | all
        "workspaceAccess": "ro",   // none | ro | rw
        "sessionToolsVisibility": "spawned",

        "docker": {
          "image": "moltbot-sandbox:latest",
          "network": "none",       // No network access
          "memory": "512m",
          "cpus": "1",
          "readonlyRootfs": true
        },

        "prune": {
          "enabled": true,
          "maxAgeMinutes": 30
        }
      }
    }
  }
}
```

### Sandbox Levels

| Level | Main Session | Sub-Agents |
|-------|--------------|------------|
| `off` | Full access | Full access |
| `non-main` | Full access | Sandboxed |
| `all` | Sandboxed | Sandboxed |

---

## Cross-Context Messaging

Control how agents can message across channels:

```json5
{
  "tools": {
    "message": {
      "crossContext": {
        // Allow messaging within same provider (e.g., Telegram→Telegram)
        "allowWithinProvider": true,

        // Allow messaging across providers (e.g., Telegram→Discord)
        "allowAcrossProviders": false
      },

      // Mark cross-context messages
      "crossContext": {
        "marker": {
          "enabled": true,
          "prefix": "[From {channel}] ",
          "suffix": ""
        }
      },

      // Enable broadcast action
      "broadcast": {
        "enabled": true
      }
    }
  }
}
```

---

## Pairing Workflow

For channels using `pairing` policy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAIRING WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User sends message                                                      │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │  User: Hello!                                                │        │
│     │  Bot: (silent - message ignored)                             │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  2. User sends /pair command                                                │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │  User: /pair                                                 │        │
│     │  Bot: To complete pairing, reply with: PAIR-ABC123           │        │
│     │       (Code expires in 5 minutes)                            │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  3. User confirms code                                                      │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │  User: PAIR-ABC123                                           │        │
│     │  Bot: ✓ Pairing complete! You can now chat with me.         │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  4. User is added to allowlist (persisted in config)                        │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │  channels.telegram.allowFrom: ["123456789"]                  │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  5. User can now chat normally                                              │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │  User: Hello!                                                │        │
│     │  Bot: Hello! How can I help you today?                       │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Best Practices

### 1. Use Strong Gateway Tokens

```bash
# Generate strong tokens
export CLAWDBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

### 2. Never Use Open DM Policy in Production

```json5
// DON'T DO THIS in production
{
  "channels": {
    "telegram": {
      "dmPolicy": "open",
      "allowFrom": ["*"]  // Anyone can drain your API budget
    }
  }
}
```

### 3. Use Allowlist for Known Contacts

```json5
{
  "channels": {
    "telegram": {
      "dmPolicy": "allowlist",
      "allowFrom": [
        "123456789",  // Your user ID
        "987654321"   // Trusted friend
      ]
    }
  }
}
```

### 4. Restrict Tool Access in Groups

```json5
{
  "channels": {
    "telegram": {
      "groups": {
        "-1001234567890": {
          "allow": true,
          "tools": {
            "profile": "minimal",  // Read-only in groups
            "deny": ["bash", "write", "edit"]
          }
        }
      }
    }
  }
}
```

### 5. Enable Sandboxing for Sub-Agents

```json5
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "workspaceAccess": "ro"
      }
    }
  }
}
```

### 6. Use Environment Variables for Secrets

```json5
// Good
{
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}"
    }
  }
}

// Bad - secrets in config file
{
  "channels": {
    "telegram": {
      "botToken": "123456:ABC-DEF..."  // Never do this!
    }
  }
}
```

### 7. Limit Cross-Context Messaging

```json5
{
  "tools": {
    "message": {
      "crossContext": {
        "allowWithinProvider": true,
        "allowAcrossProviders": false  // Prevent cross-platform leaks
      }
    }
  }
}
```

---

## Troubleshooting Access Issues

### "Message ignored"

Check:
1. Is sender in allowFrom list?
2. Is dmPolicy set correctly?
3. For groups: is the group in the groups allowlist?

```bash
# Debug with logs
moltbot logs --follow --filter routing
```

### "Tool not available"

Check:
1. Tool profile setting
2. Per-sender tool policies
3. Sandbox restrictions

### "Agent not found"

Check:
1. Agent is defined in agents.list
2. Binding matches correctly
3. Agent ID is spelled correctly

---

## Summary

You've learned:

1. ✅ Four layers of security
2. ✅ Gateway authentication
3. ✅ DM and group policies
4. ✅ Per-sender tool policies
5. ✅ Message routing flow
6. ✅ Agent bindings
7. ✅ Tool profiles and permissions
8. ✅ Sandboxing configuration
9. ✅ Cross-context messaging controls
10. ✅ Pairing workflow
11. ✅ Security best practices

---

**Next Tutorial:** [14 - Plugin Development](14-PLUGIN-DEVELOPMENT.md) - Creating custom plugins
