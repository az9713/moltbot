/**
 * Skill Parser
 *
 * Parses SKILL.md files with YAML frontmatter into SkillDefinition objects.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { SkillDefinition, SkillMetadata, SkillSource } from "./types.js";

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/**
 * Parse YAML-like frontmatter (simplified parser)
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, rawValue] = match;
      let value: unknown = rawValue.trim();

      // Handle quoted strings
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      // Handle JSON values
      else if (value.startsWith("{") || value.startsWith("[")) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }
      // Handle booleans
      else if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      }
      // Handle numbers
      else if (!isNaN(Number(value)) && value !== "") {
        value = Number(value);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse a SKILL.md file into a SkillDefinition
 */
export function parseSkillFile(
  filePath: string,
  source: SkillSource = "workspace",
): SkillDefinition | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return parseSkillContent(content, filePath, source);
  } catch (error) {
    console.error(`Failed to read skill file ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse skill content from a string
 */
export function parseSkillContent(
  content: string,
  filePath: string = "",
  source: SkillSource = "workspace",
): SkillDefinition | null {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    // No frontmatter, treat entire content as system prompt
    const name = path.basename(path.dirname(filePath)) || "unnamed";
    return {
      id: name,
      metadata: { name },
      systemPrompt: content.trim(),
      source,
      filePath,
      enabled: true,
    };
  }

  const [, frontmatterContent, body] = match;
  const frontmatter = parseFrontmatter(frontmatterContent);

  // Extract metadata
  const metadata: SkillMetadata = {
    name: (frontmatter.name as string) || path.basename(path.dirname(filePath)) || "unnamed",
    title: frontmatter.title as string | undefined,
    description: frontmatter.description as string | undefined,
    version: frontmatter.version as string | undefined,
    author: frontmatter.author as string | undefined,
    email: frontmatter.email as string | undefined,
    homepage: frontmatter.homepage as string | undefined,
    repository: frontmatter.repository as string | undefined,
    license: frontmatter.license as string | undefined,
    keywords: frontmatter.keywords as string[] | undefined,
    category: frontmatter.category as SkillMetadata["category"],
    emoji: frontmatter.emoji as string | undefined,
  };

  // Handle model config
  if (frontmatter.model) {
    if (typeof frontmatter.model === "string") {
      metadata.model = { primary: frontmatter.model };
    } else {
      metadata.model = frontmatter.model as SkillMetadata["model"];
    }
  }

  // Handle tools
  if (frontmatter.tools) {
    if (Array.isArray(frontmatter.tools)) {
      metadata.tools = frontmatter.tools.map((t) =>
        typeof t === "string" ? { name: t } : t,
      );
    }
  }

  // Handle moltbot metadata
  if (frontmatter.metadata && typeof frontmatter.metadata === "object") {
    const meta = frontmatter.metadata as Record<string, unknown>;
    if (meta.moltbot && typeof meta.moltbot === "object") {
      metadata.moltbot = meta.moltbot as SkillMetadata["moltbot"];
    }
  }

  return {
    id: metadata.name,
    metadata,
    systemPrompt: body.trim(),
    source,
    filePath,
    enabled: true,
  };
}

/**
 * Load all skills from a directory
 */
export function loadSkillsFromDir(
  dir: string,
  source: SkillSource = "workspace",
): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  if (!fs.existsSync(dir)) {
    return skills;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = path.join(dir, entry.name, "SKILL.md");
    if (fs.existsSync(skillPath)) {
      const skill = parseSkillFile(skillPath, source);
      if (skill) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

/**
 * Generate skill ID from name
 */
export function generateSkillId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
