/**
 * Skills Registry
 *
 * Manages discovery, loading, and execution of sub-agent skills.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import type { MoltbotConfig } from "../config/config.js";
import type {
  SkillDefinition,
  SkillCategory,
  SkillSource,
  SkillExecutionConfig,
  SkillExecutionResult,
  SkillInvocation,
} from "./types.js";
import { loadSkillsFromDir, parseSkillContent } from "./parser.js";

export type SkillsRegistryOptions = {
  config?: MoltbotConfig;
  bundledDir?: string;
  workspaceDir?: string;
  userSkillsDir?: string;
  enableMarketplace?: boolean;
};

export class SkillsRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private config: MoltbotConfig | undefined;
  private bundledDir: string;
  private workspaceDir: string | undefined;
  private userSkillsDir: string;

  constructor(options: SkillsRegistryOptions = {}) {
    this.config = options.config;
    this.bundledDir = options.bundledDir ?? path.join(__dirname, "bundled");
    this.workspaceDir = options.workspaceDir;
    this.userSkillsDir = options.userSkillsDir ?? path.join(os.homedir(), ".moltbot", "skills");
  }

  /**
   * Load all skills from configured sources
   */
  async load(): Promise<void> {
    this.skills.clear();

    // Load bundled skills
    await this.loadBundledSkills();

    // Load user skills
    await this.loadUserSkills();

    // Load workspace skills
    if (this.workspaceDir) {
      await this.loadWorkspaceSkills();
    }

    // Apply config overrides
    this.applyConfigOverrides();
  }

  private async loadBundledSkills(): Promise<void> {
    if (!fs.existsSync(this.bundledDir)) {
      return;
    }

    const skills = loadSkillsFromDir(this.bundledDir, "bundled");
    for (const skill of skills) {
      this.skills.set(skill.id, skill);
    }
  }

  private async loadUserSkills(): Promise<void> {
    if (!fs.existsSync(this.userSkillsDir)) {
      return;
    }

    const skills = loadSkillsFromDir(this.userSkillsDir, "workspace");
    for (const skill of skills) {
      // User skills override bundled
      this.skills.set(skill.id, skill);
    }
  }

  private async loadWorkspaceSkills(): Promise<void> {
    if (!this.workspaceDir) return;

    const skillsDir = path.join(this.workspaceDir, ".moltbot", "skills");
    if (!fs.existsSync(skillsDir)) {
      return;
    }

    const skills = loadSkillsFromDir(skillsDir, "workspace");
    for (const skill of skills) {
      // Workspace skills have highest priority
      this.skills.set(skill.id, skill);
    }
  }

  private applyConfigOverrides(): void {
    const entries = this.config?.skills?.entries;
    if (!entries) return;

    for (const [skillId, entryConfig] of Object.entries(entries)) {
      const skill = this.skills.get(skillId);
      if (skill && entryConfig.enabled === false) {
        skill.enabled = false;
      }
    }
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all loaded skills
   */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get enabled skills only
   */
  getEnabled(): SkillDefinition[] {
    return this.getAll().filter((s) => s.enabled);
  }

  /**
   * Search skills by query
   */
  search(query: string): SkillDefinition[] {
    const queryLower = query.toLowerCase();

    return this.getEnabled()
      .map((skill) => {
        let score = 0;
        const name = skill.metadata.name.toLowerCase();
        const desc = (skill.metadata.description ?? "").toLowerCase();
        const keywords = skill.metadata.keywords ?? [];

        if (name === queryLower) score += 100;
        else if (name.includes(queryLower)) score += 50;

        if (desc.includes(queryLower)) score += 25;

        for (const keyword of keywords) {
          if (keyword.toLowerCase().includes(queryLower)) score += 15;
        }

        return { skill, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.skill);
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): SkillDefinition[] {
    return this.getEnabled().filter((s) => s.metadata.category === category);
  }

  /**
   * Register a skill dynamically
   */
  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  /**
   * Load a skill from a remote URL
   */
  async loadFromUrl(url: string): Promise<SkillDefinition | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const skill = parseSkillContent(content, url, "remote");

      if (skill) {
        this.skills.set(skill.id, skill);
      }

      return skill;
    } catch (error) {
      console.error(`Failed to load skill from ${url}:`, error);
      return null;
    }
  }

  /**
   * Install a skill to user skills directory
   */
  async install(skill: SkillDefinition): Promise<boolean> {
    try {
      const skillDir = path.join(this.userSkillsDir, skill.id);
      fs.mkdirSync(skillDir, { recursive: true });

      // Generate SKILL.md content
      const content = this.generateSkillFile(skill);
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), content);

      // Reload skills
      await this.load();

      return true;
    } catch (error) {
      console.error(`Failed to install skill ${skill.id}:`, error);
      return false;
    }
  }

  /**
   * Uninstall a skill from user skills directory
   */
  async uninstall(skillId: string): Promise<boolean> {
    try {
      const skillDir = path.join(this.userSkillsDir, skillId);
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true });
      }

      // Reload skills
      await this.load();

      return true;
    } catch (error) {
      console.error(`Failed to uninstall skill ${skillId}:`, error);
      return false;
    }
  }

  private generateSkillFile(skill: SkillDefinition): string {
    const meta = skill.metadata;
    const frontmatter: string[] = [
      "---",
      `name: ${meta.name}`,
    ];

    if (meta.description) frontmatter.push(`description: ${meta.description}`);
    if (meta.version) frontmatter.push(`version: ${meta.version}`);
    if (meta.author) frontmatter.push(`author: ${meta.author}`);
    if (meta.category) frontmatter.push(`category: ${meta.category}`);
    if (meta.emoji) frontmatter.push(`emoji: ${meta.emoji}`);
    if (meta.model?.primary) frontmatter.push(`model: ${meta.model.primary}`);
    if (meta.tools?.length) {
      frontmatter.push(`tools: ${JSON.stringify(meta.tools.map((t) => t.name))}`);
    }
    if (meta.keywords?.length) {
      frontmatter.push(`keywords: ${JSON.stringify(meta.keywords)}`);
    }

    frontmatter.push("---", "");

    return frontmatter.join("\n") + skill.systemPrompt;
  }
}

// Singleton instance
let registryInstance: SkillsRegistry | null = null;

/**
 * Get the global skills registry
 */
export function getSkillsRegistry(options?: SkillsRegistryOptions): SkillsRegistry {
  if (!registryInstance) {
    registryInstance = new SkillsRegistry(options);
  }
  return registryInstance;
}

/**
 * Reset the registry (for testing)
 */
export function resetSkillsRegistry(): void {
  registryInstance = null;
}
