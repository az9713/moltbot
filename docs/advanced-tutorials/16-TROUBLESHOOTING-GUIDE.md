# Tutorial 16 - Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues, error messages, and diagnostic procedures for Moltbot. Whether you're facing connection problems, configuration errors, or performance issues, this guide will help you identify and resolve them.

---

## Prerequisites

Before troubleshooting:

- [ ] Know your Moltbot version (`moltbot --version`)
- [ ] Have access to logs (`moltbot logs --follow`)
- [ ] Know your configuration location (`~/.clawdbot/config.json`)
- [ ] Have basic command-line familiarity

---

## Quick Diagnostic Checklist

When something goes wrong, run through this checklist:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIAGNOSTIC CHECKLIST                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Is the gateway running?                                      │
│     └─> moltbot gateway status                                   │
│                                                                  │
│  2. Are channels connected?                                      │
│     └─> moltbot channels status                                  │
│                                                                  │
│  3. Is the config valid?                                         │
│     └─> moltbot config validate                                  │
│                                                                  │
│  4. What do the logs say?                                        │
│     └─> moltbot logs --follow --level error                      │
│                                                                  │
│  5. Can you reach the AI provider?                               │
│     └─> Check API key and internet connection                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Understanding Error Codes

Moltbot uses specific error codes for different failure scenarios. Here's what each means:

### Gateway Error Codes

```
┌──────────────────┬─────────────────────────────────────────────────┐
│    Error Code    │                   Meaning                       │
├──────────────────┼─────────────────────────────────────────────────┤
│ NOT_LINKED       │ No connection between gateway and node          │
│ NOT_PAIRED       │ User hasn't completed pairing with the bot      │
│ AGENT_TIMEOUT    │ Agent took too long to respond                  │
│ INVALID_REQUEST  │ Malformed request to gateway                    │
│ UNAVAILABLE      │ Gateway or service temporarily unavailable      │
└──────────────────┴─────────────────────────────────────────────────┘
```

### HTTP Status Codes

```
┌──────────┬────────────────────┬───────────────────────────────────┐
│  Status  │      Category      │           What It Means           │
├──────────┼────────────────────┼───────────────────────────────────┤
│   400    │  Bad Request       │ Malformed message or invalid data │
│   401    │  Unauthorized      │ Invalid or expired API key        │
│   402    │  Payment Required  │ Billing issue with AI provider    │
│   403    │  Forbidden         │ Access denied by policy           │
│   408    │  Timeout           │ Request took too long             │
│   429    │  Rate Limited      │ Too many requests, slow down      │
│   500    │  Server Error      │ AI provider internal error        │
│   503    │  Unavailable       │ Service temporarily overloaded    │
└──────────┴────────────────────┴───────────────────────────────────┘
```

### Failover Reasons

When Moltbot tries to use fallback models or accounts, it classifies failures:

```
┌───────────────┬───────────────────────────────────────────────────┐
│    Reason     │                  Description                      │
├───────────────┼───────────────────────────────────────────────────┤
│ rate_limit    │ Hit API rate limits (429) or service overloaded   │
│ billing       │ Payment or credit issues (402)                    │
│ auth          │ Authentication failed (401/403)                   │
│ timeout       │ Request timed out (408)                           │
│ format        │ Invalid request format (tool_use.id errors)       │
└───────────────┴───────────────────────────────────────────────────┘
```

---

## Common Error Messages and Solutions

### 1. Context Overflow Errors

**Error Messages:**
- `request_too_large`
- `context length exceeded`
- `prompt is too long`
- `exceeds model context window`
- `413 too large`

**What's Happening:**
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Your conversation + system prompt + history > model's limit      │
│                                                                    │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │ System Prompt      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │     │
│   │ Conversation       ████████████████████░░░░░░░░░░░░░░░░  │     │
│   │ New Message        ████████████░░░░░░░░░░░░░░░░░░░░░░░░  │     │
│   │                                          ▲                │     │
│   │                                   Model Limit             │     │
│   │                                   (e.g., 200K)            │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│   OVERFLOW! ──────────────────────────────────────►                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Solutions:**

1. **Start a fresh session:**
   ```
   /new
   ```

