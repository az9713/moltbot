/**
 * Memory Configuration Types
 *
 * Configuration types for the unified memory system including
 * semantic, episodic, and knowledge graph memory.
 */

import { Type, type Static } from "@sinclair/typebox";

// ============================================================================
// Semantic Memory Config
// ============================================================================

export const SemanticMemoryConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean({ description: "Enable semantic memory" })),
    embedModel: Type.Optional(
      Type.Union(
        [
          Type.Literal("text-embedding-3-small"),
          Type.Literal("text-embedding-3-large"),
          Type.Literal("text-embedding-ada-002"),
          Type.Literal("voyage-large-2"),
          Type.Literal("voyage-code-2"),
          Type.Literal("cohere-embed-english-v3.0"),
          Type.Literal("local"),
        ],
        { description: "Embedding model to use" },
      ),
    ),
    embedEndpoint: Type.Optional(
      Type.String({ description: "Custom embedding endpoint for local models" }),
    ),
    chunkSize: Type.Optional(
      Type.Number({ description: "Chunk size for text splitting", minimum: 100, maximum: 8000 }),
    ),
    chunkOverlap: Type.Optional(
      Type.Number({ description: "Chunk overlap size", minimum: 0 }),
    ),
    backend: Type.Optional(
      Type.Union(
        [
          Type.Literal("local"),
          Type.Literal("lancedb"),
          Type.Literal("postgresql"),
          Type.Literal("sqlite"),
          Type.Literal("redis"),
        ],
        { description: "Storage backend" },
      ),
    ),
    connection: Type.Optional(
      Type.Object(
        {
          url: Type.Optional(Type.String({ description: "Connection URL" })),
          database: Type.Optional(Type.String({ description: "Database/collection name" })),
          apiKey: Type.Optional(Type.String({ description: "API key for authentication" })),
        },
        { description: "Backend connection options" },
      ),
    ),
    maxEntries: Type.Optional(
      Type.Number({ description: "Maximum memories to store", minimum: 1 }),
    ),
    dimension: Type.Optional(
      Type.Number({ description: "Embedding vector dimension", minimum: 1 }),
    ),
  },
  { additionalProperties: false },
);

export type SemanticMemoryConfig = Static<typeof SemanticMemoryConfigSchema>;

// ============================================================================
// Episodic Memory Config
// ============================================================================

export const EpisodicMemoryConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean({ description: "Enable episodic memory" })),
    summarizeAfter: Type.Optional(
      Type.Number({
        description: "Summarize after N messages",
        minimum: 5,
        maximum: 100,
      }),
    ),
    retentionDays: Type.Optional(
      Type.Number({
        description: "Retention period in days",
        minimum: 1,
      }),
    ),
    maxEpisodes: Type.Optional(
      Type.Number({
        description: "Maximum episodes to retain",
        minimum: 1,
      }),
    ),
    compress: Type.Optional(
      Type.Boolean({ description: "Enable compression of old episodes" }),
    ),
  },
  { additionalProperties: false },
);

export type EpisodicMemoryConfig = Static<typeof EpisodicMemoryConfigSchema>;

// ============================================================================
// Knowledge Graph Config
// ============================================================================

export const KnowledgeGraphConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean({ description: "Enable knowledge graph" })),
    extractEntities: Type.Optional(
      Type.Boolean({ description: "Extract entities from conversations" }),
    ),
    extractionModel: Type.Optional(
      Type.String({ description: "Model for entity extraction" }),
    ),
    backend: Type.Optional(
      Type.Union(
        [
          Type.Literal("local"),
          Type.Literal("neo4j"),
          Type.Literal("memgraph"),
          Type.Literal("dgraph"),
        ],
        { description: "Storage backend" },
      ),
    ),
    connection: Type.Optional(
      Type.Object(
        {
          url: Type.Optional(Type.String({ description: "Connection URL" })),
          database: Type.Optional(Type.String({ description: "Database name" })),
          username: Type.Optional(Type.String({ description: "Username" })),
          password: Type.Optional(Type.String({ description: "Password" })),
        },
        { description: "Backend connection options" },
      ),
    ),
    maxNodes: Type.Optional(
      Type.Number({ description: "Maximum nodes in graph", minimum: 1 }),
    ),
    maxEdgesPerNode: Type.Optional(
      Type.Number({ description: "Maximum edges per node", minimum: 1 }),
    ),
  },
  { additionalProperties: false },
);

export type KnowledgeGraphConfig = Static<typeof KnowledgeGraphConfigSchema>;

// ============================================================================
// External Source Config
// ============================================================================

export const ExternalSourceConfigSchema = Type.Object(
  {
    type: Type.Union(
      [
        Type.Literal("notion"),
        Type.Literal("obsidian"),
        Type.Literal("roam"),
        Type.Literal("logseq"),
        Type.Literal("confluence"),
        Type.Literal("github"),
        Type.Literal("google_drive"),
        Type.Literal("dropbox"),
        Type.Literal("s3"),
        Type.Literal("custom"),
      ],
      { description: "Source type" },
    ),
    id: Type.Optional(Type.String({ description: "Source identifier" })),
    name: Type.Optional(Type.String({ description: "Display name" })),
    enabled: Type.Optional(Type.Boolean({ description: "Enable this source" })),
    config: Type.Optional(
      Type.Object(
        {
          token: Type.Optional(Type.String({ description: "API token/key" })),
          path: Type.Optional(Type.String({ description: "Vault/workspace path" })),
          syncInterval: Type.Optional(
            Type.Number({ description: "Sync interval in seconds", minimum: 60 }),
          ),
          include: Type.Optional(
            Type.Array(Type.String(), { description: "Include patterns (glob)" }),
          ),
          exclude: Type.Optional(
            Type.Array(Type.String(), { description: "Exclude patterns (glob)" }),
          ),
          maxFiles: Type.Optional(
            Type.Number({ description: "Maximum files to sync", minimum: 1 }),
          ),
        },
        { description: "Source-specific configuration" },
      ),
    ),
  },
  { additionalProperties: false },
);

export type ExternalSourceConfig = Static<typeof ExternalSourceConfigSchema>;

// ============================================================================
// Full Memory Config
// ============================================================================

export const MemoryConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean({ description: "Enable memory system" })),
    semantic: Type.Optional(SemanticMemoryConfigSchema),
    episodic: Type.Optional(EpisodicMemoryConfigSchema),
    knowledgeGraph: Type.Optional(KnowledgeGraphConfigSchema),
    external: Type.Optional(
      Type.Array(ExternalSourceConfigSchema, { description: "External sources" }),
    ),
    settings: Type.Optional(
      Type.Object(
        {
          autoSave: Type.Optional(
            Type.Boolean({ description: "Auto-save memories from conversations" }),
          ),
          importanceThreshold: Type.Optional(
            Type.Number({
              description: "Memory importance threshold for auto-save",
              minimum: 0,
              maximum: 1,
            }),
          ),
          consolidate: Type.Optional(
            Type.Boolean({ description: "Consolidate memories periodically" }),
          ),
          consolidateInterval: Type.Optional(
            Type.Number({ description: "Consolidation interval in hours", minimum: 1 }),
          ),
        },
        { description: "Global memory settings" },
      ),
    ),
  },
  {
    additionalProperties: false,
    description: "Memory system configuration",
  },
);

export type MemoryConfigType = Static<typeof MemoryConfigSchema>;
