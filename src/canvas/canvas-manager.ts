/**
 * Canvas Manager
 *
 * Coordinates cross-channel rich content rendering with intelligent fallbacks.
 */

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type {
  CanvasConfig,
  CanvasContent,
  CanvasEvents,
  ChannelRenderStrategy,
  RenderResult,
} from "./types.js";
import { getChannelCapabilities, getFallbackChain } from "./capabilities.js";
import { BaseRenderer } from "./renderers/base.js";
import { MarkdownRenderer } from "./renderers/markdown.js";
import { DiscordRenderer } from "./renderers/discord.js";
import { SlackRenderer } from "./renderers/slack.js";
import { TelegramRenderer } from "./renderers/telegram.js";

export type CanvasManagerOptions = {
  config?: CanvasConfig;
};

export class CanvasManager extends EventEmitter {
  private config: CanvasConfig;
  private renderers: Map<string, BaseRenderer> = new Map();
  private hostedContent: Map<string, CanvasContent> = new Map();

  constructor(options: CanvasManagerOptions = {}) {
    super();
    this.config = {
      enabled: true,
      ...options.config,
    };

    // Register built-in renderers
    this.registerRenderer("markdown", new MarkdownRenderer());
    this.registerRenderer("discord", new DiscordRenderer());
    this.registerRenderer("slack", new SlackRenderer());
    this.registerRenderer("telegram", new TelegramRenderer());
  }

  /**
   * Register a custom renderer for a channel
   */
  registerRenderer(channel: string, renderer: BaseRenderer): void {
    this.renderers.set(channel.toLowerCase(), renderer);
  }

