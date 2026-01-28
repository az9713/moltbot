export type { MemoryIndexManager, MemorySearchResult } from "./manager.js";
export { getMemorySearchManager, type MemorySearchManagerResult } from "./search-manager.js";

// Episodic Memory
export { EpisodicMemory, type EpisodicMemoryOptions } from "./episodic.js";

// Knowledge Graph
export {
  KnowledgeGraph,
  type KnowledgeGraphOptions,
  type EntityExtractionResult,
} from "./knowledge-graph.js";

// External Sources
export { ExternalSources, type ExternalSourcesOptions } from "./external-sources.js";

// Unified Memory System
export {
  MemorySystem,
  type MemorySystemOptions,
  type MemorySearchResult as UnifiedSearchResult,
} from "./memory-system.js";

// Types
export type {
  // Storage backends
  MemoryStorageBackend,
  KnowledgeGraphBackend,
  // Semantic memory
  EmbeddingModel,
  SemanticMemoryConfig,
  MemoryChunk,
  SemanticMemory,
  SemanticSearchOptions,
  SemanticSearchResult,
  // Episodic memory
  EpisodicMemoryConfig,
  ConversationMessage,
  Episode,
  EpisodeSearchOptions,
  // Knowledge graph
  KnowledgeGraphConfig,
  EntityType,
  Entity,
  RelationType,
  Relationship,
  GraphQuery,
  GraphQueryResult,
  // External sources
  ExternalSourceType,
  ExternalSourceConfig,
  ExternalDocument,
  // Configuration
  MemoryConfig,
  // Events
  MemoryEvents,
} from "./types.js";
