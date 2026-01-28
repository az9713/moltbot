/**
 * MCP Tool Adapter
 *
 * Converts MCP tools into Moltbot agent tools that can be used in the agent system.
 */

import { Type, type Static } from "@sinclair/typebox";

import type { AnyAgentTool } from "../agents/tools/common.js";
import type { McpClient } from "./client.js";
import type { McpToolDefinition } from "./types.js";

/**
 * Convert JSON Schema to TypeBox schema
 * This is a simplified conversion that handles common cases
 */
function jsonSchemaToTypebox(schema: Record<string, unknown>): unknown {
  if (!schema || typeof schema !== "object") {
    return Type.Unknown();
  }

  const type = schema.type as string;

  switch (type) {
    case "string":
      if (schema.enum) {
        return Type.Union((schema.enum as string[]).map((v) => Type.Literal(v)));
      }
      return Type.String();

    case "number":
    case "integer":
      return Type.Number();

    case "boolean":
      return Type.Boolean();

    case "array": {
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) {
        return Type.Array(jsonSchemaToTypebox(items) as ReturnType<typeof Type.Unknown>);
      }
      return Type.Array(Type.Unknown());
    }

    case "object": {
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
      const required = (schema.required as string[]) ?? [];

      if (!properties) {
        return Type.Record(Type.String(), Type.Unknown());
      }

      const typeboxProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(properties)) {
        const propType = jsonSchemaToTypebox(value);
        if (required.includes(key)) {
          typeboxProperties[key] = propType;
        } else {
          typeboxProperties[key] = Type.Optional(propType as ReturnType<typeof Type.Unknown>);
        }
      }

      return Type.Object(typeboxProperties as Record<string, ReturnType<typeof Type.Unknown>>);
    }

    default:
      return Type.Unknown();
  }
}

/**
 * Create a Moltbot agent tool from an MCP tool definition
 */
export function createMcpAgentTool(mcpClient: McpClient, toolDef: McpToolDefinition): AnyAgentTool {
  const inputSchema = jsonSchemaToTypebox(toolDef.inputSchema) as ReturnType<typeof Type.Object>;

  return {
    name: toolDef.name,
    description: toolDef.description ?? `MCP tool from ${toolDef.serverName ?? toolDef.serverId}`,
    inputSchema,
    call: async (input: Static<typeof inputSchema>) => {
      const result = await mcpClient.callTool(toolDef.name, input as Record<string, unknown>);

      if (result.isError) {
        return {
          type: "error" as const,
          error: result.error ?? "Unknown error",
        };
      }

      // Format the result for the agent
      let content: string;
      if (typeof result.content === "string") {
        content = result.content;
      } else if (result.content === null || result.content === undefined) {
        content = "Tool completed successfully (no output)";
      } else {
        content = JSON.stringify(result.content, null, 2);
      }

      return {
        type: "text" as const,
        text: content,
      };
    },
  };
}

/**
 * Create all agent tools from connected MCP servers
 */
export function createMcpAgentTools(mcpClient: McpClient): AnyAgentTool[] {
  const mcpTools = mcpClient.getAllTools();
  return mcpTools.map((toolDef) => createMcpAgentTool(mcpClient, toolDef));
}

/**
 * Create a tool search tool for discovering MCP tools
 */
export function createMcpToolSearchTool(mcpClient: McpClient): AnyAgentTool {
  return {
    name: "mcp_search_tools",
    description:
      "Search available MCP tools by query. Use this to discover what external tools are available before calling them.",
    inputSchema: Type.Object({
      query: Type.String({ description: "Search query for finding tools" }),
      maxResults: Type.Optional(
        Type.Number({ description: "Maximum number of results to return (default: 10)" }),
      ),
    }),
    call: async (input: { query: string; maxResults?: number }) => {
      const tools = mcpClient.searchTools(input.query, input.maxResults ?? 10);

      if (tools.length === 0) {
        return {
          type: "text" as const,
          text: `No tools found matching "${input.query}"`,
        };
      }

      const formatted = tools
        .map((t) => `- **${t.name}** (${t.serverName ?? t.serverId}): ${t.description ?? "No description"}`)
        .join("\n");

      return {
        type: "text" as const,
        text: `Found ${tools.length} tools:\n\n${formatted}`,
      };
    },
  };
}

/**
 * Create a resource listing tool for MCP resources
 */
export function createMcpResourceListTool(mcpClient: McpClient): AnyAgentTool {
  return {
    name: "mcp_list_resources",
    description: "List available MCP resources from connected servers",
    inputSchema: Type.Object({
      serverId: Type.Optional(
        Type.String({ description: "Filter by server ID (optional)" }),
      ),
    }),
    call: async (input: { serverId?: string }) => {
      let resources = mcpClient.getAllResources();

      if (input.serverId) {
        resources = resources.filter((r) => r.serverId === input.serverId);
      }

      if (resources.length === 0) {
        return {
          type: "text" as const,
          text: "No MCP resources available",
        };
      }

      const formatted = resources
        .map(
          (r) =>
            `- **${r.uri}** (${r.serverId}): ${r.name ?? ""}${r.description ? ` - ${r.description}` : ""}`,
        )
        .join("\n");

      return {
        type: "text" as const,
        text: `Available resources:\n\n${formatted}`,
      };
    },
  };
}

/**
 * Create a resource read tool
 */
export function createMcpResourceReadTool(mcpClient: McpClient): AnyAgentTool {
  return {
    name: "mcp_read_resource",
    description: "Read content from an MCP resource by URI",
    inputSchema: Type.Object({
      uri: Type.String({ description: "Resource URI to read" }),
    }),
    call: async (input: { uri: string }) => {
      const result = await mcpClient.readResource(input.uri);

      if ("error" in result) {
        return {
          type: "error" as const,
          error: result.error,
        };
      }

      let content: string;
      if (typeof result.content === "string") {
        content = result.content;
      } else {
        content = JSON.stringify(result.content, null, 2);
      }

      return {
        type: "text" as const,
        text: content,
      };
    },
  };
}

/**
 * Create a server status tool
 */
export function createMcpServerStatusTool(mcpClient: McpClient): AnyAgentTool {
  return {
    name: "mcp_server_status",
    description: "Get the status of connected MCP servers",
    inputSchema: Type.Object({}),
    call: async () => {
      const statuses = mcpClient.getAllServerStatuses();

      if (statuses.length === 0) {
        return {
          type: "text" as const,
          text: "No MCP servers configured",
        };
      }

      const formatted = statuses
        .map((s) => {
          const toolCount = s.tools.length;
          const resourceCount = s.resources.length;
          const statusEmoji =
            s.status === "connected"
              ? "[OK]"
              : s.status === "connecting"
                ? "[...]"
                : s.status === "error"
                  ? "[ERR]"
                  : "[OFF]";

          let line = `${statusEmoji} **${s.name ?? s.id}** (${s.status})`;
          if (s.status === "connected") {
            line += ` - ${toolCount} tools, ${resourceCount} resources`;
          }
          if (s.error) {
            line += `\n  Error: ${s.error}`;
          }
          return line;
        })
        .join("\n");

      return {
        type: "text" as const,
        text: `MCP Server Status:\n\n${formatted}`,
      };
    },
  };
}