2. **Enable context pruning in config:**
   ```json5
   {
     "agents": {
       "defaults": {
         "contextPruning": {
           "mode": "cache-ttl",
           "ttl": "15m",
           "softTrimRatio": 0.7,
           "hardClearRatio": 0.9
         }
       }
     }
   }
   ```

3. **Use a model with larger context:**
   ```json5
   {
     "agents": {
       "defaults": {
         "model": "anthropic/claude-opus-4-20250514"  // 200K context
       }
     }
   }
   ```

4. **Enable compaction:**
   ```json5
   {
     "agents": {
       "defaults": {
         "compaction": {
           "mode": "default",
           "maxHistoryShare": 0.5
         }
       }
     }
   }
   ```

---

### 2. Authentication Errors

**Error Messages:**
- `invalid_api_key`
- `incorrect api key`
- `unauthorized`
- `forbidden`
- `access denied`
- `token has expired`
- `401`/`403`

**Diagnostic Flow:**
```
┌────────────────────────────────────────────────────────────────────┐
│                   AUTH ERROR DIAGNOSIS                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────────────┐                                          │
│   │  Is ANTHROPIC_API_KEY set?                                     │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│     ┌────────▼────────┐                                            │
│     │   No            │   Yes                                      │
│     │                 │                                            │
│     ▼                 ▼                                            │
│  Set the key     ┌────────────────────┐                            │
│  in your shell   │  Does key start    │                            │
│  or .env file    │  with "sk-ant-"?   │                            │
│                  └────────┬───────────┘                            │
│                           │                                        │
│              ┌────────────▼────────────┐                           │
│              │  Yes                    │   No                      │
│              │                         │                           │
│              ▼                         ▼                           │
│   ┌─────────────────────┐   Check provider                         │
│   │  Is key active on   │   (OpenAI uses "sk-",                    │
│   │  Anthropic console? │    Google uses different)                │
│   └─────────┬───────────┘                                          │
│             │                                                      │
│    ┌────────▼────────┐                                             │
│    │  No             │   Yes                                       │
│    │                 │                                             │
│    ▼                 ▼                                             │
│  Create new key   Check for                                        │
│  or reactivate    billing issues                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Solutions:**

1. **Check environment variable is set:**
   ```bash
   # Check if set
   echo $ANTHROPIC_API_KEY

   # Set it (add to ~/.bashrc or ~/.zshrc)
   export ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

2. **Verify key format:**
   - Anthropic: `sk-ant-api03-...`
   - OpenAI: `sk-...`
   - Google: Project-based authentication

3. **Check config uses correct profile:**
   ```json5
   {
     "auth": {
       "profiles": {
         "my-anthropic": {
           "provider": "anthropic",
           "mode": "api-key"
           // Key comes from ANTHROPIC_API_KEY env var
         }
       }
     }
   }
   ```

4. **Re-authenticate if using OAuth:**
   ```bash
   moltbot auth login anthropic
   ```

---

### 3. Rate Limit Errors

**Error Messages:**
- `rate_limit`
- `too many requests`
- `429`
- `exceeded your current quota`
- `resource_exhausted`
- `quota exceeded`

