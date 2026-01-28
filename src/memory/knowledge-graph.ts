/**
 * Knowledge Graph Manager
 *
 * Manages entities and relationships extracted from conversations.
 */

import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  Entity,
  EntityType,
  Relationship,
  RelationType,
  GraphQuery,
  GraphQueryResult,
  KnowledgeGraphConfig,
  MemoryEvents,
} from "./types.js";

export type KnowledgeGraphOptions = {
  config: KnowledgeGraphConfig;
  storagePath: string;
};

export type EntityExtractionResult = {
  entities: Array<{
    name: string;
    type: EntityType;
    description?: string;
    properties?: Record<string, unknown>;
  }>;
  relationships: Array<{
    sourceName: string;
    targetName: string;
    type: RelationType;
    label?: string;
    properties?: Record<string, unknown>;
  }>;
};

/**
 * Knowledge graph for entity and relationship management
 */
export class KnowledgeGraph extends EventEmitter {
  private config: KnowledgeGraphConfig;
  private storagePath: string;
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private nameIndex: Map<string, string> = new Map(); // lowercase name -> entityId
  private loaded = false;

  constructor(options: KnowledgeGraphOptions) {
    super();
    this.config = options.config;
    this.storagePath = options.storagePath;
  }

  /**
   * Initialize and load graph from storage
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    await fs.mkdir(this.storagePath, { recursive: true });
    await this.loadGraph();
    this.loaded = true;
  }

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
  }): Promise<Entity> {
    await this.initialize();

    const normalizedName = params.name.toLowerCase().trim();

    // Check if entity already exists
    let entityId = this.nameIndex.get(normalizedName);
    let entity: Entity;

    if (entityId && this.entities.has(entityId)) {
      // Update existing entity
      entity = this.entities.get(entityId)!;
      entity.updatedAt = new Date();
      entity.referenceCount = (entity.referenceCount ?? 0) + 1;

      // Merge aliases
      if (params.aliases) {
        const existingAliases = new Set(entity.aliases ?? []);
        for (const alias of params.aliases) {
          existingAliases.add(alias);
          this.nameIndex.set(alias.toLowerCase().trim(), entityId);
        }
        entity.aliases = Array.from(existingAliases);
      }

      // Merge properties
      if (params.properties) {
        entity.properties = { ...entity.properties, ...params.properties };
      }

      // Update description if provided and better
      if (params.description && (!entity.description || params.description.length > entity.description.length)) {
        entity.description = params.description;
      }

      // Add source memory
      if (params.sourceMemoryId) {
        const sources = new Set(entity.sourceMemoryIds ?? []);
        sources.add(params.sourceMemoryId);
        entity.sourceMemoryIds = Array.from(sources);
      }

      // Update confidence (take higher)
      if (params.confidence && params.confidence > (entity.confidence ?? 0)) {
        entity.confidence = params.confidence;
      }

      this.emit("entity:updated", { entity });
    } else {
      // Create new entity
      entityId = randomUUID();

      entity = {
        id: entityId,
        name: params.name,
        type: params.type,
        aliases: params.aliases,
        description: params.description,
        properties: params.properties,
        createdAt: new Date(),
        referenceCount: 1,
        confidence: params.confidence,
        sourceMemoryIds: params.sourceMemoryId ? [params.sourceMemoryId] : undefined,
      };

      // Check max nodes limit
      if (this.config.maxNodes && this.entities.size >= this.config.maxNodes) {
        await this.pruneOldEntities(1);
      }

      this.entities.set(entityId, entity);
      this.nameIndex.set(normalizedName, entityId);

      // Index aliases
      if (params.aliases) {
        for (const alias of params.aliases) {
          this.nameIndex.set(alias.toLowerCase().trim(), entityId);
        }
      }

      this.emit("entity:created", { entity });
    }

    await this.saveGraph();
    return entity;
  }

  /**
   * Add a relationship between entities
   */
  async addRelationship(params: {
    sourceId?: string;
    sourceName?: string;
    targetId?: string;
    targetName?: string;
    type: RelationType;
    label?: string;
    properties?: Record<string, unknown>;
    confidence?: number;
    bidirectional?: boolean;
  }): Promise<Relationship | null> {
    await this.initialize();

    // Resolve source entity
    let sourceId = params.sourceId;
    if (!sourceId && params.sourceName) {
      sourceId = this.nameIndex.get(params.sourceName.toLowerCase().trim());
    }
    if (!sourceId || !this.entities.has(sourceId)) {
      return null;
    }

    // Resolve target entity
    let targetId = params.targetId;
    if (!targetId && params.targetName) {
      targetId = this.nameIndex.get(params.targetName.toLowerCase().trim());
    }
    if (!targetId || !this.entities.has(targetId)) {
      return null;
    }

    // Check for existing relationship
    const existingId = this.findRelationship(sourceId, targetId, params.type);
    if (existingId) {
      const existing = this.relationships.get(existingId)!;
      // Update confidence if higher
      if (params.confidence && params.confidence > (existing.confidence ?? 0)) {
        existing.confidence = params.confidence;
      }
      // Merge properties
      if (params.properties) {
        existing.properties = { ...existing.properties, ...params.properties };
      }
      await this.saveGraph();
      return existing;
    }

    // Check max edges per node
    if (this.config.maxEdgesPerNode) {
      const sourceEdges = this.countEdges(sourceId);
      const targetEdges = this.countEdges(targetId);

      if (sourceEdges >= this.config.maxEdgesPerNode || targetEdges >= this.config.maxEdgesPerNode) {
        return null; // Don't add more edges
      }
    }

    const relationship: Relationship = {
      id: randomUUID(),
      sourceId,
      targetId,
      type: params.type,
      label: params.label,
      properties: params.properties,
      createdAt: new Date(),
      confidence: params.confidence,
      bidirectional: params.bidirectional,
    };

    this.relationships.set(relationship.id, relationship);
    this.emit("relationship:created", { relationship });

    await this.saveGraph();
    return relationship;
  }

