# Tutorial 01: Architecture Overview

This tutorial provides a complete understanding of how Moltbot works internally. We'll explore every layer of the system with detailed ASCII diagrams and explanations.

**Time Required**: ~45 minutes
**Prerequisites**: None (complete beginner friendly)

---

## Table of Contents

1. [What is Moltbot?](#1-what-is-moltbot)
2. [The 30,000-Foot View](#2-the-30000-foot-view)
3. [System Layers Explained](#3-system-layers-explained)
4. [The Core Components](#4-the-core-components)
5. [How Components Communicate](#5-how-components-communicate)
6. [The Plugin System](#6-the-plugin-system)
7. [Native Applications](#7-native-applications)
8. [Codebase Structure](#8-codebase-structure)
9. [Key Technologies Used](#9-key-technologies-used)
10. [Summary](#10-summary)

---

## 1. What is Moltbot?

Moltbot is a **personal AI assistant platform** that you run on your own devices. Unlike cloud-based AI assistants (Siri, Alexa, Google Assistant), Moltbot:

- **Runs locally** on your computer or server
- **Connects to your messaging apps** (WhatsApp, Telegram, Discord, etc.)
- **Uses AI providers you choose** (Claude, GPT, etc.)
- **Gives you complete control** over your data and privacy

Think of Moltbot as a **bridge** between your messaging apps and AI:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    YOUR PHONE                          YOUR COMPUTER            │
│    ┌─────────┐                         ┌─────────────────┐     │
│    │WhatsApp │ ──────────────────────▶ │                 │     │
│    │Telegram │                         │    MOLTBOT      │     │
│    │Discord  │ ◀────────────────────── │    GATEWAY      │     │
│    │Slack    │                         │                 │     │
│    └─────────┘                         └────────┬────────┘     │
│                                                  │              │
│                                                  │              │
│                                                  ▼              │
│                                         ┌───────────────┐      │
│                                         │   AI PROVIDER │      │
│                                         │ (Claude, GPT) │      │
│                                         └───────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. The 30,000-Foot View

Before diving into details, here's the complete system architecture:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MOLTBOT ARCHITECTURE                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────── USER INTERFACES ───────────────────────┐  │
│  │                                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ WhatsApp │ │ Telegram │ │ Discord  │ │  Slack   │ │  Signal  │    │  │
│  │  │   Web    │ │ Bot API  │ │ Bot API  │ │   Bolt   │ │signal-cli│    │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │  │
│  │       │            │            │            │            │          │  │
│  │  ┌────┴────┐ ┌─────┴────┐ ┌────┴─────┐ ┌────┴────┐ ┌─────┴────┐     │  │
│  │  │iMessage │ │  Matrix  │ │MS Teams  │ │  Zalo   │ │Google    │     │  │
│  │  │ (macOS) │ │(extension│ │(extension│ │(extensn)│ │  Chat    │     │  │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬─────┘     │  │
│  │       │           │            │            │           │           │  │
│  └───────┴───────────┴────────────┼────────────┴───────────┴───────────┘  │
│                                   │                                        │
│                                   ▼                                        │
│  ┌───────────────────── CHANNEL ABSTRACTION LAYER ────────────────────┐   │
│  │                                                                     │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │                    CHANNEL ROUTER                            │  │   │
│  │   │  • Normalizes messages from all platforms                   │  │   │
│  │   │  • Applies access control (allowlists, pairing)             │  │   │
│  │   │  • Routes to appropriate agent/session                      │  │   │
│  │   │  • Handles mention detection in groups                      │  │   │
│  │   └──────────────────────────┬──────────────────────────────────┘  │   │
│  │                              │                                      │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌──────────────────────── GATEWAY SERVER ─────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │  │
│  │   │ HTTP Server │  │  WebSocket  │  │   Control   │                 │  │
│  │   │   (Hono)    │  │   Server    │  │     UI      │                 │  │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │  │
│  │          │                │                │                         │  │
│  │          └────────────────┼────────────────┘                         │  │
│  │                           │                                          │  │
│  │   ┌───────────────────────┼───────────────────────┐                 │  │
│  │   │              GATEWAY CORE                      │                 │  │
│  │   │  ┌───────────┐ ┌───────────┐ ┌───────────┐   │                 │  │
│  │   │  │  Session  │ │   Cron    │ │  Config   │   │                 │  │
│  │   │  │  Manager  │ │  Service  │ │  Loader   │   │                 │  │
│  │   │  └───────────┘ └───────────┘ └───────────┘   │                 │  │
│  │   │  ┌───────────┐ ┌───────────┐ ┌───────────┐   │                 │  │
│  │   │  │   Node    │ │   Hook    │ │  Plugin   │   │                 │  │
│  │   │  │ Registry  │ │  Manager  │ │  Loader   │   │                 │  │
│  │   │  └───────────┘ └───────────┘ └───────────┘   │                 │  │
│  │   └───────────────────────┬───────────────────────┘                 │  │
│  │                           │                                          │  │
│  └───────────────────────────┼──────────────────────────────────────────┘  │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────── AGENT RUNTIME ────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌─────────────────────────────────────────────────────────────┐   │  │
│  │   │                    PI FRAMEWORK                              │   │  │
│  │   │  • Agent loop (think → tool use → respond)                  │   │  │
│  │   │  • Session/context management                               │   │  │
│  │   │  • Tool execution sandbox                                   │   │  │
│  │   │  • Memory and history                                       │   │  │
│  │   └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                              │                                       │  │
│  └──────────────────────────────┼───────────────────────────────────────┘  │
│                                 │                                          │
│                                 ▼                                          │
│  ┌──────────────────────── AI PROVIDERS ───────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │   │Anthropic │  │  OpenAI  │  │ Bedrock  │  │  Gemini  │           │  │
│  │   │ (Claude) │  │  (GPT)   │  │  (AWS)   │  │ (Google) │           │  │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘           │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐                         │  │
│  │   │  Ollama  │  │   Qwen   │  │OpenRouter│                         │  │
│  │   │ (Local)  │  │(Chinese) │  │(Gateway) │                         │  │
│  │   └──────────┘  └──────────┘  └──────────┘                         │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. System Layers Explained

Moltbot is built in **distinct layers**, each with specific responsibilities:

### Layer 1: User Interfaces (Channels)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: CHANNELS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IT DOES:                                                          │
│  • Connects to external messaging platforms                             │
│  • Receives messages from users                                         │
│  • Sends responses back to users                                        │
│  • Handles platform-specific features (reactions, attachments, etc.)    │
│                                                                         │
│  BUILT-IN CHANNELS:                                                     │
│  ┌─────────────┬─────────────┬──────────────┬─────────────────────────┐│
│  │   Channel   │   Library   │ Connection   │        Location         ││
│  ├─────────────┼─────────────┼──────────────┼─────────────────────────┤│
│  │ Telegram    │ grammY      │ Bot API      │ src/telegram/           ││
│  │ WhatsApp    │ Baileys     │ QR Link      │ src/web/                ││
│  │ Discord     │ discord.js  │ Bot Token    │ src/discord/            ││
│  │ Slack       │ Bolt        │ Socket Mode  │ src/slack/              ││
│  │ Signal      │ signal-cli  │ Linked Device│ src/signal/             ││
│  │ iMessage    │ imsg        │ macOS native │ src/imessage/           ││
│  │ Google Chat │ Chat API    │ HTTP Webhook │ src/googlechat/         ││
│  └─────────────┴─────────────┴──────────────┴─────────────────────────┘│
│                                                                         │
│  EXTENSION CHANNELS (via plugins):                                      │
│  • Microsoft Teams → extensions/msteams/                                │
│  • Matrix         → extensions/matrix/                                  │
│  • Zalo           → extensions/zalo/                                    │
│  • BlueBubbles    → extensions/bluebubbles/                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 2: Channel Abstraction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: CHANNEL ABSTRACTION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IT DOES:                                                          │
│  • Normalizes messages from different platforms into a common format    │
│  • Applies security rules (allowlists, pairing codes)                   │
│  • Routes messages to the correct agent                                 │
│  • Handles group chat rules (mention detection, activation)             │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/channels/registry.ts      - Channel registration                 │
│  • src/channels/plugins/index.ts - Plugin channel system                │
│  • src/routing/resolve-route.ts  - Message routing logic                │
│  • src/routing/session-key.ts    - Session key generation               │
│                                                                         │
│  MESSAGE NORMALIZATION:                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Telegram Message:          Normalized Format:                     ││
│  │  {                    ───▶  {                                      ││
│  │    chat: { id: 123 }         channel: "telegram",                  ││
│  │    from: { id: 456 }         senderId: "456",                      ││
│  │    text: "Hello"             conversationId: "123",                ││
│  │  }                           text: "Hello",                        ││
│  │                              timestamp: Date,                      ││
│  │                              isGroup: false                        ││
│  │                            }                                       ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 3: Gateway Server

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: GATEWAY SERVER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IT DOES:                                                          │
│  • Central control plane for the entire system                          │
│  • HTTP/WebSocket server for clients and nodes                          │
│  • Manages sessions, configuration, and state                           │
│  • Orchestrates agent runs and tool execution                           │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/gateway/server.impl.ts    - Main server implementation           │
│  • src/gateway/server-http.ts    - HTTP endpoints                       │
│  • src/gateway/server-ws-runtime.ts - WebSocket handlers                │
│  • src/gateway/server-chat.ts    - Chat/agent coordination              │
│                                                                         │
│  SERVER COMPONENTS:                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │   HTTP Server (Hono)                                               ││
│  │   ├── /health          - Health check endpoint                     ││
│  │   ├── /api/*           - REST API endpoints                        ││
│  │   ├── /v1/chat/*       - OpenAI-compatible API                     ││
│  │   └── /ui/*            - Control UI static files                   ││
│  │                                                                    ││
│  │   WebSocket Server                                                 ││
│  │   ├── Client connections (mobile apps, web UI)                     ││
│  │   ├── Node connections (iOS, Android, macOS nodes)                 ││
│  │   └── Real-time event broadcasting                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  DEFAULT PORT: 18789                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 4: Agent Runtime

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       LAYER 4: AGENT RUNTIME                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IT DOES:                                                          │
│  • Manages AI agent lifecycle (start, run, stop)                        │
│  • Handles the "agent loop" (think → tool use → respond)                │
│  • Maintains session context and history                                │
│  • Executes tools in a sandboxed environment                            │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/agents/cli-runner.ts      - Agent runner for CLI                 │
│  • src/agents/context.ts         - Agent context management             │
│  • src/agents/bash-tools.ts      - Bash command tool                    │
│  • src/agents/auth-profiles.ts   - Authentication management            │
│                                                                         │
│  THE AGENT LOOP:                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │       ┌──────────────────────────────────────────────────┐        ││
│  │       │                                                  │        ││
│  │       ▼                                                  │        ││
│  │   ┌────────┐    ┌───────────┐    ┌───────────┐    ┌────────┐     ││
│  │   │Receive │───▶│   Send    │───▶│  Execute  │───▶│ Append │     ││
│  │   │ Input  │    │ to AI     │    │   Tools   │    │ Result │     ││
│  │   └────────┘    └───────────┘    └───────────┘    └───┬────┘     ││
│  │                                                       │          ││
│  │                       ┌───────────────────────────────┘          ││
│  │                       │                                          ││
│  │                       ▼                                          ││
│  │               ┌──────────────┐                                   ││
│  │               │  More tools  │ ──Yes──▶ (back to Send to AI)     ││
│  │               │   needed?    │                                   ││
│  │               └──────┬───────┘                                   ││
│  │                      │ No                                        ││
│  │                      ▼                                           ││
│  │               ┌──────────────┐                                   ││
│  │               │ Send Reply  │                                    ││
│  │               │  to User    │                                    ││
│  │               └──────────────┘                                   ││
│  │                                                                  ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 5: AI Providers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       LAYER 5: AI PROVIDERS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IT DOES:                                                          │
│  • Abstracts different AI APIs into a common interface                  │
│  • Handles authentication (OAuth, API keys)                             │
│  • Manages rate limiting and failover                                   │
│  • Tracks token usage and costs                                         │
│                                                                         │
│  KEY FILES:                                                             │
│  • src/providers/anthropic.ts    - Anthropic Claude                     │
│  • src/providers/openai.ts       - OpenAI GPT                           │
│  • src/providers/bedrock.ts      - AWS Bedrock                          │
│  • src/providers/ollama.ts       - Local Ollama models                  │
│                                                                         │
│  PROVIDER INTERFACE:                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  interface AIProvider {                                            ││
│  │    name: string;                                                   ││
│  │                                                                    ││
│  │    // Send messages and get a response                             ││
│  │    chat(                                                           ││
│  │      messages: Message[],                                          ││
│  │      options: ChatOptions                                          ││
│  │    ): Promise<Response>;                                           ││
│  │                                                                    ││
│  │    // Stream responses in real-time                                ││
│  │    streamChat(                                                     ││
│  │      messages: Message[],                                          ││
│  │      options: ChatOptions                                          ││
│  │    ): AsyncIterable<Chunk>;                                        ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  SUPPORTED PROVIDERS:                                                   │
│  • Anthropic (Claude 3/4, Opus, Sonnet, Haiku)                          │
│  • OpenAI (GPT-4, GPT-4o, o1)                                           │
│  • AWS Bedrock (Claude, other models)                                   │
│  • Google Vertex AI (Gemini)                                            │
│  • Ollama (Local models)                                                │
│  • OpenRouter (Gateway to multiple providers)                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The Core Components

### 4.1 The CLI (Command Line Interface)

The CLI is how you interact with Moltbot from the terminal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ENTRY POINT: src/entry.ts                                              │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  1. Sets process title to "moltbot"                                ││
│  │  2. Filters experimental warnings                                  ││
│  │  3. Handles Windows argv normalization                             ││
│  │  4. Loads CLI profile if specified (--profile)                     ││
│  │  5. Imports and runs src/cli/run-main.js                           ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  PROGRAM BUILDER: src/cli/program/build-program.ts                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  import { Command } from "commander";                              ││
│  │                                                                    ││
│  │  function buildProgram() {                                         ││
│  │    const program = new Command();                                  ││
│  │    const ctx = createProgramContext();                             ││
│  │                                                                    ││
│  │    configureProgramHelp(program, ctx);                             ││
│  │    registerPreActionHooks(program, ctx);                           ││
│  │    registerProgramCommands(program, ctx, argv);                    ││
│  │                                                                    ││
│  │    return program;                                                 ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  COMMAND STRUCTURE:                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  moltbot                                                           ││
│  │  ├── gateway          # Gateway server management                  ││
│  │  │   ├── run          # Start the gateway                          ││
│  │  │   └── status       # Check gateway status                       ││
│  │  ├── channels         # Channel management                         ││
│  │  │   ├── status       # Show channel status                        ││
│  │  │   ├── connect      # Connect a channel                          ││
│  │  │   └── disconnect   # Disconnect a channel                       ││
│  │  ├── agent            # Talk to the AI                             ││
│  │  ├── message          # Send messages                              ││
│  │  │   └── send         # Send a message                             ││
│  │  ├── config           # Configuration management                   ││
│  │  │   ├── get          # Get a config value                         ││
│  │  │   ├── set          # Set a config value                         ││
│  │  │   └── list         # List all config                            ││
│  │  ├── onboard          # First-time setup wizard                    ││
│  │  ├── doctor           # Run diagnostics                            ││
│  │  ├── pairing          # Manage pairing codes                       ││
│  │  └── ...more commands                                              ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Configuration System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONFIGURATION SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LOCATION: ~/.clawdbot/config.json                                      │
│                                                                         │
│  STRUCTURE:                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  {                                                                 ││
│  │    "gateway": {                                                    ││
│  │      "port": 18789,                                                ││
│  │      "bind": "loopback",                                           ││
│  │      "auth": { ... }                                               ││
│  │    },                                                              ││
│  │    "channels": {                                                   ││
│  │      "telegram": {                                                 ││
│  │        "enabled": true,                                            ││
│  │        "token": "...",                                             ││
│  │        "dm": { "policy": "pairing" }                               ││
│  │      },                                                            ││
│  │      "whatsapp": { ... },                                          ││
│  │      "discord": { ... }                                            ││
│  │    },                                                              ││
│  │    "agents": {                                                     ││
│  │      "default": {                                                  ││
│  │        "model": "claude-sonnet-4-20250514",                        ││
│  │        "systemPrompt": "..."                                       ││
│  │      }                                                             ││
│  │    },                                                              ││
│  │    "models": {                                                     ││
│  │      "provider": "anthropic",                                      ││
│  │      "model": "..."                                                ││
│  │    }                                                               ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  KEY FILES:                                                             │
│  • src/config/io.ts          - Read/write config file                   │
│  • src/config/types.ts       - Type definitions (re-exports modules)    │
│  • src/config/validation.ts  - Config validation with Zod               │
│  • src/config/zod-schema.ts  - Zod schema definitions                   │
│                                                                         │
│  TYPE MODULES (src/config/types.*.ts):                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  types.agents.ts     - Agent configuration types                   ││
│  │  types.channels.ts   - Channel configuration types                 ││
│  │  types.gateway.ts    - Gateway configuration types                 ││
│  │  types.telegram.ts   - Telegram-specific config                    ││
│  │  types.discord.ts    - Discord-specific config                     ││
│  │  types.slack.ts      - Slack-specific config                       ││
│  │  types.whatsapp.ts   - WhatsApp-specific config                    ││
│  │  types.signal.ts     - Signal-specific config                      ││
│  │  types.models.ts     - Model/provider config                       ││
│  │  types.hooks.ts      - Hook configuration                          ││
│  │  types.plugins.ts    - Plugin configuration                        ││
│  │  ... and more                                                      ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Session Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SESSION MANAGEMENT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WHAT IS A SESSION?                                                     │
│  A session represents an ongoing conversation with an AI agent.         │
│  It maintains:                                                          │
│  • Conversation history                                                 │
│  • Agent state                                                          │
│  • Tool results                                                         │
│  • Memory/context                                                       │
│                                                                         │
│  SESSION TYPES:                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  1. MAIN SESSION                                                   ││
│  │     • Default session for direct messages                          ││
│  │     • Key: "main" or "default:<agentId>"                           ││
│  │                                                                    ││
│  │  2. PEER SESSIONS                                                  ││
│  │     • Per-sender sessions                                          ││
│  │     • Key: "<channel>:<senderId>"                                  ││
│  │                                                                    ││
│  │  3. GROUP SESSIONS                                                 ││
│  │     • Per-group-chat sessions                                      ││
│  │     • Key: "<channel>:group:<groupId>"                             ││
│  │                                                                    ││
│  │  4. ISOLATED SESSIONS                                              ││
│  │     • No shared memory                                             ││
│  │     • Used for specific tasks                                      ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  SESSION KEY RESOLUTION:                                                │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Input Message                                                     ││
│  │       │                                                            ││
│  │       ▼                                                            ││
│  │  ┌─────────────┐                                                   ││
│  │  │ Is it a DM? │                                                   ││
│  │  └──────┬──────┘                                                   ││
│  │         │                                                          ││
│  │    Yes  │  No (group)                                              ││
│  │    │    │    │                                                     ││
│  │    ▼    │    ▼                                                     ││
│  │  ┌──────┴──┐  ┌───────────────┐                                    ││
│  │  │ Use DM  │  │ Use group key │                                    ││
│  │  │ session │  │ with thread   │                                    ││
│  │  └─────────┘  └───────────────┘                                    ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  KEY FILES:                                                             │
│  • src/config/sessions.ts        - Session store operations            │
│  • src/routing/session-key.ts    - Session key generation              │
│  • src/gateway/server-session-key.ts - Gateway session resolution      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. How Components Communicate

### 5.1 Internal Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTERNAL COMMUNICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │    ┌──────────┐         ┌──────────────┐         ┌──────────┐  │   │
│  │    │ Channel  │────────▶│  Channel     │────────▶│ Gateway  │  │   │
│  │    │ (e.g.    │ Events  │  Router      │ Events  │  Server  │  │   │
│  │    │ Telegram)│         │              │         │          │  │   │
│  │    └──────────┘         └──────────────┘         └────┬─────┘  │   │
│  │                                                       │        │   │
│  │    Communication: Event Emitters + Callbacks          │        │   │
│  │                                                       │        │   │
│  └───────────────────────────────────────────────────────┼────────┘   │
│                                                          │            │
│  ┌───────────────────────────────────────────────────────┼────────┐   │
│  │                                                       │        │   │
│  │    ┌──────────┐         ┌──────────────┐         ┌───▼──────┐ │   │
│  │    │  Agent   │◀────────│    Agent     │◀────────│  Session │ │   │
│  │    │  Runner  │ Promise │   Manager    │ Events  │  Manager │ │   │
│  │    │          │         │              │         │          │ │   │
│  │    └────┬─────┘         └──────────────┘         └──────────┘ │   │
│  │         │                                                      │   │
│  │    Communication: Async/Await + Promises                       │   │
│  │         │                                                      │   │
│  └─────────┼──────────────────────────────────────────────────────┘   │
│            │                                                          │
│  ┌─────────┼──────────────────────────────────────────────────────┐   │
│  │         │                                                      │   │
│  │    ┌────▼─────┐         ┌──────────────┐                      │   │
│  │    │   AI     │────────▶│  Response    │                      │   │
│  │    │ Provider │  HTTP/  │  Handler     │                      │   │
│  │    │          │  Stream │              │                      │   │
│  │    └──────────┘         └──────────────┘                      │   │
│  │                                                                │   │
│  │    Communication: HTTP Requests + Streaming                    │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 External Communication

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL COMMUNICATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TO MESSAGING PLATFORMS:                                                │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Telegram:    Bot API (HTTPS polling or webhooks)                  ││
│  │  WhatsApp:    WebSocket (Baileys library)                          ││
│  │  Discord:     WebSocket (discord.js gateway)                       ││
│  │  Slack:       WebSocket (Socket Mode via Bolt)                     ││
│  │  Signal:      REST API (signal-cli)                                ││
│  │  iMessage:    Local IPC (macOS only)                               ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  TO AI PROVIDERS:                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  All providers use HTTPS REST APIs:                                ││
│  │  • Anthropic:  api.anthropic.com                                   ││
│  │  • OpenAI:     api.openai.com                                      ││
│  │  • Bedrock:    bedrock-runtime.{region}.amazonaws.com              ││
│  │  • Ollama:     localhost:11434 (local)                             ││
│  │                                                                    ││
│  │  Streaming via Server-Sent Events (SSE)                            ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  TO NATIVE APPS (iOS, Android, macOS):                                  │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  WebSocket connection to Gateway:                                  ││
│  │  ws://localhost:18789 or wss://gateway-host:18789                  ││
│  │                                                                    ││
│  │  Protocol: JSON-RPC style messages                                 ││
│  │  {                                                                 ││
│  │    "method": "chat.send",                                          ││
│  │    "params": { "message": "Hello" },                               ││
│  │    "id": "uuid"                                                    ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. The Plugin System

Moltbot has a powerful plugin system for extending functionality:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLUGIN SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PLUGIN STRUCTURE:                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  extensions/<plugin-name>/                                         ││
│  │  ├── package.json              # Plugin npm package                ││
│  │  ├── clawdbot.plugin.json      # Plugin manifest                   ││
│  │  ├── src/                                                          ││
│  │  │   └── index.ts              # Plugin entry point                ││
│  │  └── dist/                     # Compiled output                   ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  PLUGIN MANIFEST (clawdbot.plugin.json):                                │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  {                                                                 ││
│  │    "name": "matrix",                                               ││
│  │    "version": "1.0.0",                                             ││
│  │    "description": "Matrix protocol support",                       ││
│  │    "main": "dist/index.js",                                        ││
│  │    "channels": ["matrix"],                                         ││
│  │    "hooks": {                                                      ││
│  │      "onMessage": "handleMessage",                                 ││
│  │      "onConnect": "handleConnect"                                  ││
│  │    }                                                               ││
│  │  }                                                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  EXISTING PLUGINS (extensions/):                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  CHANNEL PLUGINS:                                                  ││
│  │  • matrix/          - Matrix protocol                              ││
│  │  • msteams/         - Microsoft Teams                              ││
│  │  • zalo/            - Zalo messenger                               ││
│  │  • zalouser/        - Zalo personal account                        ││
│  │  • bluebubbles/     - BlueBubbles (iMessage bridge)                ││
│  │  • voice-call/      - Voice call support                           ││
│  │                                                                    ││
│  │  FEATURE PLUGINS:                                                  ││
│  │  • memory-core/     - Memory and context management                ││
│  │  • llm-task/        - LLM task execution                           ││
│  │  • canvas/          - Canvas rendering (A2UI)                      ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  KEY FILES:                                                             │
│  • src/plugin-sdk/index.ts       - Plugin SDK exports                   │
│  • src/plugins/runtime.ts        - Plugin runtime management            │
│  • src/gateway/server-plugins.ts - Gateway plugin loading               │
│  • src/channels/plugins/load.ts  - Channel plugin loading               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Native Applications

Moltbot includes native apps for various platforms:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NATIVE APPLICATIONS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  macOS App (apps/macos/)                                           ││
│  │  ┌────────────────────────────────────────────────────────────────┐││
│  │  │ • Menu bar app for gateway control                             │││
│  │  │ • Voice Wake (always-on speech activation)                     │││
│  │  │ • Talk Mode overlay                                            │││
│  │  │ • WebChat integration                                          │││
│  │  │ • Debug tools                                                  │││
│  │  │ Language: Swift/SwiftUI                                        │││
│  │  └────────────────────────────────────────────────────────────────┘││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  iOS App (apps/ios/)                                               ││
│  │  ┌────────────────────────────────────────────────────────────────┐││
│  │  │ • Canvas visualization                                         │││
│  │  │ • Voice Wake and Talk Mode                                     │││
│  │  │ • Camera integration                                           │││
│  │  │ • Screen recording                                             │││
│  │  │ • Bonjour pairing with gateway                                 │││
│  │  │ Language: Swift/SwiftUI                                        │││
│  │  └────────────────────────────────────────────────────────────────┘││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Android App (apps/android/)                                       ││
│  │  ┌────────────────────────────────────────────────────────────────┐││
│  │  │ • Canvas visualization                                         │││
│  │  │ • Talk Mode                                                    │││
│  │  │ • Camera integration                                           │││
│  │  │ • Screen recording                                             │││
│  │  │ • Optional SMS integration                                     │││
│  │  │ Language: Kotlin                                               │││
│  │  └────────────────────────────────────────────────────────────────┘││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  SHARED CODE: apps/shared/ (MoltbotKit - Swift framework)               │
│                                                                         │
│  APP ↔ GATEWAY COMMUNICATION:                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Native App                   Gateway                              ││
│  │      │                           │                                 ││
│  │      │──── WebSocket Connect ────▶│                                ││
│  │      │                           │                                 ││
│  │      │◀─── Connected ────────────│                                 ││
│  │      │                           │                                 ││
│  │      │──── Subscribe events ────▶│                                 ││
│  │      │                           │                                 ││
│  │      │◀─── Event stream ─────────│                                 ││
│  │      │                           │                                 ││
│  │      │──── Send command ────────▶│                                 ││
│  │      │                           │                                 ││
│  │      │◀─── Command result ───────│                                 ││
│  │      │                           │                                 ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Codebase Structure

Here's the complete directory structure with explanations:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CODEBASE STRUCTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  moltbot/                                                               │
│  │                                                                      │
│  ├── src/                          # Main TypeScript source code        │
│  │   ├── entry.ts                  # CLI entry point                    │
│  │   ├── index.ts                  # Main exports                       │
│  │   │                                                                  │
│  │   ├── cli/                      # CLI infrastructure                 │
│  │   │   ├── program/              # Command builder                    │
│  │   │   ├── deps.ts               # Dependency injection               │
│  │   │   └── prompt.ts             # User prompts                       │
│  │   │                                                                  │
│  │   ├── commands/                 # Individual CLI commands            │
│  │   │   ├── gateway.ts            # moltbot gateway                    │
│  │   │   ├── channels.ts           # moltbot channels                   │
│  │   │   ├── agent.ts              # moltbot agent                      │
│  │   │   └── ...                                                        │
│  │   │                                                                  │
│  │   ├── gateway/                  # Gateway server                     │
│  │   │   ├── server.impl.ts        # Main server                        │
│  │   │   ├── server-http.ts        # HTTP routes                        │
│  │   │   ├── server-ws-runtime.ts  # WebSocket                          │
│  │   │   ├── server-chat.ts        # Chat handling                      │
│  │   │   └── ...                                                        │
│  │   │                                                                  │
│  │   ├── channels/                 # Channel abstraction                │
│  │   │   ├── registry.ts           # Channel registry                   │
│  │   │   ├── plugins/              # Plugin channel system              │
│  │   │   └── ...                                                        │
│  │   │                                                                  │
│  │   ├── telegram/                 # Telegram channel                   │
│  │   │   ├── bot.ts                # Bot creation                       │
│  │   │   ├── monitor.ts            # Message monitoring                 │
│  │   │   └── ...                                                        │
│  │   │                                                                  │
│  │   ├── discord/                  # Discord channel                    │
│  │   ├── slack/                    # Slack channel                      │
│  │   ├── signal/                   # Signal channel                     │
│  │   ├── imessage/                 # iMessage channel                   │
│  │   ├── web/                      # WhatsApp Web channel               │
│  │   │                                                                  │
│  │   ├── agents/                   # Agent runtime                      │
│  │   │   ├── cli-runner.ts         # Agent runner                       │
│  │   │   ├── context.ts            # Agent context                      │
│  │   │   ├── bash-tools.ts         # Bash tool                          │
│  │   │   └── ...                                                        │
│  │   │                                                                  │
│  │   ├── providers/                # AI providers                       │
│  │   ├── config/                   # Configuration                      │
│  │   ├── routing/                  # Message routing                    │
│  │   ├── media/                    # Media processing                   │
│  │   ├── plugin-sdk/               # Plugin SDK                         │
│  │   ├── infra/                    # Infrastructure utilities           │
│  │   └── logging/                  # Logging system                     │
│  │                                                                      │
│  ├── extensions/                   # Plugin packages                    │
│  │   ├── matrix/                                                        │
│  │   ├── msteams/                                                       │
│  │   ├── zalo/                                                          │
│  │   └── ...                                                            │
│  │                                                                      │
│  ├── apps/                         # Native applications                │
│  │   ├── ios/                      # iOS app                            │
│  │   ├── android/                  # Android app                        │
│  │   ├── macos/                    # macOS app                          │
│  │   └── shared/                   # Shared Swift code                  │
│  │                                                                      │
│  ├── ui/                           # Web UI (Lit + Vite)                 │
│  ├── docs/                         # Mintlify documentation             │
│  ├── test/                         # Test utilities                     │
│  ├── scripts/                      # Build/utility scripts              │
│  │                                                                      │
│  ├── package.json                  # Project manifest                   │
│  ├── tsconfig.json                 # TypeScript config                  │
│  ├── vitest.config.ts              # Test config                        │
│  └── pnpm-lock.yaml                # Lock file                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Key Technologies Used

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY TECHNOLOGIES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RUNTIME & LANGUAGE:                                                    │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ Node.js 22+      │ JavaScript runtime                             │ │
│  │ TypeScript       │ Typed JavaScript                               │ │
│  │ ESM              │ ES Modules (modern import/export)              │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  BUILD & TOOLING:                                                       │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ pnpm             │ Fast package manager                           │ │
│  │ tsc              │ TypeScript compiler                            │ │
│  │ Oxlint           │ Fast linter                                    │ │
│  │ Oxfmt            │ Fast formatter                                 │ │
│  │ Vitest           │ Test framework                                 │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  WEB FRAMEWORK:                                                         │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ Hono             │ Fast, lightweight HTTP framework               │ │
│  │ ws               │ WebSocket library                              │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  MESSAGING LIBRARIES:                                                   │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ grammY           │ Telegram Bot API framework                     │ │
│  │ Baileys          │ WhatsApp Web API                               │ │
│  │ discord.js       │ Discord API client                             │ │
│  │ Slack Bolt       │ Slack SDK                                      │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  VALIDATION & TYPES:                                                    │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ Zod              │ Runtime type validation                        │ │
│  │ TypeBox          │ JSON Schema generation                         │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  CLI:                                                                   │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ Commander.js     │ CLI argument parsing                           │ │
│  │ @clack/prompts   │ Interactive prompts                            │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
│  NATIVE APPS:                                                           │
│  ┌──────────────────┬────────────────────────────────────────────────┐ │
│  │ Swift/SwiftUI    │ iOS and macOS apps                             │ │
│  │ Kotlin           │ Android app                                    │ │
│  └──────────────────┴────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Summary

Congratulations! You now understand Moltbot's complete architecture:

### Key Takeaways:

1. **Layered Architecture**: Moltbot is built in distinct layers (Channels → Router → Gateway → Agent → Provider)

2. **Gateway is Central**: The gateway server is the heart of the system, coordinating everything

3. **Channels Abstract Platforms**: Each messaging platform has its own channel implementation that normalizes messages

4. **Agents Handle AI**: The agent runtime manages conversations with AI providers

5. **Plugins Extend**: The plugin system allows adding new channels and features

6. **Native Apps Connect**: Mobile and desktop apps connect to the gateway via WebSocket

### Next Steps:

Now that you understand the architecture, continue to:
- [Tutorial 02: Data Flow Deep Dive](02-DATA-FLOW-DEEP-DIVE.md) - See how messages flow through the system
- [Tutorial 03: Gateway Internals](03-GATEWAY-INTERNALS.md) - Deep dive into the central server

---

## Quick Reference

### Key Entry Points

| Component | Entry Point |
|-----------|-------------|
| CLI | `src/entry.ts` → `src/cli/program/build-program.ts` |
| Gateway | `src/gateway/server.impl.ts` |
| Channels | `src/channels/registry.ts` |
| Agents | `src/agents/cli-runner.ts` |

### Important Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | Main TypeScript source |
| `src/gateway/` | Gateway server |
| `src/channels/` | Channel abstraction |
| `src/telegram/` | Telegram channel |
| `src/discord/` | Discord channel |
| `src/agents/` | Agent runtime |
| `src/config/` | Configuration |
| `extensions/` | Plugins |
| `apps/` | Native apps |

---

[← Back to Index](00-INDEX.md) | [Next: Data Flow Deep Dive →](02-DATA-FLOW-DEEP-DIVE.md)
