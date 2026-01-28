# Tutorial 06 - Setting Up WhatsApp

This tutorial walks you through setting up WhatsApp as a messaging channel for Moltbot. Unlike Telegram, WhatsApp requires linking a phone number via QR code, similar to WhatsApp Web.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] A phone with WhatsApp installed
- [ ] A phone number that can receive WhatsApp messages

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHATSAPP SETUP OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Run Moltbot Onboarding                                             │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Scan QR Code with WhatsApp                                         │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Configure Access (Personal vs. Separate Phone)                     │
│         │                                                                   │
│         ▼                                                                   │
│  Step 4: Set Up Allowlist                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  Step 5: Start Gateway and Test                                             │
│                                                                             │
│  Time: ~10 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How WhatsApp Integration Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐         ┌────────────────┐         ┌────────────────┐   │
│  │  Your Phone    │◄───────►│  WhatsApp      │◄───────►│   Moltbot      │   │
│  │  (Primary)     │         │  Servers       │         │   Gateway      │   │
│  └────────────────┘         └────────────────┘         └────────────────┘   │
│         │                          │                          │             │
│         │                          │                          │             │
│         └─────── Same Session ─────┴──────── Linked ──────────┘             │
│                                                                             │
│  Moltbot uses the Baileys library to act as a "linked device"               │
│  (like WhatsApp Web or Desktop), NOT as a separate account.                 │
│                                                                             │
│  This means:                                                                │
│  • Your phone must stay connected to the internet                           │
│  • Messages appear on both your phone and Moltbot                           │
│  • You can still use WhatsApp normally on your phone                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Run Moltbot Onboarding

Start the WhatsApp setup wizard:

```bash
moltbot onboard --channel whatsapp
```

Or run the full onboarding and select WhatsApp:

```bash
moltbot onboard
```

---

## Step 2: Scan QR Code

When prompted, the wizard will display a QR code in your terminal:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WhatsApp Linking                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Scan the QR with WhatsApp on your phone.                          │
│  Credentials are stored under ~/.clawdbot/sessions/whatsapp/       │
│  for future runs.                                                   │
│                                                                     │
│  ██████████████████████████████████                                 │
│  ██████████████████████████████████                                 │
│  ████ ▄▄▄▄▄ █ ▄▄█▄█▄▄█ ▄▄▄▄▄ ████                                 │
│  ████ █   █ █ ▀▄█▀█▄ █ █   █ ████                                 │
│  ████ █▄▄▄█ █▀▀ ▄▄ ▀▄█ █▄▄▄█ ████                                 │
│  ████▄▄▄▄▄▄▄█ ▀ ▀ ▀▄█▄▄▄▄▄▄▄████                                 │
│  ████ ▄▀▄▄ ▄▀▀██▀▀█▄▄▄▀▄▄█▀▀████                                 │
│  ████▄█▄█▄█▄█▄▀▄▄▄█▄▀▄▄█▄▀▄▀████                                 │
│  ████ ▄▄▄▄▄ █▄▀▀▄▄█▄ ▀▀ █▄▀█████                                 │
│  ████ █   █ █▀▀▄▀▀▄█▀▄▄▄▀▄██████                                 │
│  ████ █▄▄▄█ █ ▄▄▄▄▀▄▀▄▀ ▄▄█▄████                                 │
│  ██████████████████████████████████                                 │
│                                                                     │
│  Link WhatsApp now (QR)? (y/n): _                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### How to Scan:

1. **Open WhatsApp** on your phone
2. **Go to Settings** (tap the three dots menu)
3. **Select "Linked Devices"**
4. **Tap "Link a Device"**
5. **Point your phone's camera at the QR code**

The QR code will refresh every 20 seconds if not scanned.

### If QR Code Doesn't Appear:

- Make sure your terminal supports ANSI graphics
- Try a different terminal (e.g., iTerm2, Windows Terminal)
- Use `moltbot channels login whatsapp` after setup

---

## Step 3: Choose Your Setup Mode

