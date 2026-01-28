# Tutorial 08 - Setting Up Slack

This tutorial walks you through setting up Slack as a messaging channel for Moltbot. Slack uses Socket Mode for real-time communication, which requires creating a Slack app with specific permissions.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] A Slack workspace where you have admin permissions
- [ ] Access to the Slack API (https://api.slack.com)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SLACK SETUP OVERVIEW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Create Slack App                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Enable Socket Mode                                                 │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Configure OAuth Scopes                                             │
│         │                                                                   │
│         ▼                                                                   │
│  Step 4: Enable Event Subscriptions                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Install App to Workspace                                           │
│         │                                                                   │
│         ▼                                                                   │
│  Step 6: Configure Moltbot                                                  │
│         │                                                                   │
│         ▼                                                                   │
│  Step 7: Start Gateway and Test                                             │
│                                                                             │
│  Time: ~20 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Understanding Slack Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SLACK SOCKET MODE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────┐     WebSocket      ┌────────────┐                           │
│  │            │◄──────────────────►│            │                           │
│  │  Moltbot   │                    │   Slack    │                           │
│  │  Gateway   │                    │  Servers   │                           │
│  │            │                    │            │                           │
│  └────────────┘                    └────────────┘                           │
│                                          │                                  │
│  Socket Mode means:                      │                                  │
│  • No public URL needed                  ▼                                  │
│  • Works behind firewalls          ┌────────────┐                           │
│  • Real-time event delivery        │   Your     │                           │
│  • Two tokens required:            │ Workspace  │                           │
│    - Bot Token (xoxb-...)          └────────────┘                           │
│    - App Token (xapp-...)                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Slack App

### Open Slack API

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CREATE A SLACK APP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  How would you like to create your app?                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  From scratch                                                │    │
│  │  Create a new app, add features, and configure permissions  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  From an app manifest                                        │    │
│  │  Use a JSON or YAML manifest to quickly create an app       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

4. Enter app name and select workspace:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NAME APP & CHOOSE WORKSPACE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  App Name                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Moltbot                                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Pick a workspace to develop your app in                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ My Workspace                                            ▼   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│                                    [Cancel] [Create App]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 2: Enable Socket Mode

1. In your app settings, go to **"Socket Mode"** in the left sidebar
2. Toggle **"Enable Socket Mode"** to ON
3. Create an App-Level Token:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SOCKET MODE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Socket Mode  [Toggle: ON]                                          │
│                                                                     │
│  Socket Mode allows your app to receive events from Slack          │
│  without exposing a public HTTP endpoint.                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  App-Level Tokens                                                   │
│  These tokens allow your app to connect to Slack's Socket Mode.    │
│                                                                     │
│  [Generate Token]                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

4. Click **"Generate Token"**:
   - Token Name: `socket-mode`
   - Add scope: `connections:write`
   - Click **"Generate"**

5. **Save the token!** (starts with `xapp-`)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   YOUR APP TOKEN                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Token                                                              │
│  xapp-1-AXXXXXXXXXX-XXXXXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxx...     │
│                                                                     │
│  ⚠️  Save this token now - you won't be able to see it again!     │
│                                                                     │
│  [Copy] [Done]                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Configure OAuth Scopes

1. Go to **"OAuth & Permissions"** in the left sidebar
2. Scroll to **"Scopes"**
3. Add these **Bot Token Scopes**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BOT TOKEN SCOPES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Required Scopes:                                                   │
│                                                                     │
│  [✓] chat:write         - Send messages                             │
│  [✓] channels:history   - Read channel messages                     │
│  [✓] channels:read      - View channel info                         │
│  [✓] groups:history     - Read private channel messages             │
│  [✓] im:history         - Read DM messages                          │
│  [✓] mpim:history       - Read group DM messages                    │
│  [✓] users:read         - View user info                            │
│  [✓] app_mentions:read  - Read @mentions of the app                 │
│  [✓] reactions:read     - View reactions                            │
│  [✓] reactions:write    - Add reactions                             │
│  [✓] files:read         - View files                                │
│  [✓] files:write        - Upload files                              │
│  [✓] commands           - Handle slash commands                     │
│                                                                     │
│  Optional:                                                          │
│  [ ] pins:read          - View pins                                 │
│  [ ] pins:write         - Add pins                                  │
│  [ ] emoji:read         - View custom emoji                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 4: Enable Event Subscriptions

1. Go to **"Event Subscriptions"** in the left sidebar
2. Toggle **"Enable Events"** to ON
3. Under **"Subscribe to bot events"**, add:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIBE TO BOT EVENTS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Add Bot User Event]                                               │
│                                                                     │
│  Required Events:                                                   │
│  [✓] app_mention         - When someone @mentions your app          │
│  [✓] message.channels    - Messages in public channels              │
│  [✓] message.groups      - Messages in private channels             │
│  [✓] message.im          - Direct messages                          │
│  [✓] message.mpim        - Group direct messages                    │
│                                                                     │
│  Optional Events:                                                   │
│  [ ] reaction_added      - When someone reacts                      │
│  [ ] reaction_removed    - When reaction removed                    │
│  [ ] member_joined_channel                                          │
│  [ ] member_left_channel                                            │
│                                                                     │
│  [Save Changes]                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 5: Enable App Home (Optional but Recommended)

1. Go to **"App Home"** in the left sidebar
2. Toggle **"Messages Tab"** to ON
3. This allows users to DM your app

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APP HOME                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Show Tabs                                                          │
│                                                                     │
│  [✓] Home Tab          - Show a custom Home tab                     │
│  [✓] Messages Tab      - Allow users to send messages to app        │
│                                                                     │
│  ⚠️  Enable "Messages Tab" to receive DMs                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 6: Install App to Workspace

