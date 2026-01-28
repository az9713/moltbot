/**
 * Channel Capabilities Registry
 *
 * Defines what each messaging channel supports for rich content rendering.
 */

import type { ChannelCapabilities, ChannelRenderStrategy } from "./types.js";

// ============================================================================
// Channel Capability Definitions
// ============================================================================

export const CHANNEL_CAPABILITIES: Record<string, ChannelCapabilities> = {
  // Native apps with full canvas support
  macos: {
    channel: "macos",
    capabilities: ["canvas", "markdown", "html", "embeds", "buttons", "images", "files", "reactions"],
    preferredStrategy: "native_canvas",
  },
  ios: {
    channel: "ios",
    capabilities: ["canvas", "markdown", "html", "embeds", "buttons", "images", "files", "reactions"],
    preferredStrategy: "native_canvas",
  },
  android: {
    channel: "android",
    capabilities: ["canvas", "markdown", "html", "embeds", "buttons", "images", "files"],
    preferredStrategy: "native_canvas",
  },
  cli: {
    channel: "cli",
    capabilities: ["markdown", "images", "files"],
    preferredStrategy: "markdown",
    maxLength: 100000,
  },
  web: {
    channel: "web",
    capabilities: ["canvas", "markdown", "html", "embeds", "buttons", "images", "files", "reactions"],
    preferredStrategy: "native_canvas",
  },

  // Discord - rich embeds and components
  discord: {
    channel: "discord",
    capabilities: ["markdown", "embeds", "buttons", "images", "files", "reactions", "threads"],
    preferredStrategy: "embed",
    maxLength: 2000,
    maxEmbeds: 10,
    maxButtons: 25,
    supportsFiles: true,
  },

  // Slack - Block Kit
  slack: {
    channel: "slack",
    capabilities: ["blocks", "buttons", "images", "files", "reactions", "threads"],
    preferredStrategy: "blocks",
    maxLength: 40000,
    maxButtons: 25,
    supportsFiles: true,
  },

  // Telegram - Markdown with inline keyboards
  telegram: {
    channel: "telegram",
    capabilities: ["markdown", "html", "buttons", "images", "files", "reactions"],
    preferredStrategy: "markdown",
    maxLength: 4096,
    supportsInlineKeyboards: true,
    supportsFiles: true,
  },

  // Signal - Basic markdown
  signal: {
    channel: "signal",
    capabilities: ["markdown", "images", "files", "reactions"],
    preferredStrategy: "link",
    maxLength: 2000,
    supportsFiles: true,
  },

  // WhatsApp - Text with file attachments
  whatsapp: {
    channel: "whatsapp",
    capabilities: ["markdown", "images", "files"],
    preferredStrategy: "pdf",
    maxLength: 4096,
    supportsFiles: true,
  },

  // iMessage - Rich content
  imessage: {
    channel: "imessage",
    capabilities: ["markdown", "images", "files", "reactions"],
    preferredStrategy: "markdown",
    maxLength: 20000,
    supportsFiles: true,
  },

  // Matrix - Rich HTML
  matrix: {
    channel: "matrix",
    capabilities: ["markdown", "html", "images", "files", "reactions", "threads"],
    preferredStrategy: "html",
    maxLength: 65536,
    supportsFiles: true,
  },

  // Microsoft Teams - Adaptive Cards
  msteams: {
    channel: "msteams",
    capabilities: ["markdown", "embeds", "buttons", "images", "files", "reactions", "threads"],
    preferredStrategy: "embed",
    maxLength: 28000,
    supportsFiles: true,
  },

  // Google Chat - Cards
  googlechat: {
    channel: "googlechat",
    capabilities: ["markdown", "embeds", "buttons", "images"],
    preferredStrategy: "embed",
    maxLength: 4096,
  },

  // Zalo - Basic text
  zalo: {
    channel: "zalo",
    capabilities: ["markdown", "images"],
    preferredStrategy: "text",
    maxLength: 2000,
  },

  // Line - Flex messages
  line: {
    channel: "line",
    capabilities: ["markdown", "buttons", "images", "files"],
    preferredStrategy: "embed",
    maxLength: 5000,
    supportsFiles: true,
  },
};

// ============================================================================
// Capability Helpers
// ============================================================================

/**
 * Get capabilities for a channel
 */
export function getChannelCapabilities(channel: string): ChannelCapabilities {
  const normalized = channel.toLowerCase();
  return CHANNEL_CAPABILITIES[normalized] ?? {
    channel: normalized,
    capabilities: ["markdown"],
    preferredStrategy: "text" as ChannelRenderStrategy,
    maxLength: 2000,
  };
}

/**
 * Check if a channel supports a specific capability
 */
export function channelSupports(channel: string, capability: string): boolean {
  const caps = getChannelCapabilities(channel);
  return caps.capabilities.includes(capability as never);
}

/**
 * Get preferred render strategy for a channel
 */
export function getPreferredStrategy(channel: string): ChannelRenderStrategy {
  return getChannelCapabilities(channel).preferredStrategy;
}

/**
 * Get all channels that support a capability
 */
export function getChannelsWithCapability(capability: string): string[] {
  return Object.entries(CHANNEL_CAPABILITIES)
    .filter(([_, caps]) => caps.capabilities.includes(capability as never))
    .map(([channel]) => channel);
}

/**
 * Get the best fallback strategy chain for a channel
 */
export function getFallbackChain(channel: string): ChannelRenderStrategy[] {
  const caps = getChannelCapabilities(channel);
  const chain: ChannelRenderStrategy[] = [caps.preferredStrategy];

  // Build fallback chain based on capabilities
  if (caps.capabilities.includes("embeds") && !chain.includes("embed")) {
    chain.push("embed");
  }
  if (caps.capabilities.includes("blocks") && !chain.includes("blocks")) {
    chain.push("blocks");
  }
  if (caps.capabilities.includes("html") && !chain.includes("html")) {
    chain.push("html");
  }
  if (caps.capabilities.includes("markdown") && !chain.includes("markdown")) {
    chain.push("markdown");
  }
  if (caps.supportsFiles) {
    if (!chain.includes("pdf")) chain.push("pdf");
    if (!chain.includes("image")) chain.push("image");
  }
  if (!chain.includes("link")) chain.push("link");
  if (!chain.includes("text")) chain.push("text");

  return chain;
}
