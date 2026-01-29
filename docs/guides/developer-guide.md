# Moltbot Developer Guide

A comprehensive guide for developers new to web/full-stack development. This guide assumes you have experience with traditional programming languages like C, C++, or Java, but are new to JavaScript/TypeScript ecosystems.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Understanding the Technology Stack](#2-understanding-the-technology-stack)
3. [Development Environment Setup](#3-development-environment-setup)
4. [Project Architecture Deep Dive](#4-project-architecture-deep-dive)
5. [Development Workflow](#5-development-workflow)
6. [Code Organization and Patterns](#6-code-organization-and-patterns)
7. [Testing Guide](#7-testing-guide)
8. [Debugging Guide](#8-debugging-guide)
9. [Building and Packaging](#9-building-and-packaging)
10. [Contributing Guidelines](#10-contributing-guidelines)
11. [Troubleshooting Common Issues](#11-troubleshooting-common-issues)
12. [Glossary](#12-glossary)

---

## 1. Introduction

### What is Moltbot?

Moltbot is a **personal AI assistant platform** that connects various messaging services (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, etc.) to AI models (like Claude, GPT, etc.). Think of it as a bridge that lets you talk to AI through your favorite messaging apps.

### Why This Guide?

If you're coming from C, C++, or Java:
- **No compilation step** (mostly): JavaScript/TypeScript code runs directly or transpiles quickly
- **Package management**: Instead of manually downloading libraries, we use package managers (like Maven/Gradle but for JS)
- **Asynchronous by default**: Unlike Java threads, JavaScript uses async/await patterns
- **Dynamic typing** (JavaScript) vs **Static typing** (TypeScript): We use TypeScript for type safety

### Key Differences from Traditional Development

| Concept | C/C++/Java | JavaScript/TypeScript |
|---------|------------|----------------------|
| Compilation | Compile to binary/bytecode | Transpile TS→JS, then interpret |
| Memory | Manual (C/C++) or GC (Java) | Garbage collected |
| Threading | OS threads | Event loop + async/await |
| Package Manager | apt/yum, Maven, Gradle | npm, pnpm, yarn, bun |
| Build Tool | make, cmake, Maven | tsc, esbuild, vite |
| Entry Point | `main()` function | Module imports, CLI entry |

---

## 2. Understanding the Technology Stack

### 2.1 Core Technologies

#### Node.js (Runtime)
**What it is**: Node.js is the JavaScript runtime that executes our code. Think of it like the JVM for Java.

**Why we use it**:
- Runs JavaScript/TypeScript outside the browser
- Excellent for I/O-heavy applications (like messaging)
- Huge ecosystem of packages

**Version required**: Node.js 22 or higher

#### TypeScript (Language)
**What it is**: TypeScript is JavaScript with static types. It's like going from Python to Java in terms of type safety.

**Key concepts**:
```typescript
// Type annotations (like Java generics but everywhere)
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Interfaces (like Java interfaces)
interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

// Async/await (like Java CompletableFuture but cleaner)
async function fetchData(): Promise<string> {
  const response = await fetch('https://api.example.com');
  return response.text();
}
```

#### pnpm (Package Manager)
**What it is**: pnpm is like Maven or Gradle for JavaScript. It downloads and manages dependencies.

**Key commands**:
```bash
pnpm install          # Like 'mvn install' - downloads all dependencies
pnpm add <package>    # Like adding a dependency to pom.xml
pnpm remove <package> # Remove a dependency
```

**The `package.json` file**: This is like `pom.xml` or `build.gradle`. It lists all dependencies and scripts.

### 2.2 Key Libraries Used

| Library | Purpose | Similar To |
|---------|---------|------------|
| Commander.js | CLI argument parsing | Apache Commons CLI |
| Hono | HTTP server framework | Spring Boot / Express |
| Vitest | Testing framework | JUnit |
| Zod | Runtime validation | Bean Validation |
| Playwright | Browser automation | Selenium |
| discord.js | Discord API client | - |
| grammY | Telegram Bot API | - |

### 2.3 ESM vs CommonJS

JavaScript has two module systems:

**CommonJS (older)**:
```javascript
const fs = require('fs');        // Import
module.exports = { myFunc };     // Export
```

**ESM (what we use)**:
```javascript
import fs from 'fs';             // Import
export { myFunc };               // Export
```

Moltbot uses **ESM** (ECMAScript Modules). This is configured in `package.json` with `"type": "module"`.

---

## 3. Development Environment Setup

### 3.1 Prerequisites Installation

#### Step 1: Install Node.js

**Windows (using winget)**:
```powershell
winget install OpenJS.NodeJS.LTS
```

**Windows (manual)**:
1. Go to https://nodejs.org/
2. Download the LTS version (must be 22.x or higher)
3. Run the installer
4. Check "Add to PATH" during installation

**macOS**:
```bash
# Using Homebrew (recommended)
brew install node@22

# Or download from https://nodejs.org/
```

**Linux (Ubuntu/Debian)**:
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation**:
```bash
node --version   # Should show v22.x.x or higher
npm --version    # Should show 10.x.x or higher
```

#### Step 2: Install pnpm

pnpm is our package manager. It's faster and more disk-efficient than npm.

```bash
# Using npm (comes with Node.js)
npm install -g pnpm

# Verify installation
pnpm --version   # Should show 8.x.x or higher
```

#### Step 3: Install Git

**Windows**:
```powershell
winget install Git.Git
```

**macOS**:
```bash
brew install git
```

**Linux**:
```bash
sudo apt-get install git
```

#### Step 4: Install a Code Editor

We recommend **Visual Studio Code**:

1. Download from https://code.visualstudio.com/
2. Install these extensions:
   - **ESLint** - For code linting
   - **Prettier** - For code formatting
   - **TypeScript Importer** - Auto-import suggestions
   - **Error Lens** - Inline error display

### 3.2 Clone and Setup the Project

#### Step 1: Clone the Repository

```bash
# Navigate to where you want the project
cd ~/projects  # or C:\Projects on Windows

# Clone the repository
git clone https://github.com/moltbot/moltbot.git

# Enter the project directory
cd moltbot
```

#### Step 2: Install Dependencies

```bash
# This downloads all required packages (like 'mvn install')
pnpm install

# This may take a few minutes on first run
```

**What happens during `pnpm install`**:
1. Reads `package.json` to find required packages
2. Downloads packages to a global store
3. Creates symlinks in `node_modules/`
4. Runs any post-install scripts

#### Step 3: Build the Project

```bash
# Compile TypeScript to JavaScript
pnpm build
```

**What happens during `pnpm build`**:
1. TypeScript compiler (`tsc`) reads `tsconfig.json`
2. Transpiles `.ts` files to `.js` files
3. Outputs to `dist/` directory
4. Copies any non-TypeScript assets

#### Step 4: Verify Setup

```bash
# Run the CLI in development mode
pnpm dev --help

# You should see the Moltbot help output
```

### 3.3 Project Directory Structure

After setup, your directory looks like this:

```
moltbot/
├── src/                    # TypeScript source code (main code lives here)
│   ├── cli/               # Command-line interface infrastructure
│   ├── commands/          # Individual CLI commands
│   ├── channels/          # Messaging channel integrations
│   ├── gateway/           # HTTP/WebSocket server
│   ├── providers/         # AI model providers
│   ├── agents/            # AI agent logic
│   ├── infra/             # Core infrastructure utilities
│   └── index.ts           # Main entry point
├── dist/                   # Compiled JavaScript (generated by 'pnpm build')
├── extensions/             # Plugin packages
├── apps/                   # Native mobile/desktop apps
│   ├── ios/               # iOS app (Swift)
│   ├── android/           # Android app (Kotlin)
│   └── macos/             # macOS app (Swift)
├── ui/                     # Web user interface
├── docs/                   # Documentation
├── test/                   # Test utilities and setup
├── node_modules/           # Downloaded dependencies (don't edit!)
├── package.json            # Project configuration and dependencies
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
└── pnpm-lock.yaml          # Locked dependency versions
```

### 3.4 Understanding Configuration Files

#### `package.json` - Project Manifest

```json
{
  "name": "moltbot",           // Package name
  "version": "2026.1.26",      // Version (CalVer format)
  "type": "module",            // Use ESM modules
  "main": "dist/index.js",     // Entry point
  "bin": {
    "moltbot": "dist/entry.js" // CLI command
  },
  "scripts": {                 // npm/pnpm scripts (like Maven profiles)
    "build": "tsc",
    "dev": "tsx src/entry.ts",
    "test": "vitest run",
    "lint": "oxlint"
  },
  "dependencies": {            // Runtime dependencies
    "commander": "^12.0.0",
    "hono": "^4.0.0"
  },
  "devDependencies": {         // Development-only dependencies
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

#### `tsconfig.json` - TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",        // JavaScript version to output
    "module": "NodeNext",      // Module system
    "strict": true,            // Enable all strict checks
    "outDir": "dist",          // Output directory
    "rootDir": "src"           // Source directory
  },
  "include": ["src/**/*"],     // Files to compile
  "exclude": ["node_modules"]  // Files to ignore
}
```

---

## 4. Project Architecture Deep Dive

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ WhatsApp │ Telegram │ Discord  │  Slack   │  Signal  │ iMessage│
│  (Web)   │  (Bot)   │  (Bot)   │  (Bot)   │  (CLI)   │ (macOS) │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────┘
     │          │          │          │          │          │
     └──────────┴──────────┴────┬─────┴──────────┴──────────┘
                                │
                    ┌───────────▼───────────┐
                    │   CHANNEL ROUTER      │
                    │  (src/channels/)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      GATEWAY          │
                    │   (src/gateway/)      │
                    │  - HTTP/WS Server     │
                    │  - Session Management │
                    │  - Config Management  │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │    AGENT RUNTIME      │
                    │   (src/agents/)       │
                    │  - Pi Framework       │
                    │  - Tool Execution     │
                    │  - Memory Management  │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
┌─────────▼────────┐ ┌─────────▼────────┐ ┌─────────▼────────┐
│    PROVIDERS     │ │     PLUGINS      │ │      MEDIA       │
│ (src/providers/) │ │  (extensions/)   │ │   (src/media/)   │
│ - Anthropic      │ │ - Matrix         │ │ - Image Process  │
│ - OpenAI         │ │ - MS Teams       │ │ - Audio Process  │
│ - Bedrock        │ │ - Zalo           │ │ - Transcription  │
│ - Gemini         │ │ - Memory         │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 4.2 Core Components Explained

#### The Gateway (src/gateway/)

The Gateway is the **central control plane**. Think of it as a web server that:
1. Receives messages from all channels
2. Routes them to the appropriate AI agent
3. Sends responses back to users

**Key files**:
- `src/gateway/server.ts` - Main HTTP server (uses Hono framework)
- `src/gateway/routes.ts` - API endpoint definitions
- `src/gateway/websocket.ts` - Real-time communication

**How it works**:
```typescript
// Simplified gateway flow
import { Hono } from 'hono';

const app = new Hono();

// API endpoint for receiving messages
app.post('/api/message', async (c) => {
  const { channel, from, text } = await c.req.json();

  // Route to agent
  const response = await agent.process(text);

  // Send back to channel
  await channels[channel].send(from, response);

  return c.json({ success: true });
});
```

#### Channels (src/channels/)

Each messaging platform has its own "channel" implementation:

```
src/
├── telegram/      # Telegram Bot API (grammY)
├── discord/       # Discord (discord.js)
├── slack/         # Slack (Bolt)
├── signal/        # Signal (signal-cli)
├── imessage/      # iMessage (macOS only)
└── web/           # WhatsApp Web (Baileys)
```

**Channel interface pattern**:
```typescript
// Each channel implements a common interface
interface Channel {
  name: string;

  // Initialize the channel connection
  connect(): Promise<void>;

  // Send a message
  send(to: string, message: string): Promise<void>;

  // Handle incoming messages
  onMessage(handler: (msg: IncomingMessage) => void): void;
}
```

#### Providers (src/providers/)

Providers connect to different AI services:

```typescript
// Provider interface
interface Provider {
  name: string;

  // Send a message to the AI and get a response
  chat(messages: Message[], options: ChatOptions): Promise<Response>;

  // Stream responses (for real-time output)
  streamChat(messages: Message[], options: ChatOptions): AsyncIterable<Chunk>;
}

// Example: Anthropic provider
class AnthropicProvider implements Provider {
  async chat(messages, options) {
    const response = await this.client.messages.create({
      model: 'claude-3-opus-20240229',
      messages: messages,
      max_tokens: options.maxTokens
    });
    return response;
  }
}
```

#### CLI (src/cli/)

The command-line interface is built with Commander.js:

```typescript
// src/cli/program.ts
import { Command } from 'commander';

export function buildProgram() {
  const program = new Command()
    .name('moltbot')
    .description('Personal AI Assistant')
    .version('2026.1.26');

  // Add commands
  program
    .command('gateway')
    .description('Run the gateway server')
    .option('-p, --port <port>', 'Port number', '18789')
    .action(async (options) => {
      await startGateway(options);
    });

  program
    .command('message')
    .command('send')
    .description('Send a message')
    .option('--to <recipient>', 'Recipient')
    .option('--message <text>', 'Message text')
    .action(async (options) => {
      await sendMessage(options);
    });

  return program;
}
```

### 4.3 Data Flow Example

Let's trace what happens when someone sends a WhatsApp message:

```
1. User sends "What's the weather?" on WhatsApp
   │
   ▼
2. WhatsApp Web (Baileys) receives the message
   File: src/web/client.ts
   │
   ▼
3. Channel router determines this is a WhatsApp message
   File: src/channels/index.ts
   │
   ▼
4. Message is sent to Gateway via internal event
   File: src/gateway/events.ts
   │
   ▼
5. Gateway creates/retrieves a session for this user
   File: src/gateway/sessions.ts
   │
   ▼
6. Agent processes the message
   File: src/agents/runner.ts
   │
   ▼
7. Agent calls the configured AI provider (e.g., Claude)
   File: src/providers/anthropic.ts
   │
   ▼
8. AI generates response: "I don't have real-time weather..."
   │
   ▼
9. Response flows back through Gateway
   │
   ▼
10. Channel router sends response via WhatsApp
    File: src/web/client.ts
    │
    ▼
11. User sees the response on WhatsApp
```

### 4.4 Plugin System Architecture

Plugins extend Moltbot's functionality without modifying core code:

```
extensions/
├── matrix/                    # Matrix protocol support
│   ├── package.json          # Plugin dependencies
│   ├── clawdbot.plugin.json  # Plugin manifest
│   └── src/
│       └── index.ts          # Plugin entry point
├── msteams/                   # Microsoft Teams
├── zalo/                      # Zalo messaging
└── memory-core/               # Memory/context plugin
```

**Plugin manifest** (`clawdbot.plugin.json`):
```json
{
  "name": "matrix",
  "version": "1.0.0",
  "description": "Matrix protocol support",
  "main": "dist/index.js",
  "channels": ["matrix"],
  "hooks": {
    "onMessage": "handleMessage",
    "onConnect": "handleConnect"
  }
}
```

**Plugin entry point**:
```typescript
// extensions/matrix/src/index.ts
import { Plugin, PluginContext } from 'moltbot/plugin-sdk';

export default class MatrixPlugin implements Plugin {
  name = 'matrix';

  async initialize(ctx: PluginContext) {
    // Setup Matrix client
    this.client = await this.createMatrixClient(ctx.config);
  }

  async handleMessage(message: IncomingMessage) {
    // Process Matrix-specific message
  }
}
```

---

## 5. Development Workflow

### 5.1 Daily Development Cycle

#### Starting Your Development Session

```bash
# 1. Navigate to project directory
cd moltbot

# 2. Pull latest changes
git pull origin main

# 3. Install any new dependencies
pnpm install

# 4. Start the development server
pnpm gateway:watch
```

The `gateway:watch` command:
- Automatically recompiles when you change files
- Restarts the server after compilation
- Shows errors in the terminal

#### Making Changes

1. **Edit source files** in `src/`
2. **Save the file** - watch mode will recompile
3. **Check terminal** for any TypeScript errors
4. **Test your changes** manually or with tests

#### Running the CLI in Development

```bash
# Run any CLI command in dev mode
pnpm dev <command>

# Examples:
pnpm dev --help
pnpm dev gateway run --port 18789
pnpm dev message send --to +1234567890 --message "Test"
pnpm dev channels status
```

### 5.2 Creating a New Feature

Let's walk through adding a new CLI command step by step.

#### Example: Adding a "ping" command

**Step 1: Create the command file**

```bash
# Create a new file
touch src/commands/ping.ts
```

**Step 2: Implement the command**

```typescript
// src/commands/ping.ts
import { Command } from 'commander';

export function createPingCommand(): Command {
  return new Command('ping')
    .description('Check if the gateway is running')
    .option('-h, --host <host>', 'Gateway host', 'localhost')
    .option('-p, --port <port>', 'Gateway port', '18789')
    .action(async (options) => {
      try {
        const url = `http://${options.host}:${options.port}/health`;
        const response = await fetch(url);

        if (response.ok) {
          console.log('Gateway is running!');
        } else {
          console.error('Gateway returned error:', response.status);
          process.exit(1);
        }
      } catch (error) {
        console.error('Cannot connect to gateway:', error.message);
        process.exit(1);
      }
    });
}
```

**Step 3: Register the command**

```typescript
// src/cli/program.ts
import { createPingCommand } from '../commands/ping.js';

export function buildProgram() {
  const program = new Command()
    .name('moltbot')
    // ... existing setup ...

  // Add your new command
  program.addCommand(createPingCommand());

  return program;
}
```

**Step 4: Test the command**

```bash
# Test in development mode
pnpm dev ping --port 18789
```

**Step 5: Write a test**

```typescript
// src/commands/ping.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPingCommand } from './ping.js';

describe('ping command', () => {
  it('should report gateway status', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    });

    const command = createPingCommand();
    // ... test implementation
  });
});
```

### 5.3 Working with Async/Await

Coming from Java, async/await might feel new. Here's a comparison:

**Java (CompletableFuture)**:
```java
CompletableFuture<String> future = fetchDataAsync();
String result = future.get(); // Blocks thread
```

**TypeScript (async/await)**:
```typescript
// 'async' marks a function as asynchronous
async function fetchData(): Promise<string> {
  // 'await' pauses execution until promise resolves
  const response = await fetch('https://api.example.com');
  const data = await response.json();
  return data.result;
}

// Calling async functions
async function main() {
  const result = await fetchData(); // Waits for result
  console.log(result);
}
```

**Key differences**:
- JavaScript is single-threaded (no parallel execution by default)
- `await` doesn't block the thread; it yields to other tasks
- Always use `try/catch` for error handling:

```typescript
async function safeOperation() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error; // Re-throw or handle
  }
}
```

### 5.4 Understanding the Event Loop

Unlike Java threads, JavaScript uses an **event loop**:

```
┌───────────────────────────────────────────┐
│           JavaScript Event Loop            │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────┐    ┌──────────────────┐ │
│  │ Call Stack  │    │  Task Queue      │ │
│  │             │    │                  │ │
│  │ function()  │◄───│ setTimeout cb    │ │
│  │ main()      │    │ fetch response   │ │
│  │             │    │ file read done   │ │
│  └─────────────┘    └──────────────────┘ │
│        │                    ▲            │
│        ▼                    │            │
│  Execute synchronous    Queue async      │
│  code until stack empty callbacks        │
│                                          │
└──────────────────────────────────────────┘
```

**Practical implications**:
- Never use blocking operations (they freeze everything)
- Always use async versions: `fs.promises.readFile()` not `fs.readFileSync()`
- Long CPU tasks should be broken up or moved to worker threads

---

## 6. Code Organization and Patterns

### 6.1 File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Regular module | `kebab-case.ts` | `message-handler.ts` |
| Test file | `*.test.ts` | `message-handler.test.ts` |
| E2E test | `*.e2e.test.ts` | `gateway.e2e.test.ts` |
| Types only | `*.types.ts` | `channel.types.ts` |
| Constants | `constants.ts` | `src/infra/constants.ts` |

### 6.2 Import Organization

```typescript
// 1. Node.js built-ins
import fs from 'node:fs';
import path from 'node:path';

// 2. External packages
import { Command } from 'commander';
import { Hono } from 'hono';

// 3. Internal absolute imports
import { Config } from '../config/index.js';
import { Logger } from '../logging/index.js';

// 4. Relative imports
import { helper } from './utils.js';
import type { LocalType } from './types.js';
```

### 6.3 Dependency Injection Pattern

Moltbot uses a simple dependency injection pattern:

```typescript
// src/cli/deps.ts
export interface Dependencies {
  logger: Logger;
  config: Config;
  channels: ChannelRegistry;
  providers: ProviderRegistry;
}

export function createDefaultDeps(): Dependencies {
  const logger = new Logger();
  const config = loadConfig();

  return {
    logger,
    config,
    channels: new ChannelRegistry(config, logger),
    providers: new ProviderRegistry(config, logger)
  };
}

// Usage in commands
export function createSendCommand(deps: Dependencies): Command {
  return new Command('send')
    .action(async (options) => {
      const { logger, channels } = deps;
      logger.info('Sending message...');
      await channels.get(options.channel).send(options.to, options.message);
    });
}
```

### 6.4 Error Handling Patterns

```typescript
// Define custom errors
export class ChannelError extends Error {
  constructor(
    message: string,
    public readonly channel: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ChannelError';
  }
}

// Use specific error types
async function sendMessage(channel: string, message: string) {
  try {
    await channels.get(channel).send(message);
  } catch (error) {
    if (error instanceof ChannelError) {
      logger.error(`Channel ${error.channel} error: ${error.code}`);
    } else {
      logger.error('Unknown error:', error);
    }
    throw error;
  }
}
```

### 6.5 Type Definitions

```typescript
// Define types in a separate file or at the top
interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  timestamp: Date;
  channel: ChannelType;
}

// Use union types for constrained values
type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack';

// Use generics for reusable types
interface Response<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Example usage
async function getMessages(): Promise<Response<Message[]>> {
  try {
    const messages = await fetchMessages();
    return { success: true, data: messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## 7. Testing Guide

### 7.1 Test Framework Overview

Moltbot uses **Vitest**, a fast testing framework similar to Jest:

**Comparison with JUnit**:
| JUnit | Vitest |
|-------|--------|
| `@Test` | `it()` or `test()` |
| `@BeforeEach` | `beforeEach()` |
| `@AfterEach` | `afterEach()` |
| `assertEquals(expected, actual)` | `expect(actual).toBe(expected)` |
| `assertTrue(condition)` | `expect(condition).toBe(true)` |
| `assertThrows()` | `expect(() => ...).toThrow()` |

### 7.2 Writing Your First Test

```typescript
// src/utils/format.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatMessage, truncateText } from './format.js';

// Group related tests
describe('formatMessage', () => {
  // Individual test case
  it('should format a simple message', () => {
    const result = formatMessage('Hello', 'World');
    expect(result).toBe('Hello: World');
  });

  it('should handle empty input', () => {
    const result = formatMessage('', '');
    expect(result).toBe(': ');
  });

  it('should escape special characters', () => {
    const result = formatMessage('Test', '<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });
});

describe('truncateText', () => {
  it('should truncate long text', () => {
    const result = truncateText('Hello World', 5);
    expect(result).toBe('Hello...');
  });

  it('should not truncate short text', () => {
    const result = truncateText('Hi', 10);
    expect(result).toBe('Hi');
  });
});
```

### 7.3 Testing Async Code

```typescript
// src/api/client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ApiClient } from './client.js';

describe('ApiClient', () => {
  it('should fetch data successfully', async () => {
    // Create a mock client
    const client = new ApiClient('https://api.example.com');

    // Mock the fetch function
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    // Call the async method
    const result = await client.getData();

    // Assert the result
    expect(result).toEqual({ data: 'test' });
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data');
  });

  it('should handle errors', async () => {
    const client = new ApiClient('https://api.example.com');

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Expect the promise to reject
    await expect(client.getData()).rejects.toThrow('Network error');
  });
});
```

### 7.4 Mocking Dependencies

```typescript
// src/services/notification.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification.js';

describe('NotificationService', () => {
  let mockLogger: any;
  let mockChannel: any;
  let service: NotificationService;

  beforeEach(() => {
    // Create mocks
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    };

    mockChannel = {
      send: vi.fn().mockResolvedValue(undefined)
    };

    // Inject mocks
    service = new NotificationService(mockLogger, mockChannel);
  });

  it('should send notification and log', async () => {
    await service.notify('user123', 'Hello!');

    // Verify interactions
    expect(mockChannel.send).toHaveBeenCalledWith('user123', 'Hello!');
    expect(mockLogger.info).toHaveBeenCalledWith('Notification sent to user123');
  });

  it('should log error on failure', async () => {
    mockChannel.send.mockRejectedValue(new Error('Send failed'));

    await expect(service.notify('user123', 'Hello!')).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### 7.5 Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run a specific test file
pnpm test src/utils/format.test.ts

# Run tests matching a pattern
pnpm test --grep "formatMessage"

# Run tests with coverage report
pnpm test:coverage

# Run end-to-end tests
pnpm test:e2e

# Run live tests (requires API keys)
CLAWDBOT_LIVE_TEST=1 pnpm test:live
```

### 7.6 Test File Organization

```
src/
├── utils/
│   ├── format.ts           # Implementation
│   └── format.test.ts      # Unit tests (colocated)
├── services/
│   ├── notification.ts
│   └── notification.test.ts
└── gateway/
    ├── server.ts
    ├── server.test.ts      # Unit tests
    └── server.e2e.test.ts  # End-to-end tests
```

---

## 8. Debugging Guide

### 8.1 Console Logging

The simplest debugging method:

```typescript
// Basic logging
console.log('Variable value:', myVariable);

// Object inspection
console.log('Full object:', JSON.stringify(obj, null, 2));

// Conditional logging
if (process.env.DEBUG) {
  console.log('Debug info:', debugData);
}
```

### 8.2 VS Code Debugging

**Step 1: Create launch configuration**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev", "gateway", "run"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--", "--run", "${relativeFile}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

**Step 2: Set breakpoints**

Click in the gutter (left of line numbers) to set breakpoints.

**Step 3: Start debugging**

Press F5 or click "Run and Debug" in VS Code.

### 8.3 Node.js Inspector

```bash
# Start with inspector enabled
node --inspect dist/entry.js gateway run

# Or in development
node --inspect node_modules/.bin/tsx src/entry.ts gateway run
```

Then open Chrome and go to `chrome://inspect` to connect.

### 8.4 Debugging Async Issues

```typescript
// Add timestamps to track async flow
function timestamp(label: string) {
  console.log(`[${new Date().toISOString()}] ${label}`);
}

async function debugAsyncFlow() {
  timestamp('Start');

  const result1 = await operation1();
  timestamp('After operation1');

  const result2 = await operation2();
  timestamp('After operation2');

  return result2;
}
```

### 8.5 Common Issues and Solutions

#### Issue: "Cannot find module"

**Cause**: Missing `.js` extension in imports (ESM requires it)

**Fix**:
```typescript
// Wrong
import { helper } from './utils';

// Correct
import { helper } from './utils.js';
```

#### Issue: "Top-level await is not allowed"

**Cause**: Using `await` outside an async function in non-module context

**Fix**: Wrap in async IIFE or use in module context:
```typescript
// Option 1: Async IIFE
(async () => {
  const result = await fetchData();
  console.log(result);
})();

// Option 2: Use in module with top-level await
// (requires "type": "module" in package.json)
const result = await fetchData();
```

#### Issue: "TypeError: X is not a function"

**Cause**: Usually an import issue or wrong export type

**Debug**:
```typescript
import something from './module.js';
console.log('Imported:', typeof something, something);
```

---

## 9. Building and Packaging

### 9.1 Build Process

```bash
# Full build
pnpm build
```

This runs:
1. TypeScript compilation (`tsc`)
2. Asset copying
3. Output to `dist/`

### 9.2 Build Output Structure

```
dist/
├── entry.js           # CLI entry point
├── index.js           # Main exports
├── cli/
│   ├── program.js
│   └── deps.js
├── commands/
│   └── *.js
├── gateway/
│   └── *.js
└── ...
```

### 9.3 Local Testing of Built Output

```bash
# Build first
pnpm build

# Run the built version
node dist/entry.js --help

# Or link globally for testing
pnpm link --global

# Now you can run it like a user would
moltbot --help
```

### 9.4 Publishing (for Maintainers)

```bash
# 1. Update version in package.json
# 2. Update CHANGELOG.md
# 3. Build and test
pnpm build && pnpm test

# 4. Publish to npm
npm publish --access public --otp="<otp>"
```

---

## 10. Contributing Guidelines

### 10.1 Before You Start

1. **Check existing issues** - Someone might already be working on it
2. **Open an issue first** - Discuss your approach before coding
3. **Keep changes focused** - One feature/fix per PR

### 10.2 Development Process

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/moltbot.git
cd moltbot

# 3. Add upstream remote
git remote add upstream https://github.com/moltbot/moltbot.git

# 4. Create a feature branch
git checkout -b feature/my-new-feature

# 5. Make your changes
# ... edit files ...

# 6. Run tests and linting
pnpm lint && pnpm test

# 7. Commit using the committer script
scripts/committer "Add my new feature" src/path/to/changed/files.ts

# 8. Push to your fork
git push origin feature/my-new-feature

# 9. Open a Pull Request on GitHub
```

### 10.3 Commit Message Format

Use concise, action-oriented messages:

```
<scope>: <description>

Examples:
CLI: add verbose flag to send command
Gateway: fix session timeout handling
Telegram: support inline keyboard callbacks
Docs: add troubleshooting section for WhatsApp
Tests: add coverage for message routing
```

### 10.4 Code Review Checklist

Before submitting a PR, verify:

- [ ] Code compiles without errors (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] New code has tests
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] No console.log statements left in
- [ ] No commented-out code

### 10.5 PR Review Process

1. Maintainer reviews your PR
2. Address any feedback
3. Once approved, maintainer merges
4. Your contribution is now part of Moltbot!

---

## 11. Troubleshooting Common Issues

### 11.1 Installation Issues

#### `pnpm install` fails with permission error

```bash
# On macOS/Linux
sudo chown -R $(whoami) ~/.pnpm-store

# Or use a different store location
pnpm config set store-dir ~/.local/share/pnpm/store
```

#### Node version mismatch

```bash
# Check your version
node --version

# If too old, update Node.js
# Using nvm (Node Version Manager):
nvm install 22
nvm use 22
```

### 11.2 Build Issues

#### TypeScript errors about missing types

```bash
# Ensure all dependencies are installed
pnpm install

# If still failing, try cleaning
rm -rf node_modules
pnpm install
```

#### "Cannot find module" at runtime

1. Check if the file exists in `dist/`
2. Verify import has `.js` extension
3. Try rebuilding: `pnpm build`

### 11.3 Test Issues

#### Tests timeout

```typescript
// Increase timeout for slow tests
it('slow operation', async () => {
  // ... test code ...
}, 30000); // 30 second timeout
```

#### Tests pass locally but fail in CI

- Check for environment differences
- Look for tests depending on local files
- Verify no tests depend on timing

### 11.4 Runtime Issues

#### Gateway won't start

```bash
# Check if port is in use
# Windows:
netstat -ano | findstr :18789

# macOS/Linux:
lsof -i :18789

# Kill the process or use a different port
moltbot gateway run --port 18790
```

#### Channel connection fails

```bash
# Run diagnostics
moltbot doctor

# Check specific channel status
moltbot channels status --probe
```

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Agent** | The AI assistant that processes messages and generates responses |
| **Channel** | A messaging platform integration (WhatsApp, Telegram, etc.) |
| **Gateway** | The central server that coordinates all components |
| **Provider** | An AI service backend (Anthropic, OpenAI, etc.) |
| **Session** | A conversation context with history and state |
| **Plugin/Extension** | An add-on package that extends Moltbot functionality |
| **ESM** | ECMAScript Modules - the JavaScript module system used |
| **TypeScript** | A typed superset of JavaScript |
| **Node.js** | JavaScript runtime for server-side code |
| **pnpm** | Fast, disk-efficient package manager |
| **Vitest** | Test framework for JavaScript/TypeScript |
| **Hono** | Lightweight web framework for the Gateway |
| **Commander.js** | Library for building CLI applications |
| **Baileys** | WhatsApp Web API library |
| **grammY** | Telegram Bot API framework |
| **CalVer** | Calendar Versioning (YYYY.M.D format) |

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Run CLI in dev mode
pnpm gateway:watch    # Run gateway with hot reload
pnpm build            # Compile TypeScript

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage

# Code Quality
pnpm lint             # Run linter
pnpm format:fix       # Fix formatting

# Useful Git
git pull origin main                    # Get latest changes
git checkout -b feature/my-feature      # Create branch
scripts/committer "Message" file.ts     # Commit changes
```

### File Locations

| What | Where |
|------|-------|
| CLI commands | `src/commands/` |
| Gateway server | `src/gateway/` |
| Channel integrations | `src/telegram/`, `src/discord/`, etc. |
| AI providers | `src/providers/` |
| Plugin SDK | `src/plugin-sdk/` |
| Tests | `*.test.ts` next to source files |
| Configuration | `package.json`, `tsconfig.json` |
| Build output | `dist/` |

---

**Need more help?**
- Check the [User Guide](user-guide.md) for usage instructions
- Visit [docs.molt.bot](https://docs.molt.bot) for full documentation
- Join the [Discord](https://discord.gg/clawd) for community support
