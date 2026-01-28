/**
 * MCP Manager
 *
 * Singleton manager for MCP client instances, handling per-agent MCP configurations.
 */

import type { MoltbotConfig } from "../config/config.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { McpClient } from "./client.js";
import type { McpConfig, McpServerState } from "./types.js";
import {
  createMcpAgentTools,
  createMcpToolSearchTool,
  createMcpResourceListTool,
  createMcpResourceReadTool,
  createMcpServerStatusTool,
} from "./tool-adapter.js";

export type McpManagerContext = {
  agentId?: string;
  sessionKey?: string;
  config?: MoltbotConfig;
};

/**
 * MCP Manager handles lifecycle of MCP clients per agent
 */
export class McpManager {
  private static instance: McpManager | null = null;
  private clients: Map<string, McpClient> = new Map();
  private defaultClient: McpClient | null = null;

  private constructor() {}

  static getInstance(): McpManager {
    if (!McpManager.instance) {
      McpManager.instance = new McpManager();
    }
    return McpManager.instance;
  }

  /**
   * Get or create an MCP client for an agent
   */
  async getClient(ctx: McpManagerContext): Promise<McpClient | null> {
    const mcpConfig = this.getMcpConfig(ctx);
    if (!mcpConfig?.enabled) {
      return null;
    }

    const clientKey = ctx.agentId ?? "default";

    // Return existing client if available
    let client = this.clients.get(clientKey);
    if (client) {
      return client;
    }

    // Create new client
    client = new McpClient(mcpConfig);
    this.clients.set(clientKey, client);

    // Connect to servers
    try {
      await client.connect();
    } catch (error) {
      console.error(`[MCP] Failed to connect client for ${clientKey}:`, error);
    }

    return client;
  }

  /**
   * Get MCP configuration from agent config
   */
  private getMcpConfig(ctx: McpManagerContext): McpConfig | undefined {
    const config = ctx.config;
    if (!config) return undefined;

    // Check agent-specific MCP config
    const agent = config.agents?.list?.find((a) => a.id === ctx.agentId);

    // For now, use defaults MCP config (agent-specific will be added)
    const defaults = config.agents?.defaults as Record<string, unknown> | undefined;
    const mcpConfig = defaults?.mcp as McpConfig | undefined;

    return mcpConfig;
  }

  /**
   * Get MCP tools for an agent
   */
  async getTools(ctx: McpManagerContext): Promise<AnyAgentTool[]> {
    const client = await this.getClient(ctx);
    if (!client) {
      return [];
    }

    const tools: AnyAgentTool[] = [];

    // Add all MCP tools from connected servers
    tools.push(...createMcpAgentTools(client));

    // Add helper tools if tool search is enabled
    const mcpConfig = this.getMcpConfig(ctx);
    if (mcpConfig?.toolSearch?.enabled) {
      tools.push(createMcpToolSearchTool(client));
    }

    // Add resource tools
    tools.push(createMcpResourceListTool(client));
    tools.push(createMcpResourceReadTool(client));

    // Add status tool
    tools.push(createMcpServerStatusTool(client));

    return tools;
  }

  /**
   * Get all server statuses for an agent
   */
  async getServerStatuses(ctx: McpManagerContext): Promise<McpServerState[]> {
    const client = await this.getClient(ctx);
    if (!client) {
      return [];
    }
    return client.getAllServerStatuses();
  }

  /**
   * Disconnect and remove a client
   */
  async removeClient(agentId: string): Promise<void> {
    const client = this.clients.get(agentId);
    if (client) {
      await client.disconnect();
      this.clients.delete(agentId);
    }
  }

  /**
   * Disconnect all clients
   */
  async shutdown(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.disconnect(),
    );
    await Promise.allSettled(disconnectPromises);
    this.clients.clear();
    this.defaultClient = null;
  }

  /**
   * Reconnect a specific server for an agent
   */
  async reconnectServer(ctx: McpManagerContext, serverId: string): Promise<void> {
    const client = await this.getClient(ctx);
    if (client) {
      await client.reconnectServer(serverId);
    }
  }

  /**
   * Refresh tools for a server (called when tools change)
   */
  async refreshServerTools(ctx: McpManagerContext): Promise<void> {
    const client = await this.getClient(ctx);
    if (client) {
      // Tools are automatically refreshed via notifications
      // This method can be used for manual refresh
    }
  }
}

/**
 * Get the global MCP manager instance
 */
export function getMcpManager(): McpManager {
  return McpManager.getInstance();
}

/**
 * Get MCP tools for an agent context
 */
export async function getMcpTools(ctx: McpManagerContext): Promise<AnyAgentTool[]> {
  return getMcpManager().getTools(ctx);
}
