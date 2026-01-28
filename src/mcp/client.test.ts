import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { McpClient } from "./client.js";
import type { McpConfig, McpServerConfig } from "./types.js";

describe("McpClient", () => {
  let client: McpClient;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe("constructor", () => {
    it("should create a client with empty config", () => {
      client = new McpClient();
      expect(client).toBeInstanceOf(McpClient);
    });

    it("should create a client with config", () => {
      const config: McpConfig = {
        enabled: true,
        servers: [],
      };
      client = new McpClient(config);
      expect(client).toBeInstanceOf(McpClient);
    });
  });

  describe("connect", () => {
    it("should skip connection when disabled", async () => {
      client = new McpClient({ enabled: false });
      await expect(client.connect()).resolves.not.toThrow();
    });

    it("should skip connection when no servers configured", async () => {
      client = new McpClient({ enabled: true, servers: [] });
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe("getAllTools", () => {
    it("should return empty array when no servers connected", () => {
      client = new McpClient();
      expect(client.getAllTools()).toEqual([]);
    });
  });

  describe("getAllResources", () => {
    it("should return empty array when no servers connected", () => {
      client = new McpClient();
      expect(client.getAllResources()).toEqual([]);
    });
  });

  describe("findTool", () => {
    it("should return undefined when tool not found", () => {
      client = new McpClient();
      expect(client.findTool("nonexistent")).toBeUndefined();
    });
  });

  describe("searchTools", () => {
    it("should return empty array when no tools available", () => {
      client = new McpClient();
      expect(client.searchTools("query")).toEqual([]);
    });
  });

  describe("callTool", () => {
    it("should return error when tool not found", async () => {
      client = new McpClient();
      const result = await client.callTool("nonexistent", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("readResource", () => {
    it("should return error when resource not found", async () => {
      client = new McpClient();
      const result = await client.readResource("file://nonexistent");
      expect("error" in result).toBe(true);
    });
  });

  describe("getServerStatus", () => {
    it("should return undefined for unknown server", () => {
      client = new McpClient();
      expect(client.getServerStatus("unknown")).toBeUndefined();
    });
  });

  describe("getAllServerStatuses", () => {
    it("should return empty array when no servers", () => {
      client = new McpClient();
      expect(client.getAllServerStatuses()).toEqual([]);
    });
  });

  describe("disconnect", () => {
    it("should complete without error when no servers connected", async () => {
      client = new McpClient();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});