**Understanding Rate Limits:**
```
┌────────────────────────────────────────────────────────────────────┐
│                    RATE LIMIT TYPES                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Requests per Minute (RPM)                                        │
│   ├─────────────────────────────────────────────────────────►      │
│   │                                                                │
│   │   Too many API calls in a short period                         │
│   │                                                                │
│   Tokens per Minute (TPM)                                          │
│   ├─────────────────────────────────────────────────────────►      │
│   │                                                                │
│   │   Too many tokens processed in a minute                        │
│   │                                                                │
│   Daily Token Limit                                                │
│   ├─────────────────────────────────────────────────────────►      │
│   │                                                                │
│   │   Exceeded your plan's daily allocation                        │
│   │                                                                │
│   Concurrent Requests                                              │
│   └─────────────────────────────────────────────────────────►      │
│                                                                    │
│       Too many requests happening at the same time                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Solutions:**

1. **Enable message debouncing:**
   ```json5
   {
     "messages": {
       "inbound": {
         "debounceMs": 2000,
         "byChannel": {
           "whatsapp": 3000,
           "telegram": 1500
         }
       }
     }
   }
   ```

2. **Configure model fallbacks:**
   ```json5
   {
     "agents": {
       "defaults": {
         "model": {
           "primary": "anthropic/claude-opus-4-20250514",
           "fallbacks": [
             "anthropic/claude-sonnet-4-20250514",
             "anthropic/claude-haiku-3-20240307"
           ]
         }
       }
     }
   }
   ```

3. **Use multiple auth profiles:**
   ```json5
   {
     "auth": {
       "profiles": {
         "anthropic-1": { "provider": "anthropic", "mode": "api-key" },
         "anthropic-2": { "provider": "anthropic", "mode": "api-key" }
       },
       "order": {
         "anthropic": ["anthropic-1", "anthropic-2"]
       },
       "cooldowns": {
         "billingBackoffHours": 2,
         "billingMaxHours": 12
       }
     }
   }
   ```

4. **Wait and retry:**
   - Check the `retryAfterMs` in error response
   - Usually clears after 60 seconds

---

### 4. Billing Errors

**Error Messages:**
- `402`
- `payment required`
- `insufficient credits`
- `credit balance`
- `plans & billing`

**Solutions:**

1. **Check your billing status:**
   - Anthropic: https://console.anthropic.com/billing
   - OpenAI: https://platform.openai.com/account/billing

2. **Add payment method or credits**

3. **Configure billing cooldowns:**
   ```json5
   {
     "auth": {
       "cooldowns": {
         "billingBackoffHours": 2,    // Wait 2 hours on billing error
         "billingMaxHours": 12        // Max wait before retrying
       }
     }
   }
   ```

4. **Switch to a different account temporarily:**
   - If you have multiple API keys, Moltbot will failover automatically

---

### 5. Timeout Errors

**Error Messages:**
- `timeout`
- `timed out`
- `deadline exceeded`
- `context deadline exceeded`
- `ETIMEDOUT`
- `ESOCKETTIMEDOUT`

**What's Happening:**
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Request ──────────────────────────────────────────────► Timeout  │
│                                                                    │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     │
│   │ Moltbot │────►│ Gateway │────►│ Network │────►│ AI API  │     │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘     │
│                                                                    │
│   Timeout can occur at any stage:                                  │
│   • Network connectivity issues                                    │
│   • AI provider slow to respond                                    │
│   • Complex query taking too long                                  │
│   • Gateway connection dropped                                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Solutions:**

1. **Check network connectivity:**
   ```bash
   # Test API endpoint
   curl -I https://api.anthropic.com/v1/messages
   ```

2. **Increase timeout settings:**
   ```json5
   {
     "agents": {
       "defaults": {
         "timeoutMs": 120000  // 2 minutes
       }
     }
   }
   ```

3. **Simplify your request:**
   - Break complex tasks into smaller steps
   - Reduce context size

4. **Check for network issues:**
   - Firewall blocking connections
   - VPN interference
   - DNS resolution problems

---

### 6. Network Errors

**Error Codes:**
- `ECONNRESET` - Connection reset by peer
- `ECONNREFUSED` - Connection refused
- `EPIPE` - Broken pipe
- `ENETUNREACH` - Network unreachable
- `EHOSTUNREACH` - Host unreachable
- `ENOTFOUND` - DNS lookup failed
- `EAI_AGAIN` - DNS temporary failure

**Diagnostic Steps:**

```bash
# 1. Check DNS resolution
nslookup api.anthropic.com

# 2. Check connectivity
ping api.anthropic.com

# 3. Check HTTPS connection
curl -v https://api.anthropic.com/v1/messages

# 4. Check if behind proxy
echo $HTTP_PROXY $HTTPS_PROXY

