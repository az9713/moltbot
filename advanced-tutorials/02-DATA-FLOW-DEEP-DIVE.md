# Tutorial 02: Data Flow Deep Dive

This tutorial traces exactly how messages flow through Moltbot, from when a user sends a message to when they receive a response. We'll follow real code paths and understand every step.

**Time Required**: ~30 minutes
**Prerequisites**: [Tutorial 01 - Architecture Overview](01-ARCHITECTURE-OVERVIEW.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Complete Message Journey](#2-the-complete-message-journey)
3. [Stage 1: Message Reception](#3-stage-1-message-reception)
4. [Stage 2: Channel Processing](#4-stage-2-channel-processing)
5. [Stage 3: Routing and Access Control](#5-stage-3-routing-and-access-control)
6. [Stage 4: Agent Processing](#6-stage-4-agent-processing)
7. [Stage 5: AI Provider Interaction](#7-stage-5-ai-provider-interaction)
8. [Stage 6: Response Delivery](#8-stage-6-response-delivery)
9. [Real-World Example: Telegram Message](#9-real-world-example-telegram-message)
10. [Summary](#10-summary)

---

## 1. Overview

When you send a message to Moltbot (through WhatsApp, Telegram, etc.), it goes through a precise sequence of steps:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HIGH-LEVEL MESSAGE FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USER MESSAGE                                                           │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. RECEPTION        Platform receives message (Telegram, etc.) │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  2. NORMALIZATION    Convert to common Moltbot message format   │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  3. ACCESS CONTROL   Check allowlist, pairing codes             │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  4. ROUTING          Determine agent, session, workspace        │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  5. AGENT PROCESSING Run agent loop (think → tool → respond)   │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  6. AI INTERACTION   Send to Claude/GPT, receive response       │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  7. DELIVERY         Send response back through channel         │   │
│  └────────────────────────────────┬────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  USER RECEIVES RESPONSE                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Complete Message Journey

Let's trace a message through the entire system with detailed code references:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DETAILED MESSAGE JOURNEY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  USER: "What's the weather like today?"                          │  │
│  │        (sent via Telegram)                                       │  │
│  │                                                                  │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  TELEGRAM SERVERS                                                │  │
│  │  ───────────────                                                 │  │
│  │  • Receive message from Telegram app                             │  │
│  │  • Forward to Moltbot via Bot API polling/webhook                │  │
│  │                                                                  │  │
│  │  API Response:                                                   │  │
│  │  {                                                               │  │
│  │    "update_id": 123456,                                          │  │
│  │    "message": {                                                  │  │
│  │      "message_id": 789,                                          │  │
│  │      "from": { "id": 12345, "username": "john" },                │  │
│  │      "chat": { "id": 12345, "type": "private" },                 │  │
│  │      "text": "What's the weather like today?"                    │  │
│  │    }                                                             │  │
│  │  }                                                               │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MOLTBOT TELEGRAM MONITOR (src/telegram/monitor.ts)              │  │
│  │  ─────────────────────────────────────────────────               │  │
│  │  • grammY bot receives update via polling                        │  │
│  │  • Middleware chain processes message                            │  │
│  │  • Extract: sender, chat, text, attachments                      │  │
│  │                                                                  │  │
│  │  Code path:                                                      │  │
│  │  1. bot.on("message") handler fires                              │  │
│  │  2. createTelegramMessageProcessor() processes                   │  │
│  │  3. Message normalized to common format                          │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  CHANNEL ROUTER (src/routing/resolve-route.ts)                   │  │
│  │  ──────────────────────────────────────────────                  │  │
│  │  • Check if sender is allowed (allowlist)                        │  │
│  │  • Check if pairing is required                                  │  │
│  │  • Determine which agent handles this message                    │  │
│  │  • Generate session key                                          │  │
│  │                                                                  │  │
│  │  Routing result:                                                 │  │
│  │  {                                                               │  │
│  │    agentId: "default",                                           │  │
│  │    sessionKey: "telegram:dm:12345",                              │  │
│  │    allowed: true                                                 │  │
│  │  }                                                               │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  GATEWAY CHAT HANDLER (src/gateway/server-chat.ts)               │  │
│  │  ─────────────────────────────────────────────────               │  │
│  │  • Create or resume session                                      │  │
│  │  • Queue message for processing                                  │  │
│  │  • Broadcast events to connected clients                         │  │
│  │                                                                  │  │
│  │  Session state:                                                  │  │
│  │  {                                                               │  │
│  │    key: "telegram:dm:12345",                                     │  │
│  │    history: [...previous messages...],                           │  │
│  │    agentId: "default"                                            │  │
│  │  }                                                               │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AGENT RUNNER (src/agents/cli-runner.ts)                         │  │
│  │  ───────────────────────────────────────                         │  │
│  │  • Load agent configuration                                      │  │
│  │  • Build message array for AI                                    │  │
│  │  • Execute agent loop                                            │  │
│  │                                                                  │  │
│  │  Messages to AI:                                                 │  │
│  │  [                                                               │  │
│  │    { role: "system", content: "You are a helpful assistant..." },│  │
│  │    { role: "user", content: "What's the weather like today?" }   │  │
│  │  ]                                                               │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AI PROVIDER (src/providers/anthropic.ts)                        │  │
│  │  ────────────────────────────────────────                        │  │
│  │  • Send request to Anthropic API                                 │  │
│  │  • Stream response tokens                                        │  │
│  │  • Handle tool calls if needed                                   │  │
│  │                                                                  │  │
│  │  API Request:                                                    │  │
│  │  POST https://api.anthropic.com/v1/messages                      │  │
│  │  {                                                               │  │
│  │    "model": "claude-sonnet-4-20250514",                          │  │
│  │    "messages": [...],                                            │  │
│  │    "stream": true                                                │  │
│  │  }                                                               │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AI RESPONSE                                                     │  │
│  │  ───────────                                                     │  │
│  │  "I don't have access to real-time weather data, but I can      │  │
│  │   help you find weather information! You could check a weather  │  │
│  │   service like weather.com or ask me to use a weather tool if   │  │
│  │   one is available."                                             │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  TELEGRAM SENDER (src/telegram/send.ts)                          │  │
│  │  ──────────────────────────────────────                          │  │
│  │  • Format response for Telegram                                  │  │
│  │  • Handle long messages (chunking)                               │  │
│  │  • Send via Bot API                                              │  │
│  │                                                                  │  │
│  │  API Call:                                                       │  │
│  │  bot.api.sendMessage(12345, "I don't have access...")           │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  USER RECEIVES RESPONSE                                          │  │
│  │  ──────────────────────                                          │  │
│  │  Telegram app displays the AI's response                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stage 1: Message Reception

Each channel has its own way of receiving messages. Here's how the major channels work:

### 3.1 Telegram Reception

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TELEGRAM MESSAGE RECEPTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FILE: src/telegram/bot.ts                                              │
│                                                                         │
│  FLOW:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  1. BOT CREATION                                                   ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ const bot = new Bot(opts.token);                        │   ││
│  │     │ bot.api.config.use(apiThrottler());  // Rate limiting   │   ││
│  │     │ bot.use(sequentialize(getSequentialKey)); // Order      │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  2. MESSAGE HANDLER REGISTRATION                                   ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ bot.on("message", async (ctx) => {                      │   ││
│  │     │   // Process incoming message                           │   ││
│  │     │   await processMessage(ctx);                            │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  3. POLLING LOOP (or WEBHOOK)                                      ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ // Long polling (default):                              │   ││
│  │     │ bot.start();  // Fetches updates from Telegram          │   ││
│  │     │                                                         │   ││
│  │     │ // Or webhook mode:                                     │   ││
│  │     │ webhookCallback(bot, "hono")                            │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  LIBRARY: grammY (telegram bot framework)                               │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/telegram/bot.ts            - Bot creation and handlers           │
│  • src/telegram/monitor.ts        - Monitor startup                     │
│  • src/telegram/bot-message.ts    - Message processing                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 WhatsApp Reception

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP MESSAGE RECEPTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FILE: src/web/auto-reply/monitor.ts                                    │
│                                                                         │
│  FLOW:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  1. BAILEYS CONNECTION                                             ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ // Create WhatsApp socket connection                    │   ││
│  │     │ const sock = makeWASocket({                             │   ││
│  │     │   auth: state,                                          │   ││
│  │     │   printQRInTerminal: true                               │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  2. QR CODE SCANNING                                               ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ sock.ev.on('connection.update', (update) => {           │   ││
│  │     │   if (update.qr) {                                      │   ││
│  │     │     // Display QR code for user to scan                 │   ││
│  │     │     displayQR(update.qr);                               │   ││
│  │     │   }                                                     │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  3. MESSAGE EVENT                                                  ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ sock.ev.on('messages.upsert', async ({ messages }) => { │   ││
│  │     │   for (const msg of messages) {                         │   ││
│  │     │     if (!msg.key.fromMe) {                              │   ││
│  │     │       // Process incoming message                       │   ││
│  │     │       await onMessage(msg);                             │   ││
│  │     │     }                                                   │   ││
│  │     │   }                                                     │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  LIBRARY: @whiskeysockets/baileys                                       │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/web/auto-reply.ts          - Auto-reply logic                    │
│  • src/web/login.ts               - QR code login                       │
│  • src/web/session.ts             - Session management                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Discord Reception

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISCORD MESSAGE RECEPTION                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FILE: src/discord/monitor.ts                                           │
│                                                                         │
│  FLOW:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  1. CLIENT CREATION                                                ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ const client = new Client({                             │   ││
│  │     │   intents: [                                            │   ││
│  │     │     GatewayIntentBits.Guilds,                           │   ││
│  │     │     GatewayIntentBits.GuildMessages,                    │   ││
│  │     │     GatewayIntentBits.DirectMessages,                   │   ││
│  │     │     GatewayIntentBits.MessageContent                    │   ││
│  │     │   ]                                                     │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  2. LOGIN                                                          ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ await client.login(token);                              │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  │  3. MESSAGE EVENT                                                  ││
│  │     ┌─────────────────────────────────────────────────────────┐   ││
│  │     │ client.on('messageCreate', async (message) => {         │   ││
│  │     │   if (message.author.bot) return; // Ignore bots        │   ││
│  │     │   await handleMessage(message);                         │   ││
│  │     │ });                                                     │   ││
│  │     └─────────────────────────────────────────────────────────┘   ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  LIBRARY: discord.js                                                    │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/discord/monitor.ts              - Main monitor                   │
│  • src/discord/monitor/listeners.ts    - Event listeners                │
│  • src/discord/monitor/message-handler.ts - Message processing          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Stage 2: Channel Processing

After receiving a message, each channel normalizes it into a common format:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE NORMALIZATION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PLATFORM-SPECIFIC MESSAGE:                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Telegram:                    Discord:                             ││
│  │  {                            {                                    ││
│  │    message_id: 789,             id: "987654321",                   ││
│  │    from: {                      author: {                          ││
│  │      id: 12345,                   id: "111222333",                 ││
│  │      username: "john"             username: "john#1234"            ││
│  │    },                           },                                 ││
│  │    chat: {                      channel: {                         ││
│  │      id: 12345,                   id: "444555666",                 ││
│  │      type: "private"              type: ChannelType.DM             ││
│  │    },                           },                                 ││
│  │    text: "Hello"                content: "Hello"                   ││
│  │  }                            }                                    ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                              │                                          │
│                              ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                    NORMALIZATION PROCESS                           ││
│  │  FILE: src/channels/plugins/normalize/*.ts                         ││
│  │                                                                    ││
│  │  Each channel has a normalize function:                            ││
│  │  • src/channels/plugins/normalize/telegram.ts                      ││
│  │  • src/channels/plugins/normalize/discord.ts                       ││
│  │  • src/channels/plugins/normalize/whatsapp.ts                      ││
│  │  • src/channels/plugins/normalize/slack.ts                         ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                              │                                          │
│                              ▼                                          │
│  NORMALIZED MESSAGE (common format):                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  interface NormalizedMessage {                                     ││
│  │    // Source channel                                               ││
│  │    channel: "telegram" | "whatsapp" | "discord" | ...;             ││
│  │                                                                    ││
│  │    // Sender information                                           ││
│  │    senderId: string;          // Unique sender ID                  ││
│  │    senderName?: string;       // Display name                      ││
│  │    senderUsername?: string;   // Username if available             ││
│  │                                                                    ││
│  │    // Conversation information                                     ││
│  │    conversationId: string;    // Chat/channel ID                   ││
│  │    isGroup: boolean;          // Is this a group chat?             ││
│  │    threadId?: string;         // Thread/topic ID if applicable     ││
│  │                                                                    ││
│  │    // Message content                                              ││
│  │    text: string;              // Message text                      ││
│  │    attachments?: Attachment[]; // Media, files                     ││
│  │    replyTo?: string;          // ID of message being replied to    ││
│  │                                                                    ││
│  │    // Metadata                                                     ││
│  │    messageId: string;         // Platform message ID               ││
│  │    timestamp: Date;           // When sent                         ││
│  │    raw: unknown;              // Original platform message         ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Stage 3: Routing and Access Control

Once normalized, messages go through routing and access control:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROUTING AND ACCESS CONTROL                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: ACCESS CONTROL CHECK                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  FILE: src/channels/allowlist-match.ts                             ││
│  │                                                                    ││
│  │  ┌──────────────────────────────────────────────────────────┐     ││
│  │  │ Incoming Message                                         │     ││
│  │  │ { senderId: "12345", channel: "telegram" }               │     ││
│  │  └────────────────────────┬─────────────────────────────────┘     ││
│  │                           │                                        ││
│  │                           ▼                                        ││
│  │  ┌──────────────────────────────────────────────────────────┐     ││
│  │  │            Is DM Policy "open"?                          │     ││
│  │  │                                                          │     ││
│  │  │  Config: channels.telegram.dm.policy = "pairing"         │     ││
│  │  └──────┬───────────────────────────────────────────┬───────┘     ││
│  │         │ No                                        │ Yes         ││
│  │         ▼                                           ▼             ││
│  │  ┌──────────────────────┐              ┌────────────────────┐     ││
│  │  │ Check allowlist      │              │    Allow message   │     ││
│  │  │ for sender           │              │                    │     ││
│  │  └──────┬───────────────┘              └────────────────────┘     ││
│  │         │                                                          ││
│  │         ▼                                                          ││
│  │  ┌──────────────────────────────────────────────────────────┐     ││
│  │  │        Is sender in allowlist?                           │     ││
│  │  │                                                          │     ││
│  │  │  Config: channels.telegram.dm.allowFrom = ["12345"]      │     ││
│  │  └──────┬───────────────────────────────────────────┬───────┘     ││
│  │         │ No                                        │ Yes         ││
│  │         ▼                                           ▼             ││
│  │  ┌──────────────────────┐              ┌────────────────────┐     ││
│  │  │ Request pairing code │              │   Allow message    │     ││
│  │  │ OR reject message    │              │                    │     ││
│  │  └──────────────────────┘              └────────────────────┘     ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 2: ROUTE RESOLUTION                                               │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  FILE: src/routing/resolve-route.ts                                ││
│  │                                                                    ││
│  │  function resolveAgentRoute(message: NormalizedMessage): Route {   ││
│  │                                                                    ││
│  │    // 1. Check channel-specific routing rules                      ││
│  │    const channelRoutes = config.channels[message.channel].routing; ││
│  │                                                                    ││
│  │    // 2. Check sender-specific routing                             ││
│  │    const senderRoute = findSenderRoute(message.senderId);          ││
│  │                                                                    ││
│  │    // 3. Check conversation-specific routing                       ││
│  │    const convRoute = findConversationRoute(message.conversationId);││
│  │                                                                    ││
│  │    // 4. Fall back to default agent                                ││
│  │    return senderRoute ?? convRoute ?? channelRoutes ?? defaultRoute;│
│  │  }                                                                 ││
│  │                                                                    ││
│  │  ROUTING RESULT:                                                   ││
│  │  {                                                                 ││
│  │    agentId: "default",                                             ││
│  │    workspaceDir: "/home/user/workspace",                           ││
│  │    model: "claude-sonnet-4-20250514",                              ││
│  │    systemPrompt: "You are a helpful assistant..."                  ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 3: SESSION KEY GENERATION                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  FILE: src/routing/session-key.ts                                  ││
│  │                                                                    ││
│  │  Session keys determine conversation isolation:                    ││
│  │                                                                    ││
│  │  DM: "telegram:dm:12345"           (per-sender)                    ││
│  │  Group: "telegram:group:67890"     (per-group)                     ││
│  │  Thread: "telegram:group:67890:thread:111" (per-thread)            ││
│  │  Main: "main"                      (single shared session)         ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Stage 4: Agent Processing

The agent processes the message using the AI:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AGENT PROCESSING                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FILE: src/agents/cli-runner.ts                                         │
│                                                                         │
│  THE AGENT LOOP:                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  async function runAgentLoop(input: AgentInput): Promise<string> { ││
│  │                                                                    ││
│  │    // 1. Load or create session                                    ││
│  │    const session = await loadSession(input.sessionKey);            ││
│  │                                                                    ││
│  │    // 2. Build message array                                       ││
│  │    const messages = [                                              ││
│  │      { role: "system", content: input.systemPrompt },              ││
│  │      ...session.history,                                           ││
│  │      { role: "user", content: input.message }                      ││
│  │    ];                                                              ││
│  │                                                                    ││
│  │    // 3. Run agent loop                                            ││
│  │    while (true) {                                                  ││
│  │      // Send to AI                                                 ││
│  │      const response = await provider.chat(messages);               ││
│  │                                                                    ││
│  │      // Check for tool calls                                       ││
│  │      if (response.hasToolCalls) {                                  ││
│  │        // Execute tools                                            ││
│  │        const results = await executeTools(response.toolCalls);     ││
│  │        // Add results to messages                                  ││
│  │        messages.push(...results);                                  ││
│  │        // Continue loop                                            ││
│  │        continue;                                                   ││
│  │      }                                                             ││
│  │                                                                    ││
│  │      // No more tool calls - return text response                  ││
│  │      return response.text;                                         ││
│  │    }                                                               ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  VISUAL REPRESENTATION:                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │         START                                                      ││
│  │           │                                                        ││
│  │           ▼                                                        ││
│  │    ┌─────────────┐                                                 ││
│  │    │ Load/Create │                                                 ││
│  │    │   Session   │                                                 ││
│  │    └──────┬──────┘                                                 ││
│  │           │                                                        ││
│  │           ▼                                                        ││
│  │    ┌─────────────┐                                                 ││
│  │    │   Build     │                                                 ││
│  │    │  Messages   │                                                 ││
│  │    └──────┬──────┘                                                 ││
│  │           │                                                        ││
│  │           ▼                                                        ││
│  │    ┌─────────────┐         ┌─────────────┐                         ││
│  │    │  Send to    │─────────│   Execute   │                         ││
│  │    │     AI      │ Tools   │    Tools    │                         ││
│  │    └──────┬──────┘ Needed? └──────┬──────┘                         ││
│  │           │                       │                                ││
│  │           │ No tools              │ Results                        ││
│  │           ▼                       ▼                                ││
│  │    ┌─────────────┐         ┌─────────────┐                         ││
│  │    │   Return    │         │    Append   │                         ││
│  │    │  Response   │◀────────│   Results   │                         ││
│  │    └─────────────┘         └─────────────┘                         ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  KEY COMPONENTS:                                                        │
│  • Session: Stores conversation history                                 │
│  • Messages: Array sent to AI provider                                  │
│  • Tools: Functions the AI can call (bash, file operations, etc.)       │
│  • Response: AI's reply (text and/or tool calls)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Stage 5: AI Provider Interaction

The agent communicates with the AI provider:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI PROVIDER INTERACTION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FILE: src/providers/anthropic.ts (example)                             │
│                                                                         │
│  REQUEST TO ANTHROPIC:                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  POST https://api.anthropic.com/v1/messages                        ││
│  │                                                                    ││
│  │  Headers:                                                          ││
│  │  {                                                                 ││
│  │    "x-api-key": "sk-ant-...",                                      ││
│  │    "anthropic-version": "2023-06-01",                              ││
│  │    "content-type": "application/json"                              ││
│  │  }                                                                 ││
│  │                                                                    ││
│  │  Body:                                                             ││
│  │  {                                                                 ││
│  │    "model": "claude-sonnet-4-20250514",                            ││
│  │    "max_tokens": 4096,                                             ││
│  │    "system": "You are a helpful assistant...",                     ││
│  │    "messages": [                                                   ││
│  │      {                                                             ││
│  │        "role": "user",                                             ││
│  │        "content": "What's the weather like today?"                 ││
│  │      }                                                             ││
│  │    ],                                                              ││
│  │    "stream": true                                                  ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STREAMING RESPONSE:                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  The AI sends response tokens one at a time (streaming):           ││
│  │                                                                    ││
│  │  event: content_block_delta                                        ││
│  │  data: {"type":"content_block_delta","delta":{"type":"text_delta", ││
│  │         "text":"I"}}                                               ││
│  │                                                                    ││
│  │  event: content_block_delta                                        ││
│  │  data: {"type":"content_block_delta","delta":{"type":"text_delta", ││
│  │         "text":" don't"}}                                          ││
│  │                                                                    ││
│  │  event: content_block_delta                                        ││
│  │  data: {"type":"content_block_delta","delta":{"type":"text_delta", ││
│  │         "text":" have"}}                                           ││
│  │                                                                    ││
│  │  ...continues until complete...                                    ││
│  │                                                                    ││
│  │  event: message_stop                                               ││
│  │  data: {"type":"message_stop"}                                     ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  PROVIDER ABSTRACTION:                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Moltbot abstracts different providers behind a common interface:  ││
│  │                                                                    ││
│  │  interface Provider {                                              ││
│  │    name: string;                                                   ││
│  │    chat(messages: Message[], options: Options): Promise<Response>; ││
│  │    streamChat(messages: Message[], options: Options):              ││
│  │      AsyncIterable<Chunk>;                                         ││
│  │  }                                                                 ││
│  │                                                                    ││
│  │  SUPPORTED PROVIDERS:                                              ││
│  │  ┌──────────────┬──────────────────────────────────────────────┐  ││
│  │  │   Provider   │            API Endpoint                      │  ││
│  │  ├──────────────┼──────────────────────────────────────────────┤  ││
│  │  │ Anthropic    │ api.anthropic.com/v1/messages                │  ││
│  │  │ OpenAI       │ api.openai.com/v1/chat/completions           │  ││
│  │  │ AWS Bedrock  │ bedrock-runtime.{region}.amazonaws.com       │  ││
│  │  │ Google AI    │ generativelanguage.googleapis.com            │  ││
│  │  │ Ollama       │ localhost:11434/api/chat                     │  ││
│  │  │ OpenRouter   │ openrouter.ai/api/v1/chat/completions        │  ││
│  │  └──────────────┴──────────────────────────────────────────────┘  ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Stage 6: Response Delivery

Finally, the response is sent back to the user:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RESPONSE DELIVERY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AI RESPONSE TEXT:                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  "I don't have access to real-time weather data, but I can        ││
│  │   help you find weather information! You could check a weather    ││
│  │   service like weather.com or ask me to use a weather tool if    ││
│  │   one is available."                                              ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 1: RESPONSE FORMATTING                                            │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Each channel formats the response appropriately:                  ││
│  │                                                                    ││
│  │  TELEGRAM (src/telegram/send.ts):                                  ││
│  │  • Convert Markdown to Telegram MarkdownV2                         ││
│  │  • Handle code blocks                                              ││
│  │  • Split long messages (4096 char limit)                           ││
│  │                                                                    ││
│  │  WHATSAPP (src/web/outbound.ts):                                   ││
│  │  • Convert to WhatsApp formatting                                  ││
│  │  • Handle media attachments                                        ││
│  │  • Split long messages                                             ││
│  │                                                                    ││
│  │  DISCORD (src/discord/send.ts):                                    ││
│  │  • Convert to Discord Markdown                                     ││
│  │  • Handle embeds if needed                                         ││
│  │  • Split messages (2000 char limit)                                ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 2: CHUNKING LONG MESSAGES                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  If response exceeds platform limit:                               ││
│  │                                                                    ││
│  │  Original: "This is a very long message..." (5000 chars)           ││
│  │                                                                    ││
│  │  Telegram (4096 limit):                                            ││
│  │  ├── Chunk 1: "This is a very long message..." (4096 chars)        ││
│  │  └── Chunk 2: "...remaining text" (904 chars)                      ││
│  │                                                                    ││
│  │  Discord (2000 limit):                                             ││
│  │  ├── Chunk 1: "This is a very..." (2000 chars)                     ││
│  │  ├── Chunk 2: "...long message..." (2000 chars)                    ││
│  │  └── Chunk 3: "...remaining text" (1000 chars)                     ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 3: SEND VIA PLATFORM API                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  TELEGRAM:                                                         ││
│  │  await bot.api.sendMessage(chatId, formattedText, {                ││
│  │    parse_mode: "MarkdownV2",                                       ││
│  │    reply_to_message_id: originalMessageId                          ││
│  │  });                                                               ││
│  │                                                                    ││
│  │  WHATSAPP:                                                         ││
│  │  await sock.sendMessage(jid, {                                     ││
│  │    text: formattedText,                                            ││
│  │    quoted: originalMessage                                         ││
│  │  });                                                               ││
│  │                                                                    ││
│  │  DISCORD:                                                          ││
│  │  await message.reply(formattedText);                               ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  STEP 4: SAVE TO SESSION HISTORY                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  // Update session with the exchange                               ││
│  │  session.history.push(                                             ││
│  │    { role: "user", content: originalMessage },                     ││
│  │    { role: "assistant", content: response }                        ││
│  │  );                                                                ││
│  │  await saveSession(session);                                       ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Real-World Example: Telegram Message

Let's trace a complete example with actual code paths:

```
┌─────────────────────────────────────────────────────────────────────────┐
│            COMPLETE EXAMPLE: TELEGRAM MESSAGE FLOW                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USER SENDS: "What is 2+2?"                                             │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 1: TELEGRAM RECEIVES MESSAGE                                      │
│  ─────────────────────────────────                                      │
│  FILE: src/telegram/bot.ts                                              │
│                                                                         │
│  The grammY bot receives the update:                                    │
│  {                                                                      │
│    update_id: 987654,                                                   │
│    message: {                                                           │
│      message_id: 123,                                                   │
│      from: { id: 111222333, first_name: "John", username: "john" },     │
│      chat: { id: 111222333, type: "private" },                          │
│      date: 1706789012,                                                  │
│      text: "What is 2+2?"                                               │
│    }                                                                    │
│  }                                                                      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 2: MESSAGE HANDLER FIRES                                          │
│  ─────────────────────────────                                          │
│  FILE: src/telegram/bot-message.ts                                      │
│                                                                         │
│  bot.on("message", async (ctx) => {                                     │
│    const processor = createTelegramMessageProcessor(config);            │
│    await processor.process(ctx);                                        │
│  });                                                                    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 3: ACCESS CONTROL                                                 │
│  ──────────────────────                                                 │
│  FILE: src/channels/allowlist-match.ts                                  │
│                                                                         │
│  Check: Is user 111222333 allowed?                                      │
│  Config: channels.telegram.dm.policy = "pairing"                        │
│  Config: channels.telegram.dm.allowFrom = ["111222333"]                 │
│  Result: ALLOWED (user is in allowlist)                                 │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 4: ROUTE RESOLUTION                                               │
│  ────────────────────────                                               │
│  FILE: src/routing/resolve-route.ts                                     │
│                                                                         │
│  Route: {                                                               │
│    agentId: "default",                                                  │
│    sessionKey: "telegram:dm:111222333",                                 │
│    model: "claude-sonnet-4-20250514"                                    │
│  }                                                                      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 5: BUILD AI MESSAGES                                              │
│  ─────────────────────────                                              │
│  FILE: src/agents/cli-runner.ts                                         │
│                                                                         │
│  Messages array:                                                        │
│  [                                                                      │
│    { role: "system", content: "You are a helpful assistant..." },       │
│    // Previous history would go here                                    │
│    { role: "user", content: "What is 2+2?" }                            │
│  ]                                                                      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 6: CALL AI PROVIDER                                               │
│  ────────────────────────                                               │
│  FILE: src/providers/anthropic.ts                                       │
│                                                                         │
│  Request to: POST https://api.anthropic.com/v1/messages                 │
│  {                                                                      │
│    model: "claude-sonnet-4-20250514",                                   │
│    messages: [...],                                                     │
│    max_tokens: 4096                                                     │
│  }                                                                      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 7: AI RESPONSE                                                    │
│  ───────────────────                                                    │
│                                                                         │
│  {                                                                      │
│    content: [                                                           │
│      { type: "text", text: "2+2 equals 4." }                            │
│    ],                                                                   │
│    stop_reason: "end_turn"                                              │
│  }                                                                      │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  STEP 8: SEND REPLY                                                     │
│  ──────────────────                                                     │
│  FILE: src/telegram/send.ts                                             │
│                                                                         │
│  await bot.api.sendMessage(111222333, "2+2 equals 4.", {                │
│    reply_to_message_id: 123                                             │
│  });                                                                    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  USER SEES: "2+2 equals 4."                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Summary

### Message Flow Stages

| Stage | What Happens | Key Files |
|-------|--------------|-----------|
| 1. Reception | Platform receives message | `src/<channel>/monitor.ts` |
| 2. Normalization | Convert to common format | `src/channels/plugins/normalize/` |
| 3. Access Control | Check allowlist/pairing | `src/channels/allowlist-match.ts` |
| 4. Routing | Determine agent/session | `src/routing/resolve-route.ts` |
| 5. Agent Processing | Run agent loop | `src/agents/cli-runner.ts` |
| 6. AI Interaction | Call AI provider | `src/providers/*.ts` |
| 7. Delivery | Send response back | `src/<channel>/send.ts` |

### Key Concepts

1. **Message Normalization**: All platforms use different message formats; Moltbot normalizes them
2. **Session Keys**: Determine which conversations are isolated or shared
3. **Agent Loop**: Think → Tool Use → Respond cycle continues until complete
4. **Streaming**: AI responses are streamed for faster perceived response time
5. **Chunking**: Long responses are split to fit platform limits

### Next Steps

Now that you understand data flow, continue to:
- [Tutorial 03: Gateway Internals](03-GATEWAY-INTERNALS.md) - Deep dive into the central server
- [Tutorial 04: Channel Architecture](04-CHANNEL-ARCHITECTURE.md) - How channels are implemented

---

[← Previous: Architecture Overview](01-ARCHITECTURE-OVERVIEW.md) | [Back to Index](00-INDEX.md) | [Next: Gateway Internals →](03-GATEWAY-INTERNALS.md)
