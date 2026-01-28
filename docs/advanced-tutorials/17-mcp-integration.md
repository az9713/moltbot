---
summary: "MCP Integration: connect external tool servers using Model Context Protocol"
read_when:
  - You want to integrate external tools via MCP servers
  - You want to configure per-agent MCP server connections
  - You need tool search for large tool catalogs
---

# MCP Integration

Connect your Moltbot agents to external tools using the Model Context Protocol (MCP). MCP enables agents to access GitHub, databases, web search, and any other MCP-compatible service.

## Overview

MCP Integration provides:

- **External Tool Access**: Connect to any MCP server (GitHub, web search, databases, etc.)
- **Per-Agent Configuration**: Different agents can use different tool sets
- **Transport Options**: Stdio, SSE, and WebSocket transports
- **Tool Search**: Dynamic discovery for large tool catalogs
- **Automatic Connection Management**: Lifecycle handling and reconnection

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Moltbot Agent                        │
├─────────────────────────────────────────────────────────┤
│                    MCP Manager                           │
│  ┌─────────────┬─────────────┬─────────────────────┐    │
│  │   Client    │   Client    │      Client         │    │
│  │  (stdio)    │   (sse)     │   (websocket)       │    │
│  └──────┬──────┴──────┬──────┴──────────┬──────────┘    │
└─────────┼─────────────┼─────────────────┼───────────────┘
          │             │                 │
          ▼             ▼                 ▼
    ┌──────────┐  ┌───────────┐   ┌───────────────┐
    │  GitHub  │  │ Web Search│   │   Database    │
    │  Server  │  │  Server   │   │    Server     │
    └──────────┘  └───────────┘   └───────────────┘
```

## Getting Started

### Basic Configuration

Enable MCP for an agent in your configuration:

```json5
{
  "agents": {
    "defaults": {
      "mcp": {
        "enabled": true,
        "servers": [
          {
            "id": "github",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-github"]
          }
        ]
      }
    }
  }
}
```

### Environment Variables

MCP servers often need credentials:

```bash
# GitHub MCP server
export GITHUB_TOKEN="ghp_..."

# Custom MCP server
export MCP_API_KEY="..."
```

## Server Configuration

### Stdio Transport

For local MCP servers running as child processes:

```json5
{
  "mcp": {
    "servers": [
      {
        "id": "filesystem",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-filesystem", "/home/user/docs"],
        "env": {
          "NODE_ENV": "production"
        }
      }
    ]
  }
}
```

### SSE Transport

For remote MCP servers using Server-Sent Events:

```json5
{
  "mcp": {
    "servers": [
      {
        "id": "web-search",
        "transport": "sse",
        "url": "https://mcp.example.com/search",
        "headers": {
          "Authorization": "Bearer ${MCP_API_KEY}"
        }
      }
    ]
  }
}
```

### WebSocket Transport

For bidirectional communication:

```json5
{
  "mcp": {
    "servers": [
      {
        "id": "realtime-data",
        "transport": "websocket",
        "url": "wss://mcp.example.com/realtime",
        "reconnect": true,
        "reconnectInterval": 5000
      }
    ]
  }
}
```

## Tool Search

For servers with many tools, enable tool search to dynamically discover relevant tools:

```json5
{
  "mcp": {
    "toolSearch": {
      "enabled": true,
      "maxToolsPerRequest": 20,
      "searchThreshold": 50
    },
    "servers": [
      {
        "id": "enterprise-tools",
        "transport": "sse",
        "url": "https://tools.company.com/mcp",
        "toolCount": 200
      }
    ]
  }
}
```

When enabled:
- Tools are indexed with descriptions
- Agent queries find relevant tools
- Only matched tools are included in context
- Reduces token usage significantly

## Per-Agent Configuration

Different agents can have different MCP setups:

```json5
{
  "agents": {
    "list": [
      {
        "id": "code-agent",
        "mcp": {
          "servers": [
            {
              "id": "github",
              "transport": "stdio",
              "command": "npx",
              "args": ["-y", "@anthropic/mcp-server-github"]
            },
            {
              "id": "filesystem",
              "transport": "stdio",
              "command": "npx",
              "args": ["-y", "@anthropic/mcp-server-filesystem", "~/projects"]
            }
          ]
        }
      },
      {
        "id": "research-agent",
        "mcp": {
          "servers": [
            {
              "id": "web-search",
              "transport": "sse",
              "url": "https://search.example.com/mcp"
            },
            {
              "id": "notion",
              "transport": "stdio",
              "command": "npx",
              "args": ["-y", "@anthropic/mcp-server-notion"]
            }
          ]
        }
      }
    ]
  }
}
```

## Popular MCP Servers

### GitHub

```json5
{
  "id": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-github"]
}
```

Provides: `create_issue`, `create_pull_request`, `search_code`, `get_file_contents`, etc.

### Filesystem

```json5
{
  "id": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-filesystem", "/allowed/path"]
}
```

Provides: `read_file`, `write_file`, `list_directory`, etc.

### Postgres

```json5
{
  "id": "postgres",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-postgres"],
  "env": {
    "POSTGRES_URL": "postgres://user:pass@localhost/db"
  }
}
```

Provides: `query`, `list_tables`, `describe_table`, etc.

### Slack

```json5
{
  "id": "slack",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-slack"]
}
```

Provides: `send_message`, `list_channels`, `search_messages`, etc.

## Advanced Configuration

### Connection Options

```json5
{
  "mcp": {
    "servers": [
      {
        "id": "custom-server",
        "transport": "stdio",
        "command": "python",
        "args": ["-m", "my_mcp_server"],
        "cwd": "/path/to/server",
        "timeout": 30000,
        "retries": 3,
        "retryDelay": 1000
      }
    ],
    "options": {
      "connectionTimeout": 10000,
      "requestTimeout": 30000,
      "maxConcurrentRequests": 10
    }
  }
}
```

### Tool Filtering

Include or exclude specific tools:

```json5
{
  "mcp": {
    "servers": [
      {
        "id": "github",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-github"],
        "includeTools": ["create_issue", "search_code"],
        "excludeTools": ["delete_repository"]
      }
    ]
  }
}
```

### Security Constraints

Limit what MCP servers can do:

```json5
{
  "mcp": {
    "security": {
      "allowedDomains": ["github.com", "api.notion.com"],
      "maxRequestsPerMinute": 60,
      "disallowedTools": ["delete_*", "drop_*"]
    }
  }
}
```

## Programmatic Usage

### MCPManager API

```typescript
import { MCPManager } from "./mcp/index.js";