# 5. Check firewall
# (varies by OS)
```

**Solutions:**

1. **These errors are usually transient** - Moltbot will auto-retry

2. **If persistent, check:**
   - Internet connection
   - Firewall rules
   - Proxy configuration
   - VPN status

3. **Configure retry behavior:**
   ```json5
   {
     "agents": {
       "defaults": {
         "retry": {
           "maxRetries": 3,
           "baseDelayMs": 1000,
           "maxDelayMs": 30000
         }
       }
     }
   }
   ```

---

### 7. Message Ordering Errors

**Error Messages:**
- `incorrect role information`
- `roles must alternate`
- `400.*role`

**What's Happening:**
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   AI APIs require alternating user/assistant roles:                │
│                                                                    │
│   CORRECT:                    INCORRECT:                           │
│   ┌─────────┐                 ┌─────────┐                          │
│   │  user   │                 │  user   │                          │
│   ├─────────┤                 ├─────────┤                          │
│   │assistant│                 │  user   │  ← Two user in a row!    │
│   ├─────────┤                 ├─────────┤                          │
│   │  user   │                 │assistant│                          │
│   ├─────────┤                 └─────────┘                          │
│   │assistant│                                                      │
│   └─────────┘                                                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**This can happen when:**
- Session gets corrupted
- Messages arrive out of order
- Rapid message batching fails

**Solutions:**

1. **Start a fresh session:**
   ```
   /new
   ```

2. **Reset the specific session:**
   ```bash
   moltbot sessions reset agent:main:main
   ```

3. **If persistent, check debounce settings:**
   ```json5
   {
     "messages": {
       "inbound": {
         "debounceMs": 2000  // Give time for message ordering
       }
     }
   }
   ```

---

### 8. Image Dimension Errors

**Error Message:**
- `image dimensions exceed max allowed size`

**Solutions:**

1. Moltbot will attempt to resize images automatically

2. If you're sending many images:
   - Reduce the number of images per message
   - Resize images before sending

3. The error includes dimension info like `12000 pixels` - aim for images under 8000px per dimension

---

## Channel-Specific Issues

### Telegram Issues

#### Bot Not Responding

```
┌────────────────────────────────────────────────────────────────────┐
│                 TELEGRAM NOT RESPONDING                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   1. Is the bot token valid?                                       │
│      ├─> moltbot channels status telegram                          │
│      └─> Check @BotFather for token                                │
│                                                                    │
│   2. Is polling/webhook working?                                   │
│      └─> moltbot logs --follow --filter telegram                   │
│                                                                    │
│   3. Are you on the allowlist (if using allowlist)?                │
│      └─> Check config: channels.telegram.allowFrom                 │
│                                                                    │
│   4. Is DM policy allowing messages?                               │
│      └─> Check config: channels.telegram.dmPolicy                  │
│                                                                    │
│   5. Have you started the bot? (/start in Telegram)                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Common fixes:**

```json5
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",  // Try "open" for testing

      // If using allowlist, add your Telegram ID
      "allowFrom": ["123456789"]
    }
  }
}
```

#### Finding Your Telegram ID

1. Message @userinfobot on Telegram
2. It will reply with your user ID
3. Add this ID to your `allowFrom` list

#### Group Messages Not Working

```json5
{
  "channels": {
    "telegram": {
      "groupPolicy": {
        // Ensure bot is mentioned or replied to
        "mentionPatterns": ["@YourBotUsername"],

        // Or respond to all messages (careful!)
        // "policy": "open"
      }
    }
  }
}
```

---

### WhatsApp Issues

#### QR Code Not Appearing

```bash
# Check login status
moltbot channels status whatsapp

# Re-initiate login
moltbot channels login whatsapp
```

#### Session Disconnects

WhatsApp Web sessions can disconnect for various reasons:

1. **Phone went offline** - WhatsApp requires your phone to be online
2. **Logged out on phone** - Check WhatsApp > Linked Devices
3. **Session expired** - Re-scan QR code

```bash
# Force reconnect
moltbot channels disconnect whatsapp
moltbot channels login whatsapp
```

#### Self-Chat Mode Issues

```json5
{
  "channels": {
    "whatsapp": {
      "selfChatMode": true,
      "dmPolicy": "allowlist",
      // Your own phone number
      "allowFrom": ["+15555550123"]
    }
  }
}
```

---

### Discord Issues

#### Bot Not Joining Voice

Discord voice requires additional setup and permissions in the Discord Developer Portal.

#### Slash Commands Not Showing

```json5
{
  "commands": {
    "native": true,        // Register with Discord
    "nativeSkills": true   // Register skill commands
  }
}
```

After enabling, it may take up to an hour for Discord to propagate slash commands.

---

### Slack Issues

#### App Not Responding

