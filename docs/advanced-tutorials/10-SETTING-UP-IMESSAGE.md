# Tutorial 10 - Setting Up iMessage

This tutorial walks you through setting up iMessage as a messaging channel for Moltbot. **This feature is macOS only** and requires a Mac with Messages configured.

---

## Prerequisites

Before starting, ensure you have:

- [ ] A Mac running macOS 11 (Big Sur) or later
- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] Messages app configured with your Apple ID
- [ ] `imsg` CLI tool (or BlueBubbles for advanced setups)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IMESSAGE SETUP OVERVIEW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Verify macOS and Messages Setup                                    │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Install imsg CLI                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Grant Required Permissions                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 4: Configure Moltbot                                                  │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Set Up Allowlist                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  Step 6: Start Gateway and Test                                             │
│                                                                             │
│  Time: ~15 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How iMessage Integration Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IMESSAGE ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │  Messages.app  │◄──►│   iCloud /     │◄──►│  imsg CLI      │             │
│  │  (macOS)       │    │   Apple        │    │  (reads DB)    │             │
│  └────────────────┘    └────────────────┘    └───────┬────────┘             │
│         │                                            │                      │
│         │                                            ▼                      │
│         │                                    ┌────────────────┐             │
│         └────────────────────────────────────│   Moltbot      │             │
│               AppleScript for sending        │   Gateway      │             │
│                                              └────────────────┘             │
│                                                                             │
│  iMessage integration uses:                                                 │
│  • SQLite database access (for reading messages)                            │
│  • AppleScript (for sending messages via Messages.app)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Verify macOS and Messages Setup

### Check Messages is Configured

1. Open **Messages** app
2. Verify you're signed in with your Apple ID
3. Ensure Messages is receiving/sending properly

### Check macOS Version

```bash
sw_vers
```

Expected output:
```
ProductName:    macOS
ProductVersion: 14.x (or 11+)
```

---

## Step 2: Install imsg CLI

### Option A: Using Homebrew (Recommended)

```bash
brew install imsg
```

### Option B: Manual Installation

