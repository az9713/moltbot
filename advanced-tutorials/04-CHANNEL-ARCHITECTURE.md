# Tutorial 04 - Channel Architecture

This tutorial explains how messaging channels (Telegram, WhatsApp, Discord, Slack, etc.) are architected in Moltbot. You'll learn how channels are implemented as plugins, how they communicate with the Gateway, and how messages are normalized across platforms.

---

## What is a Channel?

A **channel** is an abstraction layer that connects a messaging platform to Moltbot:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHANNEL ABSTRACTION CONCEPT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Real World                         Moltbot                                 │
│  ┌───────────────┐                 ┌───────────────────────────────────┐    │
│  │               │                 │                                   │    │
│  │   Telegram    │◄───Channel───► │  Unified Message Format           │    │
│  │   WhatsApp    │                 │                                   │    │
│  │   Discord     │                 │  • sender: who sent it            │    │
│  │   Slack       │                 │  • content: what they said        │    │
│  │   Signal      │                 │  • channel: where it came from    │    │
│  │   iMessage    │                 │  • metadata: platform-specific    │    │
│  │   ...         │                 │                                   │    │
│  │               │                 └───────────────────────────────────┘    │
│  └───────────────┘                                                          │
│                                                                             │
│  Each channel:                                                              │
│  • Translates platform-specific messages to unified format                  │
│  • Handles platform-specific authentication                                 │
│  • Manages connection lifecycle                                             │
│  • Provides platform capabilities (reactions, threads, etc.)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Channel Plugin Structure

Every channel is implemented as a **plugin**. Here's the anatomy of a channel plugin:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHANNEL PLUGIN ANATOMY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  extensions/channel-<name>/                                                 │
│  │                                                                          │
│  ├── package.json               # npm package manifest                      │
│  │   └── "moltbot": {           # Moltbot-specific manifest                 │
│  │         "channel": {                                                     │
│  │           "id": "telegram",                                              │
│  │           "label": "Telegram",                                           │
│  │           "order": 1                                                     │
│  │         }                                                                │
│  │       }                                                                  │
│  │                                                                          │
│  ├── src/                                                                   │
│  │   ├── index.ts               # Plugin entry point                        │
│  │   ├── bot.ts                 # Bot/client creation                       │
│  │   ├── monitor.ts             # Message listener                          │
│  │   ├── sender.ts              # Message sending                           │
│  │   ├── normalize.ts           # Message normalization                     │
│  │   ├── actions.ts             # Platform actions (react, reply, etc.)     │
│  │   └── accounts.ts            # Multi-account handling                    │
│  │                                                                          │
│  └── clawdbot.plugin.json       # Legacy manifest (if present)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The ChannelPlugin Interface

