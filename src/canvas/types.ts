/**
 * Cross-Channel Rich Content (Canvas) Types
 *
 * Types for rendering rich interactive content across all messaging platforms
 * with graceful fallbacks based on channel capabilities.
 */

// ============================================================================
// Content Types
// ============================================================================

export type CanvasContentType =
  | "text"
  | "image"
  | "card"
  | "table"
  | "code"
  | "chart"
  | "form"
  | "list"
  | "embed"
  | "interactive";

export type CanvasContent = {
  /** Content ID */
  id: string;
  /** Content type */
  type: CanvasContentType;
  /** Raw data */
  data: unknown;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Priority for rendering (higher = more important) */
  priority?: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Card Content
// ============================================================================

export type CardContent = {
  type: "card";
  title: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  timestamp?: Date;
  color?: string;
  buttons?: Array<CardButton>;
  url?: string;
};

export type CardButton = {
  label: string;
  url?: string;
  action?: string;
  style?: "primary" | "secondary" | "danger" | "link";
  emoji?: string;
};

// ============================================================================
// Table Content
// ============================================================================

export type TableContent = {
  type: "table";
  headers: string[];
  rows: string[][];
  caption?: string;
  alignment?: Array<"left" | "center" | "right">;
};

// ============================================================================
// Code Content
// ============================================================================

export type CodeContent = {
  type: "code";
  code: string;
  language?: string;
  filename?: string;
  lineNumbers?: boolean;
  highlightLines?: number[];
};

// ============================================================================
// Chart Content
// ============================================================================

export type ChartType = "bar" | "line" | "pie" | "scatter" | "area";

export type ChartContent = {
  type: "chart";
  chartType: ChartType;
  title?: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  };
  options?: Record<string, unknown>;
};

// ============================================================================
// List Content
// ============================================================================

export type ListContent = {
  type: "list";
  items: Array<ListItem>;
  ordered?: boolean;
  title?: string;
};

export type ListItem = {
  text: string;
  description?: string;
  icon?: string;
  url?: string;
  children?: ListItem[];
};

// ============================================================================
// Embed Content
// ============================================================================

export type EmbedContent = {
  type: "embed";
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  provider?: string;
  author?: { name: string; url?: string; iconUrl?: string };
  footer?: { text: string; iconUrl?: string };
  color?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: Date;
};

// ============================================================================
// Interactive Content
// ============================================================================

export type InteractiveContent = {
  type: "interactive";
  elements: InteractiveElement[];
  callbackUrl?: string;
};

export type InteractiveElement =
  | { type: "button"; label: string; action: string; style?: string }
  | { type: "select"; options: Array<{ label: string; value: string }>; placeholder?: string }
  | { type: "input"; placeholder?: string; multiline?: boolean }
  | { type: "datepicker"; placeholder?: string };

// ============================================================================
// Channel Capabilities
// ============================================================================

export type ChannelCapability =
  | "markdown"
  | "html"
  | "embeds"
  | "blocks"
  | "buttons"
  | "images"
  | "files"
  | "reactions"
  | "threads"
  | "canvas";

export type ChannelRenderStrategy =
  | "native_canvas"
  | "embed"
  | "blocks"
  | "markdown"
  | "html"
  | "text"
  | "link"
  | "pdf"
  | "image";

export type ChannelCapabilities = {
  /** Channel identifier */
  channel: string;
  /** Supported capabilities */
  capabilities: ChannelCapability[];
  /** Preferred render strategy */
  preferredStrategy: ChannelRenderStrategy;
  /** Maximum message length */
  maxLength?: number;
  /** Maximum embeds per message */
  maxEmbeds?: number;
  /** Maximum buttons per message */
  maxButtons?: number;
  /** Supports file attachments */
  supportsFiles?: boolean;
  /** Supports inline keyboards */
  supportsInlineKeyboards?: boolean;
};

// ============================================================================
// Render Result
// ============================================================================

