/**
 * External Memory Sources
 *
 * Integrates external knowledge sources like Notion, Obsidian, GitHub, etc.
 */

import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

import type {
  ExternalSourceType,
  ExternalSourceConfig,
  ExternalDocument,
  MemoryEvents,
} from "./types.js";

export type ExternalSourcesOptions = {
  sources: ExternalSourceConfig[];
  storagePath: string;
  onDocumentIndexed?: (doc: ExternalDocument) => Promise<void>;
};

type SyncState = {
  sourceId: string;
  lastSync: Date;
  documentCount: number;
  errors: string[];
};

/**
 * External memory sources manager
 */
export class ExternalSources extends EventEmitter {
  private sources: Map<string, ExternalSourceConfig> = new Map();
  private documents: Map<string, ExternalDocument> = new Map();
  private syncStates: Map<string, SyncState> = new Map();
  private storagePath: string;
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();
  private onDocumentIndexed?: ExternalSourcesOptions["onDocumentIndexed"];
  private loaded = false;

  constructor(options: ExternalSourcesOptions) {
    super();
    this.storagePath = options.storagePath;
    this.onDocumentIndexed = options.onDocumentIndexed;

    // Initialize sources
    for (const source of options.sources) {
      if (source.enabled !== false) {
        const id = source.id ?? `${source.type}-${randomUUID().slice(0, 8)}`;
        this.sources.set(id, { ...source, id });
      }
    }
  }

  /**
   * Initialize and start syncing
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    await fs.mkdir(this.storagePath, { recursive: true });
    await this.loadDocuments();
    this.loaded = true;

    // Start sync timers for enabled sources
    for (const [id, source] of this.sources) {
      if (source.enabled !== false) {
        await this.scheduleSync(id);
      }
    }
  }

  /**
   * Manually sync a source
   */
  async sync(sourceId: string): Promise<{ count: number; errors: string[] }> {
    await this.initialize();

    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const errors: string[] = [];
    let count = 0;

    try {
      const documents = await this.fetchDocuments(source);
      count = documents.length;

      for (const doc of documents) {
        this.documents.set(doc.id, doc);

        if (this.onDocumentIndexed) {
          try {
            await this.onDocumentIndexed(doc);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            errors.push(`Failed to index ${doc.id}: ${errMsg}`);
          }
        }
      }

      // Update sync state
      this.syncStates.set(sourceId, {
        sourceId,
        lastSync: new Date(),
        documentCount: count,
        errors,
      });

      await this.saveDocuments();

      this.emit("external:synced", { source: source.type, documentCount: count });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(errMsg);
      this.emit("external:error", { source: source.type, error: errMsg });
    }

    return { count, errors };
  }

  /**
   * Sync all enabled sources
   */
  async syncAll(): Promise<Map<string, { count: number; errors: string[] }>> {
    await this.initialize();

    const results = new Map<string, { count: number; errors: string[] }>();

    for (const [id, source] of this.sources) {
      if (source.enabled !== false) {
        try {
          const result = await this.sync(id);
          results.set(id, result);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.set(id, { count: 0, errors: [errMsg] });
        }
      }
    }

    return results;
  }