1. **Check both tokens are set:**
   - `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - `SLACK_APP_TOKEN` (starts with `xapp-`)

2. **Verify Socket Mode is enabled** in Slack app settings

3. **Check OAuth scopes:**
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`

#### Bot Not Seeing Messages

- Add bot to channels explicitly
- Check `channels:read` scope
- For private channels, use `groups:read`

---

## Configuration Issues

### Invalid Config Errors

**Error:** `INVALID_CONFIG`

**Diagnostic:**
```bash
# Validate config
moltbot config validate

# Show current config (sanitized)
moltbot config show
```

**Common causes:**

1. **Invalid JSON5 syntax:**
   ```json5
   // WRONG - missing comma
   {
     "channels": {
       "telegram": { "enabled": true }
       "whatsapp": { "enabled": true }
     }
   }

   // CORRECT
   {
     "channels": {
       "telegram": { "enabled": true },  // ← comma!
       "whatsapp": { "enabled": true }
     }
   }
   ```

2. **Invalid enum value:**
   ```json5
   // WRONG
   { "dmPolicy": "everyone" }  // Not a valid option

   // CORRECT
   { "dmPolicy": "open" }  // Valid: open, allowlist, pairing, disabled
   ```

3. **Missing required field:**
   - Some features require specific fields
   - Check the schema: `moltbot config schema`

### Config Not Loading

**Check the config path:**
```bash
# Default location
cat ~/.clawdbot/config.json

# Custom location (if set)
echo $CLAWDBOT_CONFIG_PATH
```

**Restore from backup:**
```bash
# List backups
ls ~/.clawdbot/config.json.bak*

# Restore
cp ~/.clawdbot/config.json.bak ~/.clawdbot/config.json
```

### Environment Variables Not Working

```json5
// Variables must use ${VAR_NAME} syntax
{
  "auth": {
    "profiles": {
      "my-key": {
        // CORRECT
        "apiKey": "${ANTHROPIC_API_KEY}"

        // WRONG - won't substitute
        // "apiKey": "$ANTHROPIC_API_KEY"
        // "apiKey": "ANTHROPIC_API_KEY"
      }
    }
  }
}
```

**Check if variable is set:**
```bash
echo ${ANTHROPIC_API_KEY:-(not set)}
```

---

## Session Issues

### Session Not Found

**Error:** `session not found` or `NOT_LINKED`

**The session key format:**
```
agent:{agentId}:{sessionId}

Example: agent:main:telegram:123456789
```

**List active sessions:**
```bash
moltbot sessions list
```

**Reset a session:**
```bash
moltbot sessions reset agent:main:telegram:123456789
```

### Session History Lost

Sessions are stored in `~/.clawdbot/sessions/`. If they're gone:

1. **Check for backups:**
   ```bash
   ls ~/.clawdbot/sessions/*.bak
   ```

2. **Restore from backup:**
   ```bash
   moltbot sessions import backup.jsonl
   ```

3. **If using memory search, context may be recoverable:**
   - Memory index persists separately
   - Agent can search historical context

### Cross-Channel Session Issues

If you're using identity linking but sessions aren't merging:

```json5
{
  "session": {
    "dmScope": "per-peer",
    "identityLinks": {
      "alice": [
        "telegram:123456",
        "whatsapp:+15555550123"
      ]
    }
  }
}
```

Ensure:
- IDs match exactly (including `+` for phone numbers)
- Both channels are using same agent

---

## Gateway Issues

### Gateway Won't Start

```bash
# Check what's using the port
lsof -i :18789
# or on Windows
netstat -ano | findstr :18789

# Start with different port
moltbot gateway run --port 18790
```

### Can't Connect to Remote Gateway

