/**
 * Cross-Channel Rich Content (Canvas) System
 *
 * Provides rich interactive content rendering across all messaging platforms
 * with intelligent fallbacks based on channel capabilities.
 *
 * Features:
 * - Native canvas rendering for macOS/iOS/Android/Web
 * - Discord embeds with components
 * - Slack Block Kit
 * - Telegram HTML with inline keyboards
 * - Markdown fallback for basic channels
 * - Link/PDF/Image fallbacks for limited channels
 *
 * @example
 * ```typescript
 * import { CanvasManager } from './canvas';
 *
 * const canvas = new CanvasManager({
 *   config: {
 *     hostUrl: 'https://canvas.molt.bot',
 *     fallbacks: {
 *       whatsapp: 'pdf',
 *       signal: 'link',
 *     },
 *   },
 * });
 *
 * // Create rich content
 * const content = canvas.createContent({
 *   type: 'card',
 *   title: 'Project Update',
 *   description: 'Weekly status report',
 *   data: {
 *     type: 'card',
 *     title: 'Project Update',
 *     description: 'All tasks completed on schedule',
 *     fields: [
 *       { name: 'Status', value: 'On Track', inline: true },
 *       { name: 'Progress', value: '85%', inline: true },
 *     ],
 *     buttons: [
 *       { label: 'View Details', url: 'https://project.example.com' },
 *     ],
 *   },
 * });
 *
 * // Render for Discord (uses embeds)
 * const discordResult = await canvas.render(content, 'discord');
 * // -> { embeds: [...], components: [...] }
 *
 * // Render for Slack (uses Block Kit)
 * const slackResult = await canvas.render(content, 'slack');
 * // -> { blocks: [...] }
 *
 * // Render for Telegram (uses HTML + inline keyboard)
 * const telegramResult = await canvas.render(content, 'telegram');
 * // -> { content: '<b>...</b>', inlineKeyboard: {...} }
 *
 * // Render for Signal (falls back to link)
 * const signalResult = await canvas.render(content, 'signal');
 * // -> { content: 'View: https://canvas.molt.bot/abc', hostedUrl: '...' }
 * ```
 */

export { CanvasManager, type CanvasManagerOptions } from "./canvas-manager.js";

export {
  CHANNEL_CAPABILITIES,
  getChannelCapabilities,
  channelSupports,
  getPreferredStrategy,
  getChannelsWithCapability,
  getFallbackChain,
} from "./capabilities.js";

export {
  BaseRenderer,
  MarkdownRenderer,
  DiscordRenderer,
  SlackRenderer,
  TelegramRenderer,
} from "./renderers/index.js";

export type {
  // Content types
  CanvasContentType,
  CanvasContent,
  CardContent,
  CardButton,
  TableContent,
  CodeContent,
  ChartType,
  ChartContent,
  ListContent,
  ListItem,
  EmbedContent,
  InteractiveContent,
  InteractiveElement,
  // Channel types
  ChannelCapability,
  ChannelRenderStrategy,
  ChannelCapabilities,
  // Render result
  RenderResult,
  RenderAttachment,
  // Platform-specific
  DiscordEmbed,
  DiscordComponent,
  SlackBlock,
  SlackSectionBlock,
  SlackDividerBlock,
  SlackImageBlock,
  SlackActionsBlock,
  SlackContextBlock,
  SlackHeaderBlock,
  SlackElement,
  TelegramInlineKeyboard,
  TelegramInlineButton,
  // Configuration
  CanvasConfig,
  // Events
  CanvasEvents,
} from "./types.js";