  /**
   * Get documents from a source
   */
  async getDocuments(params?: {
    sourceType?: ExternalSourceType;
    sourceId?: string;
    limit?: number;
    modifiedAfter?: Date;
  }): Promise<ExternalDocument[]> {
    await this.initialize();

    let results = Array.from(this.documents.values());

    if (params?.sourceType) {
      results = results.filter((d) => d.source === params.sourceType);
    }

    if (params?.sourceId) {
      const source = this.sources.get(params.sourceId);
      if (source) {
        results = results.filter((d) => d.source === source.type);
      }
    }

    if (params?.modifiedAfter) {
      results = results.filter(
        (d) => d.modifiedAt && d.modifiedAt >= params.modifiedAfter!,
      );
    }

    // Sort by modified date (most recent first)
    results.sort((a, b) => {
      const aTime = a.modifiedAt?.getTime() ?? 0;
      const bTime = b.modifiedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    if (params?.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }

    return results;
  }

  /**
   * Search documents by content
   */
  async searchDocuments(query: string, limit = 10): Promise<ExternalDocument[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const results: Array<{ doc: ExternalDocument; score: number }> = [];

    for (const doc of this.documents.values()) {
      let score = 0;

      // Score based on title match
      if (doc.title.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Score based on content match
      const contentLower = doc.content.toLowerCase();
      const matches = contentLower.split(queryLower).length - 1;
      score += Math.min(matches * 2, 10);

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.doc);
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<ExternalDocument | null> {
    await this.initialize();
    return this.documents.get(documentId) ?? null;
  }

  /**
   * Get sync status for all sources
   */
  async getSyncStatus(): Promise<
    Array<{
      sourceId: string;
      sourceType: ExternalSourceType;
      name?: string;
      enabled: boolean;
      lastSync?: Date;
      documentCount: number;
      errors: string[];
    }>
  > {
    await this.initialize();

    const results: Array<{
      sourceId: string;
      sourceType: ExternalSourceType;
      name?: string;
      enabled: boolean;
      lastSync?: Date;
      documentCount: number;
      errors: string[];
    }> = [];

    for (const [id, source] of this.sources) {
      const state = this.syncStates.get(id);
      results.push({
        sourceId: id,
        sourceType: source.type,
        name: source.name,
        enabled: source.enabled !== false,
        lastSync: state?.lastSync,
        documentCount: state?.documentCount ?? 0,
        errors: state?.errors ?? [],
      });
    }

    return results;
  }

  /**
   * Stop all sync operations
   */
  async stop(): Promise<void> {
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer);
    }
    this.syncTimers.clear();
  }

  /**
   * Fetch documents from a source
   */
  private async fetchDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    switch (source.type) {
      case "obsidian":
        return this.fetchObsidianDocuments(source);
      case "notion":
        return this.fetchNotionDocuments(source);
      case "github":
        return this.fetchGitHubDocuments(source);
      case "google_drive":
        return this.fetchGoogleDriveDocuments(source);
      case "s3":
        return this.fetchS3Documents(source);
      case "logseq":
        return this.fetchLogseqDocuments(source);
      case "roam":
        return this.fetchRoamDocuments(source);
      case "confluence":
        return this.fetchConfluenceDocuments(source);
      case "dropbox":
        return this.fetchDropboxDocuments(source);
      default:
        return this.fetchCustomDocuments(source);
    }
  }

  /**
   * Fetch Obsidian vault documents
   */
  private async fetchObsidianDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    const vaultPath = source.config?.path;
    if (!vaultPath) {
      throw new Error("Obsidian vault path not configured");
    }

    const documents: ExternalDocument[] = [];
    const includePatterns = source.config?.include ?? ["**/*.md"];
    const excludePatterns = source.config?.exclude ?? ["**/node_modules/**", "**/.obsidian/**"];
    const maxFiles = source.config?.maxFiles ?? 1000;

    // Simple recursive directory scan
    const scanDir = async (dir: string): Promise<void> => {
      if (documents.length >= maxFiles) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (documents.length >= maxFiles) break;

          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(vaultPath, fullPath);

          // Check excludes
          if (this.matchesPatterns(relativePath, excludePatterns)) {
            continue;
          }

          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && this.matchesPatterns(relativePath, includePatterns)) {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const stat = await fs.stat(fullPath);

              documents.push({
                id: this.hashPath(`obsidian:${relativePath}`),
                source: "obsidian",
                sourceId: relativePath,
                title: path.basename(entry.name, ".md"),
                content,
                path: relativePath,
                modifiedAt: stat.mtime,
                syncedAt: new Date(),
              });
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    };

    await scanDir(vaultPath);
    return documents;
  }

  /**
   * Fetch Logseq graph documents
   */
  private async fetchLogseqDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    const graphPath = source.config?.path;
    if (!graphPath) {
      throw new Error("Logseq graph path not configured");
    }

    // Logseq uses pages/ and journals/ directories
    const documents: ExternalDocument[] = [];
    const pagesDir = path.join(graphPath, "pages");
    const journalsDir = path.join(graphPath, "journals");

