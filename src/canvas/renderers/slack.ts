/**
 * Slack Renderer
 *
 * Renders canvas content to Slack Block Kit format.
 */

import type {
  CanvasContent,
  CardContent,
  ChartContent,
  CodeContent,
  EmbedContent,
  InteractiveContent,
  ListContent,
  RenderResult,
  SlackBlock,
  SlackElement,
  TableContent,
} from "../types.js";
import { BaseRenderer } from "./base.js";

const SLACK_MAX_TEXT = 3000;
const SLACK_MAX_BLOCKS = 50;

export class SlackRenderer extends BaseRenderer {
  readonly channel = "slack";
  readonly format = "mrkdwn" as const;

  async render(content: CanvasContent): Promise<RenderResult> {
    const result = await this.dispatch(content);
    return {
      ...result,
      strategy: "blocks",
      fallbackText: this.createFallback(content),
    };
  }

  protected async renderCard(card: CardContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Title as header
    if (card.title) {
      blocks.push({
        type: "header",
        text: { type: "plain_text", text: this.truncate(card.title, 150) },
      });
    }

    // Image
    if (card.imageUrl) {
      blocks.push({
        type: "image",
        image_url: card.imageUrl,
        alt_text: card.title ?? "Image",
      });
    }

    // Description as section
    if (card.description) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: this.truncate(card.description, SLACK_MAX_TEXT) },
      });
    }

    // Fields
    if (card.fields?.length) {
      const fieldChunks = this.chunkArray(card.fields, 10);
      for (const chunk of fieldChunks) {
        blocks.push({
          type: "section",
          fields: chunk.map((field) => ({
            type: "mrkdwn",
            text: `*${this.escape(field.name)}*\n${this.escape(field.value)}`,
          })),
        });
      }
    }

    // Buttons
    if (card.buttons?.length) {
      const elements: SlackElement[] = card.buttons.slice(0, 5).map((button) => ({
        type: "button" as const,
        text: { type: "plain_text" as const, text: button.label },
        url: button.url,
        action_id: button.action ?? `btn_${button.label}`,
        style: button.style === "danger" ? "danger" : button.style === "primary" ? "primary" : undefined,
      }));

      blocks.push({
        type: "actions",
        elements,
      });
    }

    // Footer as context
    if (card.footer || card.timestamp) {
      const contextElements: Array<{ type: "mrkdwn"; text: string }> = [];
      if (card.footer) {
        contextElements.push({ type: "mrkdwn", text: card.footer });
      }
      if (card.timestamp) {
        contextElements.push({ type: "mrkdwn", text: card.timestamp.toISOString() });
      }
      blocks.push({
        type: "context",
        elements: contextElements,
      });
    }

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks: blocks.slice(0, SLACK_MAX_BLOCKS),
    };
  }

  protected async renderTable(table: TableContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Caption as header
    if (table.caption) {
      blocks.push({
        type: "header",
        text: { type: "plain_text", text: this.truncate(table.caption, 150) },
      });
    }

    // Render table as code block (Slack doesn't have native tables)
    const lines: string[] = [];
    const widths = table.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...table.rows.map((row) => (row[i] ?? "").length),
      );
      return Math.min(maxLen, 30);
    });

    // Header
    const headerRow = table.headers
      .map((h, i) => h.padEnd(widths[i]))
      .join(" | ");
    lines.push(headerRow);
    lines.push(widths.map((w) => "-".repeat(w)).join("-+-"));

    // Rows
    for (const row of table.rows.slice(0, 25)) {
      const rowStr = row
        .map((cell, i) => (cell ?? "").padEnd(widths[i]))
        .join(" | ");
      lines.push(rowStr);
    }

    if (table.rows.length > 25) {
      lines.push(`... and ${table.rows.length - 25} more rows`);
    }

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "```\n" + lines.join("\n") + "\n```" },
    });

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks,
    };
  }

  protected async renderCode(code: CodeContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Filename as context
    if (code.filename) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `📄 *${this.escape(code.filename)}*` }],
      });
    }

    // Code block
    const codeText = "```\n" + code.code + "\n```";

    if (codeText.length <= SLACK_MAX_TEXT) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: codeText },
      });
    } else {
      // Code too long, truncate
      const truncated = code.code.slice(0, SLACK_MAX_TEXT - 100);
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: "```\n" + truncated + "\n...\n```" },
      });
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: "_Code truncated. Full code available as file._" }],
      });
    }

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks,
    };
  }

  protected async renderChart(chart: ChartContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Title
    if (chart.title) {
      blocks.push({
        type: "header",
        text: { type: "plain_text", text: chart.title },
      });
    }

    // Chart type info
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `📊 *${chart.chartType} chart*` }],
    });

    // Data as fields
    for (const dataset of chart.data.datasets.slice(0, 3)) {
      const values = chart.data.labels
        .map((label, i) => `• ${label}: ${dataset.data[i]}`)
        .slice(0, 8)
        .join("\n");

      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*${dataset.label}*\n${values}` },
      });
    }

    if (chart.data.datasets.length > 3) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `_+ ${chart.data.datasets.length - 3} more datasets_` }],
      });
    }

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks,
    };
  }

  protected async renderList(list: ListContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Title
    if (list.title) {
      blocks.push({
        type: "header",
        text: { type: "plain_text", text: list.title },
      });
    }

    // Render list items
    const lines: string[] = [];
    const renderItems = (items: typeof list.items, depth = 0): void => {
      const indent = "    ".repeat(depth);
      let num = 1;

      for (const item of items.slice(0, 20)) {
        const marker = list.ordered ? `${num++}.` : "•";
        let line = `${indent}${marker} `;

        if (item.icon) line += `${item.icon} `;
        if (item.url) {
          line += `<${item.url}|${this.escape(item.text)}>`;
        } else {
          line += item.text;
        }

        lines.push(line);

        if (item.description) {
          lines.push(`${indent}    _${this.escape(item.description)}_`);
        }

        if (item.children?.length && depth < 2) {
          renderItems(item.children, depth + 1);
        }
      }
    };

    renderItems(list.items);

    if (list.items.length > 20) {
      lines.push(`_... and ${list.items.length - 20} more items_`);
    }

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: this.truncate(lines.join("\n"), SLACK_MAX_TEXT) },
    });

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks,
    };
  }

  protected async renderEmbed(embed: EmbedContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Author as context
    if (embed.author) {
      const authorText = embed.author.url
        ? `<${embed.author.url}|${embed.author.name}>`
        : embed.author.name;
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: authorText }],
      });
    }

    // Title
    if (embed.title) {
      const titleText = embed.url
        ? `<${embed.url}|*${this.escape(embed.title)}*>`
        : `*${this.escape(embed.title)}*`;
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: titleText },
      });
    }

    // Description
    if (embed.description) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: this.truncate(embed.description, SLACK_MAX_TEXT) },
      });
    }

    // Thumbnail
    if (embed.thumbnailUrl) {
      blocks.push({
        type: "image",
        image_url: embed.thumbnailUrl,
        alt_text: embed.title ?? "Thumbnail",
      });
    }

    // Fields
    if (embed.fields?.length) {
      const fieldChunks = this.chunkArray(embed.fields, 10);
      for (const chunk of fieldChunks) {
        blocks.push({
          type: "section",
          fields: chunk.map((field) => ({
            type: "mrkdwn" as const,
            text: `*${this.escape(field.name)}*\n${this.escape(field.value)}`,
          })),
        });
      }
    }

    // Divider before footer
    if (embed.footer || embed.timestamp) {
      blocks.push({ type: "divider" });

      const footerParts: string[] = [];
      if (embed.footer) footerParts.push(embed.footer.text);
      if (embed.timestamp) footerParts.push(embed.timestamp.toISOString());

      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: footerParts.join(" • ") }],
      });
    }

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks: blocks.slice(0, SLACK_MAX_BLOCKS),
    };
  }

  protected async renderInteractive(interactive: InteractiveContent): Promise<RenderResult> {
    const blocks: SlackBlock[] = [];

    // Group elements into action blocks
    let currentElements: SlackElement[] = [];

    for (const element of interactive.elements) {
      switch (element.type) {
        case "button":
          currentElements.push({
            type: "button",
            text: { type: "plain_text", text: element.label },
            action_id: element.action,
            style: element.style === "danger" ? "danger" : element.style === "primary" ? "primary" : undefined,
          });

          if (currentElements.length >= 5) {
            blocks.push({ type: "actions", elements: currentElements });
            currentElements = [];
          }
          break;

        case "select":
          if (currentElements.length > 0) {
            blocks.push({ type: "actions", elements: currentElements });
            currentElements = [];
          }
          blocks.push({
            type: "actions",
            elements: [
              {
                type: "static_select",
                placeholder: element.placeholder
                  ? { type: "plain_text", text: element.placeholder }
                  : undefined,
                action_id: "select",
                options: element.options.slice(0, 100).map((opt) => ({
                  text: { type: "plain_text", text: opt.label },
                  value: opt.value,
                })),
              },
            ],
          });
          break;

        case "datepicker":
          if (currentElements.length > 0) {
            blocks.push({ type: "actions", elements: currentElements });
            currentElements = [];
          }
          blocks.push({
            type: "actions",
            elements: [
              {
                type: "datepicker",
                placeholder: element.placeholder
                  ? { type: "plain_text", text: element.placeholder }
                  : undefined,
                action_id: "datepicker",
              },
            ],
          });
          break;
      }
    }

    if (currentElements.length > 0) {
      blocks.push({ type: "actions", elements: currentElements });
    }

    return {
      content: "",
      format: "mrkdwn",
      strategy: "blocks",
      blocks: blocks.slice(0, SLACK_MAX_BLOCKS),
    };
  }

  protected escape(text: string): string {
    // Slack mrkdwn escaping
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