  /**
   * Get an entity by ID or name
   */
  async getEntity(idOrName: string): Promise<Entity | null> {
    await this.initialize();

    // Try by ID first
    let entity = this.entities.get(idOrName);
    if (entity) return entity;

    // Try by name
    const entityId = this.nameIndex.get(idOrName.toLowerCase().trim());
    if (entityId) {
      return this.entities.get(entityId) ?? null;
    }

    return null;
  }

  /**
   * Search entities by type or pattern
   */
  async searchEntities(params: {
    query?: string;
    type?: EntityType | EntityType[];
    limit?: number;
    minConfidence?: number;
  }): Promise<Entity[]> {
    await this.initialize();

    let results = Array.from(this.entities.values());

    // Filter by type
    if (params.type) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      results = results.filter((e) => types.includes(e.type));
    }

    // Filter by confidence
    if (params.minConfidence !== undefined) {
      results = results.filter((e) => (e.confidence ?? 0) >= params.minConfidence!);
    }

    // Filter by query
    if (params.query) {
      const queryLower = params.query.toLowerCase();
      results = results.filter((e) => {
        if (e.name.toLowerCase().includes(queryLower)) return true;
        if (e.description?.toLowerCase().includes(queryLower)) return true;
        if (e.aliases?.some((a) => a.toLowerCase().includes(queryLower))) return true;
        return false;
      });
    }

    // Sort by reference count (most referenced first)
    results.sort((a, b) => (b.referenceCount ?? 0) - (a.referenceCount ?? 0));

    // Apply limit
    if (params.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }

