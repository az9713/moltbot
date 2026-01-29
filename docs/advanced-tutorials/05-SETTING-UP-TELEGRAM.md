# Tutorial 05 - Setting Up Telegram

This tutorial walks you through setting up Telegram as a messaging channel for Moltbot, from creating your bot to configuring access controls. Telegram is the **recommended channel for beginners** because it's the easiest to set up.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] A Telegram account
- [ ] The Telegram app installed on your phone or desktop

---

## Overview

Here's what we'll accomplish:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TELEGRAM SETUP OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Create Bot with @BotFather                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Get Bot Token                                                      │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Configure Moltbot                                                  │
│         │                                                                   │
│         ▼                                                                   │
│  Step 4: Find Your Telegram User ID                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Configure Allowlist                                                │
│         │                                                                   │
│         ▼                                                                   │
│  Step 6: Start Gateway and Test                                             │
│                                                                             │
│  Time: ~10 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create a Bot with @BotFather

BotFather is Telegram's official bot for creating and managing bots.

### 1.1 Start a Chat with BotFather

1. Open Telegram
2. Search for `@BotFather`
3. Click "Start" or send `/start`

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM - BotFather                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: /start                                                        │
│                                                                     │
│  BotFather: I can help you create and manage Telegram bots.        │
│             If you're new, please see our documentation at:        │
│             https://core.telegram.org/bots                         │
│                                                                     │
│             What do you want to do?                                 │
│             /newbot - create a new bot                              │
│             /mybots - manage existing bots                          │
│             ...                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Create a New Bot

Send `/newbot` to BotFather:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Creating Your Bot                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: /newbot                                                       │
│                                                                     │
│  BotFather: Alright, a new bot. How are we going to call it?       │
│             Please choose a name for your bot.                      │
│                                                                     │
│  You: My Personal Assistant                                         │
│                                                                     │
│  BotFather: Good. Now let's choose a username for your bot.        │
│             It must end in 'bot'. Like this:                       │
│             TetrisBot or tetris_bot.                                │
│                                                                     │
│  You: mypersonalassistant_bot                                       │
│                                                                     │
│  BotFather: Done! Congratulations on your new bot.                 │
│             Use this token to access the HTTP API:                  │
│             7123456789:AAHxxx_your_token_here_xxxabc                │
│             Keep your token secure!                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Important:**
- The **bot name** can be anything (e.g., "My Personal Assistant")
- The **bot username** must end in `bot` and be unique (e.g., `mypersonalassistant_bot`)
- **Save the token!** It looks like: `7123456789:AAHxxx...`

---

## Step 2: Get Your Bot Token

The token you received looks like this:

```
7123456789:AAHxxx_your_token_here_xxxabc
└───┬────┘ └────────────┬──────────────┘
    │                   │
 Bot ID            Secret Key
```

**Security Tips:**
- Never share your token publicly
- Don't commit it to version control
- Regenerate it if compromised (via BotFather → /mybots → your bot → API Token → Revoke)

---

## Step 3: Configure Moltbot

You have three options to add your token:

### Option A: Environment Variable (Recommended)

Set the token as an environment variable:

```bash
# Linux/macOS (add to ~/.bashrc or ~/.zshrc)
export TELEGRAM_BOT_TOKEN="7123456789:AAHxxx_your_token_here_xxxabc"

# Windows (PowerShell)
$env:TELEGRAM_BOT_TOKEN = "7123456789:AAHxxx_your_token_here_xxxabc"

# Windows (Command Prompt)
set TELEGRAM_BOT_TOKEN=7123456789:AAHxxx_your_token_here_xxxabc
```

Then enable Telegram in config:
```bash
moltbot config set channels.telegram.enabled true
```

### Option B: Configuration File

