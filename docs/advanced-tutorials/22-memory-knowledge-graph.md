---
summary: "Memory & Knowledge Graph: persistent semantic memory with entity relationships"
read_when:
  - You want agents with long-term memory
  - You need semantic search over conversations
  - You want to build knowledge graphs from interactions
---

# Agent Memory & Knowledge Graph

The Memory & Knowledge Graph system provides persistent, searchable memory with semantic understanding and relationship mapping. Agents can remember past interactions, build knowledge over time, and connect related information.

## Overview

The Memory System provides:

- **Semantic Memory**: Vector embeddings for similarity search
- **Episodic Memory**: Conversation history with auto-summarization
- **Knowledge Graph**: Entity extraction and relationship mapping
- **External Sources**: Integration with Notion, Obsidian, databases
- **Search API**: Query memory using natural language

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Memory Layer                           │
├──────────────────┬──────────────────┬───────────────────────┤
│     Semantic     │     Episodic     │    Knowledge Graph    │
│    (Vectors)     │    (History)     │     (Entities)        │
├──────────────────┴──────────────────┴───────────────────────┤
│                    Storage Backends                          │
│   [Local Files]  [LanceDB]  [PostgreSQL]  [Neo4j]  [Notion] │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Basic Memory Setup

```json5
{
  "memory": {
    "enabled": true,
    "semantic": {
      "enabled": true,
      "embedModel": "text-embedding-3-small",
      "chunkSize": 512,
      "backend": "lancedb"
    },
    "episodic": {
      "enabled": true,
      "summarizeAfter": 20,
      "retentionDays": 90
    }
  }
}
```

### Full Configuration

```json5
{
  "memory": {
    "enabled": true,

    // Semantic memory (vector search)
    "semantic": {
      "enabled": true,
      "embedModel": "text-embedding-3-small",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "backend": "lancedb",
      "backendOptions": {
        "path": "~/.clawdbot/memory/vectors"
      }
    },

    // Episodic memory (conversation history)
    "episodic": {
      "enabled": true,
      "summarizeAfter": 20,      // Summarize after N messages
      "retentionDays": 90,       // Keep for 90 days
      "autoArchive": true,
      "archivePath": "~/.clawdbot/memory/archive"
    },

    // Knowledge graph (entities & relationships)
    "knowledgeGraph": {
      "enabled": true,
      "extractEntities": true,
      "entityTypes": ["person", "organization", "project", "concept"],
      "backend": "local",        // or "neo4j"
      "backendOptions": {
        "path": "~/.clawdbot/memory/graph"
      }
    },

    // External sources
    "external": [
      {
        "type": "notion",
        "token": "${NOTION_TOKEN}",
        "databases": ["Tasks", "Projects"]
      },
      {
        "type": "obsidian",
        "vault": "~/notes"
      }
    ]
  }
}
```

## Semantic Memory

### How It Works

1. **Ingestion**: Text is chunked into segments
2. **Embedding**: Each chunk is converted to a vector
3. **Storage**: Vectors are stored in the database
4. **Search**: Queries are embedded and compared

### Configuration Options

```json5
{
  "semantic": {
    "enabled": true,
    "embedModel": "text-embedding-3-small",
    "chunkSize": 512,           // Characters per chunk
    "chunkOverlap": 50,         // Overlap between chunks
    "minChunkSize": 100,        // Skip smaller chunks
    "maxResults": 10,           // Max search results
    "similarityThreshold": 0.7, // Minimum similarity score
    "backend": "lancedb"
  }
}
```

### Supported Backends

| Backend | Description | Use Case |
|---------|-------------|----------|
| `local` | File-based vectors | Small deployments |
| `lancedb` | Embedded vector DB | Default, fast local |
| `postgres` | PostgreSQL + pgvector | Production, scalable |
| `qdrant` | Qdrant vector DB | Large scale |

### Usage

```typescript
import { MemoryManager } from "./memory/index.js";

const memory = new MemoryManager(config);

// Add memory
await memory.add({
  content: "User prefers TypeScript over JavaScript",
  metadata: { type: "preference", userId: "user-123" },
});

// Search memory
const results = await memory.search({
  query: "What programming language does the user prefer?",
  limit: 5,
});

console.log("Found:", results.map((r) => r.content));
```

## Episodic Memory

### Conversation Tracking

Episodic memory automatically tracks conversations:

```json5
{
  "episodic": {
    "enabled": true,
    "trackSessions": true,
    "summaryModel": "claude-haiku-3-20240307",
    "summarizeAfter": 20,      // Messages before summary
    "keepLastN": 50,           // Recent messages to keep
    "retentionDays": 90
  }
}
```

### Auto-Summarization

Long conversations are automatically summarized:

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Timeline                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Summary: User discussed project architecture...]           │
│  [Summary: Implemented authentication system...]             │
│  [Recent: Last 50 messages kept in full]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Retrieval

```typescript
// Get session history
const history = await memory.getSessionHistory({
  sessionId: "session-123",
  includeArchived: true,
});

// Get relevant past context
const context = await memory.getRelevantContext({
  query: "authentication implementation",
  sessionId: "current-session",
});
```

## Knowledge Graph

### Entity Extraction

Automatically extract entities from conversations:

```json5
{
  "knowledgeGraph": {
    "enabled": true,
    "extractEntities": true,
    "entityTypes": [
      "person",        // People mentioned
      "organization",  // Companies, teams
      "project",       // Projects, repos
      "concept",       // Technical concepts
      "location",      // Places
      "date"           // Dates, events
    ],
    "extractRelationships": true
  }
}
```