```
┌────────────────────────────────────────────────────────────────────┐
│                REMOTE CONNECTION TROUBLESHOOTING                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   1. Is gateway running on remote?                                 │
│      └─> ssh user@server "moltbot gateway status"                  │
│                                                                    │
│   2. Is port accessible?                                           │
│      └─> nc -zv server 18789                                       │
│                                                                    │
│   3. Is SSH tunnel established?                                    │
│      └─> ssh -L 18789:localhost:18789 user@server                  │
│                                                                    │
│   4. Is auth token correct?                                        │
│      └─> Check CLAWDBOT_GATEWAY_TOKEN on both sides                │
│                                                                    │
│   5. Is TLS certificate valid?                                     │
│      └─> Check gateway.remote.tlsFingerprint                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Gateway Disconnects Frequently

```json5
{
  "gateway": {
    "keepalive": {
      "intervalMs": 30000,
      "timeoutMs": 10000
    }
  }
}
```

---

## Performance Issues

### Slow Responses

**Diagnostic approach:**
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Message received                                                 │
│        │                                                           │
│        ▼                                                           │
│   ┌─────────────────────┐                                          │
│   │ Debounce delay      │ ← Check debounceMs                       │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│              ▼                                                     │
│   ┌─────────────────────┐                                          │
│   │ Routing resolution  │ ← Usually fast                           │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│              ▼                                                     │
│   ┌─────────────────────┐                                          │
│   │ Context loading     │ ← Large sessions = slow                  │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│              ▼                                                     │
│   ┌─────────────────────┐                                          │
│   │ AI API call         │ ← Main delay source                      │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│              ▼                                                     │
│   ┌─────────────────────┐                                          │
│   │ Tool execution      │ ← Can be slow for browser/code           │
│   └──────────┬──────────┘                                          │
│              │                                                     │
│              ▼                                                     │
│   Response sent                                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Solutions:**

1. **Reduce debounce for faster response:**
   ```json5
   {
     "messages": {
       "inbound": {
         "debounceMs": 500  // Lower = faster but may batch less
       }
     }
   }
   ```

2. **Use faster model for simple queries:**
   ```json5
   {
     "agents": {
       "defaults": {
         "model": "anthropic/claude-haiku-3-20240307"  // Fastest
       }
     }
   }
   ```

3. **Enable context pruning:**
   ```json5
   {
     "agents": {
       "defaults": {
         "contextPruning": {
           "mode": "cache-ttl",
           "ttl": "10m"
         }
       }
     }
   }
   ```

4. **Check tool timeouts:**
   ```json5
   {
     "tools": {
       "timeouts": {
         "bash": 30000,
         "browser": 60000
       }
     }
   }
   ```

### High Memory Usage

1. **Check active sessions:**
   ```bash
   moltbot sessions list
   ```

2. **Clear old sessions:**
   ```bash
   # Export first
   moltbot sessions export --all > backup.jsonl

   # Clear specific session
   moltbot sessions reset agent:main:old-session
   ```

3. **Enable memory flush:**
   ```json5
   {
     "agents": {
       "defaults": {
         "compaction": {
           "memoryFlush": {
             "enabled": true,
             "softThresholdTokens": 20000
           }
         }
       }
     }
   }
   ```

### Token Usage Too High

```bash
# Enable cache tracing to analyze usage
```

```json5
{
  "diagnostics": {
    "cacheTrace": {
      "enabled": true,
      "filePath": "~/.clawdbot/logs/cache-trace.jsonl"
    }
  }
}
```

```bash
# Analyze cache performance
cat ~/.clawdbot/logs/cache-trace.jsonl | jq '.cacheHit' | sort | uniq -c
```

---

## Logging and Debugging

### Enable Verbose Logging

```bash
# Command line
moltbot gateway run --log-level debug

# Environment variable
export CLAWDBOT_LOG_LEVEL=debug
```

### Filter Logs

```bash
# By component
moltbot logs --follow --filter telegram
moltbot logs --follow --filter routing
moltbot logs --follow --filter agent

# By level
moltbot logs --follow --level debug
moltbot logs --follow --level error

# Combined
moltbot logs --follow --filter telegram --level debug
```

### Diagnostic Flags

```json5
{
  "diagnostics": {
    "enabled": true,
    "flags": [
      "telegram.http",       // Telegram API calls
      "routing.*",           // All routing decisions
      "agent.tools",         // Tool executions
      "session.*",           // Session management
      "*"                    // Everything (verbose!)
    ]
  }
}
```

### OpenTelemetry Tracing

For production monitoring:

```json5
{
  "diagnostics": {
    "otel": {
      "enabled": true,
      "endpoint": "https://otel.example.com:4317",
      "serviceName": "moltbot",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.1
    }
  }
}
```

---

## Recovery Procedures

### Complete Reset

If all else fails, you can reset Moltbot completely:

```bash
# 1. Stop the gateway
moltbot gateway stop

