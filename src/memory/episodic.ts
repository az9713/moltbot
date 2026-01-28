/**
 * Episodic Memory Manager
 *
 * Manages conversation history with summarization and retention policies.
 */

import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  Episode,
  EpisodeSearchOptions,
  EpisodicMemoryConfig,
  ConversationMessage,
  MemoryEvents,
} from "./types.js";

export type EpisodicMemoryOptions = {
  config: EpisodicMemoryConfig;
  storagePath: string;
  summarizer?: (messages: ConversationMessage[]) => Promise<string>;
  topicExtractor?: (messages: ConversationMessage[]) => Promise<string[]>;
  entityExtractor?: (messages: ConversationMessage[]) => Promise<string[]>;
};

/**
 * Episodic memory manager for conversation history
 */
export class EpisodicMemory extends EventEmitter {
  private config: EpisodicMemoryConfig;
  private storagePath: string;
  private episodes: Map<string, Episode> = new Map();
  private activeEpisodes: Map<string, Episode> = new Map(); // sessionId -> episode
  private summarizer?: EpisodicMemoryOptions["summarizer"];
  private topicExtractor?: EpisodicMemoryOptions["topicExtractor"];
  private entityExtractor?: EpisodicMemoryOptions["entityExtractor"];
  private loaded = false;

  constructor(options: EpisodicMemoryOptions) {
    super();
    this.config = options.config;
    this.storagePath = options.storagePath;
    this.summarizer = options.summarizer;
    this.topicExtractor = options.topicExtractor;
    this.entityExtractor = options.entityExtractor;
  }

  /**
   * Initialize and load episodes from storage
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    await fs.mkdir(this.storagePath, { recursive: true });
    await this.loadEpisodes();
    this.loaded = true;
  }

  /**
   * Start a new episode for a session
   */
  async startEpisode(params: {
    agentId: string;
    sessionId: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Episode> {
    await this.initialize();

    // Check for existing active episode
    const existing = this.activeEpisodes.get(params.sessionId);
    if (existing) {
      return existing;
    }

    const episode: Episode = {
      id: randomUUID(),
      agentId: params.agentId,
      sessionId: params.sessionId,
      channel: params.channel,
      messages: [],
      startedAt: new Date(),
      totalTokens: 0,
      compressed: false,
      metadata: params.metadata,
    };

    this.episodes.set(episode.id, episode);
    this.activeEpisodes.set(params.sessionId, episode);

    this.emit("episode:started", { episode });

    return episode;
  }

  /**
   * Add a message to an episode
   */
  async addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, "id" | "timestamp">,
  ): Promise<ConversationMessage | null> {
    await this.initialize();

    const episode = this.activeEpisodes.get(sessionId);
    if (!episode) {
      return null;
    }

    const fullMessage: ConversationMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date(),
    };

    episode.messages.push(fullMessage);
    episode.totalTokens = (episode.totalTokens ?? 0) + (message.tokenCount ?? 0);

    // Check if summarization is needed
    const summarizeAfter = this.config.summarizeAfter ?? 20;
    if (this.summarizer && episode.messages.length >= summarizeAfter) {
      await this.summarizeEpisode(episode.id);
    }

    await this.saveEpisode(episode);

    return fullMessage;
  }

  /**
   * End an episode
   */
  async endEpisode(sessionId: string): Promise<Episode | null> {
    await this.initialize();

    const episode = this.activeEpisodes.get(sessionId);
    if (!episode) {
      return null;
    }

    episode.endedAt = new Date();

    // Generate summary if not already done
    if (!episode.summary && this.summarizer && episode.messages.length > 0) {
      await this.summarizeEpisode(episode.id);
    }

    // Extract topics and entities
    if (this.topicExtractor && episode.messages.length > 0) {
      episode.topics = await this.topicExtractor(episode.messages);
    }
    if (this.entityExtractor && episode.messages.length > 0) {
      episode.entities = await this.entityExtractor(episode.messages);
    }

    this.activeEpisodes.delete(sessionId);
    await this.saveEpisode(episode);

    this.emit("episode:ended", { episode });

    // Check retention policy
    await this.enforceRetention();

    return episode;
  }

  /**
   * Get an episode by ID
   */
  async getEpisode(episodeId: string): Promise<Episode | null> {
    await this.initialize();
    return this.episodes.get(episodeId) ?? null;
  }

  /**
   * Get the active episode for a session
   */
  async getActiveEpisode(sessionId: string): Promise<Episode | null> {
    await this.initialize();
    return this.activeEpisodes.get(sessionId) ?? null;
  }

  /**
   * Search episodes
   */
  async searchEpisodes(options: EpisodeSearchOptions): Promise<Episode[]> {
    await this.initialize();

    let results = Array.from(this.episodes.values());

    // Apply filters
    if (options.agentId) {
      results = results.filter((e) => e.agentId === options.agentId);
    }
    if (options.sessionId) {
      results = results.filter((e) => e.sessionId === options.sessionId);
    }
    if (options.channel) {
      results = results.filter((e) => e.channel === options.channel);
    }
    if (options.after) {
      results = results.filter((e) => e.startedAt >= options.after!);
    }
    if (options.before) {
      results = results.filter((e) => e.startedAt <= options.before!);
    }
    if (options.topics && options.topics.length > 0) {
      results = results.filter((e) =>
        options.topics!.some((t) => e.topics?.includes(t)),
      );
    }
    if (options.entities && options.entities.length > 0) {
      results = results.filter((e) =>
        options.entities!.some((ent) => e.entities?.includes(ent)),
      );
    }

    // Sort by start time (most recent first)
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    // Optionally exclude messages
    if (!options.includeMessages) {
      results = results.map((e) => ({ ...e, messages: [] }));
    }

    return results;
  }