The wizard will ask how you want to use WhatsApp:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WhatsApp phone setup                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ◯ This is my personal phone number                                 │
│  ◯ Separate phone just for Moltbot                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Option A: Personal Phone (Recommended for Most Users)

Choose this if:
- You're using your everyday WhatsApp number
- You want to message yourself to talk to the AI
- Only you (or specific people) will use it

**What happens:**
- `dmPolicy` is set to `allowlist`
- `selfChatMode` is enabled (you can message yourself)
- Your phone number is automatically added to `allowFrom`

### Option B: Separate Phone

Choose this if:
- You have a dedicated phone/SIM for the bot
- Multiple people will message the bot
- You want more control over access

**What happens:**
- You choose a DM policy (pairing, allowlist, open, disabled)
- You configure `allowFrom` separately

---

## Step 4: Configure Allowlist

If you chose "Personal Phone", the wizard adds your number automatically:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WhatsApp Personal Phone                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  We need the sender/owner number so Moltbot can allowlist you.     │
│                                                                     │
│  Your personal WhatsApp number (the phone you will message from):   │
│  > +15555550123                                                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Personal phone mode enabled.                                       │
│  - dmPolicy set to allowlist (pairing skipped)                      │
│  - allowFrom includes +15555550123                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phone Number Format

Use E.164 format (international format):
- ✅ `+15555550123` (US)
- ✅ `+447700900123` (UK)
- ✅ `+4915551234567` (Germany)
- ❌ `555-550-0123` (missing country code)
- ❌ `05555550123` (missing +)

---

## Step 5: Start Gateway and Test

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
│  ─────────────────────────────────────────────────────────────────  │
│  Channels:                                                          │
│    whatsapp: connecting...                                          │
│    whatsapp: connected ✓                                            │
│  ─────────────────────────────────────────────────────────────────  │
│  Gateway ready!                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Send a Test Message

**If using Personal Phone (Self-Chat Mode):**

1. Open WhatsApp
2. Find your own contact (or save your number as a contact)
3. Open the chat with yourself
4. Send: "Hello, are you there?"
5. Moltbot will reply in the same chat!

**If using Separate Phone:**

1. Open WhatsApp on your personal phone
2. Send a message to the Moltbot phone number
3. You should receive a response

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WhatsApp - Self Chat                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: Hello, are you there?                                         │
│                                                                     │
│  Moltbot: Hello! Yes, I'm here and ready to help. I'm your        │
│           personal AI assistant. What can I help you with?          │
│                                                                     │
│  You: What's the capital of France?                                 │
│                                                                     │
│  Moltbot: The capital of France is Paris. It's the most populous  │
│           city in France and serves as the country's political,    │
│           economic, and cultural center.                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Understanding WhatsApp Configuration

### Full Configuration Example

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,

      "dmPolicy": "allowlist",
      "allowFrom": ["+15555550123", "+447700900456"],

      "selfChatMode": true,

      "groupPolicy": "allowlist",
      "groups": {
        "120363041234567890@g.us": {
          "allow": true
        }
      },

      "allowUnmentionedGroups": false,

      "authDir": null
    }
  }
}
```

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable WhatsApp channel | `false` |
| `dmPolicy` | DM access policy | `"pairing"` |
| `allowFrom` | Phone numbers allowed to message | `[]` |
| `selfChatMode` | Enable messaging yourself | `false` |
| `groupPolicy` | Group chat access policy | `"allowlist"` |
| `allowUnmentionedGroups` | Respond without @mention | `false` |
| `authDir` | Custom session storage path | `null` (default location) |

---

## Group Chats

### Finding Group IDs

WhatsApp group IDs look like: `120363041234567890@g.us`

To find a group ID:

1. Start the gateway with debug logging:
```bash
moltbot gateway run --log-level debug
```

2. Send a message in the group (mention the bot)

3. Check the logs for the group ID:
```
whatsapp: message from +15555550123 in group 120363041234567890@g.us
```

### Configuring Group Access

```json
{
  "channels": {
    "whatsapp": {
      "groupPolicy": "allowlist",
      "groups": {
        "120363041234567890@g.us": {
          "allow": true,
          "allowUnmentioned": false
        }
      }
    }
  }
}
```

### Mention Detection

WhatsApp doesn't have native @mentions like Discord/Slack. Moltbot detects:
- Messages that start with the bot's name
- Messages that contain the bot's phone number
- Reply chains to the bot

---

## Multi-Account Setup

Run multiple WhatsApp accounts:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,

      "accounts": {
        "personal": {
          "enabled": true,
          "dmPolicy": "allowlist",
          "selfChatMode": true,
          "allowFrom": ["+15555550123"]
        },
        "work": {
          "enabled": true,
          "dmPolicy": "pairing",
          "allowFrom": []
        }
      }
    }
  }
}
```

