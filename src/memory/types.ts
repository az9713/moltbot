/**
 * Agent Memory & Knowledge Graph Types
 *
 * Types for persistent, searchable memory with semantic understanding
 * and knowledge graph capabilities.
 */

// ============================================================================
// Storage Backends
// ============================================================================

export type MemoryStorageBackend =
  | "local"
  | "lancedb"
  | "postgresql"
  | "sqlite"
  | "redis";

export type KnowledgeGraphBackend = "local" | "neo4j" | "memgraph" | "dgraph";

// ============================================================================
// Semantic Memory (Vector Embeddings)
// ============================================================================

export type EmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-embedding-ada-002"
  | "voyage-large-2"
  | "voyage-code-2"
  | "cohere-embed-english-v3.0"
  | "local";

export type SemanticMemoryConfig = {
  /** Enable semantic memory */
  enabled?: boolean;
  /** Embedding model to use */
  embedModel?: EmbeddingModel;
  /** Custom embedding endpoint (for local models) */
  embedEndpoint?: string;
  /** Chunk size for text splitting */
  chunkSize?: number;
  /** Chunk overlap */
  chunkOverlap?: number;
  /** Storage backend */
  backend?: MemoryStorageBackend;
  /** Backend-specific connection options */
  connection?: {
    /** Connection URL */
    url?: string;
    /** Database/collection name */
    database?: string;
    /** Authentication */
    apiKey?: string;
  };
  /** Maximum memories to store */
  maxEntries?: number;
  /** Dimension of embedding vectors */
  dimension?: number;
};

export type MemoryChunk = {
  /** Unique chunk ID */
  id: string;
  /** Source memory ID */
  memoryId: string;
  /** Chunk text content */
  content: string;
  /** Chunk index within memory */
  index: number;
  /** Embedding vector */
  embedding?: number[];
  /** Metadata */
  metadata?: Record<string, unknown>;
};

