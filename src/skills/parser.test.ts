import { describe, it, expect } from "vitest";

import { parseSkillContent, generateSkillId } from "./parser.js";

describe("parseSkillContent", () => {
  it("should parse skill with frontmatter", () => {
    const content = `---
name: test-skill
description: A test skill
version: 1.0.0
category: coding
---

# Test Skill

This is the system prompt.
`;

    const skill = parseSkillContent(content, "/path/to/SKILL.md", "workspace");

    expect(skill).not.toBeNull();
    expect(skill?.id).toBe("test-skill");
    expect(skill?.metadata.name).toBe("test-skill");
    expect(skill?.metadata.description).toBe("A test skill");
    expect(skill?.metadata.version).toBe("1.0.0");
    expect(skill?.metadata.category).toBe("coding");
    expect(skill?.systemPrompt).toContain("# Test Skill");
    expect(skill?.source).toBe("workspace");
    expect(skill?.enabled).toBe(true);
  });

  it("should parse skill without frontmatter", () => {
    const content = "# Simple Skill\n\nJust a prompt.";

    const skill = parseSkillContent(content, "/path/to/skill/SKILL.md", "bundled");

    expect(skill).not.toBeNull();
    expect(skill?.systemPrompt).toBe("# Simple Skill\n\nJust a prompt.");
    expect(skill?.source).toBe("bundled");
  });

  it("should parse tools array", () => {
    const content = `---
name: tool-skill
tools: ["bash", "read", "write"]
---

Skill content.
`;

    const skill = parseSkillContent(content);

    expect(skill?.metadata.tools).toHaveLength(3);
    expect(skill?.metadata.tools?.[0].name).toBe("bash");
  });

  it("should parse model configuration", () => {
    const content = `---
name: model-skill
model: claude-sonnet-4-20250514
---

Skill content.
`;

    const skill = parseSkillContent(content);

    expect(skill?.metadata.model?.primary).toBe("claude-sonnet-4-20250514");
  });

  it("should parse moltbot metadata", () => {
    const content = `---
name: moltbot-skill
metadata: {"moltbot":{"emoji":"🎯","homepage":"https://example.com"}}
---

Skill content.
`;

    const skill = parseSkillContent(content);

    expect(skill?.metadata.moltbot?.emoji).toBe("🎯");
    expect(skill?.metadata.moltbot?.homepage).toBe("https://example.com");
  });

  it("should handle keywords array", () => {
    const content = `---
name: keyword-skill
keywords: ["ai", "automation", "coding"]
---

Skill content.
`;

    const skill = parseSkillContent(content);

    expect(skill?.metadata.keywords).toEqual(["ai", "automation", "coding"]);
  });
});

describe("generateSkillId", () => {
  it("should convert name to lowercase slug", () => {
    expect(generateSkillId("Research Agent")).toBe("research-agent");
    expect(generateSkillId("Code-Reviewer")).toBe("code-reviewer");
    expect(generateSkillId("My Awesome Skill!")).toBe("my-awesome-skill");
  });

  it("should handle special characters", () => {
    expect(generateSkillId("skill@v2.0")).toBe("skill-v2-0");
    expect(generateSkillId("---skill---")).toBe("skill");
  });
});
