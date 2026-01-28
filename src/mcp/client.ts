/**
 * MCP Client implementation
 *
 * Manages connections to MCP servers and provides tool invocation capabilities.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

import type {
  McpConfig,
  McpServerConfig,
  McpServerState,
  McpToolDefinition,
  McpResourceDefinition,
  McpPromptDefinition,
  McpToolCallResult,
  McpClientEvents,
} from "./types.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
};

export class McpClient extends EventEmitter {
  private config: McpConfig;
  private servers: Map<string, McpServerState> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private requestId = 0;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();
  private messageBuffers: Map<string, string> = new Map();

  constructor(config: McpConfig = {}) {
    super();
    this.config = config;
  }

  /**
   * Initialize and connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    if (!this.config.enabled || !this.config.servers?.length) {
      return;
    }

    const connectPromises = this.config.servers
      .filter((server) => server.autoConnect !== false)
      .map((server) => this.connectServer(server));

    await Promise.allSettled(connectPromises);
  }

  /**
   * Connect to a specific MCP server
   */
  async connectServer(serverConfig: McpServerConfig): Promise<void> {
    const serverId = serverConfig.id;

    // Initialize server state
    const state: McpServerState = {
      id: serverId,
      name: serverConfig.name,
      status: "connecting",
      tools: [],
      resources: [],
      prompts: [],
    };
    this.servers.set(serverId, state);

    try {
      if (serverConfig.transport.type === "stdio") {
        await this.connectStdio(serverConfig);
      } else if (serverConfig.transport.type === "sse") {
        await this.connectSse(serverConfig);
      } else if (serverConfig.transport.type === "websocket") {
        await this.connectWebSocket(serverConfig);
      }

      // Initialize the connection
      await this.initializeServer(serverId);

      // Fetch tools, resources, and prompts
      await this.refreshServerCapabilities(serverId);

      state.status = "connected";
      state.connectedAt = new Date();
      this.emit("server:connected", { serverId });
    } catch (error) {
      state.status = "error";
      state.error = error instanceof Error ? error.message : String(error);
      state.lastError = new Date();
      this.emit("server:error", { serverId, error: error as Error });
      throw error;
    }
  }

  private async connectStdio(serverConfig: McpServerConfig): Promise<void> {
    const transport = serverConfig.transport;
    if (transport.type !== "stdio") return;

    const env = {
      ...process.env,
      ...serverConfig.env,
      ...transport.env,
    };

    const proc = spawn(transport.command, transport.args ?? [], {
      cwd: transport.cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.processes.set(serverConfig.id, proc);
    this.messageBuffers.set(serverConfig.id, "");

    proc.stdout?.on("data", (data: Buffer) => {
      this.handleStdioData(serverConfig.id, data);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      console.error(`[MCP ${serverConfig.id}] stderr: ${data.toString()}`);
    });

    proc.on("error", (error) => {
      this.handleServerError(serverConfig.id, error);
    });

    proc.on("exit", (code) => {
      this.handleServerDisconnect(serverConfig.id, `Process exited with code ${code}`);
    });

    // Wait for process to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Server ${serverConfig.id} connection timeout`));
      }, serverConfig.timeoutMs ?? this.config.timeoutMs ?? 30000);

      proc.on("spawn", () => {
        clearTimeout(timeout);
        resolve();
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private async connectSse(serverConfig: McpServerConfig): Promise<void> {
    const transport = serverConfig.transport;
    if (transport.type !== "sse") return;

    // SSE transport implementation
    // Uses EventSource to maintain a persistent connection
    const headers = transport.headers ?? {};

    const response = await fetch(transport.url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
    }

    // Store connection info for later message sending
    // In a full implementation, this would use a proper SSE client
    console.log(`[MCP ${serverConfig.id}] SSE connected to ${transport.url}`);
  }

  private async connectWebSocket(serverConfig: McpServerConfig): Promise<void> {
    const transport = serverConfig.transport;
    if (transport.type !== "websocket") return;

    // WebSocket transport implementation
    // Would use a WebSocket client library
    console.log(`[MCP ${serverConfig.id}] WebSocket connecting to ${transport.url}`);
  }

  private handleStdioData(serverId: string, data: Buffer): void {
    const buffer = (this.messageBuffers.get(serverId) ?? "") + data.toString();
    const lines = buffer.split("\n");

    // Keep incomplete line in buffer
    this.messageBuffers.set(serverId, lines.pop() ?? "");

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification;
        this.handleMessage(serverId, message);
      } catch {
        console.error(`[MCP ${serverId}] Failed to parse message: ${line}`);
      }
    }
  }

  private handleMessage(serverId: string, message: JsonRpcResponse | JsonRpcNotification): void {
    if ("id" in message && message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        this.pendingRequests.delete(message.id as number);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // Notification
      this.handleNotification(serverId, message as JsonRpcNotification);
    }
  }

  private handleNotification(serverId: string, notification: JsonRpcNotification): void {
    switch (notification.method) {
      case "notifications/tools/list_changed":
        this.refreshServerTools(serverId).catch(console.error);
        break;
      case "notifications/resources/list_changed":
        this.refreshServerResources(serverId).catch(console.error);
        break;
      case "notifications/prompts/list_changed":
        this.refreshServerPrompts(serverId).catch(console.error);
        break;
    }
  }

  private handleServerError(serverId: string, error: Error): void {
    const state = this.servers.get(serverId);
    if (state) {
      state.status = "error";
      state.error = error.message;
      state.lastError = new Date();
    }
    this.emit("server:error", { serverId, error });
  }

  private handleServerDisconnect(serverId: string, reason?: string): void {
    const state = this.servers.get(serverId);
    if (state) {
      state.status = "disconnected";
    }
    this.processes.delete(serverId);
    this.messageBuffers.delete(serverId);
    this.emit("server:disconnected", { serverId, reason });
  }

  private async sendRequest(serverId: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const proc = this.processes.get(serverId);
    if (!proc?.stdin) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      proc.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  private async initializeServer(serverId: string): Promise<void> {
    await this.sendRequest(serverId, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: "moltbot",
        version: "1.0.0",
      },
    });

    // Send initialized notification
    const proc = this.processes.get(serverId);
    if (proc?.stdin) {
      const notification: JsonRpcNotification = {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      };
      proc.stdin.write(JSON.stringify(notification) + "\n");
    }
  }

  private async refreshServerCapabilities(serverId: string): Promise<void> {
    await Promise.all([
      this.refreshServerTools(serverId),
      this.refreshServerResources(serverId),
      this.refreshServerPrompts(serverId),
    ]);
  }

  private async refreshServerTools(serverId: string): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state) return;

    const serverConfig = this.config.servers?.find((s) => s.id === serverId);

    try {
      const result = (await this.sendRequest(serverId, "tools/list")) as {
        tools?: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>;
      };

      const tools: McpToolDefinition[] = (result.tools ?? [])
        .filter((tool) => {
          if (serverConfig?.tools?.allow && !serverConfig.tools.allow.includes(tool.name)) {
            return false;
          }
          if (serverConfig?.tools?.deny?.includes(tool.name)) {
            return false;
          }
          return true;
        })
        .map((tool) => ({
          name: serverConfig?.tools?.prefix ? `${serverConfig.tools.prefix}${tool.name}` : tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          serverId,
          serverName: state.name,
        }));

      state.tools = tools;
      this.emit("tools:updated", { serverId, tools });
    } catch (error) {
      console.error(`[MCP ${serverId}] Failed to list tools:`, error);
    }
  }

  private async refreshServerResources(serverId: string): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state) return;

    try {
      const result = (await this.sendRequest(serverId, "resources/list")) as {
        resources?: Array<{ uri: string; name?: string; description?: string; mimeType?: string }>;
      };

      const resources: McpResourceDefinition[] = (result.resources ?? []).map((resource) => ({
        ...resource,
        serverId,
      }));

      state.resources = resources;
      this.emit("resources:updated", { serverId, resources });
    } catch {
      // Resources may not be supported
    }
  }

  private async refreshServerPrompts(serverId: string): Promise<void> {
    const state = this.servers.get(serverId);
    if (!state) return;

    try {
      const result = (await this.sendRequest(serverId, "prompts/list")) as {
        prompts?: Array<{
          name: string;
          description?: string;
          arguments?: Array<{ name: string; description?: string; required?: boolean }>;
        }>;
      };

      state.prompts = (result.prompts ?? []).map((prompt) => ({
        ...prompt,
        serverId,
      }));
    } catch {
      // Prompts may not be supported
    }
  }

  /**
   * Get all available tools from connected servers
   */
  getAllTools(): McpToolDefinition[] {
    const tools: McpToolDefinition[] = [];
    for (const state of this.servers.values()) {
      if (state.status === "connected") {
        tools.push(...state.tools);
      }
    }
    return tools;
  }

  /**
   * Get all available resources from connected servers
   */
  getAllResources(): McpResourceDefinition[] {
    const resources: McpResourceDefinition[] = [];
    for (const state of this.servers.values()) {
      if (state.status === "connected") {
        resources.push(...state.resources);
      }
    }
    return resources;
  }

  /**
   * Find a tool by name
   */
  findTool(name: string): McpToolDefinition | undefined {
    for (const state of this.servers.values()) {
      const tool = state.tools.find((t) => t.name === name);
      if (tool) return tool;
    }
    return undefined;
  }

  /**
   * Search tools by query (for tool search feature)
   */
  searchTools(query: string, maxResults?: number): McpToolDefinition[] {
    const limit = maxResults ?? this.config.toolSearch?.maxToolsPerRequest ?? 20;
    const queryLower = query.toLowerCase();

    const allTools = this.getAllTools();
    const scored = allTools.map((tool) => {
      let score = 0;
      const nameLower = tool.name.toLowerCase();
      const descLower = (tool.description ?? "").toLowerCase();

      if (nameLower === queryLower) score += 100;
      else if (nameLower.includes(queryLower)) score += 50;

      if (descLower.includes(queryLower)) score += 25;

      // Word matching
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (nameLower.includes(word)) score += 10;
        if (descLower.includes(word)) score += 5;
      }

      return { tool, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.tool);
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    const tool = this.findTool(name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}`, isError: true };
    }

    // Remove prefix if present to get original tool name
    const serverConfig = this.config.servers?.find((s) => s.id === tool.serverId);
    const originalName = serverConfig?.tools?.prefix
      ? name.slice(serverConfig.tools.prefix.length)
      : name;

    try {
      const result = await this.sendRequest(tool.serverId, "tools/call", {
        name: originalName,
        arguments: args,
      });

      return {
        success: true,
        content: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isError: true,
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<{ content: unknown } | { error: string }> {
    // Find which server has this resource
    for (const state of this.servers.values()) {
      const resource = state.resources.find((r) => r.uri === uri);
      if (resource) {
        try {
          const result = await this.sendRequest(state.id, "resources/read", { uri });
          return { content: result };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      }
    }
    return { error: `Resource not found: ${uri}` };
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): McpServerState | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all server statuses
   */
  getAllServerStatuses(): McpServerState[] {
    return Array.from(this.servers.values());
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const proc = this.processes.get(serverId);
    if (proc) {
      proc.kill();
    }
    this.handleServerDisconnect(serverId, "Manual disconnect");
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    const serverIds = Array.from(this.servers.keys());
    await Promise.all(serverIds.map((id) => this.disconnectServer(id)));
    this.servers.clear();
    this.processes.clear();
    this.messageBuffers.clear();
    this.pendingRequests.clear();
  }

  /**
   * Reconnect to a server
   */
  async reconnectServer(serverId: string): Promise<void> {
    await this.disconnectServer(serverId);

    const serverConfig = this.config.servers?.find((s) => s.id === serverId);
    if (serverConfig) {
      await this.connectServer(serverConfig);
    }
  }
}

// Re-export event types for consumers
export type { McpClientEvents };
