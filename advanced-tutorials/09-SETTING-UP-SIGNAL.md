# Tutorial 09 - Setting Up Signal

This tutorial walks you through setting up Signal as a messaging channel for Moltbot. Signal integration requires `signal-cli`, a command-line interface for the Signal messenger.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Moltbot installed (`npm install -g moltbot@latest`)
- [ ] An AI provider configured (Claude or GPT API key)
- [ ] A phone number that can receive SMS (for Signal verification)
- [ ] Java 17+ installed (required by signal-cli)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SIGNAL SETUP OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Install signal-cli                                                 │
│         │                                                                   │
│         ▼                                                                   │
│  Step 2: Link as Secondary Device                                           │
│         │                                                                   │
│         ▼                                                                   │
│  Step 3: Verify Connection                                                  │
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
│  Time: ~25 minutes                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How Signal Integration Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SIGNAL ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │  Your Phone    │◄──►│    Signal      │◄──►│  signal-cli    │             │
│  │  (Primary)     │    │   Servers      │    │  (Linked)      │             │
│  └────────────────┘    └────────────────┘    └───────┬────────┘             │
│                                                      │                      │
│                                                      ▼                      │
│                                              ┌────────────────┐             │
│                                              │   Moltbot      │             │
│                                              │   Gateway      │             │
│                                              └────────────────┘             │
│                                                                             │
│  signal-cli acts as a "linked device" (like Signal Desktop)                 │
│  Messages are end-to-end encrypted between all devices                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Install signal-cli

### Check Java Version

signal-cli requires Java 17 or newer:

```bash
java -version
```

Expected output:
```
openjdk version "17.0.x" or higher
```

If Java is not installed:
```bash
# macOS (Homebrew)
brew install openjdk@17

# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# Windows
# Download from https://adoptium.net/
```

### Install signal-cli

#### Option A: Using Moltbot Installer

```bash
moltbot onboard --channel signal
```

The wizard will offer to install signal-cli automatically.

#### Option B: Manual Installation

**macOS (Homebrew):**
```bash
brew install signal-cli
```

**Linux:**
```bash
# Download latest release
VERSION=0.13.0  # Check https://github.com/AsamK/signal-cli/releases
wget https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}.tar.gz

# Extract
tar xf signal-cli-${VERSION}.tar.gz

# Move to path
sudo mv signal-cli-${VERSION} /opt/signal-cli
sudo ln -sf /opt/signal-cli/bin/signal-cli /usr/local/bin/signal-cli
```

**Windows:**
```powershell
# Download from GitHub releases
# Extract and add to PATH
```

### Verify Installation

```bash
signal-cli --version
```

Expected output:
```
signal-cli 0.13.x
```

---

## Step 2: Link as Secondary Device

You have two options:
- **Option A**: Link to existing Signal account (recommended)
- **Option B**: Register a new phone number

### Option A: Link to Existing Account (Recommended)

This links signal-cli as a secondary device to your existing Signal account:

```bash
signal-cli link -n "Moltbot"
```

This will display a QR code in your terminal:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SIGNAL DEVICE LINKING                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Scan this QR code with Signal on your phone:                      │
│                                                                     │
│  ██████████████████████████████████                                 │
│  ██████████████████████████████████                                 │
│  ████ ▄▄▄▄▄ █ ▄▄█▄█▄▄█ ▄▄▄▄▄ ████                                 │
│  ████ █   █ █ ▀▄█▀█▄ █ █   █ ████                                 │
│  ...                                                                │
│                                                                     │
│  On your phone:                                                     │
│  1. Open Signal                                                     │
│  2. Settings → Linked Devices                                       │
│  3. "Link New Device"                                               │
│  4. Scan this QR code                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**How to scan:**
1. Open Signal on your phone
2. Go to **Settings** (tap your profile picture)
3. Select **Linked Devices**
4. Tap **Link New Device**
5. Point camera at the QR code

After successful linking:
```
Associated with: +15555550123
```

### Option B: Register New Number (Advanced)

For a dedicated bot number:

```bash
# Start registration (receives SMS)
signal-cli -u +15555550123 register

# Enter verification code
signal-cli -u +15555550123 verify 123456
```

---

## Step 3: Verify Connection

### Check Linked Account

```bash
signal-cli -u +15555550123 receive
```

If successful, this will wait for messages and show any pending ones.

### Test Sending

```bash
signal-cli -u +15555550123 send -m "Hello from signal-cli" +14445556666
```

---

## Step 4: Configure Moltbot

### Configuration File

Edit `~/.clawdbot/config.json`:

