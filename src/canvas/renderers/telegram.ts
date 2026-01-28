/**
 * Telegram Renderer
 *
 * Renders canvas content to Telegram HTML with inline keyboards.
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
  TelegramInlineButton,
  TelegramInlineKeyboard,
} from "../types.js";
import { BaseRenderer } from "./base.js";

const TELEGRAM_MAX_MESSAGE = 4096;
const TELEGRAM_MAX_CAPTION = 1024;
const TELEGRAM_MAX_BUTTONS_PER_ROW = 8;
const TELEGRAM_MAX_BUTTON_ROWS = 100;

export class TelegramRenderer extends BaseRenderer {
  readonly channel = "telegram";
  readonly format = "html" as const;

  async render(content: CanvasContent): Promise<RenderResult> {
    const result = await this.dispatch(content);
    return {
      ...result,
      strategy: "markdown",
      fallbackText: this.createFallback(content),
    };
  }

  protected async renderCard(card: CardContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Title
    if (card.title) {
      if (card.url) {
        lines.push(`<b><a href="${this.escapeAttr(card.url)}">${this.escape(card.title)}</a></b>`);
      } else {
        lines.push(`<b>${this.escape(card.title)}</b>`);
      }
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
        lines.push(`<b>${this.escape(field.name)}:</b> ${this.escape(field.value)}`);
      }
      lines.push("");
    }

    // Footer
    if (card.footer || card.timestamp) {
      const footerParts: string[] = [];
      if (card.footer) footerParts.push(card.footer);
      if (card.timestamp) footerParts.push(card.timestamp.toLocaleString());
      lines.push(`<i>${footerParts.join(" • ")}</i>`);
    }

    // Buttons as inline keyboard
    let inlineKeyboard: TelegramInlineKeyboard | undefined;
    if (card.buttons?.length) {
      const rows: TelegramInlineButton[][] = [];
      let currentRow: TelegramInlineButton[] = [];

      for (const button of card.buttons) {
        const btn: TelegramInlineButton = {
          text: button.emoji ? `${button.emoji} ${button.label}` : button.label,
        };

        if (button.url) {
          btn.url = button.url;
        } else if (button.action) {
          btn.callback_data = button.action;
        }

        currentRow.push(btn);

        if (currentRow.length >= 3) {
          rows.push(currentRow);
          currentRow = [];
        }
      }

      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      inlineKeyboard = { inline_keyboard: rows.slice(0, TELEGRAM_MAX_BUTTON_ROWS) };
    }

    const content = this.truncate(lines.join("\n").trim(), TELEGRAM_MAX_MESSAGE);

    // If there's an image, it should be sent separately
    if (card.imageUrl) {
      return {
        content,
        format: "html",
        strategy: "markdown",
        inlineKeyboard,
        attachments: [
          {
            type: "image",
            filename: "image.jpg",
            url: card.imageUrl,
          },
        ],
      };
    }

    return {
      content,
      format: "html",
      strategy: "markdown",
      inlineKeyboard,
    };
  }

  protected async renderTable(table: TableContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Caption
    if (table.caption) {
      lines.push(`<b>${this.escape(table.caption)}</b>`);
      lines.push("");
    }

    // Render as fixed-width table
    const widths = table.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...table.rows.map((row) => (row[i] ?? "").length),
      );
      return Math.min(maxLen, 20);
    });

    // Header
    lines.push("<pre>");
    const headerRow = table.headers
      .map((h, i) => h.slice(0, widths[i]).padEnd(widths[i]))
      .join(" │ ");
    lines.push(headerRow);
    lines.push(widths.map((w) => "─".repeat(w)).join("─┼─"));

    // Rows (limit to fit message size)
    const maxRows = Math.floor((TELEGRAM_MAX_MESSAGE - lines.join("\n").length - 100) / 50);
    for (const row of table.rows.slice(0, Math.min(maxRows, 30))) {
      const rowStr = row
        .map((cell, i) => (cell ?? "").slice(0, widths[i]).padEnd(widths[i]))
        .join(" │ ");
      lines.push(rowStr);
    }

    lines.push("</pre>");

    if (table.rows.length > maxRows) {
      lines.push(`<i>... and ${table.rows.length - maxRows} more rows</i>`);
    }

    return {
      content: this.truncate(lines.join("\n"), TELEGRAM_MAX_MESSAGE),
      format: "html",
      strategy: "markdown",
    };
  }

  protected async renderCode(code: CodeContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Filename
    if (code.filename) {
      lines.push(`📄 <b>${this.escape(code.filename)}</b>`);
      lines.push("");
    }

    // Code block
    const lang = code.language ?? "";
    lines.push(`<pre><code class="language-${lang}">${this.escape(code.code)}</code></pre>`);

    const content = lines.join("\n");

    if (content.length <= TELEGRAM_MAX_MESSAGE) {
      return {
        content,
        format: "html",
        strategy: "markdown",
      };
    }

    // Code too long: truncate and offer file
    const truncated = code.code.slice(0, TELEGRAM_MAX_MESSAGE - 200);
    return {
      content: `📄 <b>${this.escape(code.filename ?? "Code")}</b>\n\n<pre><code>${this.escape(truncated)}\n...</code></pre>\n\n<i>Code truncated. Full file attached.</i>`,
      format: "html",
      strategy: "markdown",
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
    const lines: string[] = [];

    // Title
    if (chart.title) {
      lines.push(`<b>${this.escape(chart.title)}</b>`);
    }

    lines.push(`📊 <i>${chart.chartType} chart</i>`);
    lines.push("");

    // Data summary
    for (const dataset of chart.data.datasets.slice(0, 3)) {
      lines.push(`<b>${this.escape(dataset.label)}</b>`);
      const values = chart.data.labels
        .map((label, i) => `  • ${label}: ${dataset.data[i]}`)
        .slice(0, 6);
      lines.push(...values);
      if (chart.data.labels.length > 6) {
        lines.push(`  <i>... and ${chart.data.labels.length - 6} more</i>`);
      }
      lines.push("");
    }

    if (chart.data.datasets.length > 3) {
      lines.push(`<i>+ ${chart.data.datasets.length - 3} more datasets</i>`);
    }

    return {
      content: this.truncate(lines.join("\n"), TELEGRAM_MAX_MESSAGE),
      format: "html",
      strategy: "markdown",
    };
  }

  protected async renderList(list: ListContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Title
    if (list.title) {
      lines.push(`<b>${this.escape(list.title)}</b>`);
      lines.push("");
    }

    const renderItems = (items: typeof list.items, depth = 0): void => {
      const indent = "  ".repeat(depth);
      let num = 1;

      for (const item of items.slice(0, 25)) {
        const marker = list.ordered ? `${num++}.` : "•";
        let line = `${indent}${marker} `;

        if (item.icon) line += `${item.icon} `;
        if (item.url) {
          line += `<a href="${this.escapeAttr(item.url)}">${this.escape(item.text)}</a>`;
        } else {
          line += this.escape(item.text);
        }

        lines.push(line);

        if (item.description) {
          lines.push(`${indent}  <i>${this.escape(item.description)}</i>`);
        }

        if (item.children?.length && depth < 2) {
          renderItems(item.children, depth + 1);
        }
      }
    };

    renderItems(list.items);

    if (list.items.length > 25) {
      lines.push(`<i>... and ${list.items.length - 25} more items</i>`);
    }

    return {
      content: this.truncate(lines.join("\n"), TELEGRAM_MAX_MESSAGE),
      format: "html",
      strategy: "markdown",
    };
  }

  protected async renderEmbed(embed: EmbedContent): Promise<RenderResult> {
    const lines: string[] = [];

    // Author
    if (embed.author) {
      if (embed.author.url) {
        lines.push(`<i><a href="${this.escapeAttr(embed.author.url)}">${this.escape(embed.author.name)}</a></i>`);
      } else {
        lines.push(`<i>${this.escape(embed.author.name)}</i>`);
      }
      lines.push("");
    }

    // Title
    if (embed.title) {
      if (embed.url) {
        lines.push(`<b><a href="${this.escapeAttr(embed.url)}">${this.escape(embed.title)}</a></b>`);
      } else {
        lines.push(`<b>${this.escape(embed.title)}</b>`);
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
      for (const field of embed.fields.slice(0, 10)) {
        lines.push(`<b>${this.escape(field.name)}</b>`);
        lines.push(this.escape(field.value));
        lines.push("");
      }
    }

    // Footer
    if (embed.footer || embed.timestamp) {
      lines.push("───────────");
      const footerParts: string[] = [];
      if (embed.footer) footerParts.push(embed.footer.text);
      if (embed.timestamp) footerParts.push(embed.timestamp.toLocaleString());
      lines.push(`<i>${footerParts.join(" • ")}</i>`);
    }

    return {
      content: this.truncate(lines.join("\n").trim(), TELEGRAM_MAX_MESSAGE),
      format: "html",
      strategy: "markdown",
    };
  }

  protected async renderInteractive(interactive: InteractiveContent): Promise<RenderResult> {
    const lines: string[] = [];
    lines.push("<b>Interactive options:</b>");
    lines.push("");

    const rows: TelegramInlineButton[][] = [];
    let currentRow: TelegramInlineButton[] = [];

    for (const element of interactive.elements) {
      switch (element.type) {
        case "button":
          currentRow.push({
            text: element.label,
            callback_data: element.action,
          });

          if (currentRow.length >= 3) {
            rows.push(currentRow);
            currentRow = [];
          }
          break;

        case "select":
          // Render select options as buttons
          if (currentRow.length > 0) {
            rows.push(currentRow);
            currentRow = [];
          }

          lines.push(`<i>${element.placeholder ?? "Select an option"}:</i>`);

          for (const opt of element.options.slice(0, 10)) {
            rows.push([
              {
                text: opt.label,
                callback_data: opt.value,
              },
            ]);
          }
          break;

        case "input":
          lines.push(`📝 <i>${element.placeholder ?? "Enter text to respond"}</i>`);
          break;

        case "datepicker":
          lines.push(`📅 <i>${element.placeholder ?? "Reply with a date"}</i>`);
          break;
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return {
      content: lines.join("\n"),
      format: "html",
      strategy: "markdown",
      inlineKeyboard: rows.length > 0
        ? { inline_keyboard: rows.slice(0, TELEGRAM_MAX_BUTTON_ROWS) }
        : undefined,
    };
  }

  protected escape(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private escapeAttr(text: string): string {
    return this.escape(text).replace(/"/g, "&quot;");
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  }
}
