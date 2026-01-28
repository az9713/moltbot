/**
 * Unified Memory System
 *
 * Coordinates semantic memory, episodic memory, knowledge graph,
 * and external sources into a cohesive memory system.
 */

import { EventEmitter } from "node:events";
import * as path from "node:path";

import type {
  MemoryConfig,
  SemanticMemory,
  SemanticSearchOptions,
  SemanticSearchResult,
  Episode,
  EpisodeSearchOptions,
  ConversationMessage,
  Entity,
  EntityType,
  Relationship,
  GraphQuery,
  GraphQueryResult,
  ExternalDocument,
  MemoryEvents,
} from "./types.js";
import { EpisodicMemory } from "./episodic.js";
import { KnowledgeGraph, type EntityExtractionResult } from "./knowledge-graph.js";
import { ExternalSources } from "./external-sources.js";

export type MemorySystemOptions = {
  config: MemoryConfig;
  basePath: string;
  agentId: string;
  /** Function to generate embeddings for semantic search */
  embedText?: (text: string) => Promise<number[]>;
  /** Function to summarize conversations */
  summarizer?: (messages: ConversationMessage[]) => Promise<string>;
  /** Function to extract topics from conversations */
  topicExtractor?: (messages: ConversationMessage[]) => Promise<string[]>;
  /** Function to extract entities from text */
  entityExtractor?: (text: string) => Promise<EntityExtractionResult>;
};

