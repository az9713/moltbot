/**
 * MCP (Model Context Protocol) integration types
 *
 * Enables Moltbot agents to connect to MCP servers for external tool integration.
 */

export type McpTransportType = "stdio" | "sse" | "websocket";

export type McpStdioTransport = {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type McpSseTransport = {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
};

export type McpWebSocketTransport = {
  type: "websocket";
  url: string;
  headers?: Record<string, string>;
};

export type McpTransport = McpStdioTransport | McpSseTransport | McpWebSocketTransport;

export type McpServerConfig = {
  /** Unique identifier for this server */
  id: string;
  /** Display name for the server */
  name?: string;
  /** Transport configuration */
  transport: McpTransport;
  /** Whether to auto-connect on agent start */
  autoConnect?: boolean;
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  };
  /** Tool filtering */
  tools?: {
    /** Only expose these tools from this server */
    allow?: string[];
    /** Hide these tools from this server */
    deny?: string[];
    /** Prefix to add to tool names (e.g., "github_") */
    prefix?: string;
  };
  /** Resource filtering */
  resources?: {
    allow?: string[];
    deny?: string[];
  };
  /** Environment variable overrides for this server */
  env?: Record<string, string>;
};

export type McpToolSearchConfig = {
  /** Enable tool search for large tool catalogs */
  enabled?: boolean;
  /** Max tools to include per request (default: 20) */
  maxToolsPerRequest?: number;
  /** Use embeddings for semantic tool search */
  semanticSearch?: boolean;
  /** Cache tool descriptions for faster search */
  cacheDescriptions?: boolean;
};

export type McpConfig = {
  /** Enable MCP integration */
  enabled?: boolean;
  /** MCP server configurations */
  servers?: McpServerConfig[];
  /** Global tool search settings */
  toolSearch?: McpToolSearchConfig;
  /** Global connection timeout (ms) */
  timeoutMs?: number;
  /** Max concurrent server connections */
  maxConcurrent?: number;
};

// Runtime types

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
  serverName?: string;
};

export type McpResourceDefinition = {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  serverId: string;
};

export type McpPromptDefinition = {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  serverId: string;
};

export type McpServerStatus = "disconnected" | "connecting" | "connected" | "error";

export type McpServerState = {
  id: string;
  name?: string;
  status: McpServerStatus;
  error?: string;
  tools: McpToolDefinition[];
  resources: McpResourceDefinition[];
  prompts: McpPromptDefinition[];
  connectedAt?: Date;
  lastError?: Date;
};

export type McpToolCallResult = {
  success: boolean;
  content?: unknown;
  error?: string;
  isError?: boolean;
};

export type McpClientEvents = {
  "server:connected": { serverId: string };
  "server:disconnected": { serverId: string; reason?: string };
  "server:error": { serverId: string; error: Error };
  "tools:updated": { serverId: string; tools: McpToolDefinition[] };
  "resources:updated": { serverId: string; resources: McpResourceDefinition[] };
};
