/**
 * Agent Debugging & Observability Types
 *
 * Types for real-time visibility into agent execution,
 * token usage, and decision-making.
 */

// ============================================================================
// Execution State
// ============================================================================

export type AgentExecutionState = "idle" | "thinking" | "tool_calling" | "waiting" | "completed" | "failed";

export type ExecutionContext = {
  /** Execution ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Channel (telegram, discord, etc.) */
  channel?: string;
  /** Current state */
  state: AgentExecutionState;
  /** When execution started */
  startedAt: Date;
  /** When execution ended */
  endedAt?: Date;
  /** Current prompt being processed */
  currentPrompt?: string;
  /** Model being used */
  model?: string;
  /** Parent execution ID (for sub-agents) */
  parentExecutionId?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Token Usage Tracking
// ============================================================================

export type TokenUsage = {
  /** Input tokens */
  input: number;
  /** Output tokens */
  output: number;
  /** Cache read tokens */
  cacheRead?: number;
  /** Cache write tokens */
  cacheWrite?: number;
  /** Total tokens */
  total: number;
};

export type TokenBudget = {
  /** Maximum tokens for this session */
  maxTokens: number;
  /** Tokens used so far */
  usedTokens: number;
  /** Percentage used */
  percentUsed: number;
  /** Warning threshold percentage */
  warningThreshold?: number;
  /** Is over warning threshold */
  isWarning: boolean;
};

export type CostEstimate = {
  /** Input cost in USD */
  inputCost: number;
  /** Output cost in USD */
  outputCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Currency */
  currency: "USD";
};

// ============================================================================
// Tool Invocation Tracking
// ============================================================================

export type ToolInvocationStatus = "pending" | "running" | "completed" | "failed" | "blocked";

export type ToolInvocation = {
  /** Invocation ID */
  id: string;
  /** Execution context ID */
  executionId: string;
  /** Tool name */
  toolName: string;
  /** Tool input (JSON) */
  input: unknown;
  /** Tool output */
  output?: unknown;
  /** Error if failed */
  error?: string;
  /** Status */
  status: ToolInvocationStatus;
  /** When invoked */
  invokedAt: Date;
  /** When completed */
  completedAt?: Date;
  /** Duration in ms */
  durationMs?: number;
  /** Token usage for this tool call */
  tokenUsage?: TokenUsage;
  /** Was this blocked by policy */
  blockedReason?: string;
};

// ============================================================================
// Decision Tree / Reasoning
// ============================================================================

export type DecisionNodeType = "thought" | "action" | "observation" | "conclusion";

export type DecisionNode = {
  /** Node ID */
  id: string;
  /** Parent node ID */
  parentId?: string;
  /** Node type */
  type: DecisionNodeType;
  /** Content/description */
  content: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Timestamp */
  timestamp: Date;
  /** Associated tool invocation */
  toolInvocationId?: string;
  /** Children node IDs */
  children?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
};

export type DecisionTree = {
  /** Root node ID */
  rootId: string;
  /** All nodes */
  nodes: Map<string, DecisionNode>;
  /** Current active node */
  currentNodeId?: string;
};

// ============================================================================
// Sub-Agent Tracking
// ============================================================================

export type SubAgentInfo = {
  /** Agent ID */
  agentId: string;
  /** Agent type (Explore, Plan, etc.) */
  type: string;
  /** Current state */
  state: AgentExecutionState;
  /** Task description */
  task?: string;
  /** When started */
  startedAt: Date;
  /** When completed */
  completedAt?: Date;
  /** Token usage */
  tokenUsage?: TokenUsage;
  /** Result summary */
  result?: string;
  /** Error if failed */
  error?: string;
};

// ============================================================================
// Performance Metrics
// ============================================================================

export type PerformanceMetrics = {
  /** Time to first token */
  ttft?: number;
  /** Total response time */
  totalTime?: number;
  /** Tokens per second */
  tokensPerSecond?: number;
  /** Number of API calls */
  apiCalls: number;
  /** Number of retries */
  retries: number;
  /** Number of tool calls */
  toolCalls: number;
  /** Average tool call duration */
  avgToolDuration?: number;
};

// ============================================================================
// Debug Session
// ============================================================================

export type DebugSession = {
  /** Session ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Channel */
  channel?: string;
  /** When session started */
  startedAt: Date;
  /** When session ended */
  endedAt?: Date;
  /** Executions in this session */
  executions: ExecutionContext[];
  /** Tool invocations */
  toolInvocations: ToolInvocation[];
  /** Decision tree */
  decisionTree?: DecisionTree;
  /** Active sub-agents */
  subAgents: SubAgentInfo[];
  /** Token budget */
  tokenBudget: TokenBudget;
  /** Total cost */
  cost: CostEstimate;
  /** Performance metrics */
  metrics: PerformanceMetrics;
  /** Errors encountered */
  errors: Array<{ timestamp: Date; message: string; stack?: string }>;
  /** Is session active */
  isActive: boolean;
};

// ============================================================================
// Dashboard Configuration
// ============================================================================

export type DashboardConfig = {
  /** Enable debug dashboard */
  enabled?: boolean;
  /** Dashboard port */
  port?: number;
  /** Enable live updates via WebSocket */
  liveUpdates?: boolean;
  /** Update interval in ms */
  updateInterval?: number;
  /** Maximum sessions to retain */
  maxSessions?: number;
  /** Maximum events per session */
  maxEventsPerSession?: number;
  /** Enable cost tracking */
  trackCosts?: boolean;
  /** Cost per 1K input tokens by model */
  inputCostPer1K?: Record<string, number>;
  /** Cost per 1K output tokens by model */
  outputCostPer1K?: Record<string, number>;
};

// ============================================================================
// Events
// ============================================================================

export type DebugEvents = {
  "execution:started": { execution: ExecutionContext };
  "execution:stateChanged": { executionId: string; state: AgentExecutionState };
  "execution:completed": { executionId: string; duration: number };
  "execution:failed": { executionId: string; error: string };
  "tool:invoked": { invocation: ToolInvocation };
  "tool:completed": { invocationId: string; duration: number };
  "tool:failed": { invocationId: string; error: string };
  "tool:blocked": { invocationId: string; reason: string };
  "tokens:updated": { executionId: string; usage: TokenUsage };
  "tokens:warning": { executionId: string; percentUsed: number };
  "subagent:started": { subAgent: SubAgentInfo };
  "subagent:completed": { agentId: string; result?: string };
  "subagent:failed": { agentId: string; error: string };
  "decision:node": { node: DecisionNode };
  "session:created": { sessionId: string };
  "session:ended": { sessionId: string };
  "error": { sessionId: string; error: string };
};

// ============================================================================
// Snapshot Types
// ============================================================================

export type DashboardSnapshot = {
  /** Timestamp */
  timestamp: Date;
  /** Active sessions count */
  activeSessions: number;
  /** Active executions */
  activeExecutions: number;
  /** Total tokens today */
  tokensToday: TokenUsage;
  /** Total cost today */
  costToday: CostEstimate;
  /** Active sub-agents */
  activeSubAgents: number;
  /** Recent errors */
  recentErrors: number;
  /** Sessions by channel */
  sessionsByChannel: Record<string, number>;
  /** Top agents by usage */
  topAgentsByUsage: Array<{ agentId: string; tokens: number }>;
};