export type MemorySearchResult = {
  type: "semantic" | "episodic" | "entity" | "external";
  score: number;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Unified memory system that coordinates all memory components
 */
export class MemorySystem extends EventEmitter {
  private config: MemoryConfig;
  private basePath: string;
  private agentId: string;
  private episodic?: EpisodicMemory;
  private knowledgeGraph?: KnowledgeGraph;
  private externalSources?: ExternalSources;
  private embedText?: MemorySystemOptions["embedText"];
  private entityExtractor?: MemorySystemOptions["entityExtractor"];
  private initialized = false;

  constructor(options: MemorySystemOptions) {
    super();
    this.config = options.config;
    this.basePath = options.basePath;
    this.agentId = options.agentId;
    this.embedText = options.embedText;
    this.entityExtractor = options.entityExtractor;

    // Initialize episodic memory
    if (options.config.episodic?.enabled) {
      this.episodic = new EpisodicMemory({
        config: options.config.episodic,
        storagePath: path.join(options.basePath, "episodic"),
        summarizer: options.summarizer,
        topicExtractor: options.topicExtractor,
        entityExtractor: async (messages) => {
          // Extract entity names from conversation
          if (!options.entityExtractor) return [];
          const text = messages.map((m) => m.content).join("\n");
          const extraction = await options.entityExtractor(text);
          return extraction.entities.map((e) => e.name);
        },
      });

      // Forward events
      this.episodic.on("episode:started", (data) => this.emit("episode:started", data));
      this.episodic.on("episode:ended", (data) => this.emit("episode:ended", data));
      this.episodic.on("episode:summarized", (data) => this.emit("episode:summarized", data));
    }

    // Initialize knowledge graph
    if (options.config.knowledgeGraph?.enabled) {
      this.knowledgeGraph = new KnowledgeGraph({
        config: options.config.knowledgeGraph,
        storagePath: path.join(options.basePath, "knowledge-graph"),
      });

      // Forward events
      this.knowledgeGraph.on("entity:created", (data) => this.emit("entity:created", data));
      this.knowledgeGraph.on("entity:updated", (data) => this.emit("entity:updated", data));
      this.knowledgeGraph.on("relationship:created", (data) => this.emit("relationship:created", data));
    }

    // Initialize external sources
    if (options.config.external && options.config.external.length > 0) {
      this.externalSources = new ExternalSources({
        sources: options.config.external,
        storagePath: path.join(options.basePath, "external"),
        onDocumentIndexed: async (doc) => {
          // Optionally extract entities from external documents
          if (this.knowledgeGraph && this.entityExtractor) {
            try {
              const extraction = await this.entityExtractor(doc.content);
              await this.knowledgeGraph.importExtraction(extraction, doc.id);
            } catch {
              // Ignore extraction errors
            }
          }
        },
      });

      // Forward events
      this.externalSources.on("external:synced", (data) => this.emit("external:synced", data));
      this.externalSources.on("external:error", (data) => this.emit("external:error", data));
    }
  }

  /**
   * Initialize all memory components
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      this.episodic?.initialize(),
      this.knowledgeGraph?.initialize(),
      this.externalSources?.initialize(),
    ]);

    this.initialized = true;
  }

  /**
   * Unified search across all memory types
   */
  async search(
    query: string,
    options?: {
      types?: Array<"semantic" | "episodic" | "entity" | "external">;
      limit?: number;
      minScore?: number;
    },
  ): Promise<MemorySearchResult[]> {
    await this.initialize();

    const types = options?.types ?? ["semantic", "episodic", "entity", "external"];
    const limit = options?.limit ?? 10;
    const minScore = options?.minScore ?? 0.3;
    const results: MemorySearchResult[] = [];

    // Search episodic memory
    if (types.includes("episodic") && this.episodic) {
      const recentMessages = await this.episodic.getRecentMessages({
        agentId: this.agentId,
        limit: 20,
      });

      // Simple keyword matching for episodic
      const queryLower = query.toLowerCase();
      for (const msg of recentMessages) {
        if (msg.content.toLowerCase().includes(queryLower)) {
          results.push({
            type: "episodic",
            score: 0.7,
            content: msg.content.slice(0, 500),
            source: msg.role,
            metadata: { timestamp: msg.timestamp, role: msg.role },
          });
        }
      }
    }

    // Search knowledge graph
    if (types.includes("entity") && this.knowledgeGraph) {
      const entities = await this.knowledgeGraph.searchEntities({
        query,
        limit: 10,
      });

      for (const entity of entities) {
        results.push({
          type: "entity",
          score: entity.confidence ?? 0.8,
          content: `${entity.name}: ${entity.description ?? entity.type}`,
          source: entity.type,
          metadata: {
            entityId: entity.id,
            type: entity.type,
            properties: entity.properties,
          },
        });
      }
    }

    // Search external sources
    if (types.includes("external") && this.externalSources) {
      const docs = await this.externalSources.searchDocuments(query, 10);

      for (const doc of docs) {
        results.push({
          type: "external",
          score: 0.6,
          content: `${doc.title}\n${doc.content.slice(0, 300)}...`,
          source: doc.source,
          metadata: {
            documentId: doc.id,
            path: doc.path,
            url: doc.url,
          },
        });
      }
    }

    // Sort by score and apply limits
    return results
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // =========================================================================
  // Episodic Memory API
  // =========================================================================

  /**
   * Start a new conversation episode
   */
  async startEpisode(params: {
    sessionId: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Episode | null> {
    if (!this.episodic) return null;
    await this.initialize();

    return this.episodic.startEpisode({
      agentId: this.agentId,
      ...params,
    });
  }

  /**
   * Add a message to the current episode
   */
  async addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, "id" | "timestamp">,
  ): Promise<ConversationMessage | null> {
    if (!this.episodic) return null;
    await this.initialize();

    const result = await this.episodic.addMessage(sessionId, message);

    // Extract entities from the message if enabled
    if (
      result &&
      this.knowledgeGraph &&
      this.entityExtractor &&
      this.config.knowledgeGraph?.extractEntities
    ) {
      try {
        const extraction = await this.entityExtractor(message.content);
        await this.knowledgeGraph.importExtraction(extraction);
      } catch {
        // Ignore extraction errors
      }
    }

    return result;
  }

  /**
   * End the current episode
   */
  async endEpisode(sessionId: string): Promise<Episode | null> {
    if (!this.episodic) return null;
    await this.initialize();

    return this.episodic.endEpisode(sessionId);
  }

  /**
   * Get an episode by ID
   */
  async getEpisode(episodeId: string): Promise<Episode | null> {
    if (!this.episodic) return null;
    await this.initialize();

    return this.episodic.getEpisode(episodeId);
  }

  /**
   * Search episodes
   */
  async searchEpisodes(options: EpisodeSearchOptions): Promise<Episode[]> {
    if (!this.episodic) return [];
    await this.initialize();

    return this.episodic.searchEpisodes(options);
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(params: {
    sessionId?: string;
    limit?: number;
  }): Promise<ConversationMessage[]> {
    if (!this.episodic) return [];
    await this.initialize();

    return this.episodic.getRecentMessages({
      agentId: this.agentId,
      ...params,
    });
  }

  // =========================================================================
  // Knowledge Graph API
  // =========================================================================

  /**
   * Add or update an entity
   */
  async upsertEntity(params: {
    name: string;
    type: EntityType;
    aliases?: string[];
    description?: string;
    properties?: Record<string, unknown>;
    sourceMemoryId?: string;
    confidence?: number;
  }): Promise<Entity | null> {
    if (!this.knowledgeGraph) return null;
    await this.initialize();

    return this.knowledgeGraph.upsertEntity(params);
  }

  /**
   * Add a relationship between entities
   */
  async addRelationship(params: {
    sourceId?: string;
    sourceName?: string;
    targetId?: string;
    targetName?: string;
    type: Relationship["type"];
    label?: string;
    properties?: Record<string, unknown>;
    confidence?: number;
    bidirectional?: boolean;
  }): Promise<Relationship | null> {
    if (!this.knowledgeGraph) return null;
    await this.initialize();

    return this.knowledgeGraph.addRelationship(params);
  }

  /**
   * Get an entity by ID or name
   */
  async getEntity(idOrName: string): Promise<Entity | null> {
    if (!this.knowledgeGraph) return null;
    await this.initialize();

    return this.knowledgeGraph.getEntity(idOrName);
  }

  /**
   * Search entities
   */
  async searchEntities(params: {
    query?: string;
    type?: EntityType | EntityType[];
    limit?: number;
    minConfidence?: number;
  }): Promise<Entity[]> {
    if (!this.knowledgeGraph) return [];
    await this.initialize();

    return this.knowledgeGraph.searchEntities(params);
  }

  /**
   * Query the knowledge graph
   */
  async queryGraph(params: GraphQuery): Promise<GraphQueryResult> {
    if (!this.knowledgeGraph) return { entities: [], relationships: [] };
    await this.initialize();

    return this.knowledgeGraph.query(params);
  }

  /**
   * Import entity extraction results
   */
  async importExtraction(
    extraction: EntityExtractionResult,
    sourceMemoryId?: string,
  ): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
    if (!this.knowledgeGraph) return { entities: [], relationships: [] };
    await this.initialize();

    return this.knowledgeGraph.importExtraction(extraction, sourceMemoryId);
  }

  // =========================================================================
  // External Sources API
  // =========================================================================

  /**
   * Sync an external source
   */
  async syncExternalSource(
    sourceId: string,
  ): Promise<{ count: number; errors: string[] }> {
    if (!this.externalSources) return { count: 0, errors: [] };
    await this.initialize();

    return this.externalSources.sync(sourceId);
  }

  /**
   * Sync all external sources
   */
  async syncAllExternalSources(): Promise<
    Map<string, { count: number; errors: string[] }>
  > {
    if (!this.externalSources) return new Map();
    await this.initialize();

    return this.externalSources.syncAll();
  }

  /**
   * Get external documents
   */
  async getExternalDocuments(params?: {
    sourceType?: ExternalDocument["source"];
    sourceId?: string;
    limit?: number;
    modifiedAfter?: Date;
  }): Promise<ExternalDocument[]> {
    if (!this.externalSources) return [];
    await this.initialize();

    return this.externalSources.getDocuments(params);
  }

  /**
   * Search external documents
   */
  async searchExternalDocuments(
    query: string,
    limit = 10,
  ): Promise<ExternalDocument[]> {
    if (!this.externalSources) return [];
    await this.initialize();

    return this.externalSources.searchDocuments(query, limit);
  }

  /**
   * Get sync status for all external sources
   */
  async getExternalSyncStatus(): Promise<
    Array<{
      sourceId: string;
      sourceType: ExternalDocument["source"];
      name?: string;
      enabled: boolean;
      lastSync?: Date;
      documentCount: number;
      errors: string[];
    }>
  > {
    if (!this.externalSources) return [];
    await this.initialize();

    return this.externalSources.getSyncStatus();
  }

  // =========================================================================
  // System API
  // =========================================================================

  /**
   * Get overall memory statistics
   */
  async getStats(): Promise<{
    episodic?: {
      totalEpisodes: number;
      activeEpisodes: number;
      totalMessages: number;
    };
    knowledgeGraph?: {
      totalEntities: number;
      totalRelationships: number;
    };
    external?: {
      totalSources: number;
      totalDocuments: number;
    };
  }> {
    await this.initialize();

    const stats: Awaited<ReturnType<MemorySystem["getStats"]>> = {};

    if (this.episodic) {
      const episodicStats = await this.episodic.getStats();
      stats.episodic = {
        totalEpisodes: episodicStats.totalEpisodes,
        activeEpisodes: episodicStats.activeEpisodes,
        totalMessages: episodicStats.totalMessages,
      };
    }

    if (this.knowledgeGraph) {
      const graphStats = await this.knowledgeGraph.getStats();
      stats.knowledgeGraph = {
        totalEntities: graphStats.totalEntities,
        totalRelationships: graphStats.totalRelationships,
      };
    }

    if (this.externalSources) {
      const syncStatus = await this.externalSources.getSyncStatus();
      stats.external = {
        totalSources: syncStatus.length,
        totalDocuments: syncStatus.reduce((sum, s) => sum + s.documentCount, 0),
      };
    }

    return stats;
  }

  /**
   * Check if specific memory components are enabled
   */
  getCapabilities(): {
    episodic: boolean;
    knowledgeGraph: boolean;
    external: boolean;
  } {
    return {
      episodic: !!this.episodic,
      knowledgeGraph: !!this.knowledgeGraph,
      external: !!this.externalSources,
    };
  }

  /**
   * Stop all background operations
   */
  async stop(): Promise<void> {
    await this.externalSources?.stop();
  }
}