### Graph Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Knowledge Graph                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    [Person: John] ──works_on──► [Project: API]              │
│         │                            │                       │
│         │                            │                       │
│    uses_tool                    depends_on                   │
│         │                            │                       │
│         ▼                            ▼                       │
│    [Concept: TypeScript]      [Project: Auth Service]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Querying the Graph

```typescript
// Find related entities
const related = await memory.graph.findRelated({
  entity: "API Project",
  relationTypes: ["works_on", "depends_on"],
  depth: 2,
});

// Query with natural language
const answer = await memory.graph.query(
  "Who is working on the API project?"
);

// Get entity details
const entity = await memory.graph.getEntity("john-smith");
console.log("John's projects:", entity.relationships.filter(r => r.type === "works_on"));
```

## External Sources

### Notion Integration

```json5
{
  "external": [
    {
      "type": "notion",
      "token": "${NOTION_TOKEN}",
      "sync": {
        "enabled": true,
        "interval": 3600000,  // 1 hour
        "databases": ["Tasks", "Projects", "Meeting Notes"]
      }
    }
  ]
}
```

### Obsidian Integration

```json5
{
  "external": [
    {
      "type": "obsidian",
      "vault": "~/notes",
      "sync": {
        "enabled": true,
        "watch": true,
        "include": ["**/*.md"],
        "exclude": ["templates/**", ".obsidian/**"]
      }
    }
  ]
}
```

### Database Integration

```json5
{
  "external": [
    {
      "type": "postgres",
      "connection": "${DATABASE_URL}",
      "tables": ["users", "projects", "documents"],
      "sync": {
        "enabled": true,
        "interval": 1800000  // 30 minutes
      }
    }
  ]
}
```

## Memory Tools

Agents have access to memory tools:

### memory_search

Search semantic memory:

```typescript
const results = await tools.memory_search({
  query: "authentication implementation details",
  limit: 5,
  filter: { type: "code" },
});
```

### memory_add

Add to memory:

```typescript
await tools.memory_add({
  content: "User prefers detailed explanations",
  metadata: { type: "preference" },
});
```

### memory_graph_query

Query knowledge graph:

```typescript
const answer = await tools.memory_graph_query({
  query: "What projects is John working on?",
});
```

## Programmatic Usage

### MemoryManager API

```typescript
import { MemoryManager } from "./memory/index.js";

// Initialize
const memory = new MemoryManager({
  semantic: { enabled: true, backend: "lancedb" },
  episodic: { enabled: true },
  knowledgeGraph: { enabled: true },
});

// Semantic operations
await memory.semantic.add({ content: "...", metadata: {} });
const results = await memory.semantic.search({ query: "..." });

// Episodic operations
await memory.episodic.recordMessage({ role: "user", content: "..." });
const history = await memory.episodic.getHistory({ sessionId: "..." });

// Knowledge graph operations
await memory.graph.addEntity({ type: "person", name: "John" });
await memory.graph.addRelationship({
  from: "john",
  to: "api-project",
  type: "works_on",
});
const related = await memory.graph.findRelated({ entity: "john" });
```

### Event Handling

```typescript
memory.on("memory:added", ({ id, content }) => {
  console.log(`Added memory: ${id}`);
});

memory.on("entity:extracted", ({ entities }) => {
  console.log(`Extracted ${entities.length} entities`);
});

memory.on("sync:completed", ({ source, count }) => {
  console.log(`Synced ${count} items from ${source}`);
});
```

## CLI Commands

```bash
# Search memory
moltbot memory search "authentication"

# Add to memory
moltbot memory add "Important note about the project"

# List recent memories
moltbot memory list --last 20

# Query knowledge graph
moltbot memory graph "Who works on the API?"

# Sync external sources
moltbot memory sync --source notion

# Export memory
moltbot memory export --format json > memory.json

# Clear memory (careful!)
moltbot memory clear --type semantic --before 2024-01-01
```

## Storage Locations

Default storage locations:

```
~/.clawdbot/memory/
├── vectors/           # Semantic vectors (LanceDB)
├── episodes/          # Conversation history
├── graph/             # Knowledge graph
├── archive/           # Archived sessions
└── external/          # External source cache
```

## Performance Tuning

### Large Deployments

```json5
{
  "memory": {
    "semantic": {
      "backend": "qdrant",
      "backendOptions": {
        "url": "http://qdrant:6333",
        "collection": "moltbot",
        "vectorSize": 1536
      },
      "batchSize": 100,
      "parallelEmbedding": true
    },
    "episodic": {
      "backend": "postgres",
      "backendOptions": {
        "connection": "${DATABASE_URL}"
      }
    },
    "knowledgeGraph": {
      "backend": "neo4j",
      "backendOptions": {
        "url": "bolt://neo4j:7687",
        "user": "neo4j",
        "password": "${NEO4J_PASSWORD}"
      }
    }
  }
}
```

### Caching

```json5
{
  "memory": {
    "cache": {
      "enabled": true,
      "ttl": 300000,        // 5 minutes
      "maxSize": 1000       // Max cached items
    }
  }
}
```

## Troubleshooting

### Search Not Returning Results

1. Verify embeddings are being created:
   ```bash
   moltbot memory stats
   ```

2. Check similarity threshold isn't too high

3. Rebuild index if needed:
   ```bash
   moltbot memory reindex
   ```

### Entity Extraction Missing Items

1. Enable debug logging:
   ```bash
   LOG_LEVEL=debug moltbot gateway
   ```

2. Check entity types are configured

3. Verify extraction model is available

### Sync Failures

1. Check external source credentials

2. Verify network connectivity

3. Review sync logs:
   ```bash
   moltbot memory sync-status
   ```

## See Also

- [Concepts: Memory](/concepts/memory)
- [Agent Debugging](/advanced-tutorials/23-debugging-dashboard)
- [External Integrations](/configuration#external-integrations)