// Initialize manager
const mcp = new MCPManager({
  servers: [
    {
      id: "github",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@anthropic/mcp-server-github"],
    },
  ],
});

// Connect to servers
await mcp.connect();

// Get available tools
const tools = await mcp.listTools();
console.log("Available tools:", tools.map((t) => t.name));

// Call a tool
const result = await mcp.callTool("github", "search_code", {
  query: "authentication",
  repo: "owner/repo",
});

// Search for tools (with tool search enabled)
const relevantTools = await mcp.searchTools("create github issue");

// Disconnect
await mcp.disconnect();
```

### Event Handling

```typescript
mcp.on("server:connected", ({ serverId }) => {
  console.log(`Connected to ${serverId}`);
});

mcp.on("server:disconnected", ({ serverId, error }) => {
  console.log(`Disconnected from ${serverId}:`, error?.message);
});

mcp.on("tool:called", ({ serverId, toolName, duration }) => {
  console.log(`Tool ${toolName} on ${serverId} took ${duration}ms`);
});

mcp.on("tool:error", ({ serverId, toolName, error }) => {
  console.error(`Tool ${toolName} failed:`, error.message);
});
```

## Troubleshooting

### Server Not Starting

1. Check the command is correct:
   ```bash
   npx -y @anthropic/mcp-server-github --help
   ```

2. Verify environment variables:
   ```bash
   echo $GITHUB_TOKEN
   ```

3. Check for errors in gateway logs:
   ```bash
   moltbot logs --filter mcp
   ```

### Tool Not Found

1. List available tools:
   ```bash
   moltbot mcp tools --server github
   ```

2. Check tool filtering configuration

3. Verify server is connected:
   ```bash
   moltbot mcp status
   ```

### Connection Timeout

1. Increase timeout:
   ```json5
   {
     "mcp": {
       "options": {
         "connectionTimeout": 30000
       }
     }
   }
   ```

2. Check network connectivity to remote servers

3. Verify server URL is correct

## CLI Commands

```bash
# List MCP servers
moltbot mcp list

# Show server status
moltbot mcp status

# List tools from a server
moltbot mcp tools --server github

# Test a tool
moltbot mcp call github search_code --query "auth"

# Reconnect a server
moltbot mcp reconnect github
```

## See Also

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Agent Configuration](/concepts/agent)
- [Tool Configuration](/configuration#tools)