1. Go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INSTALL TO WORKSPACE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Moltbot is requesting permission to access the My Workspace       │
│  Slack workspace.                                                   │
│                                                                     │
│  Moltbot will be able to:                                          │
│  • Send messages as @moltbot                                        │
│  • View messages and other content                                  │
│  • View people in the workspace                                     │
│  • Add reactions to messages                                        │
│                                                                     │
│                                    [Cancel] [Allow]                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

4. After installation, copy the **Bot User OAuth Token** (starts with `xoxb-`)

---

## Step 7: Configure Moltbot

### You Need Two Tokens

1. **App Token** (`xapp-...`) - From Socket Mode setup
2. **Bot Token** (`xoxb-...`) - From Install App page

### Option A: Environment Variables

```bash
# Linux/macOS
export SLACK_APP_TOKEN="xapp-YOUR-APP-TOKEN-HERE"
export SLACK_BOT_TOKEN="xoxb-YOUR-BOT-TOKEN-HERE"

# Windows PowerShell
$env:SLACK_APP_TOKEN = "xapp-YOUR-APP-TOKEN-HERE"
$env:SLACK_BOT_TOKEN = "xoxb-YOUR-BOT-TOKEN-HERE"
```

Then enable Slack:
```bash
moltbot config set channels.slack.enabled true
```

### Option B: Configuration File

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "appToken": "${SLACK_APP_TOKEN}",
      "botToken": "${SLACK_BOT_TOKEN}"
    }
  }
}
```

### Option C: Onboarding Wizard

```bash
moltbot onboard --channel slack
```

---

## Step 8: Start Gateway and Test

### Start the Gateway

```bash
moltbot gateway run
```

Expected output:
```
slack: connecting to Socket Mode...
slack: connected ✓
slack: Bot ID: U0123456789
```

### Test the Bot

1. Open Slack
2. Find your app in the sidebar (or search for it)
3. Send a direct message or @mention in a channel

**DM Test:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Moltbot                                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: Hello!                                                        │
│                                                                     │
│  Moltbot: Hello! I'm Moltbot, your AI assistant. How can I help?   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Channel Mention Test:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  #general                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: @Moltbot what time is it?                                     │
│                                                                     │
│  Moltbot: The current time depends on your timezone.                │
│           Could you tell me your location or timezone?              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Channel Access Configuration

### Channel Allowlist

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "appToken": "xapp-...",
      "botToken": "xoxb-...",

      "groupPolicy": "allowlist",
      "channels": {
        "C0123456789": { "allow": true },
        "general": { "allow": true },
        "ai-chat": { "allow": true }
      }
    }
  }
}
```

### Finding Channel IDs

1. Right-click on a channel
2. Click "View channel details"
3. Scroll to bottom for Channel ID (starts with C)

Or use the Moltbot wizard - it can resolve channel names automatically.

### DM Configuration

```json
{
  "channels": {
    "slack": {
      "dm": {
        "enabled": true,
        "policy": "allowlist",
        "allowFrom": ["U0123456789"]
      }
    }
  }
}
```

### Finding User IDs

1. Click on a user's profile
2. Click "..." menu
3. "Copy member ID"

---

## Slash Commands (Optional)

### Add Slash Command

1. Go to **"Slash Commands"** in your app settings
2. Click **"Create New Command"**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CREATE NEW COMMAND                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Command                                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ /ask                                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Short Description                                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Ask Moltbot a question                                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [Save]                                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Using Slash Commands

```
/ask What's the weather like today?
```

The response will appear only to you (ephemeral) or in the channel, depending on configuration.

---

## Complete Configuration Example

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "appToken": "${SLACK_APP_TOKEN}",
      "botToken": "${SLACK_BOT_TOKEN}",

      "groupPolicy": "allowlist",
      "channels": {
        "C0123456789": { "allow": true },
        "general": { "allow": true }
      },

      "dm": {
        "enabled": true,
        "policy": "allowlist",
        "allowFrom": ["U0123456789"]
      },

      "allowUnmentionedGroups": false
    }
  }
}
```

---

## Troubleshooting

### Common Issues

| Problem | Symptom | Solution |
|---------|---------|----------|
| "Invalid token" | Connection fails | Check both tokens are correct |
| "Not authorized" | Can't access channels | Check OAuth scopes |
| No DMs | Can't message app | Enable App Home Messages Tab |
| No events | Bot doesn't respond | Check Event Subscriptions |

### Token Issues

```
slack: Error: invalid_auth
```
→ One or both tokens are incorrect. Double-check:
- App Token from Socket Mode page
- Bot Token from Install App page

### Socket Mode Issues

```
slack: Socket Mode connection failed
```
→ Ensure:
- Socket Mode is enabled
- App Token has `connections:write` scope

### Permission Issues

```
slack: channel_not_found
```
→ The bot needs to be invited to the channel:
1. Go to the channel
2. Type `/invite @Moltbot`

---

## Summary

You've learned how to:

1. ✅ Create a Slack app with Socket Mode
2. ✅ Generate App Token and Bot Token
3. ✅ Configure OAuth scopes
4. ✅ Set up Event Subscriptions
5. ✅ Enable App Home for DMs
6. ✅ Install app to workspace
7. ✅ Configure Moltbot with both tokens
8. ✅ Set up channel and DM access

Slack is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [09 - Setting Up Signal](09-SETTING-UP-SIGNAL.md) - Signal messenger integration