### Linking Multiple Accounts

```bash
# Link the default account
moltbot channels login whatsapp

# Link a named account
moltbot channels login whatsapp --account personal
moltbot channels login whatsapp --account work
```

Each account has its own QR code and session storage.

---

## Session Management

### Where Sessions Are Stored

```
~/.clawdbot/
└── sessions/
    └── whatsapp/
        ├── default/        # Default account
        │   ├── creds.json  # Credentials
        │   └── ...         # Keys and state
        ├── personal/       # Named account
        │   └── ...
        └── work/           # Named account
            └── ...
```

### Re-Linking (If Disconnected)

If your session becomes invalid:

```bash
# Re-link via wizard
moltbot channels login whatsapp

# Or delete session and re-link
rm -rf ~/.clawdbot/sessions/whatsapp/default
moltbot channels login whatsapp
```

### Session Persistence

The session survives gateway restarts. You only need to scan the QR code once (unless you:
- Delete the session files
- Log out from your phone's Linked Devices
- Get disconnected for too long)

---

## Troubleshooting

### Common Issues

| Problem | Symptom | Solution |
|---------|---------|----------|
| QR code not showing | Blank terminal area | Use a terminal with ANSI support |
| Scan failed | QR keeps refreshing | Ensure phone is connected to internet |
| "Not linked" status | Session expired | Re-run `moltbot channels login whatsapp` |
| No response in self-chat | `selfChatMode` disabled | Set `selfChatMode: true` in config |
| No response from others | `allowFrom` missing | Add their phone number to `allowFrom` |

### Connection Issues

```
whatsapp: connection closed, reconnecting...
whatsapp: reconnect attempt 1/5
```

This is normal - the bot will reconnect automatically.

If reconnection fails repeatedly:
1. Check your internet connection
2. Check if your phone's WhatsApp is online
3. Try re-linking the device

### Debugging

Enable verbose logging:

```bash
moltbot logs --follow --filter whatsapp
```

### Phone Disconnected Warning

WhatsApp requires your phone to stay connected. If you see:

```
whatsapp: primary device disconnected
```

Check that:
- Your phone has internet access
- WhatsApp is not force-closed
- Battery optimization isn't killing WhatsApp

---

## Security Considerations

### Linked Device Limitations

As a linked device, Moltbot can:
- ✅ Send and receive messages
- ✅ See message history (limited)
- ✅ Access contacts and groups

As a linked device, Moltbot cannot:
- ❌ Change account settings
- ❌ Access payment features
- ❌ Make calls

### Privacy

- Messages are end-to-end encrypted
- Session keys are stored locally
- Moltbot doesn't send data to third parties
- WhatsApp's normal privacy policies apply

### Securing Your Session

Protect your session files:

```bash
# Make session directory private
chmod 700 ~/.clawdbot/sessions/whatsapp/
```

---

## Summary

You've learned how to:

1. ✅ Understand how WhatsApp integration works (linked device)
2. ✅ Run the onboarding wizard and scan QR code
3. ✅ Choose between personal phone and separate phone setup
4. ✅ Configure allowlist with phone numbers
5. ✅ Set up self-chat mode
6. ✅ Configure group access
7. ✅ Manage sessions and troubleshoot issues

WhatsApp is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [07 - Setting Up Discord](07-SETTING-UP-DISCORD.md) - Discord bot setup