  /**
   * Get recent messages across episodes
   */
  async getRecentMessages(params: {
    agentId?: string;
    sessionId?: string;
    limit?: number;
  }): Promise<ConversationMessage[]> {
    await this.initialize();

    let episodes = Array.from(this.episodes.values());

    if (params.agentId) {
      episodes = episodes.filter((e) => e.agentId === params.agentId);
    }
    if (params.sessionId) {
      episodes = episodes.filter((e) => e.sessionId === params.sessionId);
    }

    // Collect all messages with their timestamps
    const allMessages: ConversationMessage[] = [];
    for (const episode of episodes) {
      allMessages.push(...episode.messages);
    }

    // Sort by timestamp (most recent first)
    allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limit = params.limit ?? 50;
    return allMessages.slice(0, limit);
  }

  /**
   * Summarize an episode
   */
  private async summarizeEpisode(episodeId: string): Promise<void> {
    const episode = this.episodes.get(episodeId);
    if (!episode || !this.summarizer) return;

    try {
      const summary = await this.summarizer(episode.messages);
      episode.summary = summary;

      this.emit("episode:summarized", { episodeId, summary });

      // Optionally compress old messages
      if (this.config.compress) {
        await this.compressEpisode(episode);
      }
    } catch (error) {
      console.error(`Failed to summarize episode ${episodeId}:`, error);
    }
  }

  /**
   * Compress an episode by removing old messages
   */
  private async compressEpisode(episode: Episode): Promise<void> {
    if (episode.compressed || !episode.summary) return;

    const keepRecent = 5; // Keep last 5 messages
    if (episode.messages.length <= keepRecent) return;

    episode.messages = episode.messages.slice(-keepRecent);
    episode.compressed = true;
  }

  /**
   * Enforce retention policy
   */
  private async enforceRetention(): Promise<void> {
    const retentionDays = this.config.retentionDays ?? 90;
    const maxEpisodes = this.config.maxEpisodes;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Remove old episodes
    const toDelete: string[] = [];
    for (const [id, episode] of this.episodes) {
      if (episode.endedAt && episode.endedAt < cutoffDate) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.deleteEpisode(id);
    }

    // Enforce max episodes limit
    if (maxEpisodes && this.episodes.size > maxEpisodes) {
      const sorted = Array.from(this.episodes.values())
        .filter((e) => e.endedAt) // Only consider completed episodes
        .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

      const excess = sorted.slice(0, this.episodes.size - maxEpisodes);
      for (const episode of excess) {
        await this.deleteEpisode(episode.id);
      }
    }
  }

  /**
   * Delete an episode
   */
  async deleteEpisode(episodeId: string): Promise<boolean> {
    const episode = this.episodes.get(episodeId);
    if (!episode) return false;

    // Remove from active if present
    if (this.activeEpisodes.get(episode.sessionId)?.id === episodeId) {
      this.activeEpisodes.delete(episode.sessionId);
    }

    this.episodes.delete(episodeId);

    // Remove from storage
    const filePath = path.join(this.storagePath, `${episodeId}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }

    return true;
  }

  /**
   * Load episodes from storage
   */
  private async loadEpisodes(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const filePath = path.join(this.storagePath, file);
          const content = await fs.readFile(filePath, "utf-8");
          const episode = JSON.parse(content) as Episode;

          // Restore Date objects
          episode.startedAt = new Date(episode.startedAt);
          if (episode.endedAt) {
            episode.endedAt = new Date(episode.endedAt);
          }
          for (const msg of episode.messages) {
            msg.timestamp = new Date(msg.timestamp);
          }

          this.episodes.set(episode.id, episode);

          // Restore active episodes (those without endedAt)
          if (!episode.endedAt) {
            this.activeEpisodes.set(episode.sessionId, episode);
          }
        } catch (error) {
          console.error(`Failed to load episode from ${file}:`, error);
        }
      }
    } catch {
      // Directory might not exist yet
    }
  }

  /**
   * Save an episode to storage
   */
  private async saveEpisode(episode: Episode): Promise<void> {
    const filePath = path.join(this.storagePath, `${episode.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(episode, null, 2));
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalEpisodes: number;
    activeEpisodes: number;
    totalMessages: number;
    oldestEpisode?: Date;
    newestEpisode?: Date;
  }> {
    await this.initialize();

    let totalMessages = 0;
    let oldest: Date | undefined;
    let newest: Date | undefined;

    for (const episode of this.episodes.values()) {
      totalMessages += episode.messages.length;

      if (!oldest || episode.startedAt < oldest) {
        oldest = episode.startedAt;
      }
      if (!newest || episode.startedAt > newest) {
        newest = episode.startedAt;
      }
    }

    return {
      totalEpisodes: this.episodes.size,
      activeEpisodes: this.activeEpisodes.size,
      totalMessages,
      oldestEpisode: oldest,
      newestEpisode: newest,
    };
  }
}
