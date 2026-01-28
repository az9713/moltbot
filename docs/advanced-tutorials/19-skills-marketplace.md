---
summary: "Skills Marketplace: discoverable, versioned, reusable sub-agent templates"
read_when:
  - You want to use pre-built agent skills
  - You want to create reusable agent templates
  - You need specialized agents for common tasks
---

# Sub-Agent Skills Marketplace

The Skills Marketplace provides discoverable, versioned, and reusable sub-agent templates for common tasks. Skills encapsulate agent behavior, tools, and configuration into shareable packages.

## Overview

The Skills Marketplace enables:

- **Pre-built Skills**: Ready-to-use agent templates for research, code review, data analysis
- **Skill Discovery**: Browse and search available skills
- **Version Management**: Semantic versioning with compatibility checks
- **Custom Skills**: Create and share your own agent templates
- **Skill Composition**: Combine multiple skills for complex workflows

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Skills Marketplace                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  research   │  │ code-review │  │ data-analyst│     │
│  │   agent     │  │   agent     │  │    agent    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   writer    │  │  scheduler  │  │   devops    │     │
│  │   agent     │  │   agent     │  │   agent     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Skill Manager                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Discovery  │  │  Versioning │  │ Composition │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Built-in Skills

### research-agent

Deep web research with citations:

```yaml
---
name: research-agent
description: Deep research with web search and citations
model: claude-sonnet-4-20250514
tools:
  - web_search
  - memory_search
  - write_file
max_turns: 20
timeout: 300s
---

You are a research agent. Your task is to:
1. Search the web for authoritative sources
2. Cross-reference multiple sources
3. Synthesize findings with citations
4. Save results to memory

Always cite your sources with URLs.
```

**Usage:**
```bash
moltbot skill run research-agent "What are the latest AI safety developments?"
```

### code-reviewer

PR review with security analysis:

```yaml
---
name: code-reviewer
description: Code review with security and best practices analysis
model: claude-sonnet-4-20250514
tools:
  - github
  - bash
  - read_file
max_turns: 15
---

You are a code reviewer. For each PR:
1. Analyze code changes for bugs and issues
2. Check for security vulnerabilities
3. Verify test coverage
4. Suggest improvements
5. Provide actionable feedback

Be constructive and specific.
```

**Usage:**
```bash
moltbot skill run code-reviewer "Review PR #123 in owner/repo"
```

### data-analyst

Data exploration and visualization:

```yaml
---
name: data-analyst
description: Data exploration, analysis, and visualization
model: claude-sonnet-4-20250514
tools:
  - python
  - write_file
  - read_file
max_turns: 25
---

You are a data analyst. Your capabilities:
1. Load and explore datasets
2. Clean and transform data
3. Perform statistical analysis
4. Create visualizations
5. Generate insights and reports

Use pandas, matplotlib, and seaborn.
```

### writer-agent

Long-form content with editing:

```yaml
---
name: writer-agent
description: Long-form content creation with research and editing
model: claude-sonnet-4-20250514
tools:
  - web_search
  - memory_search
  - write_file
max_turns: 30
---

You are a professional writer. Your process:
1. Research the topic thoroughly
2. Create an outline
3. Write the first draft
4. Edit for clarity and flow
5. Polish and finalize

Maintain consistent tone and style.
```

### scheduler-agent

Calendar and reminder management:

```yaml
---
name: scheduler-agent
description: Calendar and reminder management
model: claude-sonnet-4-20250514
tools:
  - calendar
  - reminders
  - send_message
max_turns: 10
---

You are a scheduling assistant. You can:
1. View and manage calendar events
2. Set reminders and alerts
3. Find optimal meeting times
4. Send scheduling notifications

Be precise with times and timezones.
```

### devops-agent

Infrastructure and deployment:

```yaml
---
name: devops-agent
description: Infrastructure management and deployment
model: claude-sonnet-4-20250514
tools:
  - bash
  - write_file
  - read_file
max_turns: 20
---

You are a DevOps engineer. Your capabilities:
1. Manage Docker containers
2. Deploy to Kubernetes
3. Configure CI/CD pipelines
4. Monitor infrastructure
5. Troubleshoot issues

Follow security best practices.
```

## Using Skills

### CLI Commands

```bash
# List available skills
moltbot skill list

# Search for skills
moltbot skill search "code review"

# Show skill details
moltbot skill info research-agent

# Run a skill
moltbot skill run research-agent "Research topic"

# Run with options
moltbot skill run data-analyst \
  --file data.csv \
  --output report.md \
  "Analyze this dataset"
```

### From Configuration

Enable skills for an agent:

```json5
{
  "agents": {
    "defaults": {
      "skills": {
        "enabled": true,
        "available": [
          "research-agent",
          "code-reviewer",
          "data-analyst"
        ]
      }
    }
  }
}
```

