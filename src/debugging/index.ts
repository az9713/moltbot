/**
 * Agent Debugging & Observability System
 *
 * Provides real-time visibility into agent execution, token usage,
 * and decision-making through a web-based dashboard.
 *
 * Features:
 * - Live execution tracking
 * - Token budget monitoring
 * - Tool invocation logging
 * - Decision tree visualization
 * - Sub-agent tracking
 * - Cost estimation
 * - Performance metrics
 *
 * @example
 * ```typescript
 * import { DebugCollector, DashboardServer } from './debugging';
 *
 * // Create collector
 * const collector = new DebugCollector({
 *   config: { enabled: true, trackCosts: true },
 * });
 *
 * // Start a session
 * const session = collector.startSession({
 *   agentId: 'main',
 *   sessionId: 'telegram:123',
 *   channel: 'telegram',
 *   maxTokens: 100000,
 * });
 *
 * // Track execution
 * const execution = collector.startExecution({
 *   sessionId: session.id,
 *   agentId: 'main',
 *   prompt: 'User request...',
 *   model: 'claude-sonnet-4-20250514',
 * });
 *
 * // Track tool calls
 * const invocation = collector.recordToolInvocation({
 *   executionId: execution.id,
 *   toolName: 'web_search',
 *   input: { query: 'test' },
 * });
 *
 * collector.completeToolInvocation(invocation.id, {
 *   output: { results: [...] },
 * });
 *
 * // Update tokens
 * collector.updateTokenUsage(execution.id, {
 *   input: 1000,
 *   output: 500,
 *   total: 1500,
 * });
 *
 * // Start dashboard server
 * const dashboard = new DashboardServer({
 *   collector,
 *   config: { port: 9999, liveUpdates: true },
 * });
 *
 * await dashboard.start();
 * // Dashboard available at http://localhost:9999
 * ```
 */

export { DebugCollector, type DebugCollectorOptions } from "./collector.js";
export { DashboardServer, type DashboardServerOptions } from "./dashboard-server.js";

export type {
  // Execution state
  AgentExecutionState,
  ExecutionContext,
  // Token tracking
  TokenUsage,
  TokenBudget,
  CostEstimate,
  // Tool invocation
  ToolInvocationStatus,
  ToolInvocation,
  // Decision tree
  DecisionNodeType,
  DecisionNode,
  DecisionTree,
  // Sub-agents
  SubAgentInfo,
  // Performance
  PerformanceMetrics,
  // Session
  DebugSession,
  // Configuration
  DashboardConfig,
  // Events
  DebugEvents,
  // Snapshot
  DashboardSnapshot,
} from "./types.js";