# 2. Backup everything
tar -czf moltbot-backup.tar.gz ~/.clawdbot

# 3. Remove state (keeps config)
rm -rf ~/.clawdbot/sessions
rm -rf ~/.clawdbot/memory
rm -rf ~/.clawdbot/cache

# 4. Restart
moltbot gateway run
```

### Config Reset

```bash
# Backup current config
cp ~/.clawdbot/config.json ~/.clawdbot/config.json.broken

# Create minimal config
cat > ~/.clawdbot/config.json << 'EOF'
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open"
    }
  }
}
EOF

# Validate
moltbot config validate
```

### Session Recovery

```bash
# Export all sessions
moltbot sessions export --all > sessions-backup.jsonl

# View session contents
cat sessions-backup.jsonl | jq -r '.sessionKey'

# Import after recovery
moltbot sessions import sessions-backup.jsonl
```

---

## Getting Help

### Before Asking for Help

Collect this information:

1. **Version:**
   ```bash
   moltbot --version
   ```

2. **Config (sanitized):**
   ```bash
   moltbot config show
   ```

3. **Recent error logs:**
   ```bash
   moltbot logs --level error | tail -50
   ```

4. **System info:**
   ```bash
   node --version
   uname -a  # or systeminfo on Windows
   ```

### Debug Information

```bash
# Full diagnostic dump
moltbot gateway status --verbose
moltbot channels status --all
moltbot config validate --verbose
```

### Reporting Issues

When reporting issues:

1. Describe what you expected to happen
2. Describe what actually happened
3. Include the error message (exact text)
4. Include relevant log output
5. Include your config (remove sensitive tokens!)
6. Include steps to reproduce

---

## Summary

You've learned how to troubleshoot:

1. ✅ Error codes and their meanings
2. ✅ Context overflow issues
3. ✅ Authentication problems
4. ✅ Rate limiting
5. ✅ Billing errors
6. ✅ Timeout and network issues
7. ✅ Message ordering problems
8. ✅ Channel-specific issues (Telegram, WhatsApp, Discord, Slack)
9. ✅ Configuration problems
10. ✅ Session management
11. ✅ Gateway connectivity
12. ✅ Performance optimization
13. ✅ Logging and debugging
14. ✅ Recovery procedures

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│                    MOLTBOT TROUBLESHOOTING QUICK REF               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  STATUS COMMANDS                                                   │
│  moltbot gateway status      - Check gateway                       │
│  moltbot channels status     - Check all channels                  │
│  moltbot sessions list       - List sessions                       │
│  moltbot config validate     - Validate config                     │
│                                                                    │
│  LOG COMMANDS                                                      │
│  moltbot logs --follow                - Real-time logs             │
│  moltbot logs --level error           - Errors only                │
│  moltbot logs --filter telegram       - Telegram logs              │
│                                                                    │
│  RECOVERY COMMANDS                                                 │
│  /new                                 - Fresh session              │
│  moltbot sessions reset KEY           - Reset session              │
│  moltbot channels login CHANNEL       - Re-login                   │
│  moltbot gateway restart              - Restart gateway            │
│                                                                    │
│  COMMON FIXES                                                      │
│  • Context overflow    → /new or enable pruning                    │
│  • 401/403             → Check API key                             │
│  • 429                 → Wait or use fallbacks                     │
│  • 402                 → Add credits/payment                       │
│  • Timeout             → Check network, increase timeout           │
│  • Role ordering       → /new to reset session                     │
│                                                                    │
│  CONFIG LOCATIONS                                                  │
│  Config:    ~/.clawdbot/config.json                                │
│  Sessions:  ~/.clawdbot/sessions/                                  │
│  Logs:      ~/.clawdbot/logs/                                      │
│  Backups:   ~/.clawdbot/config.json.bak*                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

**Congratulations!** You've completed the Moltbot Advanced Tutorials series.

For more help, see:
- [Getting Started Guide](../guides/quick-start.md)
- [User Guide](../guides/user-guide.md)
- [Developer Guide](../guides/developer-guide.md)
