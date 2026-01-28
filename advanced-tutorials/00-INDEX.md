# Moltbot Advanced Tutorials Index

Welcome to the Moltbot Advanced Tutorials. These comprehensive guides will take you from zero knowledge to complete mastery of the Moltbot personal AI assistant platform.

## Who This Is For

- **Complete Beginners**: No prior experience with Moltbot, Node.js, or messaging APIs required
- **Traditional Developers**: Coming from C/C++/Java/Python backgrounds
- **Power Users**: Looking to unlock advanced features and customizations
- **System Administrators**: Deploying Moltbot in production environments

## Tutorial Structure

Each tutorial is designed to be self-contained while building upon previous concepts. You can read them in order or jump to specific topics.

---

## Part 1: Understanding Moltbot

| Tutorial | Description | Time |
|----------|-------------|------|
| [01 - Architecture Overview](01-ARCHITECTURE-OVERVIEW.md) | Complete system architecture with ASCII diagrams | 45 min |
| [02 - Data Flow Deep Dive](02-DATA-FLOW-DEEP-DIVE.md) | How messages flow through the entire system | 30 min |
| [03 - Gateway Internals](03-GATEWAY-INTERNALS.md) | The central server explained in detail | 40 min |
| [04 - Channel Architecture](04-CHANNEL-ARCHITECTURE.md) | How messaging platforms connect to Moltbot | 35 min |

---

## Part 2: Channel Setup Guides

| Tutorial | Description | Time |
|----------|-------------|------|
| [05 - Setting Up Telegram](05-SETTING-UP-TELEGRAM.md) | Complete Telegram bot setup from scratch | 25 min |
| [06 - Setting Up WhatsApp](06-SETTING-UP-WHATSAPP.md) | WhatsApp Web integration step-by-step | 30 min |
| [07 - Setting Up Discord](07-SETTING-UP-DISCORD.md) | Discord bot creation and configuration | 35 min |
| [08 - Setting Up Slack](08-SETTING-UP-SLACK.md) | Slack app creation and Socket Mode setup | 30 min |
| [09 - Setting Up Signal](09-SETTING-UP-SIGNAL.md) | Signal messenger integration guide | 40 min |
| [10 - Setting Up iMessage](10-SETTING-UP-IMESSAGE.md) | iMessage integration (macOS only) | 20 min |

---

## Part 3: Configuration & Customization

| Tutorial | Description | Time |
|----------|-------------|------|
| [11 - Configuration Deep Dive](11-CONFIGURATION-DEEP-DIVE.md) | Complete configuration system explained | 45 min |
| [12 - Agent System](12-AGENT-SYSTEM.md) | AI agent integration and customization | 40 min |
| [13 - Security and Routing](13-SECURITY-AND-ROUTING.md) | Access control, pairing, and message routing | 35 min |

---

## Part 4: Advanced Topics

| Tutorial | Description | Time |
|----------|-------------|------|
| [14 - Plugin Development](14-PLUGIN-DEVELOPMENT.md) | Creating custom extensions and channels | 50 min |
| [15 - Power User Features](15-POWER-USER-FEATURES.md) | Advanced features for experienced users | 40 min |
| [16 - Troubleshooting Guide](16-TROUBLESHOOTING-GUIDE.md) | Comprehensive problem-solving reference | 30 min |

---

## Quick Reference

### Essential Commands

```bash
# Installation
npm install -g moltbot@latest

# First-time setup
moltbot onboard --install-daemon

# Start gateway
moltbot gateway run

# Check status
moltbot channels status

# Run diagnostics
moltbot doctor
```

### Key File Locations

| Purpose | Path |
|---------|------|
| Configuration | `~/.clawdbot/config.json` |
| Credentials | `~/.clawdbot/credentials/` |
| Sessions | `~/.clawdbot/sessions/` |
| Logs | `~/.clawdbot/logs/` |
| Agents | `~/.clawdbot/agents/` |

### Documentation Links

- **Official Docs**: https://docs.molt.bot
- **GitHub**: https://github.com/moltbot/moltbot
- **Discord Community**: https://discord.gg/clawd

---

## How to Use These Tutorials

1. **Start with Architecture** (Tutorial 01) to understand the big picture
2. **Follow Data Flow** (Tutorial 02) to see how everything connects
3. **Set up your first channel** (Tutorials 05-10) to get hands-on experience
4. **Dive into Configuration** (Tutorial 11) for customization
5. **Explore Advanced Topics** (Tutorials 14-16) as needed

Each tutorial includes:
- ASCII diagrams for visual understanding
- Step-by-step instructions with commands
- Code snippets from the actual codebase
- Troubleshooting tips
- Verification steps to confirm success

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 22+ installed (`node --version`)
- [ ] npm or pnpm installed
- [ ] Terminal/command line access
- [ ] An AI provider account (Anthropic Claude or OpenAI)
- [ ] Accounts on messaging platforms you want to use

---

Let's begin! Start with [Tutorial 01 - Architecture Overview](01-ARCHITECTURE-OVERVIEW.md).