Edit `~/.clawdbot/config.json`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "7123456789:AAHxxx_your_token_here_xxxabc"
    }
  }
}
```

### Option C: Onboarding Wizard

Run the wizard and follow prompts:

```bash
moltbot onboard --channel telegram
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Onboarding Wizard                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Telegram bot token                                                 │
│  ─────────────────────────────────────────────────────────────────  │
│  1) Open Telegram and chat with @BotFather                         │
│  2) Run /newbot (or /mybots)                                       │
│  3) Copy the token (looks like 123456:ABC...)                      │
│  Tip: you can also set TELEGRAM_BOT_TOKEN in your env.             │
│  Docs: https://docs.molt.bot/telegram                              │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  > Enter Telegram bot token: _                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 4: Find Your Telegram User ID

To configure the allowlist, you need your Telegram user ID (a number).

### Method 1: Using Moltbot Logs (Recommended)

1. Start the gateway:
```bash
moltbot gateway run
```

2. Send a message to your bot in Telegram

3. Check the logs:
```bash
moltbot logs --follow
```

Look for a line like:
```
telegram: received message from 123456789 (John Doe)
```

The number `123456789` is your user ID.

### Method 2: Using Telegram API

1. Get your bot token
2. Open this URL in your browser (replace TOKEN with your token):
```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

3. Send a message to your bot
4. Refresh the page and look for:
```json
{
  "message": {
    "from": {
      "id": 123456789,
      ...
    }
  }
}
```

### Method 3: Using Third-Party Bots

Send `/start` to one of these bots:
- `@userinfobot`
- `@getidsbot`

They will reply with your user ID.

---

## Step 5: Configure Allowlist

The allowlist controls who can message your bot.

### Understanding DM Policies

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DM POLICY OPTIONS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "pairing" (default)                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Unknown user sends message                                 │    │
│  │       │                                                     │    │
│  │       ▼                                                     │    │
│  │  Bot replies with pairing code                              │    │
│  │       │                                                     │    │
│  │       ▼                                                     │    │
│  │  You approve the code (via Control UI or CLI)               │    │
│  │       │                                                     │    │
│  │       ▼                                                     │    │
│  │  User is added to allowlist                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "allowlist"                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Only users in allowFrom list can message                   │    │
│  │  Unknown users are silently ignored                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "open"                                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Anyone can message the bot (public bot)                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Setting Up Allowlist

Add your user ID to the allowlist:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "your-token-here",
      "dmPolicy": "allowlist",
      "allowFrom": ["123456789"]
    }
  }
}
```

Or use the CLI:

```bash
moltbot config set channels.telegram.dmPolicy allowlist
moltbot config set channels.telegram.allowFrom '["123456789"]'
```

### Adding Multiple Users

```json
{
  "channels": {
    "telegram": {
      "allowFrom": [
        "123456789",
        "987654321",
        "555666777"
      ]
    }
  }
}
```

---

## Step 6: Start Gateway and Test

### Start the Gateway

```bash
moltbot gateway run
```

Expected output:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Gateway starting...                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  Port: 18789                                                        │
│  Bind: loopback (127.0.0.1)                                         │
│  Control UI: http://localhost:18789/control                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Channels:                                                          │
│    telegram: starting...                                            │
│    telegram: connected ✓                                            │
│  ─────────────────────────────────────────────────────────────────  │
│  Gateway ready!                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Verify Connection

Check channel status:
```bash
moltbot channels status
```

Expected output:
```
┌────────────┬─────────┬────────────────────────┐
│ Channel    │ Status  │ Details                │
├────────────┼─────────┼────────────────────────┤
│ telegram   │ running │ Token: from config     │
│            │         │ Connected: yes         │
└────────────┴─────────┴────────────────────────┘
```

### Send a Test Message

1. Open Telegram
2. Find your bot (search for the username you created)
3. Send: "Hello, can you hear me?"
4. You should receive a response from the AI!

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM - Your Bot                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: Hello, can you hear me?                                       │
│                                                                     │
│  Bot: Hello! Yes, I can hear you perfectly. I'm your personal      │
│       AI assistant powered by Moltbot. How can I help you today?   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Advanced Configuration

