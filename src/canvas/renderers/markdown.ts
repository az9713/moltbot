/**
 * Markdown Renderer
 *
 * Renders canvas content to GitHub-flavored Markdown.
 * Used for CLI, iMessage, Signal, and as base for HTML/Telegram.
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
  TableContent,
} from "../types.js";
import { BaseRenderer } from "./base.js";

export class MarkdownRenderer extends BaseRenderer {
  readonly channel = "markdown";
  readonly format = "markdown" as const;

  async render(content: CanvasContent): Promise<RenderResult> {
    const result = await this.dispatch(content);
    return {
      ...result,
      format: "markdown",
      strategy: "markdown",
      fallbackText: this.createFallback(content),
    };
  }

  protected async renderCard(card: CardContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Title
    if (card.title) {
      lines.push(`## ${this.escape(card.title)}`);
      lines.push("");
    }

    // Image
    if (card.imageUrl) {
      lines.push(`![${this.escape(card.title ?? "Image")}](${card.imageUrl})`);
      lines.push("");
    }

    // Description
    if (card.description) {
      lines.push(this.escape(card.description));
      lines.push("");
    }

    // Fields
    if (card.fields?.length) {
      for (const field of card.fields) {
        lines.push(`**${this.escape(field.name)}:** ${this.escape(field.value)}`);
      }
      lines.push("");
    }

    // Buttons as links
    if (card.buttons?.length) {
      const buttonLinks = card.buttons
        .filter((b) => b.url)
        .map((b) => `[${b.emoji ?? ""}${this.escape(b.label)}](${b.url})`)
        .join(" | ");
      if (buttonLinks) {
        lines.push(buttonLinks);
        lines.push("");
      }
    }

    // Footer
    if (card.footer || card.timestamp) {
      const footerParts: string[] = [];
      if (card.footer) footerParts.push(card.footer);
      if (card.timestamp) footerParts.push(card.timestamp.toISOString());
      lines.push(`*${footerParts.join(" • ")}*`);
    }

    return {
      content: lines.join("\n").trim(),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderTable(table: TableContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Caption
    if (table.caption) {
      lines.push(`### ${this.escape(table.caption)}`);
      lines.push("");
    }

    // Header row
    const headerRow = table.headers.map((h) => this.escape(h)).join(" | ");
    lines.push(`| ${headerRow} |`);

    // Separator with alignment
    const separators = table.headers.map((_, i) => {
      const align = table.alignment?.[i] ?? "left";
      switch (align) {
        case "center":
          return ":---:";
        case "right":
          return "---:";
        default:
          return "---";
      }
    });
    lines.push(`| ${separators.join(" | ")} |`);

    // Data rows
    for (const row of table.rows) {
      const cells = row.map((cell) => this.escape(cell)).join(" | ");
      lines.push(`| ${cells} |`);
    }

    return {
      content: lines.join("\n"),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderCode(code: CodeContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Filename as header
    if (code.filename) {
      lines.push(`**${this.escape(code.filename)}**`);
      lines.push("");
    }

    // Fenced code block
    const lang = code.language ?? "";
    lines.push(`\`\`\`${lang}`);
    lines.push(code.code);
    lines.push("```");

    return {
      content: lines.join("\n"),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderChart(chart: ChartContent): Promise<RenderResult> {
    // Charts can't be rendered as pure markdown
    // Provide a text representation of the data
    const lines: string[] = [];

    if (chart.title) {
      lines.push(`### ${this.escape(chart.title)}`);
      lines.push("");
    }

    lines.push(`*Chart type: ${chart.chartType}*`);
    lines.push("");

    // Render as table
    const headers = ["Label", ...chart.data.datasets.map((ds) => ds.label)];
    lines.push(`| ${headers.join(" | ")} |`);
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

    for (let i = 0; i < chart.data.labels.length; i++) {
      const row = [
        chart.data.labels[i],
        ...chart.data.datasets.map((ds) => String(ds.data[i] ?? "")),
      ];
      lines.push(`| ${row.join(" | ")} |`);
    }

    return {
      content: lines.join("\n"),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderList(list: ListContent): Promise<RenderResult> {
    const lines: string[] = [];

    if (list.title) {
      lines.push(`### ${this.escape(list.title)}`);
      lines.push("");
    }

    const renderItems = (items: typeof list.items, depth = 0): void => {
      const indent = "  ".repeat(depth);
      const marker = list.ordered ? "1." : "-";

      for (const item of items) {
        let line = `${indent}${marker} `;

        if (item.icon) line += `${item.icon} `;
        if (item.url) {
          line += `[${this.escape(item.text)}](${item.url})`;
        } else {
          line += this.escape(item.text);
        }

        lines.push(line);

        if (item.description) {
          lines.push(`${indent}  *${this.escape(item.description)}*`);
        }

        if (item.children?.length) {
          renderItems(item.children, depth + 1);
        }
      }
    };

    renderItems(list.items);

    return {
      content: lines.join("\n"),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderEmbed(embed: EmbedContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Author
    if (embed.author) {
      if (embed.author.url) {
        lines.push(`*[${this.escape(embed.author.name)}](${embed.author.url})*`);
      } else {
        lines.push(`*${this.escape(embed.author.name)}*`);
      }
      lines.push("");
    }

    // Title
    if (embed.title) {
      if (embed.url) {
        lines.push(`## [${this.escape(embed.title)}](${embed.url})`);
      } else {
        lines.push(`## ${this.escape(embed.title)}`);
      }
      lines.push("");
    }

    // Description
    if (embed.description) {
      lines.push(this.escape(embed.description));
      lines.push("");
    }

    // Fields
    if (embed.fields?.length) {
      for (const field of embed.fields) {
        lines.push(`**${this.escape(field.name)}**`);
        lines.push(this.escape(field.value));
        lines.push("");
      }
    }

    // Thumbnail
    if (embed.thumbnailUrl) {
      lines.push(`![Thumbnail](${embed.thumbnailUrl})`);
      lines.push("");
    }

    // Footer
    if (embed.footer || embed.timestamp) {
      const footerParts: string[] = [];
      if (embed.footer) footerParts.push(embed.footer.text);
      if (embed.timestamp) footerParts.push(embed.timestamp.toISOString());
      lines.push(`---`);
      lines.push(`*${footerParts.join(" • ")}*`);
    }

    return {
      content: lines.join("\n").trim(),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected async renderInteractive(interactive: InteractiveContent): Promise<RenderResult> {
    // Interactive elements can't be rendered in markdown
    // Show as a description of the available actions
    const lines: string[] = [];
    lines.push("*Interactive elements:*");
    lines.push("");

    for (const element of interactive.elements) {
      switch (element.type) {
        case "button":
          lines.push(`- [${element.label}] (${element.action})`);
          break;
        case "select":
          lines.push(`- Select: ${element.placeholder ?? "Choose an option"}`);
          for (const opt of element.options) {
            lines.push(`  - ${opt.label}`);
          }
          break;
        case "input":
          lines.push(`- Input: ${element.placeholder ?? "Enter text"}`);
          break;
        case "datepicker":
          lines.push(`- Date picker: ${element.placeholder ?? "Select a date"}`);
          break;
      }
    }

    return {
      content: lines.join("\n"),
      format: "markdown",
      strategy: "markdown",
    };
  }

  protected escape(text: string): string {
    // Escape markdown special characters but preserve formatting
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|");
  }
}