### Programmatic Usage

```typescript
import { SkillManager } from "./skills/index.js";

const skills = new SkillManager();

// List available skills
const available = await skills.list();
console.log("Available skills:", available.map((s) => s.name));

// Run a skill
const result = await skills.run("research-agent", {
  prompt: "What are the latest developments in quantum computing?",
  options: {
    maxTurns: 15,
    timeout: 180000,
  },
});

console.log("Research complete:", result.output);
```

## Creating Custom Skills

### Skill File Structure

Create a skill in `~/.clawdbot/skills/`:

```
my-skill/
├── SKILL.md          # Skill definition
├── tools/            # Custom tools (optional)
│   └── my-tool.ts
└── templates/        # Prompt templates (optional)
    └── system.md
```

### SKILL.md Format

```yaml
---
name: my-custom-skill
version: 1.0.0
description: "A custom skill for specific tasks"
author: "Your Name"
license: MIT
model: claude-sonnet-4-20250514
tools:
  - bash
  - write_file
  - my-custom-tool
max_turns: 20
timeout: 300s
variables:
  - name: output_format
    default: markdown
    description: Output format (markdown, json, html)
---

# My Custom Skill

You are a specialized agent for [task description].

## Instructions

1. First, understand the user's request
2. Then, perform the necessary operations
3. Finally, output the result in {{output_format}} format

## Guidelines

- Be thorough but concise
- Handle errors gracefully
- Always verify your work
```

### Custom Tools

Add custom tools to your skill:

```typescript
// tools/my-tool.ts
import { defineTool } from "moltbot/plugin-sdk";

export const myCustomTool = defineTool({
  name: "my-custom-tool",
  description: "Does something useful",
  input: {
    type: "object",
    properties: {
      input: { type: "string", description: "Input data" },
    },
    required: ["input"],
  },
  handler: async ({ input }) => {
    // Tool implementation
    return { result: `Processed: ${input}` };
  },
});
```

### Publishing Skills

Share your skill with the community:

```bash
# Package the skill
moltbot skill pack my-custom-skill

# Publish to registry
moltbot skill publish my-custom-skill-1.0.0.tgz
```

## Skill Composition

Combine multiple skills for complex workflows:

```yaml
---
name: full-stack-developer
description: Combined development workflow
composition:
  - skill: code-reviewer
    phase: review
  - skill: devops-agent
    phase: deploy
  - skill: writer-agent
    phase: document
---

# Full Stack Developer

This skill combines code review, deployment, and documentation.

## Workflow

1. Review code changes (code-reviewer)
2. Deploy to staging (devops-agent)
3. Update documentation (writer-agent)
```

## Version Management

### Semantic Versioning

Skills use semantic versioning:

```yaml
---
name: research-agent
version: 2.1.0
compatibility:
  moltbot: ">=2024.1.0"
  node: ">=22.0.0"
---
```

### Version Commands

```bash
# Check for updates
moltbot skill check-updates

# Update a skill
moltbot skill update research-agent

# Update all skills
moltbot skill update --all

# Install specific version
moltbot skill install research-agent@1.5.0
```

## Configuration

### Global Skill Settings

```json5
{
  "skills": {
    "enabled": true,
    "registry": "https://skills.molt.bot",
    "cacheDir": "~/.clawdbot/skills-cache",
    "autoUpdate": true,
    "defaults": {
      "model": "claude-sonnet-4-20250514",
      "timeout": 300000,
      "maxTurns": 20
    }
  }
}
```

### Per-Skill Configuration

```json5
{
  "skills": {
    "overrides": {
      "research-agent": {
        "model": "claude-opus-4-20250514",
        "maxTurns": 30
      },
      "code-reviewer": {
        "tools": {
          "github": {
            "token": "${GITHUB_TOKEN}"
          }
        }
      }
    }
  }
}
```

## Troubleshooting

### Skill Not Found

1. Check skill is installed:
   ```bash
   moltbot skill list --installed
   ```

2. Update skill registry:
   ```bash
   moltbot skill refresh
   ```

3. Install the skill:
   ```bash
   moltbot skill install research-agent
   ```

### Skill Execution Fails

1. Check skill logs:
   ```bash
   moltbot skill logs research-agent --last 50
   ```

2. Verify required tools are available

3. Check model availability

### Version Conflicts

1. Check compatibility:
   ```bash
   moltbot skill check research-agent
   ```

2. Update Moltbot if needed

3. Use compatible skill version

## See Also

- [Agent Orchestration](/advanced-tutorials/20-agent-orchestration)
- [Custom Tools](/configuration#custom-tools)
- [Agent Configuration](/concepts/agent)
