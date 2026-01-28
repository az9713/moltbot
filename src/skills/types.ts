/**
 * Sub-Agent Skills Marketplace Types
 *
 * Defines types for discoverable, versioned, reusable sub-agent templates.
 */

export type SkillToolRef = {
  name: string;
  required?: boolean;
};

export type SkillModelConfig = {
  /** Preferred model for this skill */
  primary?: string;
  /** Fallback models */
  fallbacks?: string[];
  /** Minimum model capability tier */
  minTier?: "basic" | "standard" | "advanced";
};

export type SkillMetadata = {
  /** Skill name (used as identifier) */
  name: string;
  /** Human-readable title */
  title?: string;
  /** Short description */
  description?: string;
  /** Semantic version */
  version?: string;
  /** Author name or handle */
  author?: string;
  /** Author email */
  email?: string;
  /** Homepage/documentation URL */
  homepage?: string;
  /** Repository URL */
  repository?: string;
  /** License identifier */
  license?: string;
  /** Keywords for discovery */
  keywords?: string[];
  /** Category for organization */
  category?: SkillCategory;
  /** Emoji icon */
  emoji?: string;
  /** Model configuration */
  model?: SkillModelConfig;
  /** Tools this skill uses */
  tools?: SkillToolRef[];
  /** Required environment variables */
  envVars?: string[];
  /** Platform requirements */
  platforms?: ("macos" | "linux" | "windows")[];
  /** Moltbot-specific metadata */
  moltbot?: {
    emoji?: string;
    homepage?: string;
    featured?: boolean;
    verified?: boolean;
  };
};

export type SkillCategory =
  | "research"
  | "coding"
  | "writing"
  | "data"
  | "devops"
  | "automation"
  | "communication"
  | "other";

export type SkillSource =
  | "bundled"
  | "marketplace"
  | "workspace"
  | "plugin"
  | "remote";

export type SkillDefinition = {
  /** Unique skill identifier */
  id: string;
  /** Skill metadata from frontmatter */
  metadata: SkillMetadata;
  /** System prompt content */
  systemPrompt: string;
  /** Source of the skill */
  source: SkillSource;
  /** File path if local */
  filePath?: string;
  /** Plugin ID if from plugin */
  pluginId?: string;
  /** Whether skill is enabled */
  enabled: boolean;
};

export type SkillExecutionConfig = {
  /** Maximum turns for the skill execution */
  maxTurns?: number;
  /** Timeout in seconds */
  timeoutSec?: number;
  /** Model override */
  model?: string;
  /** Tool allowlist override */
  tools?: string[];
  /** Whether to run in sandbox */
  sandboxed?: boolean;
  /** Session scope */
  sessionScope?: "per-sender" | "per-chat" | "shared";
};

export type SkillInvocation = {
  /** Skill to invoke */
  skillId: string;
  /** Input prompt for the skill */
  prompt: string;
  /** Execution configuration */
  config?: SkillExecutionConfig;
  /** Context to pass to the skill */
  context?: Record<string, unknown>;
};

export type SkillExecutionResult = {
  /** Whether execution succeeded */
  success: boolean;
  /** Output from the skill */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Execution duration in ms */
  durationMs?: number;
  /** Token usage */
  tokens?: {
    input: number;
    output: number;
  };
};

// Marketplace types

export type MarketplaceSkillInfo = {
  id: string;
  metadata: SkillMetadata;
  downloads: number;
  rating: number;
  ratingCount: number;
  lastUpdated: string;
  verified: boolean;
};

export type MarketplaceSearchResult = {
  skills: MarketplaceSkillInfo[];
  total: number;
  page: number;
  pageSize: number;
};

export type MarketplaceSearchOptions = {
  query?: string;
  category?: SkillCategory;
  author?: string;
  keywords?: string[];
  sortBy?: "downloads" | "rating" | "updated" | "name";
  page?: number;
  pageSize?: number;
};
