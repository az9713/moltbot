# Moltbot User Guide

A complete guide for setting up and using Moltbot, your personal AI assistant. This guide is written for users with little to no technical experience.

---

## Table of Contents

1. [What is Moltbot?](#1-what-is-moltbot)
2. [System Requirements](#2-system-requirements)
3. [Installation Guide](#3-installation-guide)
4. [First-Time Setup (Onboarding)](#4-first-time-setup-onboarding)
5. [Connecting Your Messaging Apps](#5-connecting-your-messaging-apps)
6. [Talking to Your AI Assistant](#6-talking-to-your-ai-assistant)
7. [Understanding Sessions and Memory](#7-understanding-sessions-and-memory)
8. [Security and Privacy](#8-security-and-privacy)
9. [Troubleshooting](#9-troubleshooting)
10. [Frequently Asked Questions](#10-frequently-asked-questions)
11. [Getting Help](#11-getting-help)

---

## 1. What is Moltbot?

### 1.1 Overview

**Moltbot** is your personal AI assistant that you control. Unlike cloud-based AI assistants, Moltbot runs on your own computer, giving you:

- **Privacy**: Your conversations stay on your devices
- **Multi-platform**: Talk to your AI through WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and more
- **Always available**: Runs as a background service, ready when you need it
- **Customizable**: Choose which AI model to use and how it behaves

### 1.2 How It Works (Simple Explanation)

```
┌─────────────────────────────────────────────────────────┐
│                      YOUR DEVICES                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ WhatsApp │  │ Telegram │  │ Discord  │  ...more     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│       └─────────────┼─────────────┘                     │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │   MOLTBOT   │  ← Runs on your computer  │
│              │   GATEWAY   │                            │
│              └──────┬──────┘                            │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  AI Model   │  ← Claude, GPT, etc.      │
│              │ (via API)   │                            │
│              └─────────────┘                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

1. You send a message through any connected app (WhatsApp, Telegram, etc.)
2. Moltbot receives the message
3. It sends your message to an AI model
4. The AI generates a response
5. Moltbot sends the response back to you through the same app

### 1.3 Key Terms

| Term | What It Means |
|------|---------------|
| **Gateway** | The Moltbot program running on your computer that handles everything |
| **Channel** | A messaging app connection (WhatsApp, Telegram, etc.) |
| **Session** | A conversation with the AI, including its memory of what you discussed |
| **Provider** | The AI service you're using (Anthropic Claude, OpenAI GPT, etc.) |

---

## 2. System Requirements

### 2.1 Supported Operating Systems

| Platform | Support Level | Notes |
|----------|--------------|-------|
| **macOS** | Full support | macOS 12 (Monterey) or later |
| **Linux** | Full support | Ubuntu 20.04+, Debian 11+, or similar |
| **Windows** | Via WSL2 | Windows 10/11 with WSL2 (strongly recommended) |

### 2.2 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB or more |
| Storage | 1 GB free | 5 GB free |
| Internet | Required | Stable broadband |

### 2.3 Software Requirements

- **Node.js** version 22 or higher (we'll show you how to install this)
- An account with an AI provider (Anthropic, OpenAI, or others)

---

## 3. Installation Guide

### 3.1 Installing on macOS

#### Step 1: Open Terminal

1. Press `Cmd + Space` to open Spotlight
2. Type "Terminal" and press Enter
3. A window with a command prompt will open

#### Step 2: Install Homebrew (if not already installed)

Homebrew is a package manager that makes installing software easy.

Copy and paste this command, then press Enter:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. This may take a few minutes.

#### Step 3: Install Node.js

```bash
brew install node@22
```

Verify it installed correctly:

```bash
node --version
```

You should see something like `v22.x.x`.

#### Step 4: Install Moltbot

```bash
npm install -g moltbot@latest
```

#### Step 5: Verify Installation

```bash
moltbot --version
```

You should see the version number (e.g., `2026.1.26`).

### 3.2 Installing on Linux (Ubuntu/Debian)

#### Step 1: Open Terminal

- On Ubuntu: Press `Ctrl + Alt + T`
- Or find "Terminal" in your applications menu

#### Step 2: Install Node.js

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs
```

Verify installation:

```bash
node --version
```

#### Step 3: Install Moltbot

```bash
sudo npm install -g moltbot@latest
```

#### Step 4: Verify Installation

```bash
moltbot --version
```

### 3.3 Installing on Windows (via WSL2)

Windows Subsystem for Linux (WSL2) lets you run Linux on Windows. This is the recommended way to run Moltbot on Windows.

#### Step 1: Enable WSL2

Open **PowerShell as Administrator**:
1. Right-click the Start button
2. Select "Windows Terminal (Admin)" or "PowerShell (Admin)"

Run this command:

```powershell
wsl --install
```

Restart your computer when prompted.

#### Step 2: Set Up Ubuntu

After restart, Ubuntu will install automatically. Follow the prompts to:
1. Create a username (lowercase, no spaces)
2. Create a password

#### Step 3: Install Node.js in WSL

Open Ubuntu from the Start menu, then run:

```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 4: Install Moltbot

```bash
sudo npm install -g moltbot@latest
```

#### Step 5: Verify Installation

```bash
moltbot --version
```

---

## 4. First-Time Setup (Onboarding)

The onboarding wizard guides you through setting up Moltbot for the first time.

### 4.1 Start the Wizard

```bash
moltbot onboard --install-daemon
```

The `--install-daemon` flag makes Moltbot start automatically when your computer boots.

### 4.2 What the Wizard Does

The wizard will guide you through:

1. **Welcome Screen** - Basic information about Moltbot
2. **AI Provider Setup** - Connecting to Claude, GPT, or another AI
3. **Channel Selection** - Choosing which messaging apps to connect
4. **Channel Configuration** - Setting up each messaging app
5. **Security Settings** - Configuring who can message your assistant
6. **Completion** - Starting the gateway service

### 4.3 AI Provider Setup

You'll need an account with at least one AI provider:

#### Option A: Anthropic (Claude) - Recommended

1. Go to [anthropic.com](https://www.anthropic.com)
2. Sign up for Claude Pro or Claude Max
3. During onboarding, select "Anthropic" and sign in with OAuth

#### Option B: OpenAI (GPT)

1. Go to [openai.com](https://openai.com)
2. Sign up for ChatGPT Plus
3. During onboarding, select "OpenAI" and sign in with OAuth

#### Option C: API Key (Advanced)

If you have API keys:
1. Select "API Key" during onboarding
2. Enter your API key when prompted

### 4.4 After Onboarding

Once the wizard completes, Moltbot will be running! You can verify with:

```bash
moltbot channels status
```

---

## 5. Connecting Your Messaging Apps

### 5.1 WhatsApp Setup

WhatsApp uses QR code linking, similar to WhatsApp Web.

#### Step 1: Start WhatsApp Connection

```bash
moltbot channels connect whatsapp
```

#### Step 2: Scan QR Code

1. A QR code will appear in your terminal
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code with your phone

#### Step 3: Verify Connection

```bash
moltbot channels status
```

You should see WhatsApp listed as "connected".

**Important Notes:**
- Your phone must stay connected to the internet
- WhatsApp Web sessions may expire; re-run the connect command if needed

### 5.2 Telegram Setup

Telegram uses a bot token from BotFather.

#### Step 1: Create a Bot

1. Open Telegram and search for `@BotFather`
2. Send the message: `/newbot`
3. Follow the prompts to name your bot
4. BotFather will give you a **token** (looks like `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`)
5. Save this token!

#### Step 2: Configure in Moltbot

```bash
moltbot config set channels.telegram.token "YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the actual token.

#### Step 3: Connect

```bash
moltbot channels connect telegram
```

#### Step 4: Start Chatting

Find your bot in Telegram by its username and start a conversation!

### 5.3 Discord Setup

Discord requires creating a bot application.

#### Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "My Moltbot")
4. Click **"Create"**

#### Step 2: Create a Bot

1. In your application, go to the **"Bot"** section
2. Click **"Add Bot"**
3. Under **"Token"**, click **"Copy"**
4. Save this token!

#### Step 3: Set Bot Permissions

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Send Messages`, `Read Message History`, `View Channels`
4. Copy the generated URL
5. Open this URL in your browser to add the bot to your server

#### Step 4: Configure in Moltbot

```bash
moltbot config set channels.discord.token "YOUR_TOKEN_HERE"
```

#### Step 5: Connect

```bash
moltbot channels connect discord
```

### 5.4 Slack Setup

Slack requires creating a Slack App.

#### Step 1: Create a Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name your app and select your workspace

#### Step 2: Configure Permissions

1. Go to **"OAuth & Permissions"**
2. Add these **Bot Token Scopes**:
   - `chat:write`
   - `im:history`
   - `im:read`
   - `im:write`
3. Click **"Install to Workspace"**
4. Copy the **"Bot User OAuth Token"**

#### Step 3: Configure in Moltbot

```bash
moltbot config set channels.slack.token "YOUR_TOKEN_HERE"
```

#### Step 4: Connect

```bash
moltbot channels connect slack
```

### 5.5 Signal Setup

Signal requires the signal-cli tool.

**Note**: Signal setup is more complex. See the full documentation at [docs.molt.bot/channels/signal](https://docs.molt.bot/channels/signal).

### 5.6 iMessage Setup (macOS Only)

iMessage integration is available only on macOS.

```bash
moltbot channels connect imessage
```

Follow the prompts to grant necessary permissions.

### 5.7 Viewing All Connected Channels

To see which channels are connected:

```bash
moltbot channels status
```

For more detailed information:

```bash
moltbot channels status --probe
```

---

## 6. Talking to Your AI Assistant

### 6.1 Basic Usage

Once channels are connected, simply send a message through any connected app:

**You**: "What's the capital of France?"
**Moltbot**: "The capital of France is Paris..."

### 6.2 Direct Messages vs Group Chats

#### Direct Messages

- Messages sent directly to your bot are processed automatically
- Great for private conversations

#### Group Chats

In group chats, Moltbot responds when:
- You mention the bot by name
- You reply to a bot message
- You use a trigger word (if configured)

### 6.3 Command Line Usage

You can also talk to Moltbot directly from the command line:

```bash
# Simple message
moltbot agent --message "What's the weather like?"

# With extended thinking
moltbot agent --message "Explain quantum computing" --thinking high
```

### 6.4 Sending Messages Through Channels

Send a message through a specific channel:

```bash
# Via Telegram
moltbot message send --channel telegram --to @username --message "Hello!"

# Via WhatsApp
moltbot message send --channel whatsapp --to +1234567890 --message "Hello!"
```

### 6.5 Voice Interaction

On supported platforms (macOS, iOS, Android), you can use voice:

- **Voice Wake**: Say a wake word to activate
- **Talk Mode**: Have a conversation using voice

See [docs.molt.bot/nodes/talk](https://docs.molt.bot/nodes/talk) for setup.

---

## 7. Understanding Sessions and Memory

### 7.1 What is a Session?

A **session** is a conversation with your AI assistant. It includes:

- All messages exchanged
- The AI's memory of the conversation
- Any context or personality you've set

### 7.2 Session Types

| Type | Description |
|------|-------------|
| **Main** | Your primary conversation, used for direct messages |
| **Group** | Separate sessions for each group chat |
| **Isolated** | Special sessions that don't share memory |

### 7.3 Managing Sessions

#### View Active Sessions

```bash
moltbot sessions list
```

#### Clear a Session (Start Fresh)

```bash
moltbot sessions clear
```

#### View Session History

```bash
moltbot sessions history --limit 20
```

### 7.4 How Memory Works

The AI remembers your conversation within a session. This means:

- It knows what you discussed earlier
- It can reference previous topics
- Context builds over time

**Note**: Very long conversations may have older messages summarized to fit within AI context limits.

---

## 8. Security and Privacy

### 8.1 Who Can Message Your Bot?

By default, Moltbot uses **pairing mode** to prevent strangers from using your AI:

1. Unknown senders receive a pairing code
2. You must approve them with: `moltbot pairing approve <channel> <code>`
3. Once approved, they can chat with your bot

### 8.2 Changing Security Settings

#### View Current Policy

```bash
moltbot config get dmPolicy
```

#### Allow Anyone (Not Recommended)

```bash
moltbot config set dmPolicy open
```

#### Require Pairing (Recommended)

```bash
moltbot config set dmPolicy pairing
```

### 8.3 Allowlist Management

Add someone to your allowlist:

```bash
moltbot pairing approve telegram abc123
```

View approved users:

```bash
moltbot pairing list
```

Remove someone:

```bash
moltbot pairing revoke telegram @username
```

### 8.4 Running Diagnostics

Check for security issues:

```bash
moltbot doctor
```

This will warn you about:
- Open DM policies
- Misconfigured channels
- Potential security risks

### 8.5 Where Data is Stored

All your data stays local:

| Data | Location |
|------|----------|
| Configuration | `~/.clawdbot/config.json` |
| Credentials | `~/.clawdbot/credentials/` |
| Sessions | `~/.clawdbot/sessions/` |
| Logs | `~/.clawdbot/logs/` |

**Nothing is sent to Moltbot servers.** Only the AI provider receives your messages.

---

## 9. Troubleshooting

### 9.1 Gateway Won't Start

**Symptoms**: Error when running `moltbot gateway run`

**Solutions**:

1. **Check if already running**:
   ```bash
   moltbot channels status
   ```

2. **Check if port is in use**:
   ```bash
   # macOS/Linux
   lsof -i :18789

   # Windows (in PowerShell)
   netstat -ano | findstr :18789
   ```

3. **Try a different port**:
   ```bash
   moltbot gateway run --port 18790
   ```

4. **Run diagnostics**:
   ```bash
   moltbot doctor
   ```

### 9.2 WhatsApp Disconnects

**Symptoms**: WhatsApp shows as disconnected

**Solutions**:

1. **Reconnect**:
   ```bash
   moltbot channels connect whatsapp
   ```

2. **Check your phone**:
   - Is your phone connected to the internet?
   - Is WhatsApp running?

3. **Re-link device**:
   - On phone: WhatsApp → Settings → Linked Devices
   - Remove the old link
   - Run connect command again

### 9.3 Telegram Bot Not Responding

**Symptoms**: Messages to Telegram bot get no response

**Solutions**:

1. **Check connection**:
   ```bash
   moltbot channels status --probe
   ```

2. **Verify token**:
   ```bash
   moltbot config get channels.telegram.token
   ```

3. **Restart the channel**:
   ```bash
   moltbot channels restart telegram
   ```

### 9.4 AI Not Responding

**Symptoms**: Messages are received but AI doesn't reply

**Solutions**:

1. **Check provider status**:
   ```bash
   moltbot providers status
   ```

2. **Verify credentials**:
   ```bash
   moltbot login
   ```

3. **Check logs**:
   ```bash
   moltbot logs --tail 50
   ```

### 9.5 Permission Errors (macOS)

**Symptoms**: Errors about permissions or access

**Solutions**:

1. Open **System Preferences** → **Security & Privacy**
2. Check the **Privacy** tab
3. Grant permissions for:
   - Accessibility (for some features)
   - Full Disk Access (if needed)
   - Automation (for iMessage)

### 9.6 Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Gateway not running | Start gateway: `moltbot gateway run` |
| `EADDRINUSE` | Port already in use | Use different port or stop other process |
| `ETIMEDOUT` | Network timeout | Check internet connection |
| `Unauthorized` | Invalid credentials | Re-run `moltbot login` |

### 9.7 Getting More Help

If none of these solutions work:

1. Run full diagnostics:
   ```bash
   moltbot doctor --verbose
   ```

2. Check the logs:
   ```bash
   moltbot logs --tail 100
   ```

3. Join the Discord community: [discord.gg/clawd](https://discord.gg/clawd)

---

## 10. Frequently Asked Questions

### General Questions

**Q: Is Moltbot free?**
A: Moltbot itself is free and open source. However, you'll need a subscription to an AI provider (Anthropic Claude or OpenAI) to use it.

**Q: Does Moltbot store my conversations?**
A: Conversations are stored locally on your computer. Nothing is sent to Moltbot servers. The AI provider receives your messages to generate responses.

**Q: Can I use Moltbot offline?**
A: No, Moltbot requires an internet connection to communicate with AI providers and messaging platforms.

### Setup Questions

**Q: How do I update Moltbot?**
A: Run:
```bash
npm install -g moltbot@latest
```

**Q: Can I run Moltbot on multiple computers?**
A: Yes, but each computer needs its own installation and configuration.

**Q: How do I completely uninstall Moltbot?**
A:
```bash
npm uninstall -g moltbot
rm -rf ~/.clawdbot
```

### Usage Questions

**Q: How do I change the AI model?**
A: Configure it in settings:
```bash
moltbot config set model "claude-3-opus-20240229"
```

**Q: Can multiple people use my Moltbot?**
A: Yes, add them to the allowlist:
```bash
moltbot pairing approve <channel> <code>
```

**Q: How do I reset everything and start fresh?**
A:
```bash
moltbot doctor --reset
# Then run onboarding again
moltbot onboard
```

### Troubleshooting Questions

**Q: Why is my bot slow?**
A: Response time depends on:
- Your internet speed
- AI provider response time
- Model complexity (opus is slower than haiku)

**Q: Can I see what the AI is thinking?**
A: Use thinking mode:
```bash
moltbot agent --message "Your question" --thinking high
```

---

## 11. Getting Help

### Documentation

- Full documentation: [docs.molt.bot](https://docs.molt.bot)
- Getting started guide: [docs.molt.bot/start/getting-started](https://docs.molt.bot/start/getting-started)
- Channel-specific guides: [docs.molt.bot/channels](https://docs.molt.bot/channels)

### Community

- Discord server: [discord.gg/clawd](https://discord.gg/clawd)
- GitHub issues: [github.com/moltbot/moltbot/issues](https://github.com/moltbot/moltbot/issues)

### Reporting Issues

When reporting a problem, please include:

1. Your operating system (macOS, Linux, Windows/WSL)
2. Node.js version: `node --version`
3. Moltbot version: `moltbot --version`
4. Error messages (copy the full output)
5. Steps to reproduce the issue

### Quick Diagnostic Command

Run this to gather helpful diagnostic info:

```bash
moltbot doctor --verbose 2>&1 | tee moltbot-diagnostic.txt
```

This creates a file you can share when asking for help.

---

## Quick Reference Card

### Essential Commands

| What | Command |
|------|---------|
| Start onboarding | `moltbot onboard --install-daemon` |
| Start gateway | `moltbot gateway run` |
| Check status | `moltbot channels status` |
| Connect channel | `moltbot channels connect <channel>` |
| Talk to AI | `moltbot agent --message "Your question"` |
| Send message | `moltbot message send --to <recipient> --message "Text"` |
| Run diagnostics | `moltbot doctor` |
| View logs | `moltbot logs --tail 50` |
| Get help | `moltbot --help` |

### Configuration Paths

| What | Path |
|------|------|
| Config file | `~/.clawdbot/config.json` |
| Credentials | `~/.clawdbot/credentials/` |
| Sessions | `~/.clawdbot/sessions/` |
| Logs | `~/.clawdbot/logs/` |

### Default Ports

| Service | Port |
|---------|------|
| Gateway HTTP | 18789 |
| WebSocket | 18789 |

---

**Welcome to Moltbot!** If you have questions, don't hesitate to ask in the Discord community or check the documentation. Enjoy your personal AI assistant!