export type SemanticMemory = {
  /** Unique memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Source type */
  source: "conversation" | "document" | "web" | "manual" | "external";
  /** Source reference (URL, file path, etc.) */
  sourceRef?: string;
  /** When memory was created */
  createdAt: Date;
  /** When memory was last accessed */
  accessedAt?: Date;
  /** Access count for relevance scoring */
  accessCount?: number;
  /** Associated agent ID */
  agentId?: string;
  /** Associated session/channel */
  sessionId?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Importance score (0-1) */
  importance?: number;
  /** Chunks for this memory */
  chunks?: MemoryChunk[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

export type SemanticSearchOptions = {
  /** Query text */
  query: string;
  /** Maximum results */
  limit?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Filter by source type */
  source?: SemanticMemory["source"] | SemanticMemory["source"][];
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by tags */
  tags?: string[];
  /** Include embeddings in results */
  includeEmbeddings?: boolean;
};

export type SemanticSearchResult = {
  memory: SemanticMemory;
  score: number;
  matchedChunk?: MemoryChunk;
};

// ============================================================================
// Episodic Memory (Conversation History)
// ============================================================================

export type EpisodicMemoryConfig = {
  /** Enable episodic memory */
  enabled?: boolean;
  /** Summarize after N messages */
  summarizeAfter?: number;
  /** Retention period in days */
  retentionDays?: number;
  /** Storage backend */
  backend?: MemoryStorageBackend;
  /** Maximum episodes to retain */
  maxEpisodes?: number;
  /** Enable compression of old episodes */
  compress?: boolean;
};

export type ConversationMessage = {
  /** Message ID */
  id: string;
  /** Role (user, assistant, system) */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Tool calls if applicable */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  /** Tool result if applicable */
  toolResult?: {
    callId: string;
    result: string;
  };
  /** Timestamp */
  timestamp: Date;
  /** Token count */
  tokenCount?: number;
};

export type Episode = {
  /** Unique episode ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Session/channel ID */
  sessionId: string;
  /** Channel type */
  channel?: string;
  /** Episode title/summary */
  title?: string;
  /** Conversation messages */
  messages: ConversationMessage[];
  /** Episode summary (generated) */
  summary?: string;
  /** Key topics discussed */
  topics?: string[];
  /** Entities mentioned */
  entities?: string[];
  /** When episode started */
  startedAt: Date;
  /** When episode ended */
  endedAt?: Date;
  /** Total tokens used */
  totalTokens?: number;
  /** Is episode compressed */
  compressed?: boolean;
  /** Metadata */
  metadata?: Record<string, unknown>;
};

export type EpisodeSearchOptions = {
  /** Agent ID filter */
  agentId?: string;
  /** Session ID filter */
  sessionId?: string;
  /** Channel filter */
  channel?: string;
  /** Date range start */
  after?: Date;
  /** Date range end */
  before?: Date;
  /** Topic filter */
  topics?: string[];
  /** Entity filter */
  entities?: string[];
  /** Maximum results */
  limit?: number;
  /** Include messages */
  includeMessages?: boolean;
};

// ============================================================================
// Knowledge Graph (Entity Relationships)
// ============================================================================

export type KnowledgeGraphConfig = {
  /** Enable knowledge graph */
  enabled?: boolean;
  /** Extract entities from conversations */
  extractEntities?: boolean;
  /** Entity extraction model */
  extractionModel?: string;
  /** Storage backend */
  backend?: KnowledgeGraphBackend;
  /** Backend connection */
  connection?: {
    url?: string;
    database?: string;
    username?: string;
    password?: string;
  };
  /** Maximum nodes */
  maxNodes?: number;
  /** Maximum edges per node */
  maxEdgesPerNode?: number;
};

export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "project"
  | "concept"
  | "event"
  | "document"
  | "tool"
  | "custom";

export type Entity = {
  /** Unique entity ID */
  id: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: EntityType;
  /** Aliases/alternate names */
  aliases?: string[];
  /** Entity description */
  description?: string;
  /** Properties */
  properties?: Record<string, unknown>;
  /** When first seen */
  createdAt: Date;
  /** When last referenced */
  updatedAt?: Date;
  /** Reference count */
  referenceCount?: number;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Source memories */
  sourceMemoryIds?: string[];
};

export type RelationType =
  | "knows"
  | "works_at"
  | "works_with"
  | "located_in"
  | "part_of"
  | "related_to"
  | "created"
  | "mentioned_in"
  | "depends_on"
  | "custom";

export type Relationship = {
  /** Unique relationship ID */
  id: string;
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Relationship type */
  type: RelationType;
  /** Custom relationship label */
  label?: string;
  /** Relationship properties */
  properties?: Record<string, unknown>;
  /** When relationship was established */
  createdAt: Date;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Bidirectional relationship */
  bidirectional?: boolean;
};

export type GraphQuery = {
  /** Starting entity ID or name */
  start?: string;
  /** Entity type filter */
  entityType?: EntityType | EntityType[];
  /** Relationship type filter */
  relationshipType?: RelationType | RelationType[];
  /** Maximum depth for traversal */
  maxDepth?: number;
  /** Maximum results */
  limit?: number;
  /** Include relationship details */
  includeRelationships?: boolean;
};

export type GraphQueryResult = {
  entities: Entity[];
  relationships: Relationship[];
};

// ============================================================================
// External Memory Sources
// ============================================================================

export type ExternalSourceType =
  | "notion"
  | "obsidian"
  | "roam"
  | "logseq"
  | "confluence"
  | "github"
  | "google_drive"
  | "dropbox"
  | "s3"
  | "custom";

export type ExternalSourceConfig = {
  /** Source type */
  type: ExternalSourceType;
  /** Source identifier */
  id?: string;
  /** Display name */
  name?: string;
  /** Enable this source */
  enabled?: boolean;
  /** Source-specific configuration */
  config?: {
    /** API token/key */
    token?: string;
    /** Vault/workspace path */
    path?: string;
    /** Sync interval in seconds */
    syncInterval?: number;
    /** Include patterns (glob) */
    include?: string[];
    /** Exclude patterns (glob) */
    exclude?: string[];
    /** Maximum files to sync */
    maxFiles?: number;
  };
};

export type ExternalDocument = {
  /** Document ID */
  id: string;
  /** Source type */
  source: ExternalSourceType;
  /** Source-specific document ID */
  sourceId: string;
  /** Document title */
  title: string;
  /** Document content */
  content: string;
  /** Document URL */
  url?: string;
  /** File path if applicable */
  path?: string;
  /** Last modified */
  modifiedAt?: Date;
  /** Last synced */
  syncedAt?: Date;
  /** Metadata */
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Memory Configuration
// ============================================================================

export type MemoryConfig = {
  /** Enable memory system */
  enabled?: boolean;
  /** Semantic memory configuration */
  semantic?: SemanticMemoryConfig;
  /** Episodic memory configuration */
  episodic?: EpisodicMemoryConfig;
  /** Knowledge graph configuration */
  knowledgeGraph?: KnowledgeGraphConfig;
  /** External sources */
  external?: ExternalSourceConfig[];
  /** Global settings */
  settings?: {
    /** Auto-save memories from conversations */
    autoSave?: boolean;
    /** Memory importance threshold for auto-save */
    importanceThreshold?: number;
    /** Consolidate memories periodically */
    consolidate?: boolean;
    /** Consolidation interval in hours */
    consolidateInterval?: number;
  };
};

// ============================================================================
// Memory Events
// ============================================================================

export type MemoryEvents = {
  "memory:created": { memory: SemanticMemory };
  "memory:updated": { memory: SemanticMemory };
  "memory:deleted": { memoryId: string };
  "memory:searched": { query: string; resultCount: number };
  "episode:started": { episode: Episode };
  "episode:ended": { episode: Episode };
  "episode:summarized": { episodeId: string; summary: string };
  "entity:created": { entity: Entity };
  "entity:updated": { entity: Entity };
  "relationship:created": { relationship: Relationship };
  "external:synced": { source: ExternalSourceType; documentCount: number };
  "external:error": { source: ExternalSourceType; error: string };
};
