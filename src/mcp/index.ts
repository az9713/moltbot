/**
 * MCP (Model Context Protocol) Integration
 *
 * Enables Moltbot agents to connect to MCP servers for external tool integration.
 *
 * Features:
 * - Connect to any MCP server (GitHub, web search, databases, etc.)
 * - Per-agent MCP server configuration
 * - Dynamic tool discovery from MCP servers
 * - Tool search for large tool catalogs
 * - Stdio, SSE, and WebSocket transports
 *
 * @example
 * ```typescript
 * import { getMcpManager, getMcpTools } from './mcp';
 *
 * // Get tools for an agent
 * const tools = await getMcpTools({
 *   agentId: 'main',
 *   config: moltbotConfig,
 * });
 *
 * // Access the manager directly
 * const manager = getMcpManager();
 * const statuses = await manager.getServerStatuses({ agentId: 'main', config });
 * ```
 */

export { McpClient, type McpClientEvents } from "./client.js";
export { McpManager, getMcpManager, getMcpTools, type McpManagerContext } from "./manager.js";
export {
  createMcpAgentTool,
  createMcpAgentTools,
  createMcpToolSearchTool,
  createMcpResourceListTool,
  createMcpResourceReadTool,
  createMcpServerStatusTool,
} from "./tool-adapter.js";
export type {
  McpConfig,
  McpServerConfig,
  McpTransport,
  McpStdioTransport,
  McpSseTransport,
  McpWebSocketTransport,
  McpToolSearchConfig,
  McpToolDefinition,
  McpResourceDefinition,
  McpPromptDefinition,
  McpServerStatus,
  McpServerState,
  McpToolCallResult,
} from "./types.js";
