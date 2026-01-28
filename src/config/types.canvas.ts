/**
 * Canvas Configuration Types
 *
 * TypeBox schemas for cross-channel canvas configuration.
 */

import { Type, type Static } from "@sinclair/typebox";

// ============================================================================
// Render Strategy
// ============================================================================

export const ChannelRenderStrategySchema = Type.Union([
  Type.Literal("native_canvas"),
  Type.Literal("embed"),
  Type.Literal("blocks"),
  Type.Literal("markdown"),
  Type.Literal("html"),
  Type.Literal("text"),
  Type.Literal("link"),
  Type.Literal("pdf"),
  Type.Literal("image"),
]);

export type ChannelRenderStrategyConfig = Static<typeof ChannelRenderStrategySchema>;

// ============================================================================
// PDF Configuration
// ============================================================================

export const CanvasPdfConfigSchema = Type.Object({
  /** Enable PDF generation */
  enabled: Type.Optional(Type.Boolean()),
  /** Page size */
  pageSize: Type.Optional(Type.Union([
    Type.Literal("A4"),
    Type.Literal("letter"),
    Type.Literal("legal"),
  ])),
  /** Page margin in pixels */
  margin: Type.Optional(Type.Number()),
});

export type CanvasPdfConfig = Static<typeof CanvasPdfConfigSchema>;

// ============================================================================
// Image Configuration
// ============================================================================

export const CanvasImageConfigSchema = Type.Object({
  /** Enable image generation */
  enabled: Type.Optional(Type.Boolean()),
  /** Image format */
  format: Type.Optional(Type.Union([
    Type.Literal("png"),
    Type.Literal("jpeg"),
    Type.Literal("webp"),
  ])),
  /** Quality (0-100) for lossy formats */
  quality: Type.Optional(Type.Number()),
  /** Maximum width in pixels */
  maxWidth: Type.Optional(Type.Number()),
});

export type CanvasImageConfig = Static<typeof CanvasImageConfigSchema>;

// ============================================================================
// Chart Configuration
// ============================================================================

export const CanvasChartConfigSchema = Type.Object({
  /** Enable chart rendering */
  enabled: Type.Optional(Type.Boolean()),
  /** Default color palette */
  defaultColors: Type.Optional(Type.Array(Type.String())),
  /** Chart theme */
  theme: Type.Optional(Type.Union([
    Type.Literal("light"),
    Type.Literal("dark"),
  ])),
});

export type CanvasChartConfig = Static<typeof CanvasChartConfigSchema>;

// ============================================================================
// Main Canvas Configuration
// ============================================================================

export const CanvasConfigSchema = Type.Object({
  /** Enable canvas system */
  enabled: Type.Optional(Type.Boolean()),
  /** URL for hosted canvas pages */
  hostUrl: Type.Optional(Type.String()),
  /** Default render strategy per channel */
  fallbacks: Type.Optional(Type.Record(Type.String(), ChannelRenderStrategySchema)),
  /** PDF generation settings */
  pdf: Type.Optional(CanvasPdfConfigSchema),
  /** Image generation settings */
  image: Type.Optional(CanvasImageConfigSchema),
  /** Chart rendering settings */
  chart: Type.Optional(CanvasChartConfigSchema),
});

export type CanvasConfig = Static<typeof CanvasConfigSchema>;