  /**
   * Render content for a specific channel
   */
  async render(content: CanvasContent, channel: string): Promise<RenderResult> {
    const normalizedChannel = channel.toLowerCase();
    const capabilities = getChannelCapabilities(normalizedChannel);
    const fallbackChain = getFallbackChain(normalizedChannel);

    // Apply config overrides
    const configuredStrategy = this.config.fallbacks?.[normalizedChannel];
    if (configuredStrategy) {
      // Move configured strategy to front of chain
      const filtered = fallbackChain.filter((s) => s !== configuredStrategy);
      filtered.unshift(configuredStrategy);
    }

    // Try each strategy in the fallback chain
    let lastError: Error | undefined;
    for (const strategy of fallbackChain) {
      try {
        const result = await this.renderWithStrategy(content, normalizedChannel, strategy);
        if (result) {
          this.emit("content:rendered", {
            contentId: content.id,
            channel: normalizedChannel,
            strategy,
          });
          return result;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // All strategies failed, return plain text fallback
    this.emit("content:error", {
      contentId: content.id,
      error: lastError?.message ?? "All render strategies failed",
    });

    return {
      content: this.createFallbackText(content),
      format: "text",
      strategy: "text",
      fallbackText: this.createFallbackText(content),
    };
  }

  /**
   * Render using a specific strategy
   */
  private async renderWithStrategy(
    content: CanvasContent,
    channel: string,
    strategy: ChannelRenderStrategy,
  ): Promise<RenderResult | null> {
    switch (strategy) {
      case "native_canvas":
        // Native canvas is handled by the native app
        // Return content as-is with metadata
        return {
          content: JSON.stringify(content.data),
          format: "json",
          strategy: "native_canvas",
          fallbackText: this.createFallbackText(content),
        };

      case "embed":
        // Use Discord renderer for embed format
        const discordRenderer = this.renderers.get("discord");
        if (discordRenderer) {
          return discordRenderer.render(content);
        }
        return null;

      case "blocks":
        // Use Slack renderer for block format
        const slackRenderer = this.renderers.get("slack");
        if (slackRenderer) {
          return slackRenderer.render(content);
        }
        return null;

      case "html":
        // Use Telegram renderer for HTML format
        const telegramRenderer = this.renderers.get("telegram");
        if (telegramRenderer) {
          return telegramRenderer.render(content);
        }
        return null;

      case "markdown":
        // Use markdown renderer
        const markdownRenderer = this.renderers.get("markdown");
        if (markdownRenderer) {
          return markdownRenderer.render(content);
        }
        return null;

      case "link":
        // Host content and return link
        const url = await this.hostContent(content);
        if (url) {
          return {
            content: `View rich content: ${url}`,
            format: "text",
            strategy: "link",
            hostedUrl: url,
            fallbackText: this.createFallbackText(content),
          };
        }
        return null;

      case "pdf":
        // Generate PDF attachment
        if (this.config.pdf?.enabled) {
          const pdfData = await this.generatePdf(content);
          if (pdfData) {
            return {
              content: content.title ?? "Rich content attached",
              format: "text",
              strategy: "pdf",
              attachments: [
                {
                  type: "pdf",
                  filename: `${content.id}.pdf`,
                  data: pdfData,
                  mimeType: "application/pdf",
                },
              ],
              fallbackText: this.createFallbackText(content),
            };
          }
        }
        return null;

      case "image":
        // Generate image attachment
        if (this.config.image?.enabled) {
          const imageData = await this.generateImage(content);
          if (imageData) {
            const format = this.config.image.format ?? "png";
            return {
              content: content.title ?? "Rich content attached",
              format: "text",
              strategy: "image",
              attachments: [
                {
                  type: "image",
                  filename: `${content.id}.${format}`,
                  data: imageData,
                  mimeType: `image/${format}`,
                },
              ],
              fallbackText: this.createFallbackText(content),
            };
          }
        }
        return null;

      case "text":
      default:
        return {
          content: this.createFallbackText(content),
          format: "text",
          strategy: "text",
          fallbackText: this.createFallbackText(content),
        };
    }
  }

  /**
   * Create content object
   */
  createContent(params: Omit<CanvasContent, "id">): CanvasContent {
    const content: CanvasContent = {
      ...params,
      id: randomUUID(),
    };

    this.emit("content:created", { content });
    return content;
  }

  /**
   * Host content at a URL for link-based fallback
   */
  async hostContent(content: CanvasContent): Promise<string | null> {
    if (!this.config.hostUrl) {
      return null;
    }

    // Store content for retrieval
    this.hostedContent.set(content.id, content);

    const url = `${this.config.hostUrl}/canvas/${content.id}`;

    this.emit("content:hosted", { contentId: content.id, url });
    return url;
  }

  /**
   * Get hosted content by ID
   */
  getHostedContent(contentId: string): CanvasContent | undefined {
    return this.hostedContent.get(contentId);
  }

  /**
   * Generate PDF from content (stub - would need PDF library)
   */
  private async generatePdf(_content: CanvasContent): Promise<Buffer | null> {
    // Would integrate with a PDF generation library like puppeteer or pdfkit
    // For now, return null to fall back to next strategy
    return null;
  }

  /**
   * Generate image from content (stub - would need image library)
   */
  private async generateImage(_content: CanvasContent): Promise<Buffer | null> {
    // Would integrate with an image generation library like puppeteer or sharp
    // For now, return null to fall back to next strategy
    return null;
  }

  /**
   * Create plain text fallback for content
   */
  private createFallbackText(content: CanvasContent): string {
    const parts: string[] = [];

    if (content.title) parts.push(content.title);
    if (content.description) parts.push(content.description);

    const data = content.data as Record<string, unknown>;
    if (typeof data.text === "string") parts.push(data.text);
    if (typeof data.content === "string") parts.push(data.content);
    if (typeof data.description === "string" && data.description !== content.description) {
      parts.push(data.description as string);
    }

    return parts.join("\n\n") || `[${content.type} content]`;
  }

  /**
   * Get configuration
   */
  getConfig(): CanvasConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CanvasConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Type augmentation for EventEmitter
export interface CanvasManager {
  on<K extends keyof CanvasEvents>(event: K, listener: (data: CanvasEvents[K]) => void): this;
  emit<K extends keyof CanvasEvents>(event: K, data: CanvasEvents[K]): boolean;
}
