# Tutorial 03 - Gateway Internals

Welcome to the deep dive into the Moltbot Gateway. This tutorial explains exactly how the central control plane works, what each component does, and how they interact.

## What is the Gateway?

The Gateway is the **central nervous system** of Moltbot. Think of it like the control tower at an airport:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GATEWAY CONTROL TOWER                                │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Telegram   │    │  WhatsApp   │    │   Discord   │    │    Slack    │ │
│  │   Flight    │    │   Flight    │    │   Flight    │    │   Flight    │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │                  │         │
│         ▼                  ▼                  ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     GATEWAY HTTP/WebSocket SERVER                    │   │
│  │                        (Port 18789 by default)                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         AI AGENT RUNTIME                             │   │
│  │                   (Claude, GPT, Ollama, etc.)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The Gateway handles:**
- Starting and managing messaging channels (Telegram, WhatsApp, etc.)
- Routing messages between channels and AI agents
- WebSocket connections for real-time communication
- HTTP API for control and configuration
- Plugin lifecycle management
- Session and state management
- Scheduled tasks (cron jobs)
- Health monitoring

---

## Gateway Startup Sequence

When you run `moltbot gateway run`, here's what happens step by step:

### Step 1: Configuration Loading

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: CONFIGURATION LOADING                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Read config file (~/.clawdbot/config.json)                      │
│         │                                                           │
│         ▼                                                           │
│  2. Check for legacy entries (auto-migrate if found)                │
│         │                                                           │
│         ▼                                                           │
│  3. Validate against Zod schema                                     │
│         │                                                           │
│         ▼                                                           │
│  4. Auto-enable plugins based on environment                        │
│         │                                                           │
│         ▼                                                           │
│  5. Apply runtime configuration overrides                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server.impl.ts:147-248`

The configuration loading process:

1. **Read Config Snapshot**: Loads the JSON file from `~/.clawdbot/config.json`
2. **Legacy Migration**: If old config format detected, automatically migrates
3. **Validation**: Uses Zod schemas to validate all configuration
4. **Plugin Auto-Enable**: Enables plugins based on environment variables
5. **Runtime Config Resolution**: Merges CLI options with config file

### Step 2: Plugin and Channel Registration

```
┌─────────────────────────────────────────────────────────────────────┐
│                 STEP 2: PLUGIN & CHANNEL REGISTRATION               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐                                                  │
│  │ Load Bundled  │                                                  │
│  │   Plugins     │─────┐                                            │
│  └───────────────┘     │                                            │
│                        ▼                                            │
│  ┌───────────────┐  ┌─────────────────────────────────────┐         │
│  │ Load External │──│        PLUGIN REGISTRY              │         │
│  │   Plugins     │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│         │
│  └───────────────┘  │  │Telegram │ │WhatsApp │ │ Discord ││         │
│                     │  │ Plugin  │ │ Plugin  │ │ Plugin  ││         │
│                     │  └─────────┘ └─────────┘ └─────────┘│         │
│  ┌───────────────┐  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│         │
│  │ Load Config   │──│  │  Slack  │ │ Signal  │ │iMessage ││         │
│  │   Plugins     │  │  │ Plugin  │ │ Plugin  │ │ Plugin  ││         │
│  └───────────────┘  │  └─────────┘ └─────────┘ └─────────┘│         │
│                     └─────────────────────────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server.impl.ts:222-236`

Plugins are loaded from three sources:
1. **Bundled Plugins**: Built into Moltbot (in `extensions/` directory)
2. **External Plugins**: Installed via npm
3. **Config Plugins**: Paths specified in config

Each channel is implemented as a plugin that registers:
- Gateway methods (RPC handlers)
- Event handlers
- Onboarding adapters
- Message normalizers

### Step 3: HTTP/WebSocket Server Creation

```
┌─────────────────────────────────────────────────────────────────────┐
│               STEP 3: HTTP/WEBSOCKET SERVER CREATION                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    HONO HTTP SERVER                           │  │
│  │                                                               │  │
│  │  GET  /health ─────────────────► Health check endpoint        │  │
│  │  GET  /control/* ──────────────► Control UI (web dashboard)   │  │
│  │  POST /v1/chat/completions ────► OpenAI-compatible API        │  │
│  │  POST /v1/responses ───────────► OpenResponses API            │  │
│  │  WS   / ───────────────────────► WebSocket upgrade            │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    WEBSOCKET SERVER                           │  │
│  │                                                               │  │
│  │  • JSON-RPC style method calls                                │  │
│  │  • Real-time event broadcasting                               │  │
│  │  • Client connection management                               │  │
│  │  • Authentication & authorization                             │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-runtime-state.ts`

The Gateway uses:
- **Hono**: Fast HTTP framework for REST endpoints
- **ws**: WebSocket library for real-time communication
- **Node.js HTTP/HTTPS**: Native server with optional TLS

### Step 4: Channel Manager Initialization

```
┌─────────────────────────────────────────────────────────────────────┐
│                STEP 4: CHANNEL MANAGER INITIALIZATION               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Channel Manager                                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │  startChannels() ────► Loop through enabled channels        │    │
│  │         │                                                   │    │
│  │         ├─► telegram.enabled? ──► startChannel('telegram')  │    │
│  │         ├─► whatsapp.enabled? ──► startChannel('whatsapp')  │    │
│  │         ├─► discord.enabled?  ──► startChannel('discord')   │    │
│  │         ├─► slack.enabled?    ──► startChannel('slack')     │    │
│  │         └─► ...                                             │    │
│  │                                                             │    │
│  │  Each channel runs in its own async context                 │    │
│  │  with isolated error handling                               │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-channels.ts`

The Channel Manager:
- Tracks runtime state for each channel
- Provides start/stop/restart capabilities
- Handles graceful shutdown
- Reports channel status and errors

### Step 5: Discovery and Networking

```
┌─────────────────────────────────────────────────────────────────────┐
│                STEP 5: DISCOVERY AND NETWORKING                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  mDNS/Bonjour   │    │   Tailscale     │    │  Wide Area      │  │
│  │   Discovery     │    │   Exposure      │    │   Discovery     │  │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘  │
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 GATEWAY DISCOVERY SERVICE                   │    │
│  │                                                             │    │
│  │  • Advertises gateway on local network                      │    │
│  │  • Enables mobile app auto-discovery                        │    │
│  │  • Supports secure Tailscale exposure                       │    │
│  │  • Machine display name for identification                  │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-discovery-runtime.ts`

Discovery enables:
- **mDNS (Bonjour)**: Local network discovery for mobile apps
- **Tailscale**: Secure remote access over VPN
- **Wide Area**: Cloud-based discovery (optional)

---

## Gateway Internal Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GATEWAY INTERNAL COMPONENTS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           CORE SERVICES                                │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Config    │  │   Logger    │  │    Deps     │  │   Cron      │   │  │
│  │  │   Loader    │  │  Subsystem  │  │  Container  │  │  Scheduler  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        COMMUNICATION LAYER                             │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  WebSocket  │  │    HTTP     │  │   Event     │  │   Node      │   │  │
│  │  │   Handler   │  │   Router    │  │  Broadcast  │  │  Registry   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         CHANNEL LAYER                                  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  Channel    │  │   Message   │  │   Session   │  │  Allowlist  │   │  │
│  │  │  Manager    │  │ Normalizer  │  │   Tracker   │  │  Resolver   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          AGENT LAYER                                   │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Agent     │  │    Chat     │  │   Tool      │  │   Model     │   │  │
│  │  │  Runtime    │  │  Handlers   │  │  Registry   │  │  Catalog    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Gateway Methods (RPC API)

The Gateway exposes methods via WebSocket RPC. Here are the main categories:

### Channel Methods

| Method | Description |
|--------|-------------|
| `channels.status` | Get status of all channels |
| `channels.start` | Start a specific channel |
| `channels.stop` | Stop a specific channel |
| `channels.restart` | Restart a channel |
| `channels.login` | Trigger login flow (e.g., WhatsApp QR) |

### Agent Methods

| Method | Description |
|--------|-------------|
| `agent.send` | Send a message to the AI agent |
| `agent.abort` | Abort an in-progress agent run |
| `agent.list` | List available agents |
| `agent.config` | Get agent configuration |

### Config Methods

| Method | Description |
|--------|-------------|
| `config.get` | Get current configuration |
| `config.patch` | Apply partial configuration update |
| `config.apply` | Apply full configuration |
| `config.reload` | Reload configuration from file |

### Health Methods

| Method | Description |
|--------|-------------|
| `health.check` | Simple health check |
| `health.snapshot` | Detailed health snapshot |
| `health.version` | Get version information |

**Code Reference:** `src/gateway/server-methods-list.ts`

---

## Event Broadcasting System

The Gateway broadcasts events to connected clients in real-time:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EVENT BROADCASTING SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Event Sources                         Connected Clients            │
│  ┌─────────────────┐                  ┌─────────────────┐           │
│  │  Channel Events │────────┐         │   Control UI    │◄────┐    │
│  │  (new message)  │        │         │   (Browser)     │     │    │
│  └─────────────────┘        │         └─────────────────┘     │    │
│  ┌─────────────────┐        │         ┌─────────────────┐     │    │
│  │  Agent Events   │────────┤         │   Mobile App    │◄────┤    │
│  │  (thinking...)  │        │         │   (iOS/Android) │     │    │
│  └─────────────────┘        │         └─────────────────┘     │    │
│  ┌─────────────────┐        ▼         ┌─────────────────┐     │    │
│  │  Health Events  │───► BROADCAST ───│   CLI Client    │◄────┤    │
│  │  (status change)│        ▲         │   (moltbot)     │     │    │
│  └─────────────────┘        │         └─────────────────┘     │    │
│  ┌─────────────────┐        │         ┌─────────────────┐     │    │
│  │  Cron Events    │────────┤         │   API Client    │◄────┘    │
│  │  (task fired)   │        │         │   (custom)      │          │
│  └─────────────────┘        │         └─────────────────┘          │
│  ┌─────────────────┐        │                                      │
│  │  Config Events  │────────┘                                      │
│  │  (config changed)                                               │
│  └─────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Events:**

| Event | Description |
|-------|-------------|
| `message.received` | New message from a channel |
| `message.sent` | Message sent to a channel |
| `agent.thinking` | Agent started processing |
| `agent.token` | Streaming token from AI |
| `agent.done` | Agent finished processing |
| `channel.status` | Channel status changed |
| `health.changed` | Health status changed |
| `config.changed` | Configuration changed |

**Code Reference:** `src/gateway/server-broadcast.ts`

---

## Node Registry (Remote Clients)

The Gateway maintains a registry of connected "nodes" (clients):

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NODE REGISTRY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    REGISTERED NODES                          │    │
│  │                                                             │    │
│  │  Node ID: "ios-abc123"                                       │    │
│  │  ├── Type: mobile                                           │    │
│  │  ├── Platform: ios                                          │    │
│  │  ├── Connected: 2024-01-15T10:30:00Z                        │    │
│  │  ├── Capabilities: [voice, push, camera]                    │    │
│  │  └── Subscriptions: [chat.main, health]                     │    │
│  │                                                             │    │
│  │  Node ID: "web-xyz789"                                       │    │
│  │  ├── Type: web                                              │    │
│  │  ├── Platform: browser                                      │    │
│  │  ├── Connected: 2024-01-15T10:25:00Z                        │    │
│  │  ├── Capabilities: [notifications]                          │    │
│  │  └── Subscriptions: [chat.main, channel.status]             │    │
│  │                                                             │    │
│  │  Node ID: "cli-def456"                                       │    │
│  │  ├── Type: cli                                              │    │
│  │  ├── Platform: linux                                        │    │
│  │  ├── Connected: 2024-01-15T10:20:00Z                        │    │
│  │  ├── Capabilities: []                                       │    │
│  │  └── Subscriptions: [agent.events]                          │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/node-registry.ts`

Nodes can:
- Subscribe to specific event streams
- Receive targeted events
- Participate in skills execution
- Provide remote capabilities (voice, etc.)

---

## Cron Service

The Gateway includes a built-in cron scheduler:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CRON SERVICE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Configuration (in config.json):                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  {                                                          │    │
│  │    "cron": {                                                │    │
│  │      "tasks": {                                             │    │
│  │        "daily-summary": {                                   │    │
│  │          "schedule": "0 9 * * *",                           │    │
│  │          "message": "Give me a summary of today's tasks",   │    │
│  │          "channel": "telegram",                             │    │
│  │          "target": "123456789"                              │    │
│  │        },                                                   │    │
│  │        "weekly-report": {                                   │    │
│  │          "schedule": "0 17 * * 5",                          │    │
│  │          "message": "Generate weekly report",               │    │
│  │          "channel": "slack",                                │    │
│  │          "target": "#reports"                               │    │
│  │        }                                                    │    │
│  │      }                                                      │    │
│  │    }                                                        │    │
│  │  }                                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Execution Flow:                                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Schedule   │───►│   Execute   │───►│   Send to   │             │
│  │  Matches    │    │   Agent     │    │   Channel   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-cron.ts`

---

## Gateway Lifecycle Management

### Hot Reload

The Gateway supports hot reloading of configuration:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HOT RELOAD PROCESS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  File System                   Gateway                              │
│  ┌─────────────┐              ┌─────────────────────────┐           │
│  │config.json  │ ─── Watch ──►│  Config File Watcher    │           │
│  │  (changed)  │              │                         │           │
│  └─────────────┘              └───────────┬─────────────┘           │
│                                           │                         │
│                                           ▼                         │
│                               ┌─────────────────────────┐           │
│                               │  Detect Changes Type    │           │
│                               └───────────┬─────────────┘           │
│                                           │                         │
│               ┌───────────────────────────┼───────────────────────┐ │
│               │                           │                       │ │
│               ▼                           ▼                       ▼ │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌───────────┐│
│  │  HOT RELOADABLE     │    │  REQUIRES RESTART   │    │  NO-OP    ││
│  │  • Channel settings │    │  • Port changes     │    │  • Same   ││
│  │  • Agent config     │    │  • TLS settings     │    │    value  ││
│  │  • Cron tasks       │    │  • Bind mode        │    │           ││
│  │  • Hooks            │    │                     │    │           ││
│  └─────────────────────┘    └─────────────────────┘    └───────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/config-reload.ts`

### Graceful Shutdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GRACEFUL SHUTDOWN SEQUENCE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Signal Received (SIGINT/SIGTERM)                                │
│           │                                                         │
│           ▼                                                         │
│  2. Broadcast shutdown event to connected clients                   │
│           │                                                         │
│           ▼                                                         │
│  3. Stop accepting new connections                                  │
│           │                                                         │
│           ▼                                                         │
│  4. Stop all channels (in parallel):                                │
│     ├── Telegram: disconnect bot                                    │
│     ├── WhatsApp: close session                                     │
│     ├── Discord: logout                                             │
│     ├── Slack: close socket                                         │
│     └── ...                                                         │
│           │                                                         │
│           ▼                                                         │
│  5. Stop cron scheduler                                             │
│           │                                                         │
│           ▼                                                         │
│  6. Stop heartbeat runner                                           │
│           │                                                         │
│           ▼                                                         │
│  7. Stop plugin services                                            │
│           │                                                         │
│           ▼                                                         │
│  8. Close WebSocket connections                                     │
│           │                                                         │
│           ▼                                                         │
│  9. Close HTTP server                                               │
│           │                                                         │
│           ▼                                                         │
│  10. Cleanup complete                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-close.ts`

---

## Security Features

### Authentication

The Gateway supports multiple authentication modes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION MODES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Mode: "none" (default for local)                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  No authentication required                                 │    │
│  │  Suitable for: localhost-only deployments                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Mode: "token"                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Bearer token authentication                                │    │
│  │  Header: Authorization: Bearer <token>                      │    │
│  │  Config: gateway.auth.token                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Mode: "device" (for mobile apps)                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Device pairing with QR code                                │    │
│  │  Uses short-lived tokens after pairing                      │    │
│  │  Secure for mobile app connections                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/auth.ts`

### Bind Modes

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BIND MODES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "loopback" (most secure, default)                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Binds to: 127.0.0.1                                        │    │
│  │  Access: localhost only                                     │    │
│  │  Use case: Single-machine deployment                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "lan"                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Binds to: 0.0.0.0                                          │    │
│  │  Access: All network interfaces                             │    │
│  │  Use case: Access from other devices on LAN                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "tailnet"                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Binds to: Tailscale IPv4 (100.x.x.x)                       │    │
│  │  Access: Only via Tailscale VPN                             │    │
│  │  Use case: Secure remote access                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Code Reference:** `src/gateway/server-runtime-config.ts`

---

## Debugging the Gateway

### View Logs

```bash
# Follow gateway logs in real-time
moltbot logs --follow

# Show only gateway subsystem logs
moltbot logs --follow --filter gateway

# Show channel-specific logs
moltbot logs --follow --filter telegram
moltbot logs --follow --filter whatsapp
```

### Health Check

```bash
# Quick health check
moltbot doctor

# Detailed status with probing
moltbot gateway call health.snapshot

# Channel status
moltbot channels status
```

### Common Gateway Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Port in use | "EADDRINUSE" error | Change port with `--port` or stop other process |
| Config invalid | "Invalid config" at startup | Run `moltbot doctor` to validate |
| Channel won't start | Channel shows "error" status | Check channel-specific logs |
| No WebSocket connections | Control UI won't connect | Check firewall, verify port is open |
| Auth failures | 401 responses | Verify token in config matches request |

---

## Configuration Reference

### Gateway-specific Config

```json
{
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "your-secret-token"
    },
    "tls": {
      "enabled": false,
      "cert": "/path/to/cert.pem",
      "key": "/path/to/key.pem"
    },
    "controlUi": {
      "enabled": true,
      "basePath": "/control"
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": false
        },
        "responses": {
          "enabled": false
        }
      }
    }
  }
}
```

---

## Summary

The Gateway is the central orchestrator of Moltbot:

1. **Starts up** by loading config, registering plugins, and creating servers
2. **Manages channels** through the Channel Manager
3. **Handles requests** via HTTP REST and WebSocket RPC
4. **Broadcasts events** to connected clients in real-time
5. **Schedules tasks** via the cron service
6. **Hot reloads** when configuration changes
7. **Shuts down gracefully** when signaled

Understanding the Gateway internals helps you:
- Debug connection issues
- Customize channel behavior
- Build integrations
- Optimize performance

---

**Next Tutorial:** [04 - Channel Architecture](04-CHANNEL-ARCHITECTURE.md) - Learn how channels connect to the Gateway
