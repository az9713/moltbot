---
summary: "Advanced Tutorials: deep dives into MCP, hooks, orchestration, and more"
---

# Advanced Tutorials

Deep-dive tutorials for advanced Moltbot features. These guides cover enterprise capabilities, multi-agent systems, and integration patterns.

## Feature Tutorials

### Integration

| Tutorial | Description |
|----------|-------------|
| [MCP Integration](/advanced-tutorials/17-mcp-integration) | Connect external tools via Model Context Protocol |
| [Cross-Channel Canvas](/advanced-tutorials/24-cross-channel-canvas) | Rich content rendering with platform-specific fallbacks |

### Agent Systems

| Tutorial | Description |
|----------|-------------|
| [Agent Hooks System](/advanced-tutorials/18-agent-hooks-system) | Event-driven lifecycle interception for security and logging |
| [Skills Marketplace](/advanced-tutorials/19-skills-marketplace) | Discoverable, versioned, reusable sub-agent templates |
| [Agent Orchestration](/advanced-tutorials/20-agent-orchestration) | Coordinate multiple specialized agents |
| [Proactive Agents](/advanced-tutorials/21-proactive-agents) | Autonomous agents triggered by schedules and events |

### Data & Memory

| Tutorial | Description |
|----------|-------------|
| [Memory & Knowledge Graph](/advanced-tutorials/22-memory-knowledge-graph) | Persistent semantic memory with entity relationships |

### Operations

| Tutorial | Description |
|----------|-------------|
| [Debugging Dashboard](/advanced-tutorials/23-debugging-dashboard) | Real-time agent observability and cost tracking |
| [Security Enhancements](/advanced-tutorials/25-security-enhancements) | RBAC, audit logging, rate limiting |

## Quick Navigation

### By Use Case

**I want to connect external tools:**
- Start with [MCP Integration](/advanced-tutorials/17-mcp-integration)

**I want to control agent behavior:**
- See [Agent Hooks System](/advanced-tutorials/18-agent-hooks-system)
- See [Security Enhancements](/advanced-tutorials/25-security-enhancements)

**I want reusable agent templates:**
- Check [Skills Marketplace](/advanced-tutorials/19-skills-marketplace)

**I want multiple agents working together:**
- Read [Agent Orchestration](/advanced-tutorials/20-agent-orchestration)

**I want agents that run automatically:**
- Explore [Proactive Agents](/advanced-tutorials/21-proactive-agents)

**I want agents to remember things:**
- See [Memory & Knowledge Graph](/advanced-tutorials/22-memory-knowledge-graph)

**I want to debug agent issues:**
- Use [Debugging Dashboard](/advanced-tutorials/23-debugging-dashboard)

**I want rich content in messages:**
- Check [Cross-Channel Canvas](/advanced-tutorials/24-cross-channel-canvas)

## Prerequisites

These tutorials assume familiarity with:

- Basic Moltbot configuration
- Agent concepts and sessions
- Channel setup and messaging

If you're new to Moltbot, start with:

- [Getting Started](/install)
- [Configuration](/configuration)
- [Concepts](/concepts)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Moltbot Advanced Features                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │     MCP     │  │    Agent    │  │   Skills    │              │
│  │ Integration │  │    Hooks    │  │ Marketplace │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐              │
│  │ Orchestrator│  │  Proactive  │  │   Memory    │              │
│  │   System    │  │   Agents    │  │    Graph    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Core Platform                          │   │
│  │  [Debug Dashboard] [Canvas System] [Security Layer]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Matrix

| Feature | Agents | Channels | Tools | Config |
|---------|--------|----------|-------|--------|
| MCP Integration | ✓ Per-agent | - | ✓ Dynamic | ✓ |
| Agent Hooks | ✓ All | ✓ All | ✓ Intercept | ✓ |
| Skills | ✓ Templates | - | ✓ Bundled | ✓ |
| Orchestration | ✓ Multi | - | ✓ Shared | ✓ |
| Proactive | ✓ Background | ✓ Delivery | ✓ All | ✓ |
| Memory Graph | ✓ Persistent | - | ✓ Search | ✓ |
| Debug Dashboard | ✓ Trace | ✓ Track | ✓ Log | - |
| Canvas | - | ✓ Render | - | ✓ |
| Security | ✓ RBAC | ✓ Policies | ✓ Limits | ✓ |

## Getting Help

- Check the [troubleshooting sections](#) in each tutorial
- Review [Debugging](/debugging) for common issues
- Ask in the community channels