    const scanLogseqDir = async (dir: string, prefix: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

          const fullPath = path.join(dir, entry.name);
          const content = await fs.readFile(fullPath, "utf-8");
          const stat = await fs.stat(fullPath);

          documents.push({
            id: this.hashPath(`logseq:${prefix}/${entry.name}`),
            source: "logseq",
            sourceId: `${prefix}/${entry.name}`,
            title: path.basename(entry.name, ".md"),
            content,
            path: `${prefix}/${entry.name}`,
            modifiedAt: stat.mtime,
            syncedAt: new Date(),
          });
        }
      } catch {
        // Directory might not exist
      }
    };

    await scanLogseqDir(pagesDir, "pages");
    await scanLogseqDir(journalsDir, "journals");

    return documents;
  }

  /**
   * Fetch Notion documents (requires API token)
   */
  private async fetchNotionDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    const token = source.config?.token;
    if (!token) {
      throw new Error("Notion API token not configured");
    }

    // Note: Actual Notion API integration would require the @notionhq/client package
    // This is a placeholder that shows the structure
    console.warn("Notion integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch GitHub documents (requires API token)
   */
  private async fetchGitHubDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    const token = source.config?.token;
    if (!token) {
      throw new Error("GitHub API token not configured");
    }

    // Note: Would use GitHub API to fetch repository contents
    console.warn("GitHub integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch Google Drive documents
   */
  private async fetchGoogleDriveDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn("Google Drive integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch S3 documents
   */
  private async fetchS3Documents(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn("S3 integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch Roam documents
   */
  private async fetchRoamDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn("Roam integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch Confluence documents
   */
  private async fetchConfluenceDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn("Confluence integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch Dropbox documents
   */
  private async fetchDropboxDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn("Dropbox integration requires additional setup. Returning empty results.");
    return [];
  }

  /**
   * Fetch custom source documents
   */
  private async fetchCustomDocuments(source: ExternalSourceConfig): Promise<ExternalDocument[]> {
    console.warn(`Custom source type ${source.type} not implemented. Returning empty results.`);
    return [];
  }

  /**
   * Schedule periodic sync for a source
   */
  private async scheduleSync(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;

    const interval = (source.config?.syncInterval ?? 3600) * 1000; // Default 1 hour

    // Initial sync
    try {
      await this.sync(sourceId);
    } catch (err) {
      console.error(`Initial sync failed for ${sourceId}:`, err);
    }

    // Schedule recurring syncs
    const timer = setInterval(async () => {
      try {
        await this.sync(sourceId);
      } catch (err) {
        console.error(`Scheduled sync failed for ${sourceId}:`, err);
      }
    }, interval);

    this.syncTimers.set(sourceId, timer);
  }

  /**
   * Check if path matches any glob patterns (simplified)
   */
  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple pattern matching
      if (pattern.includes("**")) {
        // Wildcard for any path
        const regex = new RegExp(
          pattern
            .replace(/\*\*/g, ".*")
            .replace(/\*/g, "[^/]*")
            .replace(/\./g, "\\."),
        );
        if (regex.test(filePath)) return true;
      } else if (pattern.endsWith("*")) {
        if (filePath.startsWith(pattern.slice(0, -1))) return true;
      } else if (pattern.startsWith("*")) {
        if (filePath.endsWith(pattern.slice(1))) return true;
      } else {
        if (filePath === pattern || filePath.endsWith("/" + pattern)) return true;
      }
    }
    return false;
  }

  /**
   * Create a hash for a path to use as document ID
   */
  private hashPath(p: string): string {
    return createHash("sha256").update(p).digest("hex").slice(0, 16);
  }

  /**
   * Load documents from storage
   */
  private async loadDocuments(): Promise<void> {
    try {
      const docsPath = path.join(this.storagePath, "documents.json");
      const statesPath = path.join(this.storagePath, "sync-states.json");

      // Load documents
      try {
        const content = await fs.readFile(docsPath, "utf-8");
        const docs = JSON.parse(content) as ExternalDocument[];

        for (const doc of docs) {
          if (doc.modifiedAt) doc.modifiedAt = new Date(doc.modifiedAt);
          if (doc.syncedAt) doc.syncedAt = new Date(doc.syncedAt);
          this.documents.set(doc.id, doc);
        }
      } catch {
        // File might not exist
      }

      // Load sync states
      try {
        const content = await fs.readFile(statesPath, "utf-8");
        const states = JSON.parse(content) as SyncState[];

        for (const state of states) {
          state.lastSync = new Date(state.lastSync);
          this.syncStates.set(state.sourceId, state);
        }
      } catch {
        // File might not exist
      }
    } catch (error) {
      console.error("Failed to load external documents:", error);
    }
  }

  /**
   * Save documents to storage
   */
  private async saveDocuments(): Promise<void> {
    const docsPath = path.join(this.storagePath, "documents.json");
    const statesPath = path.join(this.storagePath, "sync-states.json");

    await fs.writeFile(
      docsPath,
      JSON.stringify(Array.from(this.documents.values()), null, 2),
    );
    await fs.writeFile(
      statesPath,
      JSON.stringify(Array.from(this.syncStates.values()), null, 2),
    );
  }
}
