# Tutorial 07 - Setting Up Discord

This tutorial walks you through setting up Discord as a messaging channel for Moltbot. Discord requires creating a bot application through the Discord Developer Portal.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] A Discord account
- [ ] A Discord server where you have admin permissions (or can create one)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DISCORD SETUP OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Create Discord Application                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Create Bot User                                                    │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Get Bot Token                                                      │
│         │                                                                   │
│         ▼                                                                   │
│  Step 4: Enable Required Intents                                            │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Invite Bot to Your Server                                          │
│         │                                                                   │
│         ▼                                                                   │
│  Step 6: Configure Moltbot                                                  │
│         │                                                                   │
│         ▼                                                                   │
│  Step 7: Start Gateway and Test                                             │
│                                                                             │
│  Time: ~15 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Discord Application

### Open Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Log in with your Discord account
3. Click **"New Application"** (top right)

```
┌─────────────────────────────────────────────────────────────────────┐
│             DISCORD DEVELOPER PORTAL - Applications                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [+ New Application]                                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  CREATE AN APPLICATION                                      │    │
│  │                                                             │    │
│  │  NAME                                                       │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │ Moltbot                                              │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │  By clicking Create, you agree to the Discord              │    │
│  │  Developer Terms of Service and Developer Policy.          │    │
│  │                                                             │    │
│  │                                    [Cancel] [Create]        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

4. Enter a name (e.g., "Moltbot") and click **"Create"**

---

## Step 2: Create Bot User

1. In your application, go to **"Bot"** in the left sidebar
2. Click **"Add Bot"**
3. Click **"Yes, do it!"** to confirm

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BOT SETTINGS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Build-A-Bot                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  A bot user is required to interact with users and servers.        │
│                                                                     │
│  [Add Bot]                                                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  ADD A BOT TO THIS APP?                                             │
│                                                                     │
│  Adding a bot user gives your app visible life in Discord.         │
│  However, this action is irreversible!                             │
│                                                                     │
│                                    [No] [Yes, do it!]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Get Bot Token

After creating the bot:

1. Under the **"Bot"** section, find **"Token"**
2. Click **"Reset Token"** (or "Copy" if visible)
3. **Save this token securely!**

```
┌─────────────────────────────────────────────────────────────────────┐
│                            BOT TOKEN                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TOKEN                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ MTIzNDU2Nzg5MDEyMzQ1Njc4.GxxxxxxX.xxxxxxxxxxxxxxxxxxxxxxx   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  [Copy]  [Reset Token]                                              │
│                                                                     │
│  ⚠️  This token is shown only once.                                │
│     Store it securely. Never share it publicly.                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Token format:** `MTIzNDU2Nzg5MDEyMzQ1Njc4.GxxxxxxX.xxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 4: Enable Required Intents

Still in the **"Bot"** section, scroll down to **"Privileged Gateway Intents"**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PRIVILEGED GATEWAY INTENTS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PRESENCE INTENT                                                    │
│  [ ] Allows your bot to track member presence.                      │
│      (Optional - not needed for Moltbot)                           │
│                                                                     │
│  SERVER MEMBERS INTENT                                              │
│  [ ] Allows your bot to receive member events.                      │
│      (Optional - useful for greeting new members)                   │
│                                                                     │
│  MESSAGE CONTENT INTENT  ⚠️ REQUIRED                               │
│  [✓] Allows your bot to read message content.                       │
│      Required to see what users type!                              │
│                                                                     │
│  [Save Changes]                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Enable "MESSAGE CONTENT INTENT"** - This is required for Moltbot to read messages!

Click **"Save Changes"**.

---

## Step 5: Invite Bot to Your Server

### Generate Invite URL

1. Go to **"OAuth2"** in the left sidebar
2. Click **"URL Generator"**
3. Under **"Scopes"**, check:
   - `bot`
   - `applications.commands` (optional, for slash commands)

4. Under **"Bot Permissions"**, check:
   - Send Messages
   - Read Message History
   - Add Reactions
   - Embed Links
   - Attach Files
   - Use Slash Commands

```
┌─────────────────────────────────────────────────────────────────────┐
│                       OAUTH2 URL GENERATOR                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SCOPES                                                             │
│  [✓] bot                                                            │
│  [✓] applications.commands                                          │
│                                                                     │
│  BOT PERMISSIONS                                                    │
│  [✓] Send Messages          [✓] Add Reactions                       │
│  [✓] Read Message History   [✓] Embed Links                         │
│  [✓] Attach Files           [✓] Use Slash Commands                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  GENERATED URL                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ https://discord.com/api/oauth2/authorize?client_id=...      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  [Copy]                                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

5. Copy the **Generated URL**

### Invite to Server

1. Open the URL in your browser
2. Select your server from the dropdown
3. Click **"Authorize"**
4. Complete the CAPTCHA if prompted