### Group Chats

To use your bot in group chats:

1. **Add bot to group**: Open group → Add member → Search for your bot

2. **Disable Privacy Mode** (required to see all messages):
   - Chat with @BotFather
   - Send `/mybots`
   - Select your bot
   - Bot Settings → Group Privacy → Turn OFF

3. **Configure group access**:

```json
{
  "channels": {
    "telegram": {
      "groupPolicy": "allowlist",
      "groups": {
        "-100123456789": {
          "allow": true
        }
      },
      "allowUnmentionedGroups": false
    }
  }
}
```

**Finding Group IDs:**
- Group IDs are negative numbers
- Check logs when bot joins a group
- Or use `@getidsbot` in the group

### Mention Requirement

By default, the bot requires an @mention in groups:

```
# Bot responds:
@mybot what's the weather?

# Bot ignores:
what's the weather?
```

To disable mention requirement:
```json
{
  "channels": {
    "telegram": {
      "allowUnmentionedGroups": true
    }
  }
}
```

### Multiple Telegram Bots

Run multiple bots for different purposes:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "default-bot-token",

      "accounts": {
        "work": {
          "enabled": true,
          "botToken": "work-bot-token",
          "allowFrom": ["111222333"]
        },
        "family": {
          "enabled": true,
          "botToken": "family-bot-token",
          "allowFrom": ["444555666", "777888999"]
        }
      }
    }
  }
}
```

### Bot Commands

Set up slash commands for your bot:

1. Chat with @BotFather
2. Send `/setcommands`
3. Select your bot
4. Send your commands:

```
help - Show help information
ask - Ask a question
summarize - Summarize text
translate - Translate text
```

---

## Troubleshooting

### Bot Not Responding

| Problem | Solution |
|---------|----------|
| "telegram: not configured" | Check that `botToken` is set correctly |
| "telegram: connection error" | Verify token is valid, check internet |
| No response in DM | Check if your user ID is in `allowFrom` |
| No response in group | Check `groupPolicy` and privacy mode |

### Common Errors

**"Unauthorized" Error:**
```
telegram: error: Response code 401 (Unauthorized)
```
→ Token is invalid. Get a new one from @BotFather.

**"Conflict" Error:**
```
telegram: error: Conflict: terminated by other getUpdates request
```
→ Another instance is running. Stop it or use a different port.

**"Chat not found" Error:**
```
telegram: error: Bad Request: chat not found
```
→ The chat ID is wrong or bot was removed from the chat.

### Debug Mode

Enable verbose logging:
```bash
moltbot gateway run --log-level debug
```

Or in config:
```json
{
  "logging": {
    "level": "debug"
  }
}
```

---

## Complete Configuration Example

Here's a complete configuration for Telegram:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "7123456789:AAHxxx_your_token_here_xxxabc",

      "dmPolicy": "allowlist",
      "allowFrom": [
        "123456789",
        "987654321"
      ],

      "groupPolicy": "allowlist",
      "groups": {
        "-100123456789": {
          "allow": true,
          "agentId": "general"
        }
      },

      "allowUnmentionedGroups": false,

      "accounts": {
        "work": {
          "enabled": true,
          "botToken": "another-bot-token",
          "dmPolicy": "allowlist",
          "allowFrom": ["111222333"]
        }
      }
    }
  }
}
```

---

## Summary

You've learned how to:

1. ✅ Create a Telegram bot with @BotFather
2. ✅ Get and securely store the bot token
3. ✅ Configure Moltbot to use Telegram
4. ✅ Find your Telegram user ID
5. ✅ Set up DM policies and allowlists
6. ✅ Configure group chats
7. ✅ Troubleshoot common issues

Telegram is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [06 - Setting Up WhatsApp](06-SETTING-UP-WHATSAPP.md) - WhatsApp Web integration
