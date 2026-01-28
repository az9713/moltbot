/**
 * Discord Renderer
 *
 * Renders canvas content to Discord embeds and components.
 */

import type {
  CanvasContent,
  CardContent,
  ChartContent,
  CodeContent,
  DiscordComponent,
  DiscordEmbed,
  EmbedContent,
  InteractiveContent,
  ListContent,
  RenderResult,
  TableContent,
} from "../types.js";
import { BaseRenderer } from "./base.js";

const DISCORD_MAX_EMBED_TITLE = 256;
const DISCORD_MAX_EMBED_DESCRIPTION = 4096;
const DISCORD_MAX_FIELD_NAME = 256;
const DISCORD_MAX_FIELD_VALUE = 1024;
const DISCORD_MAX_FOOTER = 2048;
const DISCORD_MAX_EMBEDS = 10;

export class DiscordRenderer extends BaseRenderer {
  readonly channel = "discord";
  readonly format = "markdown" as const;

  async render(content: CanvasContent): Promise<RenderResult> {
    const result = await this.dispatch(content);
    return {
      ...result,
      strategy: "embed",
      fallbackText: this.createFallback(content),
    };
  }

  protected async renderCard(card: CardContent): Promise<RenderResult> {
    const embed: DiscordEmbed = {};

    // Title
    if (card.title) {
      embed.title = this.truncate(card.title, DISCORD_MAX_EMBED_TITLE);
      if (card.url) embed.url = card.url;
    }

    // Description
    if (card.description) {
      embed.description = this.truncate(card.description, DISCORD_MAX_EMBED_DESCRIPTION);
    }

    // Color
    if (card.color) {
      embed.color = this.parseColor(card.color);
    }

    // Image
    if (card.imageUrl) {
      embed.image = { url: card.imageUrl };
    }

    // Thumbnail
    if (card.thumbnailUrl) {
      embed.thumbnail = { url: card.thumbnailUrl };
    }

    // Fields
    if (card.fields?.length) {
      embed.fields = card.fields.slice(0, 25).map((field) => ({
        name: this.truncate(field.name, DISCORD_MAX_FIELD_NAME),
        value: this.truncate(field.value, DISCORD_MAX_FIELD_VALUE),
        inline: field.inline,
      }));
    }

    // Footer
    if (card.footer) {
      embed.footer = { text: this.truncate(card.footer, DISCORD_MAX_FOOTER) };
    }

    // Timestamp
    if (card.timestamp) {
      embed.timestamp = card.timestamp.toISOString();
    }

    // Buttons as components
    const components: DiscordComponent[] = [];
    if (card.buttons?.length) {
      const actionRow: DiscordComponent = {
        type: 1, // ACTION_ROW
        components: card.buttons.slice(0, 5).map((button, i) => ({
          type: 2, // BUTTON
          style: button.url ? 5 : this.getButtonStyle(button.style), // LINK or other
          label: button.label,
          url: button.url,
          custom_id: button.url ? undefined : `btn_${i}`,
          emoji: button.emoji ? { name: button.emoji } : undefined,
        })),
      };
      components.push(actionRow);
    }

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      embeds: [embed],
      components: components.length ? components : undefined,
    };
  }

  protected async renderTable(table: TableContent): Promise<RenderResult> {
    // Discord doesn't support tables in embeds well
    // Render as fields or code block
    const embed: DiscordEmbed = {};

    if (table.caption) {
      embed.title = this.truncate(table.caption, DISCORD_MAX_EMBED_TITLE);
    }

    // Small tables: render as fields
    if (table.rows.length <= 10 && table.headers.length <= 3) {
      embed.fields = [];

      for (const row of table.rows) {
        if (embed.fields.length >= 25) break;

        const rowData = table.headers
          .map((header, i) => `**${header}:** ${row[i] ?? ""}`)
          .join("\n");

        embed.fields.push({
          name: row[0] ?? "Row",
          value: this.truncate(rowData, DISCORD_MAX_FIELD_VALUE),
          inline: true,
        });
      }

      return {
        content: "",
        format: "markdown",
        strategy: "embed",
        embeds: [embed],
      };
    }

    // Large tables: render as code block
    const lines: string[] = [];
    const headerRow = table.headers.join(" | ");
    lines.push(headerRow);
    lines.push(table.headers.map(() => "---").join(" | "));

    for (const row of table.rows.slice(0, 20)) {
      lines.push(row.join(" | "));
    }

    if (table.rows.length > 20) {
      lines.push(`... and ${table.rows.length - 20} more rows`);
    }

    embed.description = "```\n" + lines.join("\n") + "\n```";

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      embeds: [embed],
    };
  }

  protected async renderCode(code: CodeContent): Promise<RenderResult> {
    const embed: DiscordEmbed = {};

    if (code.filename) {
      embed.title = this.truncate(code.filename, DISCORD_MAX_EMBED_TITLE);
    }

    const lang = code.language ?? "";
    const codeBlock = `\`\`\`${lang}\n${code.code}\n\`\`\``;

    if (codeBlock.length <= DISCORD_MAX_EMBED_DESCRIPTION) {
      embed.description = codeBlock;
      return {
        content: "",
        format: "markdown",
        strategy: "embed",
        embeds: [embed],
      };
    }

    // Code too long: send as file attachment
    return {
      content: code.filename ? `**${code.filename}**` : "",
      format: "markdown",
      strategy: "embed",
      attachments: [
        {
          type: "file",
          filename: code.filename ?? `code.${code.language ?? "txt"}`,
          data: Buffer.from(code.code, "utf-8"),
          mimeType: "text/plain",
        },
      ],
    };
  }

  protected async renderChart(chart: ChartContent): Promise<RenderResult> {
    // Discord can't render charts natively
    // Would need to generate an image via external service
    const embed: DiscordEmbed = {
      title: chart.title
        ? this.truncate(chart.title, DISCORD_MAX_EMBED_TITLE)
        : "Chart",
      description: `*${chart.chartType} chart*\n\nData preview:`,
      fields: [],
    };

    // Show data as fields
    for (const dataset of chart.data.datasets.slice(0, 3)) {
      const values = chart.data.labels
        .map((label, i) => `${label}: ${dataset.data[i]}`)
        .slice(0, 5)
        .join("\n");

      embed.fields!.push({
        name: dataset.label,
        value: this.truncate(values, DISCORD_MAX_FIELD_VALUE),
        inline: true,
      });
    }

    if (chart.data.datasets.length > 3) {
      embed.footer = { text: `+ ${chart.data.datasets.length - 3} more datasets` };
    }

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      embeds: [embed],
    };
  }

  protected async renderList(list: ListContent): Promise<RenderResult> {
    const embed: DiscordEmbed = {};

    if (list.title) {
      embed.title = this.truncate(list.title, DISCORD_MAX_EMBED_TITLE);
    }

    const lines: string[] = [];
    const renderItems = (items: typeof list.items, depth = 0): void => {
      const indent = "  ".repeat(depth);
      let num = 1;

      for (const item of items) {
        const marker = list.ordered ? `${num++}.` : "•";
        let line = `${indent}${marker} `;

        if (item.icon) line += `${item.icon} `;
        if (item.url) {
          line += `[${item.text}](${item.url})`;
        } else {
          line += item.text;
        }

        lines.push(line);

        if (item.description) {
          lines.push(`${indent}  *${item.description}*`);
        }

        if (item.children?.length && depth < 2) {
          renderItems(item.children, depth + 1);
        }
      }
    };

    renderItems(list.items.slice(0, 20));

    if (list.items.length > 20) {
      lines.push(`... and ${list.items.length - 20} more items`);
    }

    embed.description = this.truncate(lines.join("\n"), DISCORD_MAX_EMBED_DESCRIPTION);

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      embeds: [embed],
    };
  }

  protected async renderEmbed(embedContent: EmbedContent): Promise<RenderResult> {
    const embed: DiscordEmbed = {};

    // Author
    if (embedContent.author) {
      embed.author = {
        name: embedContent.author.name,
        url: embedContent.author.url,
        icon_url: embedContent.author.iconUrl,
      };
    }

    // Title
    if (embedContent.title) {
      embed.title = this.truncate(embedContent.title, DISCORD_MAX_EMBED_TITLE);
      if (embedContent.url) embed.url = embedContent.url;
    }

    // Description
    if (embedContent.description) {
      embed.description = this.truncate(embedContent.description, DISCORD_MAX_EMBED_DESCRIPTION);
    }

    // Color
    if (embedContent.color) {
      embed.color = this.parseColor(embedContent.color);
    }

    // Thumbnail
    if (embedContent.thumbnailUrl) {
      embed.thumbnail = { url: embedContent.thumbnailUrl };
    }

    // Fields
    if (embedContent.fields?.length) {
      embed.fields = embedContent.fields.slice(0, 25).map((field) => ({
        name: this.truncate(field.name, DISCORD_MAX_FIELD_NAME),
        value: this.truncate(field.value, DISCORD_MAX_FIELD_VALUE),
        inline: field.inline,
      }));
    }

    // Footer
    if (embedContent.footer) {
      embed.footer = {
        text: this.truncate(embedContent.footer.text, DISCORD_MAX_FOOTER),
        icon_url: embedContent.footer.iconUrl,
      };
    }

    // Timestamp
    if (embedContent.timestamp) {
      embed.timestamp = embedContent.timestamp.toISOString();
    }

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      embeds: [embed],
    };
  }

  protected async renderInteractive(interactive: InteractiveContent): Promise<RenderResult> {
    const components: DiscordComponent[] = [];
    let currentRow: DiscordComponent = { type: 1, components: [] };

    for (const element of interactive.elements) {
      switch (element.type) {
        case "button":
          if (currentRow.components!.length >= 5) {
            components.push(currentRow);
            currentRow = { type: 1, components: [] };
          }
          currentRow.components!.push({
            type: 2, // BUTTON
            style: this.getButtonStyle(element.style),
            label: element.label,
            custom_id: element.action,
          });
          break;

        case "select":
          if (currentRow.components!.length > 0) {
            components.push(currentRow);
            currentRow = { type: 1, components: [] };
          }
          components.push({
            type: 1,
            components: [
              {
                type: 3, // STRING_SELECT
                custom_id: "select",
                placeholder: element.placeholder,
                options: element.options.slice(0, 25).map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                })),
              },
            ],
          });
          break;
      }
    }

    if (currentRow.components!.length > 0) {
      components.push(currentRow);
    }

    return {
      content: "",
      format: "markdown",
      strategy: "embed",
      components: components.slice(0, 5), // Max 5 action rows
    };
  }

  protected escape(text: string): string {
    // Discord markdown escaping
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/~/g, "\\~")
      .replace(/`/g, "\\`")
      .replace(/\|/g, "\\|");
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }

  private parseColor(color: string): number {
    // Parse hex color to integer
    const hex = color.replace(/^#/, "");
    return parseInt(hex, 16) || 0;
  }

  private getButtonStyle(style?: string): number {
    switch (style) {
      case "primary":
        return 1;
      case "secondary":
        return 2;
      case "danger":
        return 4;
      case "link":
        return 5;
      default:
        return 2; // Secondary
    }
  }
}
