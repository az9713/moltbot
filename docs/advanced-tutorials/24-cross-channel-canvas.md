---
summary: "Cross-Channel Canvas: rich interactive content with platform-specific rendering"
read_when:
  - You want rich content rendering across channels
  - You need platform-specific UI components
  - You want consistent UX with graceful fallbacks
---

# Cross-Channel Rich Content (Canvas)

The Canvas system renders rich interactive content across all messaging platforms with intelligent fallbacks. Create cards, tables, charts, and interactive elements that adapt to each channel's capabilities.

## Overview

The Canvas system provides:

- **Universal Content Types**: Cards, tables, charts, code blocks, lists
- **Platform Rendering**: Native components for Discord, Slack, Telegram
- **Graceful Fallbacks**: Markdown, images, PDFs for limited platforms
- **Interactive Elements**: Buttons, forms, selections
- **Hosted Pages**: Full interactive experiences for basic channels

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Canvas System                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Content Types                         │    │
│  │  [Card] [Table] [Chart] [Code] [List] [Embed] [Form]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Canvas Manager                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         ▼                  ▼                  ▼                 │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐          │
│  │  Discord   │     │   Slack    │     │  Telegram  │          │
│  │  Renderer  │     │  Renderer  │     │  Renderer  │          │
│  └────────────┘     └────────────┘     └────────────┘          │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐          │
│  │   Embeds   │     │   Blocks   │     │    HTML    │          │
│  │ + Buttons  │     │ + Actions  │     │ + Keyboard │          │
│  └────────────┘     └────────────┘     └────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Rendering Strategies

| Channel | Strategy | Capabilities |
|---------|----------|--------------|
| macOS/iOS | Native Canvas | Full interactive UI |
| Discord | Embeds + Components | Rich embeds, buttons, selections |
| Slack | Block Kit | Sections, actions, modals |
| Telegram | HTML + Keyboards | Formatted text, inline keyboards |
| Matrix | HTML | Formatted text, basic styling |
| Signal | Markdown + Link | Text with hosted preview |
| WhatsApp | Text + PDF | Plain text with file attachments |

## Content Types

### Card

```typescript
const card: CardContent = {
  type: "card",
  title: "Project Status",
  description: "Current sprint progress",
  color: "#4CAF50",
  fields: [
    { name: "Tasks", value: "12/15 completed", inline: true },
    { name: "Blockers", value: "2 active", inline: true },
  ],
  footer: "Updated 5 minutes ago",
  thumbnail: "https://example.com/project-icon.png",
  actions: [
    { type: "button", label: "View Details", action: "view_project" },
    { type: "button", label: "Add Task", action: "add_task" },
  ],
};
```

**Rendering:**
- **Discord**: Embed with fields and button components
- **Slack**: Section blocks with button actions
- **Telegram**: HTML formatted message with inline keyboard
- **Fallback**: Markdown with link buttons

### Table

```typescript
const table: TableContent = {
  type: "table",
  title: "Task List",
  headers: ["Task", "Status", "Due Date"],
  rows: [
    ["Implement auth", "In Progress", "Jan 20"],
    ["Write tests", "Pending", "Jan 22"],
    ["Deploy", "Pending", "Jan 25"],
  ],
  footer: "3 tasks total",
};
```

**Rendering:**
- **Discord**: Code block with aligned columns
- **Slack**: Markdown table in section
- **Telegram**: Preformatted HTML table
- **Fallback**: ASCII table

### Chart

```typescript
const chart: ChartContent = {
  type: "chart",
  chartType: "bar",
  title: "Weekly Progress",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      { label: "Tasks", data: [5, 8, 12, 10, 15] },
    ],
  },
  options: {
    colors: ["#4CAF50"],
  },
};
```

**Rendering:**
- **Native Canvas**: Interactive chart
- **Discord/Slack**: Generated chart image
- **Telegram**: Image with caption
- **Fallback**: ASCII bar chart or hosted link

### Code

```typescript
const code: CodeContent = {
  type: "code",
  language: "typescript",
  content: `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`,
  filename: "greeting.ts",
  startLine: 1,
};
```

**Rendering:**
- **Discord**: Code block with syntax highlighting
- **Slack**: Code block
- **Telegram**: `<pre><code>` block
- **Fallback**: Plain code block

### List

```typescript
const list: ListContent = {
  type: "list",
  title: "Action Items",
  items: [
    { text: "Review PR #123", checked: true },
    { text: "Update documentation", checked: false },
    { text: "Deploy to staging", checked: false },
  ],
  ordered: false,
};
```

### Embed

```typescript
const embed: EmbedContent = {
  type: "embed",
  title: "GitHub Pull Request",
  url: "https://github.com/org/repo/pull/123",
  description: "Add authentication feature",
  provider: "GitHub",
  thumbnail: "https://github.githubassets.com/favicon.ico",
};
```

### Form

```typescript
const form: FormContent = {
  type: "form",
  title: "Create Task",
  fields: [
    { name: "title", type: "text", label: "Task Title", required: true },
    { name: "priority", type: "select", label: "Priority",
      options: ["Low", "Medium", "High"] },
    { name: "description", type: "textarea", label: "Description" },
  ],
  submitLabel: "Create",
  submitAction: "create_task",
};
```

**Rendering:**
- **Slack**: Modal with input blocks
- **Discord**: Modal with text inputs
- **Others**: Hosted form page

## Configuration

### Basic Setup

```json5
{
  "canvas": {
    "enabled": true,
    "hostUrl": "https://canvas.example.com"
  }
}
```

### Full Configuration