```json
{
  "channels": {
    "signal": {
      "enabled": true,
      "account": "+15555550123",
      "cliPath": "signal-cli"
    }
  }
}
```

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable Signal channel | `false` |
| `account` | Phone number (E.164) | Required |
| `cliPath` | Path to signal-cli | `"signal-cli"` |
| `dmPolicy` | DM access policy | `"pairing"` |
| `allowFrom` | Allowed sender numbers | `[]` |

---

## Step 5: Set Up Allowlist

### Understanding Sender IDs

Signal uses two types of identifiers:

1. **Phone Number (E.164)**: `+15555550123`
2. **UUID**: `uuid:123e4567-e89b-12d3-a456-426614174000`

### Configure Allowlist

```json
{
  "channels": {
    "signal": {
      "enabled": true,
      "account": "+15555550123",
      "dmPolicy": "allowlist",
      "allowFrom": [
        "+14445556666",
        "uuid:123e4567-e89b-12d3-a456-426614174000"
      ]
    }
  }
}
```

### Finding UUIDs

When you receive a message, check the logs:
```
signal: message from uuid:123e4567-... (+14445556666)
```

---

## Step 6: Start Gateway and Test

### Start the Gateway

```bash
moltbot gateway run
```

Expected output:
```
signal: starting...
signal: using account +15555550123
signal: connected ✓
```

### Send a Test Message

1. Open Signal on another phone
2. Send a message to the Moltbot number
3. Check for a response

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SIGNAL - Moltbot                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: Hello, are you there?                                         │
│                                                                     │
│  Moltbot: Hello! Yes, I'm here. I'm your personal AI assistant.    │
│           How can I help you today?                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Group Chats

### Configuration

```json
{
  "channels": {
    "signal": {
      "groupPolicy": "allowlist",
      "groups": {
        "group.abc123...=": {
          "allow": true
        }
      },
      "allowUnmentionedGroups": false
    }
  }
}
```

### Finding Group IDs

Check the logs when a message arrives in a group:
```
signal: message in group group.abc123...= from +14445556666
```

---

## Multi-Account Setup

Run multiple Signal accounts:

```json
{
  "channels": {
    "signal": {
      "enabled": true,
      "account": "+15555550123",

      "accounts": {
        "work": {
          "enabled": true,
          "account": "+15555550456",
          "dmPolicy": "allowlist",
          "allowFrom": ["+14445556666"]
        }
      }
    }
  }
}
```

Link each account separately:
```bash
# Link default account
signal-cli link -n "Moltbot"

# Link work account (after default is linked)
signal-cli -u +15555550456 link -n "Moltbot Work"
```

---

## Troubleshooting

### signal-cli Not Found

```
signal: Error: signal-cli not found
```

**Solution:** Verify installation path:
```bash
which signal-cli
```

Then update config:
```json
{
  "channels": {
    "signal": {
      "cliPath": "/usr/local/bin/signal-cli"
    }
  }
}
```

### Java Not Found

```
Error: Could not find Java
```

**Solution:** Install Java 17+ and ensure it's in PATH.

### Account Not Linked

```
signal: Error: User +15555550123 is not registered
```

**Solution:** Run the link command again:
```bash
signal-cli link -n "Moltbot"
```

### Message Decryption Failed

```
signal: Error: Failed to decrypt message
```

This can happen if:
- signal-cli was offline too long
- Key exchange is out of sync

**Solution:** Try receiving pending messages:
```bash
signal-cli -u +15555550123 receive
```

### Permission Issues (Linux)

```
signal: Error: Cannot access signal data
```

**Solution:** Check file permissions:
```bash
ls -la ~/.local/share/signal-cli/
```

Ensure the Moltbot process user owns the directory.

---

## Performance Tuning

### Daemon Mode (Advanced)

For faster response times, run signal-cli in daemon mode:

```bash
# Start daemon
signal-cli -u +15555550123 daemon --socket /tmp/signal-cli.sock
```

Then configure Moltbot to use the socket:
```json
{
  "channels": {
    "signal": {
      "daemonSocket": "/tmp/signal-cli.sock"
    }
  }
}
```

---

## Summary

You've learned how to:

1. ✅ Install signal-cli and Java
2. ✅ Link signal-cli as a secondary device
3. ✅ Verify the connection works
4. ✅ Configure Moltbot for Signal
5. ✅ Set up allowlist with phone numbers
6. ✅ Test messaging
7. ✅ Troubleshoot common issues

Signal is now ready as your personal AI assistant interface!

---

**Next Tutorial:** [10 - Setting Up iMessage](10-SETTING-UP-IMESSAGE.md) - iMessage integration (macOS only)
