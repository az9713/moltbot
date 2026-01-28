/**
 * Base Renderer
 *
 * Abstract base class for channel-specific content renderers.
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

export abstract class BaseRenderer {
  abstract readonly channel: string;
  abstract readonly format: RenderResult["format"];

  /**
   * Render content to the channel's native format
   */
  abstract render(content: CanvasContent): Promise<RenderResult>;

  /**
   * Render a card to the channel format
   */
  protected abstract renderCard(card: CardContent): Promise<RenderResult>;

  /**
   * Render a table to the channel format
   */
  protected abstract renderTable(table: TableContent): Promise<RenderResult>;

  /**
   * Render code to the channel format
   */
  protected abstract renderCode(code: CodeContent): Promise<RenderResult>;

  /**
   * Render a chart to the channel format
   */
  protected abstract renderChart(chart: ChartContent): Promise<RenderResult>;

  /**
   * Render a list to the channel format
   */
  protected abstract renderList(list: ListContent): Promise<RenderResult>;

  /**
   * Render an embed to the channel format
   */
  protected abstract renderEmbed(embed: EmbedContent): Promise<RenderResult>;

  /**
   * Render interactive content to the channel format
   */
  protected abstract renderInteractive(interactive: InteractiveContent): Promise<RenderResult>;

  /**
   * Dispatch content to appropriate renderer
   */
  protected async dispatch(content: CanvasContent): Promise<RenderResult> {
    const data = content.data as Record<string, unknown>;
    const type = data.type ?? content.type;

    switch (type) {
      case "card":
        return this.renderCard(data as CardContent);
      case "table":
        return this.renderTable(data as TableContent);
      case "code":
        return this.renderCode(data as CodeContent);
      case "chart":
        return this.renderChart(data as ChartContent);
      case "list":
        return this.renderList(data as ListContent);
      case "embed":
        return this.renderEmbed(data as EmbedContent);
      case "interactive":
        return this.renderInteractive(data as InteractiveContent);
      case "text":
      default:
        return this.renderText(data);
    }
  }

  /**
   * Render plain text content
   */
  protected async renderText(data: Record<string, unknown>): Promise<RenderResult> {
    const text = String(data.text ?? data.content ?? "");
    return {
      content: text,
      format: "text",
      strategy: "text",
      fallbackText: text,
    };
  }

  /**
   * Create a fallback text representation
   */
  protected createFallback(content: CanvasContent): string {
    const parts: string[] = [];

    if (content.title) parts.push(content.title);
    if (content.description) parts.push(content.description);

    const data = content.data as Record<string, unknown>;
    if (typeof data.text === "string") parts.push(data.text);
    if (typeof data.content === "string") parts.push(data.content);

    return parts.join("\n\n") || `[${content.type} content]`;
  }

  /**
   * Escape special characters for the format
   */
  protected abstract escape(text: string): string;
}