Every channel implements the `ChannelPlugin` interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CHANNEL PLUGIN INTERFACE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  interface ChannelPlugin {                                                  │
│    // Identification                                                        │
│    id: ChannelId;                    // "telegram", "whatsapp", etc.        │
│    meta: ChannelMeta;                // Display info, docs, etc.            │
│                                                                             │
│    // Lifecycle                                                             │
│    start?: (params) => Promise<void>;    // Start the channel              │
│    stop?: (params) => Promise<void>;     // Stop the channel               │
│                                                                             │
│    // Capabilities                                                          │
│    capabilities: ChannelCapabilities;     // What this channel can do       │
│                                                                             │
│    // Adapters                                                              │
│    onboarding?: ChannelOnboardingAdapter; // Setup wizard integration       │
│    messaging?: ChannelMessagingAdapter;   // Send message helpers           │
│    mentions?: ChannelMentionAdapter;      // @mention handling              │
│    threading?: ChannelThreadingAdapter;   // Thread/reply handling          │
│    streaming?: ChannelStreamingAdapter;   // Streaming message handling     │
│    actions?: ChannelMessageActionAdapter; // Platform actions               │
│                                                                             │
│    // Message Handling                                                      │
│    normalizeMessage?: (raw) => NormalizedMessage;  // Normalize inbound     │
│    sendMessage?: (params) => Promise<void>;        // Send outbound         │
│                                                                             │
│    // Status                                                                │
│    getStatus?: () => ChannelAccountSnapshot[];     // Current status        │
│    getStatusIssues?: () => ChannelStatusIssue[];   // Problems to fix       │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/plugins/types.core.ts:11-332`

---

## Channel Capabilities

Each channel declares what features it supports:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHANNEL CAPABILITIES MATRIX                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Capability       │ Telegram │ WhatsApp │ Discord │ Slack │ Signal │ iMsg   │
│  ─────────────────┼──────────┼──────────┼─────────┼───────┼────────┼──────  │
│  DM (direct)      │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Group            │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Threads          │    ✓     │    ✗     │    ✓    │   ✓   │   ✗    │   ✗    │
│  Reactions        │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Reply            │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Edit             │    ✓     │    ✗     │    ✓    │   ✓   │   ✗    │   ✗    │
│  Delete           │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Polls            │    ✓     │    ✓     │    ✗    │   ✓   │   ✗    │   ✗    │
│  Media            │    ✓     │    ✓     │    ✓    │   ✓   │   ✓    │   ✓    │
│  Effects          │    ✗     │    ✗     │    ✗    │   ✗   │   ✗    │   ✓    │
│  Native Commands  │    ✓     │    ✗     │    ✓    │   ✓   │   ✗    │   ✗    │
│  Streaming        │    ✓     │    ✓*    │    ✓    │   ✓   │   ✗    │   ✗    │
│                                                                             │
│  * WhatsApp uses block-streaming (edits during generation)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/plugins/types.core.ts:164-178`

---

## Message Flow Through a Channel

When a message arrives from any platform, it goes through this flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INBOUND MESSAGE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Platform API                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Telegram: bot.on('message', ...)                                   │    │
│  │  WhatsApp: sock.ev.on('messages.upsert', ...)                       │    │
│  │  Discord:  client.on('messageCreate', ...)                          │    │
│  │  Slack:    app.event('message', ...)                                │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CHANNEL MONITOR (listener)                        │    │
│  │                                                                     │    │
│  │  • Receives platform-specific message object                        │    │
│  │  • Filters out unwanted messages (bots, system, etc.)               │    │
│  │  • Extracts sender, content, attachments                            │    │
│  │                                                                     │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MESSAGE NORMALIZER                                │    │
│  │                                                                     │    │
│  │  Input (Telegram):              Output (Normalized):                │    │
│  │  {                              {                                   │    │
│  │    message_id: 123,               id: "telegram:123",               │    │
│  │    from: { id: 456, ... },        sender: {                         │    │
│  │    text: "Hello",                   id: "456",                      │    │
│  │    chat: { id: 789, ... }           name: "John",                   │    │
│  │  }                                  ...                              │    │
│  │                                   },                                │    │
│  │                                   content: "Hello",                 │    │
│  │                                   channel: "telegram",              │    │
│  │                                   chatType: "dm",                   │    │
│  │                                   ...                               │    │
│  │                                 }                                   │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SECURITY LAYER                                    │    │
│  │                                                                     │    │
│  │  1. Check allowlist (is sender permitted?)                          │    │
│  │  2. Check DM policy (pairing/allowlist/open/disabled)               │    │
│  │  3. Check group policy (if group message)                           │    │
│  │  4. Check mention requirements (for groups)                         │    │
│  │                                                                     │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SESSION MANAGER                                   │    │
│  │                                                                     │    │
│  │  • Resolve session key (sender + group + channel)                   │    │
│  │  • Look up or create conversation session                           │    │
│  │  • Add message to session history                                   │    │
│  │                                                                     │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    AGENT RUNTIME                                     │    │
│  │                                                                     │    │
│  │  • Process message with AI agent                                    │    │
│  │  • Execute any tools                                                │    │
│  │  • Generate response                                                │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Outbound Message Flow

When sending a message back to the platform:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OUTBOUND MESSAGE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent Response                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  { text: "Here's your answer...", tools: [...] }                    │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    RESPONSE FORMATTER                                │    │
│  │                                                                     │    │
│  │  • Format for target platform                                       │    │
│  │  • Apply message length limits                                      │    │
│  │  • Handle markdown/formatting conversion                            │    │
│  │  • Split long messages if needed                                    │    │
│  │                                                                     │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CHANNEL SENDER                                    │    │
│  │                                                                     │    │
│  │  Telegram: bot.api.sendMessage(chatId, text, options)               │    │
│  │  WhatsApp: sock.sendMessage(jid, content)                           │    │
│  │  Discord:  channel.send({ content, ... })                           │    │
│  │  Slack:    client.chat.postMessage({ channel, text, ... })          │    │
│  │                                                                     │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ACKNOWLEDGMENT                                    │    │
│  │                                                                     │    │
│  │  • Optionally add reaction to original message                      │    │
│  │  • Update session with response                                     │    │
│  │  • Emit events for connected clients                                │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Channel Registry

The channel registry manages all loaded channel plugins:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHANNEL REGISTRY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Registry Structure                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  CHAT_CHANNEL_ORDER = [                                             │    │
│  │    "telegram",     // Order 1 - Recommended for beginners           │    │
│  │    "whatsapp",     // Order 2 - Popular but needs QR                │    │
│  │    "discord",      // Order 3 - Needs bot token                     │    │
│  │    "slack",        // Order 4 - Needs app setup                     │    │
│  │    "signal",       // Order 5 - Needs signal-cli                    │    │
│  │    "imessage",     // Order 6 - macOS only                          │    │
│  │    "bluebubbles",  // Order 7 - Alternative iMessage                │    │
│  │  ]                                                                  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Registry Operations                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  listChannelPlugins()   → [ChannelPlugin, ...]                      │    │
│  │  getChannelPlugin(id)   → ChannelPlugin | undefined                 │    │
│  │  normalizeChannelId(id) → ChannelId | null                          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/registry.ts` and `src/channels/plugins/index.ts`

---

## Multi-Account Support

Channels support multiple accounts (e.g., multiple Telegram bots):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-ACCOUNT ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Config Structure:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    "channels": {                                                    │    │
│  │      "telegram": {                                                  │    │
│  │        "enabled": true,                                             │    │
│  │        "botToken": "default-token",     // Default account          │    │
│  │                                                                     │    │
│  │        "accounts": {                     // Additional accounts     │    │
│  │          "work": {                                                  │    │
│  │            "enabled": true,                                         │    │
│  │            "botToken": "work-bot-token"                             │    │
│  │          },                                                         │    │
│  │          "personal": {                                              │    │
│  │            "enabled": true,                                         │    │
│  │            "botToken": "personal-bot-token"                         │    │
│  │          }                                                          │    │
│  │        }                                                            │    │
│  │      }                                                              │    │
│  │    }                                                                │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Runtime:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │  Gateway                                                          │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │      │
│  │  │  Telegram   │  │  Telegram   │  │  Telegram   │               │      │
│  │  │  (default)  │  │   (work)    │  │ (personal)  │               │      │
│  │  │  Bot 1234   │  │  Bot 5678   │  │  Bot 9012   │               │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │      │
│  │       All three run simultaneously as separate bot instances      │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Account ID Convention:**
- Default account: `default` or empty
- Named accounts: Any lowercase string (e.g., `work`, `personal`)

**Code Reference:** `src/telegram/accounts.ts`, `src/web/accounts.ts`

---

## DM Policies

Each channel supports configurable DM (direct message) policies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DM POLICY OPTIONS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "pairing" (default)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Unknown sender ──► Show pairing code ──► Owner approves ──► Allowed │    │
│  │                                                                     │    │
│  │  Best for: Personal use where you want to approve new contacts      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  "allowlist"                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Unknown sender ──► Blocked (silently ignored)                      │    │
│  │  Known sender ────► Allowed                                         │    │
│  │                                                                     │    │
│  │  Best for: Strict access control, only pre-approved contacts        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  "open"                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Any sender ──► Allowed                                             │    │
│  │                                                                     │    │
│  │  Best for: Public bots, customer service, community assistants      │    │
│  │  Requires: allowFrom to include "*" wildcard                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  "disabled"                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  All DMs ──► Ignored                                                │    │
│  │                                                                     │    │
│  │  Best for: Group-only bots that shouldn't respond to DMs            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/config/types.ts` (DmPolicy type)

---

## Group Access Control

Groups have their own access policies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROUP ACCESS CONTROL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Group Policy Options:                                                      │
│                                                                             │
│  "allowlist" ──► Only respond in configured groups                          │
│  "open" ──────► Respond in any group the bot is added to                    │
│  "disabled" ──► Ignore all group messages                                   │
│                                                                             │
│  Discord Example:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    "channels": {                                                    │    │
│  │      "discord": {                                                   │    │
│  │        "groupPolicy": "allowlist",                                  │    │
│  │        "guilds": {                                                  │    │
│  │          "123456789": {             // Guild ID                     │    │
│  │            "channels": {                                            │    │
│  │              "987654321": {         // Channel ID                   │    │
│  │                "allow": true                                        │    │
│  │              },                                                     │    │
│  │              "general": {           // Channel name                 │    │
│  │                "allow": true                                        │    │
│  │              }                                                      │    │
│  │            }                                                        │    │
│  │          }                                                          │    │
│  │        }                                                            │    │
│  │      }                                                              │    │
│  │    }                                                                │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Slack Example:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    "channels": {                                                    │    │
│  │      "slack": {                                                     │    │
│  │        "groupPolicy": "allowlist",                                  │    │
│  │        "channels": {                                                │    │
│  │          "C123456": { "allow": true },  // Channel ID               │    │
│  │          "general": { "allow": true }   // Channel name             │    │
│  │        }                                                            │    │
│  │      }                                                              │    │
│  │    }                                                                │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mention Gating

For groups, Moltbot can require an @mention before responding:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MENTION GATING                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Flow:                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Group Message                                                      │    │
│  │       │                                                             │    │
│  │       ▼                                                             │    │
│  │  ┌───────────────────────────────────────┐                          │    │
│  │  │   Is Moltbot @mentioned?              │                          │    │
│  │  └────────────────┬──────────────────────┘                          │    │
│  │                   │                                                 │    │
│  │       ┌───────────┴───────────┐                                     │    │
│  │       ▼                       ▼                                     │    │
│  │  ┌────────────┐         ┌────────────┐                              │    │
│  │  │    Yes     │         │    No      │                              │    │
│  │  │  Process   │         │   Ignore   │                              │    │
│  │  │  Message   │         │  (unless   │                              │    │
│  │  └────────────┘         │  configured│                              │    │
│  │                         │  otherwise)│                              │    │
│  │                         └────────────┘                              │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Configuration:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    "channels": {                                                    │    │
│  │      "<channel>": {                                                 │    │
│  │        "allowUnmentionedGroups": false   // Default: require @      │    │
│  │      }                                                              │    │
│  │    }                                                                │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Platform-Specific Mention Patterns:                                        │
│  • Telegram: @botusername                                                   │
│  • Discord: @BotName or <@bot_id>                                           │
│  • Slack: @AppName or <@APP_ID>                                             │
│  • WhatsApp: No official mention, uses name detection                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/mention-gating.ts`

---

## Message Normalization Deep Dive

Each platform sends messages in different formats. Normalizers convert them to a common structure:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MESSAGE NORMALIZATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Telegram Raw Message:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    update_id: 123456789,                                            │    │
│  │    message: {                                                       │    │
│  │      message_id: 42,                                                │    │
│  │      from: {                                                        │    │
│  │        id: 111222333,                                               │    │
│  │        is_bot: false,                                               │    │
│  │        first_name: "John",                                          │    │
│  │        last_name: "Doe",                                            │    │
│  │        username: "johndoe"                                          │    │
│  │      },                                                             │    │
│  │      chat: {                                                        │    │
│  │        id: 111222333,                                               │    │
│  │        type: "private"                                              │    │
│  │      },                                                             │    │
│  │      date: 1705320000,                                              │    │
│  │      text: "Hello, what's the weather?"                             │    │
│  │    }                                                                │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│                              normalizer()                                   │
│                                     │                                       │
│                                     ▼                                       │
│  Normalized Message:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  {                                                                  │    │
│  │    id: "telegram:42",                                               │    │
│  │    channel: "telegram",                                             │    │
│  │    accountId: "default",                                            │    │
│  │    chatType: "dm",                                                  │    │
│  │    sender: {                                                        │    │
│  │      id: "111222333",                                               │    │
│  │      name: "John Doe",                                              │    │
│  │      username: "johndoe"                                            │    │
│  │    },                                                               │    │
│  │    target: {                                                        │    │
│  │      id: "111222333",                                               │    │
│  │      type: "dm"                                                     │    │
│  │    },                                                               │    │
│  │    content: "Hello, what's the weather?",                           │    │
│  │    timestamp: 1705320000000,                                        │    │
│  │    rawPlatformMessage: { ... }  // Original for reference           │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/plugins/normalize/*.ts`

---

## Channel Status and Health

Each channel reports its status:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHANNEL STATUS REPORTING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Status Fields (ChannelAccountSnapshot):                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  accountId         │ "default", "work", etc.                        │    │
│  │  enabled           │ Is channel enabled in config?                  │    │
│  │  configured        │ Are credentials set up?                        │    │
│  │  linked            │ Is session/auth active? (WhatsApp)             │    │
│  │  running           │ Is channel process active?                     │    │
│  │  connected         │ Is connected to platform API?                  │    │
│  │  lastConnectedAt   │ Timestamp of last successful connection        │    │
│  │  lastMessageAt     │ Timestamp of last message processed            │    │
│  │  lastError         │ Most recent error message                      │    │
│  │  reconnectAttempts │ Number of reconnection attempts                │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Example Status Output:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  $ moltbot channels status                                          │    │
│  │                                                                     │    │
│  │  Telegram (default)                                                 │    │
│  │    Status: connected ✓                                              │    │
│  │    Last message: 2 minutes ago                                      │    │
│  │    Token: from config                                               │    │
│  │                                                                     │    │
│  │  WhatsApp (default)                                                 │    │
│  │    Status: connected ✓                                              │    │
│  │    Linked: yes                                                      │    │
│  │    Last message: 5 minutes ago                                      │    │
│  │                                                                     │    │
│  │  Discord (default)                                                  │    │
│  │    Status: not configured                                           │    │
│  │    Token: missing                                                   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/channels/plugins/status.ts`

---

## Summary

The channel architecture provides:

1. **Abstraction**: Each platform is hidden behind a common interface
2. **Normalization**: Messages are converted to a unified format
3. **Flexibility**: Multi-account support, configurable policies
4. **Security**: Allowlists, DM policies, mention gating
5. **Extensibility**: New channels can be added as plugins

Key takeaways:
- Channels are plugins with a standard interface
- Messages flow through normalization → security → session → agent
- Each channel declares its capabilities
- Access is controlled via DM policies and group allowlists

---

**Next Tutorial:** [05 - Setting Up Telegram](05-SETTING-UP-TELEGRAM.md) - Step-by-step Telegram bot setup