```json5
{
  "canvas": {
    "enabled": true,
    "hostUrl": "https://canvas.example.com",

    // Channel-specific overrides
    "fallbacks": {
      "discord": "embed",
      "slack": "blocks",
      "telegram": "html",
      "signal": "link",
      "whatsapp": "pdf"
    },

    // PDF generation settings
    "pdf": {
      "enabled": true,
      "pageSize": "A4",
      "margin": 20
    },

    // Image generation settings
    "image": {
      "enabled": true,
      "format": "png",
      "quality": 90,
      "maxWidth": 1200
    },

    // Chart rendering
    "chart": {
      "enabled": true,
      "defaultColors": ["#4CAF50", "#2196F3", "#FF9800"],
      "theme": "light"
    }
  }
}
```

## Programmatic Usage

### CanvasManager API

```typescript
import { CanvasManager } from "./canvas/index.js";

// Initialize
const canvas = new CanvasManager({
  hostUrl: "https://canvas.example.com",
});

// Render content
const result = await canvas.render({
  content: {
    type: "card",
    title: "Hello World",
    description: "A simple card",
  },
  channel: "discord",
});

console.log("Rendered:", result);
// { type: "embed", embed: { title: "Hello World", ... } }
```

### Custom Renderers

```typescript
import { BaseRenderer } from "./canvas/renderers/base.js";

class CustomRenderer extends BaseRenderer {
  renderCard(card: CardContent): RenderResult {
    // Custom rendering logic
    return {
      type: "custom",
      data: {
        // Platform-specific format
      },
    };
  }

  renderTable(table: TableContent): RenderResult {
    // Custom table rendering
  }
}

// Register renderer
canvas.registerRenderer("custom-channel", new CustomRenderer());
```

### Content Hosting

```typescript
// Host interactive content
const hosted = await canvas.host({
  content: complexContent,
  expiry: 3600, // 1 hour
  theme: "dark",
});

console.log("Hosted URL:", hosted.url);
// https://canvas.example.com/c/abc123
```

## Platform-Specific Examples

### Discord

```typescript
// Card renders to embed + buttons
const discordResult = await canvas.render({
  content: cardContent,
  channel: "discord",
});

// Result:
{
  type: "embed",
  embed: {
    title: "Project Status",
    description: "Current sprint progress",
    color: 0x4CAF50,
    fields: [
      { name: "Tasks", value: "12/15 completed", inline: true },
    ],
  },
  components: [
    {
      type: 1, // Action Row
      components: [
        { type: 2, style: 1, label: "View Details", custom_id: "view_project" },
      ],
    },
  ],
}
```

### Slack

```typescript
// Card renders to Block Kit
const slackResult = await canvas.render({
  content: cardContent,
  channel: "slack",
});

// Result:
{
  type: "blocks",
  blocks: [
    {
      type: "header",
      text: { type: "plain_text", text: "Project Status" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "Current sprint progress" },
      fields: [
        { type: "mrkdwn", text: "*Tasks*\n12/15 completed" },
      ],
    },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "View Details" } },
      ],
    },
  ],
}
```

### Telegram

```typescript
// Card renders to HTML + keyboard
const telegramResult = await canvas.render({
  content: cardContent,
  channel: "telegram",
});

// Result:
{
  type: "html",
  text: "<b>Project Status</b>\nCurrent sprint progress\n\n<b>Tasks:</b> 12/15 completed",
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ text: "View Details", callback_data: "view_project" }],
    ],
  },
}
```

## Fallback Chain

When a channel doesn't support rich content:

```
Native Canvas
     │ (not supported)
     ▼
Platform-Specific (embed/blocks/html)
     │ (not supported)
     ▼
Markdown
     │ (not supported)
     ▼
Hosted Link
     │ (not supported)
     ▼
PDF Attachment
     │ (not supported)
     ▼
Plain Text
```

## Interactive Elements

### Button Handling

```typescript
// Define button action
const card: CardContent = {
  type: "card",
  title: "Confirm Action",
  actions: [
    { type: "button", label: "Approve", action: "approve", style: "primary" },
    { type: "button", label: "Reject", action: "reject", style: "danger" },
  ],
};

// Handle button clicks
canvas.on("action", async ({ action, context }) => {
  if (action === "approve") {
    await handleApproval(context);
  } else if (action === "reject") {
    await handleRejection(context);
  }
});
```

### Form Submission

```typescript
// Handle form submission
canvas.on("form:submit", async ({ formId, data, context }) => {
  if (formId === "create_task") {
    await createTask(data);
    await canvas.respond(context, {
      type: "card",
      title: "Task Created",
      description: `Created task: ${data.title}`,
    });
  }
});
```

## CLI Commands

```bash
# Preview content rendering
moltbot canvas preview card.json --channel discord

# Test all channel renderings
moltbot canvas test card.json

# Generate hosted page
moltbot canvas host card.json --expiry 3600

# List hosted pages
moltbot canvas list

# Clear expired pages
moltbot canvas cleanup
```

## Troubleshooting

### Content Not Rendering

1. Verify canvas is enabled:
   ```json5
   { "canvas": { "enabled": true } }
   ```

2. Check channel supports content type

3. Review fallback configuration

### Buttons Not Working

1. Verify action handlers are registered

2. Check button action IDs match

3. Review channel interaction setup

### Charts Not Displaying

1. Verify chart generation is enabled

2. Check image hosting is configured

3. Review chart data format

### Hosted Pages Failing

1. Verify hostUrl is accessible

2. Check SSL certificate

3. Review page expiry settings

## See Also

- [Channels](/channels)
- [Message Formatting](/concepts/markdown-formatting)
- [Agent Hooks](/advanced-tutorials/18-agent-hooks-system)