Download from [imsg releases](https://github.com/your-imsg-repo/releases) and add to PATH.

### Verify Installation

```bash
imsg --version
```

Expected output:
```
imsg version 1.x.x
```

---

## Step 3: Grant Required Permissions

iMessage integration requires special macOS permissions.

### Full Disk Access

1. Open **System Preferences** (or System Settings on newer macOS)
2. Go to **Security & Privacy** → **Privacy**
3. Select **Full Disk Access**
4. Click the lock icon to make changes
5. Add your terminal app (Terminal.app or iTerm)
6. Add `imsg` if it appears separately

```
┌─────────────────────────────────────────────────────────────────────┐
│              FULL DISK ACCESS                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Allow the apps below to access all files on your computer.        │
│                                                                     │
│  [✓] Terminal                                                       │
│  [✓] iTerm                                                          │
│  [✓] Visual Studio Code                                             │
│  [ ] ...                                                            │
│                                                                     │
│  ⚠️  This is required to read the Messages database                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Automation Permission

When you first run Moltbot with iMessage, you'll see a prompt:

```
┌─────────────────────────────────────────────────────────────────────┐
│              AUTOMATION PERMISSION                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Terminal" wants access to control "Messages"                     │
│                                                                     │
│  This will allow the script to perform actions within "Messages"   │
│                                                                     │
│                                    [Don't Allow] [OK]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Click "OK"** to allow sending messages.

---

## Step 4: Configure Moltbot

### Basic Configuration

Edit `~/.clawdbot/config.json`:

```json
{
  "channels": {
    "imessage": {
      "enabled": true,
      "cliPath": "imsg",
      "service": "auto"
    }
  }
}
```

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable iMessage channel | `false` |
| `cliPath` | Path to imsg CLI | `"imsg"` |
| `service` | Message service type | `"auto"` |
| `dmPolicy` | DM access policy | `"pairing"` |
| `allowFrom` | Allowed sender handles | `[]` |

### Service Types

- `"auto"`: Automatically detect iMessage vs SMS
- `"imessage"`: Force iMessage only
- `"sms"`: Force SMS only (if using iPhone as relay)

---

## Step 5: Set Up Allowlist

### Handle Formats

iMessage handles can be:
- Phone number: `+15555550123`
- Email: `user@example.com`
- Chat ID: `chat_id:123`

### Configure Allowlist

```json
{
  "channels": {
    "imessage": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "allowFrom": [
        "+15555550123",
        "user@example.com"
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
imessage: starting...
imessage: using imsg at /usr/local/bin/imsg
imessage: connected ✓
```

### Verify Database Access

```bash
imsg chats --limit 5
```

This should list your recent conversations.

### Send a Test Message

Have someone send you an iMessage, or message yourself from another Apple device.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  MESSAGES - Your Friend                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Friend: Hey, are you there?                                        │
│                                                                     │
│  You (Moltbot): Hello! Yes, I'm here. I'm your AI assistant.       │
│                 How can I help you today?                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Group Chats

### Configuration

```json
{
  "channels": {
    "imessage": {
      "groupPolicy": "allowlist",
      "groups": {
        "chat_id:123": {
          "allow": true
        }
      }
    }
  }
}
```

### Finding Chat IDs

```bash
imsg chats --format json
```

Look for `chat_id` or `chat_identifier` in the output.

---

## Alternative: BlueBubbles

For more advanced setups (especially if your Mac isn't always on), consider [BlueBubbles](https://bluebubbles.app/).

### BlueBubbles Setup

1. Install BlueBubbles server on your Mac
2. Configure BlueBubbles to expose API
3. Update Moltbot config:

```json
{
  "channels": {
    "bluebubbles": {
      "enabled": true,
      "httpUrl": "http://localhost:1234",
      "password": "your-server-password"
    }
  }
}
```

BlueBubbles provides:
- Web API access
- Push notifications
- Remote access via Ngrok

---

## Troubleshooting

### Permission Denied

```
imessage: Error: Cannot access Messages database
```

**Solutions:**
1. Grant Full Disk Access (see Step 3)
2. Restart Terminal after granting permission
3. Check database location:
   ```bash
   ls -la ~/Library/Messages/chat.db
   ```

### AppleScript Errors

```
imessage: Error: AppleScript execution failed
```

**Solutions:**
1. Grant Automation permission
2. Open Messages app (it must be running)
3. Check if Messages is signed in

### Message Not Sending

```
imessage: send failed: service unavailable
```

**Solutions:**
1. Verify Messages app is working
2. Check internet connection
3. Verify recipient is valid iMessage user

### Slow Message Detection

iMessage polling can have delays.

**Optimization:**
```json
{
  "channels": {
    "imessage": {
      "pollInterval": 1000
    }
  }
}
```

(Default is 2000ms = 2 seconds)

---

## Security Considerations

### Privacy

- Messages database contains all your iMessage history
- Full Disk Access grants broad permissions
- Consider using a dedicated Mac for Moltbot

### Recommendations

1. Use a dedicated user account for Moltbot
2. Enable FileVault encryption
3. Keep macOS updated
4. Use allowlist mode (not open)

---

## Limitations

iMessage integration has these limitations:

| Feature | Status |
|---------|--------|
| Send text messages | ✅ Supported |
| Receive messages | ✅ Supported |
| Group chats | ✅ Supported |
| Tapbacks/reactions | ⚠️ Limited |
| Effects | ❌ Not supported |
| Attachments | ⚠️ Limited |
| Rich links | ❌ Not supported |

---

## Summary

You've learned how to:

1. ✅ Verify macOS and Messages setup
2. ✅ Install imsg CLI
3. ✅ Grant required permissions (Full Disk Access, Automation)
4. ✅ Configure Moltbot for iMessage
5. ✅ Set up allowlist with handles
6. ✅ Test messaging
7. ✅ Troubleshoot common issues

iMessage is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [11 - Configuration Deep Dive](11-CONFIGURATION-DEEP-DIVE.md) - Complete configuration system explained