    return results;
  }

  /**
   * Query the knowledge graph
   */
  async query(params: GraphQuery): Promise<GraphQueryResult> {
    await this.initialize();

    const result: GraphQueryResult = {
      entities: [],
      relationships: [],
    };

    // Find starting entity
    let startEntity: Entity | null = null;
    if (params.start) {
      startEntity = await this.getEntity(params.start);
    }

    // If no start, return filtered entities
    if (!startEntity) {
      result.entities = await this.searchEntities({
        type: params.entityType,
        limit: params.limit,
      });
      return result;
    }

    // Traverse from start entity
    const visited = new Set<string>();
    const toVisit: Array<{ entity: Entity; depth: number }> = [
      { entity: startEntity, depth: 0 },
    ];
    const maxDepth = params.maxDepth ?? 2;
    const limit = params.limit ?? 100;

    while (toVisit.length > 0 && result.entities.length < limit) {
      const current = toVisit.shift()!;

      if (visited.has(current.entity.id)) continue;
      visited.add(current.entity.id);

      // Check entity type filter
      if (params.entityType) {
        const types = Array.isArray(params.entityType)
          ? params.entityType
          : [params.entityType];
        if (!types.includes(current.entity.type)) continue;
      }

      result.entities.push(current.entity);

      // Get relationships and continue traversal
      if (current.depth < maxDepth) {
        const rels = this.getRelationshipsFor(current.entity.id, params.relationshipType);

        for (const rel of rels) {
          if (params.includeRelationships) {
            result.relationships.push(rel);
          }

          // Find connected entity
          const connectedId =
            rel.sourceId === current.entity.id ? rel.targetId : rel.sourceId;
          const connected = this.entities.get(connectedId);

          if (connected && !visited.has(connected.id)) {
            toVisit.push({ entity: connected, depth: current.depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Get relationships for an entity
   */
  getRelationshipsFor(
    entityId: string,
    typeFilter?: RelationType | RelationType[],
  ): Relationship[] {
    const types = typeFilter
      ? Array.isArray(typeFilter)
        ? typeFilter
        : [typeFilter]
      : undefined;

    const results: Relationship[] = [];

    for (const rel of this.relationships.values()) {
      // Check if entity is part of relationship
      const isSource = rel.sourceId === entityId;
      const isTarget = rel.targetId === entityId;

      if (!isSource && !isTarget) continue;
      if (isTarget && !rel.bidirectional) continue;

      // Check type filter
      if (types && !types.includes(rel.type)) continue;

      results.push(rel);
    }

    return results;
  }

  /**
   * Import extraction results from LLM
   */
  async importExtraction(
    extraction: EntityExtractionResult,
    sourceMemoryId?: string,
  ): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
    await this.initialize();

    const importedEntities: Entity[] = [];
    const importedRelationships: Relationship[] = [];

    // First, create/update all entities
    for (const e of extraction.entities) {
      const entity = await this.upsertEntity({
        name: e.name,
        type: e.type,
        description: e.description,
        properties: e.properties,
        sourceMemoryId,
        confidence: 0.8, // Default confidence for LLM extractions
      });
      importedEntities.push(entity);
    }

    // Then, create relationships
    for (const r of extraction.relationships) {
      const relationship = await this.addRelationship({
        sourceName: r.sourceName,
        targetName: r.targetName,
        type: r.type,
        label: r.label,
        properties: r.properties,
        confidence: 0.7, // Slightly lower confidence for relationships
      });
      if (relationship) {
        importedRelationships.push(relationship);
      }
    }

    return { entities: importedEntities, relationships: importedRelationships };
  }

  /**
   * Delete an entity and its relationships
   */
  async deleteEntity(entityId: string): Promise<boolean> {
    await this.initialize();

    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remove from name index
    this.nameIndex.delete(entity.name.toLowerCase().trim());
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        this.nameIndex.delete(alias.toLowerCase().trim());
      }
    }

    // Remove relationships
    const toDelete: string[] = [];
    for (const [relId, rel] of this.relationships) {
      if (rel.sourceId === entityId || rel.targetId === entityId) {
        toDelete.push(relId);
      }
    }
    for (const relId of toDelete) {
      this.relationships.delete(relId);
    }

    this.entities.delete(entityId);
    await this.saveGraph();

    return true;
  }

  /**
   * Get graph statistics
   */
  async getStats(): Promise<{
    totalEntities: number;
    totalRelationships: number;
    entitiesByType: Record<EntityType, number>;
    relationshipsByType: Record<RelationType, number>;
  }> {
    await this.initialize();

    const entitiesByType: Record<EntityType, number> = {
      person: 0,
      organization: 0,
      location: 0,
      project: 0,
      concept: 0,
      event: 0,
      document: 0,
      tool: 0,
      custom: 0,
    };

    const relationshipsByType: Record<RelationType, number> = {
      knows: 0,
      works_at: 0,
      works_with: 0,
      located_in: 0,
      part_of: 0,
      related_to: 0,
      created: 0,
      mentioned_in: 0,
      depends_on: 0,
      custom: 0,
    };

    for (const entity of this.entities.values()) {
      entitiesByType[entity.type]++;
    }

    for (const rel of this.relationships.values()) {
      relationshipsByType[rel.type]++;
    }

    return {
      totalEntities: this.entities.size,
      totalRelationships: this.relationships.size,
      entitiesByType,
      relationshipsByType,
    };
  }

  /**
   * Export graph to a format suitable for visualization
   */
  async exportForVisualization(): Promise<{
    nodes: Array<{ id: string; label: string; type: EntityType; size: number }>;
    edges: Array<{ id: string; source: string; target: string; label: string; type: RelationType }>;
  }> {
    await this.initialize();

    const nodes = Array.from(this.entities.values()).map((e) => ({
      id: e.id,
      label: e.name,
      type: e.type,
      size: Math.min(10, Math.max(1, Math.log2((e.referenceCount ?? 1) + 1))),
    }));

    const edges = Array.from(this.relationships.values()).map((r) => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      label: r.label ?? r.type,
      type: r.type,
    }));

    return { nodes, edges };
  }

  /**
   * Find a relationship by source, target, and type
   */
  private findRelationship(
    sourceId: string,
    targetId: string,
    type: RelationType,
  ): string | null {
    for (const [id, rel] of this.relationships) {
      if (rel.sourceId === sourceId && rel.targetId === targetId && rel.type === type) {
        return id;
      }
      // Check reverse direction for bidirectional
      if (rel.bidirectional && rel.sourceId === targetId && rel.targetId === sourceId && rel.type === type) {
        return id;
      }
    }
    return null;
  }

  /**
   * Count edges for an entity
   */
  private countEdges(entityId: string): number {
    let count = 0;
    for (const rel of this.relationships.values()) {
      if (rel.sourceId === entityId || rel.targetId === entityId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Prune old entities to stay under limit
   */
  private async pruneOldEntities(count: number): Promise<void> {
    const sorted = Array.from(this.entities.values())
      .sort((a, b) => {
        // Prioritize by reference count (keep more referenced)
        const refDiff = (a.referenceCount ?? 0) - (b.referenceCount ?? 0);
        if (refDiff !== 0) return refDiff;
        // Then by recency (remove older)
        return (a.updatedAt?.getTime() ?? a.createdAt.getTime()) -
          (b.updatedAt?.getTime() ?? b.createdAt.getTime());
      });

    const toDelete = sorted.slice(0, count);
    for (const entity of toDelete) {
      await this.deleteEntity(entity.id);
    }
  }

  /**
   * Load graph from storage
   */
  private async loadGraph(): Promise<void> {
    try {
      const entitiesPath = path.join(this.storagePath, "entities.json");
      const relationshipsPath = path.join(this.storagePath, "relationships.json");

      // Load entities
      try {
        const content = await fs.readFile(entitiesPath, "utf-8");
        const entities = JSON.parse(content) as Entity[];

        for (const entity of entities) {
          // Restore Date objects
          entity.createdAt = new Date(entity.createdAt);
          if (entity.updatedAt) {
            entity.updatedAt = new Date(entity.updatedAt);
          }

          this.entities.set(entity.id, entity);
          this.nameIndex.set(entity.name.toLowerCase().trim(), entity.id);

          if (entity.aliases) {
            for (const alias of entity.aliases) {
              this.nameIndex.set(alias.toLowerCase().trim(), entity.id);
            }
          }
        }
      } catch {
        // File might not exist yet
      }

      // Load relationships
      try {
        const content = await fs.readFile(relationshipsPath, "utf-8");
        const relationships = JSON.parse(content) as Relationship[];

        for (const rel of relationships) {
          rel.createdAt = new Date(rel.createdAt);
          this.relationships.set(rel.id, rel);
        }
      } catch {
        // File might not exist yet
      }
    } catch (error) {
      console.error("Failed to load knowledge graph:", error);
    }
  }

  /**
   * Save graph to storage
   */
  private async saveGraph(): Promise<void> {
    const entitiesPath = path.join(this.storagePath, "entities.json");
    const relationshipsPath = path.join(this.storagePath, "relationships.json");

    await fs.writeFile(
      entitiesPath,
      JSON.stringify(Array.from(this.entities.values()), null, 2),
    );
    await fs.writeFile(
      relationshipsPath,
      JSON.stringify(Array.from(this.relationships.values()), null, 2),
    );
  }
}