```
┌─────────────────────────────────────────────────────────────────────┐
│               ADD BOT TO SERVER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ADD TO SERVER                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ My Discord Server                            ▼              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  MOLTBOT WILL HAVE THESE PERMISSIONS:                               │
│  • Send Messages                                                    │
│  • Read Message History                                             │
│  • Add Reactions                                                    │
│  • ...                                                              │
│                                                                     │
│                                    [Cancel] [Authorize]             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 6: Configure Moltbot

### Option A: Environment Variable

```bash
# Linux/macOS
export DISCORD_BOT_TOKEN="MTIzNDU2Nzg5MDEyMzQ1Njc4.GxxxxxxX.xxxxxxxxxxxxxxxxxxxxxxx"

# Windows PowerShell
$env:DISCORD_BOT_TOKEN = "your-token-here"
```

Then enable in config:
```bash
moltbot config set channels.discord.enabled true
```

### Option B: Configuration File

Edit `~/.clawdbot/config.json`:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "MTIzNDU2Nzg5MDEyMzQ1Njc4.GxxxxxxX.xxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

### Option C: Onboarding Wizard

```bash
moltbot onboard --channel discord
```

---

## Step 7: Start Gateway and Test

### Start the Gateway

```bash
moltbot gateway run
```

Expected output:
```
discord: connecting...
discord: logged in as Moltbot#1234
discord: connected ✓
```

### Send a Test Message

1. Open Discord
2. Go to a channel where the bot has access
3. Mention the bot: `@Moltbot hello!`
4. You should receive a response

```
┌─────────────────────────────────────────────────────────────────────┐
│  #general                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: @Moltbot hello!                                               │
│                                                                     │
│  Moltbot: Hello! I'm here to help. What can I do for you?          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Configuring Channel Access

### Understanding Discord Structure

```
Discord Server (Guild)
├── Category
│   ├── #text-channel
│   ├── #another-channel
│   └── Voice Channel
└── #uncategorized-channel
```

### Guild and Channel Allowlist

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "your-token",

      "groupPolicy": "allowlist",
      "guilds": {
        "123456789012345678": {
          "channels": {
            "987654321098765432": {
              "allow": true
            },
            "general": {
              "allow": true
            }
          }
        }
      }
    }
  }
}
```

### Finding IDs

**Enable Developer Mode:**
1. Discord Settings → App Settings → Advanced
2. Enable "Developer Mode"

**Get Guild (Server) ID:**
1. Right-click the server name
2. Click "Copy Server ID"

**Get Channel ID:**
1. Right-click the channel
2. Click "Copy Channel ID"

---

## DM Configuration

### DM Policy

```json
{
  "channels": {
    "discord": {
      "dm": {
        "enabled": true,
        "policy": "allowlist",
        "allowFrom": ["123456789012345678"]
      }
    }
  }
}
```

### Finding User IDs

1. Enable Developer Mode (see above)
2. Right-click on a user
3. Click "Copy User ID"

---

## Advanced Configuration

### Full Configuration Example

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "your-bot-token",

      "groupPolicy": "allowlist",
      "guilds": {
        "123456789012345678": {
          "channels": {
            "general": { "allow": true },
            "ai-chat": { "allow": true }
          }
        }
      },

      "dm": {
        "enabled": true,
        "policy": "allowlist",
        "allowFrom": ["111222333444555666"]
      },

      "allowUnmentionedGroups": false,

      "accounts": {
        "work": {
          "enabled": true,
          "token": "another-bot-token",
          "groupPolicy": "open"
        }
      }
    }
  }
}
```

### Multiple Bot Accounts

```bash
# Link work account
moltbot channels connect discord --account work
```

---

## Troubleshooting

### Common Issues

| Problem | Symptom | Solution |
|---------|---------|----------|
| "Invalid token" | Bot won't connect | Reset token in Developer Portal |
| "Missing Access" | Can't read messages | Check Message Content Intent |
| "Missing Permissions" | Can't send messages | Re-invite with proper permissions |
| Bot ignores messages | No response | Check `groupPolicy` and channel allowlist |

### Token Issues

If you see:
```
discord: Error: Invalid token
```

1. Go to Discord Developer Portal
2. Bot → Reset Token
3. Copy new token to config

### Intent Issues

If bot connects but doesn't see messages:
```
discord: connected
discord: no message content (intents disabled?)
```

1. Go to Developer Portal → Bot
2. Enable "MESSAGE CONTENT INTENT"
3. Restart gateway

### Permission Issues

If bot can't respond:
```
discord: Missing Permissions
```

1. Go to Server Settings → Roles
2. Find the bot's role
3. Ensure "Send Messages" is enabled
4. Or re-invite with the invite URL

---

## Summary

You've learned how to:

1. ✅ Create a Discord application and bot
2. ✅ Get and configure the bot token
3. ✅ Enable Message Content Intent
4. ✅ Generate invite URL with proper permissions
5. ✅ Invite bot to your server
6. ✅ Configure Moltbot
7. ✅ Set up channel and DM access

Discord is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [08 - Setting Up Slack](08-SETTING-UP-SLACK.md) - Slack app and Socket Mode setup