export type RenderResult = {
  /** Rendered content */
  content: string;
  /** Format of the rendered content */
  format: "text" | "markdown" | "html" | "mrkdwn" | "json";
  /** Strategy used for rendering */
  strategy: ChannelRenderStrategy;
  /** Attachments to send with message */
  attachments?: RenderAttachment[];
  /** Embeds (for Discord) */
  embeds?: DiscordEmbed[];
  /** Blocks (for Slack) */
  blocks?: SlackBlock[];
  /** Inline keyboard (for Telegram) */
  inlineKeyboard?: TelegramInlineKeyboard;
  /** Components (for Discord) */
  components?: DiscordComponent[];
  /** Link to hosted canvas page */
  hostedUrl?: string;
  /** Fallback text for unsupported clients */
  fallbackText?: string;
};

export type RenderAttachment = {
  type: "file" | "image" | "pdf";
  filename: string;
  url?: string;
  data?: Buffer;
  mimeType?: string;
};

// ============================================================================
// Discord-Specific Types
// ============================================================================

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

export type DiscordComponent = {
  type: number;
  components?: DiscordComponent[];
  style?: number;
  label?: string;
  emoji?: { name: string };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
  options?: Array<{ label: string; value: string; description?: string }>;
  placeholder?: string;
};

// ============================================================================
// Slack-Specific Types
// ============================================================================

export type SlackBlock =
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackImageBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackHeaderBlock;

export type SlackSectionBlock = {
  type: "section";
  text?: { type: "mrkdwn" | "plain_text"; text: string };
  fields?: Array<{ type: "mrkdwn" | "plain_text"; text: string }>;
  accessory?: SlackElement;
};

export type SlackDividerBlock = {
  type: "divider";
};

export type SlackImageBlock = {
  type: "image";
  image_url: string;
  alt_text: string;
  title?: { type: "plain_text"; text: string };
};

export type SlackActionsBlock = {
  type: "actions";
  elements: SlackElement[];
};

export type SlackContextBlock = {
  type: "context";
  elements: Array<{ type: "mrkdwn" | "plain_text" | "image"; text?: string; image_url?: string; alt_text?: string }>;
};

export type SlackHeaderBlock = {
  type: "header";
  text: { type: "plain_text"; text: string };
};

export type SlackElement = {
  type: "button" | "static_select" | "datepicker" | "overflow";
  text?: { type: "plain_text"; text: string };
  action_id?: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
  options?: Array<{ text: { type: "plain_text"; text: string }; value: string }>;
  placeholder?: { type: "plain_text"; text: string };
};

// ============================================================================
// Telegram-Specific Types
// ============================================================================

export type TelegramInlineKeyboard = {
  inline_keyboard: TelegramInlineButton[][];
};

export type TelegramInlineButton = {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  switch_inline_query?: string;
};

// ============================================================================
// Canvas Configuration
// ============================================================================

export type CanvasConfig = {
  /** Enable canvas system */
  enabled?: boolean;
  /** URL for hosted canvas pages */
  hostUrl?: string;
  /** Default render strategy per channel */
  fallbacks?: Record<string, ChannelRenderStrategy>;
  /** PDF generation settings */
  pdf?: {
    enabled?: boolean;
    pageSize?: "A4" | "letter" | "legal";
    margin?: number;
  };
  /** Image generation settings */
  image?: {
    enabled?: boolean;
    format?: "png" | "jpeg" | "webp";
    quality?: number;
    maxWidth?: number;
  };
  /** Chart rendering settings */
  chart?: {
    enabled?: boolean;
    defaultColors?: string[];
    theme?: "light" | "dark";
  };
};

// ============================================================================
// Events
// ============================================================================

export type CanvasEvents = {
  "content:created": { content: CanvasContent };
  "content:rendered": { contentId: string; channel: string; strategy: ChannelRenderStrategy };
  "content:hosted": { contentId: string; url: string };
  "content:error": { contentId: string; error: string };
};
