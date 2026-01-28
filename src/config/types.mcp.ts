/**
 * MCP (Model Context Protocol) configuration types
 */

export type McpTransportType = "stdio" | "sse" | "websocket";

export type McpStdioTransportConfig = {
  type: "stdio";
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables for the process */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
};

export type McpSseTransportConfig = {
  type: "sse";
  /** SSE endpoint URL */
  url: string;
  /** HTTP headers */
  headers?: Record<string, string>;
};

export type McpWebSocketTransportConfig = {
  type: "websocket";
  /** WebSocket URL */
  url: string;
  /** HTTP headers for upgrade request */
  headers?: Record<string, string>;
};

export type McpTransportConfig =
  | McpStdioTransportConfig
  | McpSseTransportConfig
  | McpWebSocketTransportConfig;

export type McpServerToolsConfig = {
  /** Only expose these tools from this server */
  allow?: string[];
  /** Hide these tools from this server */
  deny?: string[];
  /** Prefix to add to tool names (e.g., "github_") */
  prefix?: string;
};

export type McpServerResourcesConfig = {
  /** Only expose these resources */
  allow?: string[];
  /** Hide these resources */
  deny?: string[];
};

export type McpRetryConfig = {
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Initial delay between retries (ms) */
  delayMs?: number;
  /** Backoff multiplier for retries */
  backoffMultiplier?: number;
};

export type McpServerConfig = {
  /** Unique identifier for this server */
  id: string;
  /** Display name for the server */
  name?: string;
  /** Transport configuration */
  transport: McpTransportConfig;
  /** Whether to auto-connect on agent start (default: true) */
  autoConnect?: boolean;
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
  /** Retry configuration */
  retry?: McpRetryConfig;
  /** Tool filtering */
  tools?: McpServerToolsConfig;
  /** Resource filtering */
  resources?: McpServerResourcesConfig;
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
