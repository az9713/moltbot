/**
 * Sub-Agent Skills Marketplace
 *
 * Discoverable, versioned, reusable sub-agent templates for common tasks.
 *
 * Features:
 * - Skill definition format (YAML frontmatter in SKILL.md)
 * - Built-in skills: research-agent, code-reviewer, data-analyst, writer-agent, scheduler-agent, devops-agent
 * - Skill discovery and loading from multiple sources
 * - Skill search and categorization
 * - Remote skill loading from URLs
 * - Skill installation and management
 *
 * @example
 * ```typescript
 * import { getSkillsRegistry, getSkillExecutor } from './skills';
 *
 * // Load all skills
 * const registry = getSkillsRegistry();
 * await registry.load();
 *
 * // Search for skills
 * const skills = registry.search('research');
 *
 * // Execute a skill
 * const executor = getSkillExecutor({
 *   spawnSession: async (params) => {
 *     // Your session spawning logic
 *     return { success: true, output: 'Result' };
 *   },
 * });
 *
 * const result = await executor.run('research-agent', 'Research AI trends');
 * ```
 */

export {
  SkillsRegistry,
  getSkillsRegistry,
  resetSkillsRegistry,
  type SkillsRegistryOptions,
} from "./registry.js";

export {
  SkillExecutor,
  getSkillExecutor,
  resetSkillExecutor,
  type SkillExecutorOptions,
  type SpawnSessionParams,
  type SpawnSessionResult,
} from "./executor.js";

export {
  parseSkillFile,
  parseSkillContent,
  loadSkillsFromDir,
  generateSkillId,
} from "./parser.js";

export type {
  SkillToolRef,
  SkillModelConfig,
  SkillMetadata,
  SkillCategory,
  SkillSource,
  SkillDefinition,
  SkillExecutionConfig,
  SkillExecutionResult,
  SkillInvocation,
  MarketplaceSkillInfo,
  MarketplaceSearchResult,
  MarketplaceSearchOptions,
} from "./types.js";
