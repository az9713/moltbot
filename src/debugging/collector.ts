/**
 * Debug Data Collector
 *
 * Collects and aggregates debugging data from agent executions.
 */

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type {
  DebugSession,
  ExecutionContext,
  ToolInvocation,
  TokenUsage,
  TokenBudget,
  CostEstimate,
  PerformanceMetrics,
  DecisionNode,
  DecisionTree,
  SubAgentInfo,
  DashboardConfig,
  DebugEvents,
  AgentExecutionState,
  DashboardSnapshot,
} from "./types.js";

// Default cost per 1K tokens (USD)
const DEFAULT_COSTS: Record<string, { input: number; output: number }> = {
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
  "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-opus-4-5-20251101": { input: 0.015, output: 0.075 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  default: { input: 0.001, output: 0.002 },
};

export type DebugCollectorOptions = {
  config?: DashboardConfig;
};

/**
 * Collects and manages debug data for agent executions
 */
export class DebugCollector extends EventEmitter {
  private config: DashboardConfig;
  private sessions: Map<string, DebugSession> = new Map();
  private executionToSession: Map<string, string> = new Map();
  private dailyStats: {
    date: string;
    tokens: TokenUsage;
    cost: CostEstimate;
  } = {
    date: new Date().toISOString().split("T")[0],
    tokens: { input: 0, output: 0, total: 0 },
    cost: { inputCost: 0, outputCost: 0, totalCost: 0, currency: "USD" },
  };

  constructor(options?: DebugCollectorOptions) {
    super();
    this.config = options?.config ?? { enabled: true };
  }

  // =========================================================================
  // Session Management
  // =========================================================================

  /**
   * Start a new debug session
   */
  startSession(params: {
    agentId: string;
    sessionId?: string;
    channel?: string;
    maxTokens?: number;
  }): DebugSession {
    const id = params.sessionId ?? randomUUID();

    const session: DebugSession = {
      id,
      agentId: params.agentId,
      channel: params.channel,
      startedAt: new Date(),
      executions: [],
      toolInvocations: [],
      subAgents: [],
      tokenBudget: {
        maxTokens: params.maxTokens ?? 200000,
        usedTokens: 0,
        percentUsed: 0,
        warningThreshold: 80,
        isWarning: false,
      },
      cost: { inputCost: 0, outputCost: 0, totalCost: 0, currency: "USD" },
      metrics: {
        apiCalls: 0,
        retries: 0,
        toolCalls: 0,
      },
      errors: [],
      isActive: true,
    };

    this.sessions.set(id, session);

    // Enforce max sessions limit
    this.enforceSessionLimit();

    this.emitEvent("session:created", { sessionId: id });

    return session;
  }

  /**
   * End a debug session
   */
  endSession(sessionId: string): DebugSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endedAt = new Date();
    session.isActive = false;

    // Calculate final metrics
    this.calculateSessionMetrics(session);

    this.emitEvent("session:ended", { sessionId });

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): DebugSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  /**
   * Get all sessions
   */
  getAllSessions(limit = 100): DebugSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  // =========================================================================
  // Execution Tracking
  // =========================================================================

  /**
   * Start tracking an execution
   */
  startExecution(params: {
    sessionId: string;
    agentId: string;
    prompt?: string;
    model?: string;
    parentExecutionId?: string;
  }): ExecutionContext {
    const session = this.sessions.get(params.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${params.sessionId}`);
    }

    const execution: ExecutionContext = {
      id: randomUUID(),
      agentId: params.agentId,
      sessionId: params.sessionId,
      channel: session.channel,
      state: "thinking",
      startedAt: new Date(),
      currentPrompt: params.prompt,
      model: params.model,
      parentExecutionId: params.parentExecutionId,
    };

    session.executions.push(execution);
    session.metrics.apiCalls++;
    this.executionToSession.set(execution.id, params.sessionId);

    this.emitEvent("execution:started", { execution });

    return execution;
  }

  /**
   * Update execution state
   */
  updateExecutionState(executionId: string, state: AgentExecutionState): void {
    const sessionId = this.executionToSession.get(executionId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const execution = session.executions.find((e) => e.id === executionId);
    if (!execution) return;

    execution.state = state;

    if (state === "completed" || state === "failed") {
      execution.endedAt = new Date();
    }

    this.emitEvent("execution:stateChanged", { executionId, state });

    if (state === "completed") {
      const duration = execution.endedAt!.getTime() - execution.startedAt.getTime();
      this.emitEvent("execution:completed", { executionId, duration });
    } else if (state === "failed") {
      this.emitEvent("execution:failed", { executionId, error: "Execution failed" });
    }
  }

  /**
   * Record execution failure
   */
  recordExecutionError(executionId: string, error: string, stack?: string): void {
    const sessionId = this.executionToSession.get(executionId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.errors.push({
      timestamp: new Date(),
      message: error,
      stack,
    });

    // Limit errors per session
    const maxErrors = this.config.maxEventsPerSession ?? 1000;
    if (session.errors.length > maxErrors) {
      session.errors = session.errors.slice(-maxErrors);
    }

    this.updateExecutionState(executionId, "failed");
    this.emitEvent("error", { sessionId, error });
  }

  // =========================================================================
  // Tool Invocation Tracking
  // =========================================================================

  /**
   * Record a tool invocation
   */
  recordToolInvocation(params: {
    executionId: string;
    toolName: string;
    input: unknown;
  }): ToolInvocation {
    const sessionId = this.executionToSession.get(params.executionId);
    if (!sessionId) {
      throw new Error(`Execution not found: ${params.executionId}`);
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const invocation: ToolInvocation = {
      id: randomUUID(),
      executionId: params.executionId,
      toolName: params.toolName,
      input: params.input,
      status: "running",
      invokedAt: new Date(),
    };

    session.toolInvocations.push(invocation);
    session.metrics.toolCalls++;

    // Update execution state
    this.updateExecutionState(params.executionId, "tool_calling");

    this.emitEvent("tool:invoked", { invocation });

    return invocation;
  }

  /**
   * Complete a tool invocation
   */
  completeToolInvocation(
    invocationId: string,
    result: { output?: unknown; error?: string; tokenUsage?: TokenUsage },
  ): void {
    const invocation = this.findToolInvocation(invocationId);
    if (!invocation) return;

    invocation.completedAt = new Date();
    invocation.durationMs = invocation.completedAt.getTime() - invocation.invokedAt.getTime();
    invocation.status = result.error ? "failed" : "completed";
    invocation.output = result.output;
    invocation.error = result.error;
    invocation.tokenUsage = result.tokenUsage;

    if (result.error) {
      this.emitEvent("tool:failed", { invocationId, error: result.error });
    } else {
      this.emitEvent("tool:completed", { invocationId, duration: invocation.durationMs });
    }
  }

  /**
   * Block a tool invocation
   */
  blockToolInvocation(invocationId: string, reason: string): void {
    const invocation = this.findToolInvocation(invocationId);
    if (!invocation) return;

    invocation.status = "blocked";
    invocation.blockedReason = reason;
    invocation.completedAt = new Date();

    this.emitEvent("tool:blocked", { invocationId, reason });
  }

  // =========================================================================
  // Token Tracking
  // =========================================================================

  /**
   * Update token usage
   */
  updateTokenUsage(executionId: string, usage: TokenUsage, model?: string): void {
    const sessionId = this.executionToSession.get(executionId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update session token budget
    session.tokenBudget.usedTokens += usage.total;
    session.tokenBudget.percentUsed =
      (session.tokenBudget.usedTokens / session.tokenBudget.maxTokens) * 100;
    session.tokenBudget.isWarning =
      session.tokenBudget.percentUsed >= (session.tokenBudget.warningThreshold ?? 80);

    // Update costs
    const modelCosts = DEFAULT_COSTS[model ?? "default"] ?? DEFAULT_COSTS.default;
    const inputCost = (usage.input / 1000) * modelCosts.input;
    const outputCost = (usage.output / 1000) * modelCosts.output;

    session.cost.inputCost += inputCost;
    session.cost.outputCost += outputCost;
    session.cost.totalCost = session.cost.inputCost + session.cost.outputCost;

    // Update daily stats
    this.updateDailyStats(usage, inputCost, outputCost);

    this.emitEvent("tokens:updated", { executionId, usage });

    if (session.tokenBudget.isWarning) {
      this.emitEvent("tokens:warning", {
        executionId,
        percentUsed: session.tokenBudget.percentUsed,
      });
    }
  }

  /**
   * Get token budget for a session
   */
  getTokenBudget(sessionId: string): TokenBudget | null {
    const session = this.sessions.get(sessionId);
    return session?.tokenBudget ?? null;
  }

  // =========================================================================
  // Sub-Agent Tracking
  // =========================================================================

  /**
   * Track a sub-agent start
   */
  recordSubAgentStart(params: {
    sessionId: string;
    agentId: string;
    type: string;
    task?: string;
  }): SubAgentInfo {
    const session = this.sessions.get(params.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${params.sessionId}`);
    }

    const subAgent: SubAgentInfo = {
      agentId: params.agentId,
      type: params.type,
      state: "thinking",
      task: params.task,
      startedAt: new Date(),
    };

    session.subAgents.push(subAgent);
    this.emitEvent("subagent:started", { subAgent });

    return subAgent;
  }

  /**
   * Complete a sub-agent
   */
  completeSubAgent(
    sessionId: string,
    agentId: string,
    result: { output?: string; error?: string; tokenUsage?: TokenUsage },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const subAgent = session.subAgents.find((s) => s.agentId === agentId);
    if (!subAgent) return;

    subAgent.completedAt = new Date();
    subAgent.state = result.error ? "failed" : "completed";
    subAgent.result = result.output;
    subAgent.error = result.error;
    subAgent.tokenUsage = result.tokenUsage;

    if (result.error) {
      this.emitEvent("subagent:failed", { agentId, error: result.error });
    } else {
      this.emitEvent("subagent:completed", { agentId, result: result.output });
    }
  }

  // =========================================================================
  // Decision Tree Tracking
  // =========================================================================

  /**
   * Add a decision node
   */
  addDecisionNode(sessionId: string, node: Omit<DecisionNode, "id" | "timestamp">): DecisionNode {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const fullNode: DecisionNode = {
      ...node,
      id: randomUUID(),
      timestamp: new Date(),
    };

    if (!session.decisionTree) {
      session.decisionTree = {
        rootId: fullNode.id,
        nodes: new Map(),
      };
    }

    session.decisionTree.nodes.set(fullNode.id, fullNode);
    session.decisionTree.currentNodeId = fullNode.id;

    // Update parent's children
    if (fullNode.parentId) {
      const parent = session.decisionTree.nodes.get(fullNode.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(fullNode.id);
      }
    }

    this.emitEvent("decision:node", { node: fullNode });

    return fullNode;
  }

  /**
   * Get decision tree for a session
   */
  getDecisionTree(sessionId: string): DecisionTree | null {
    const session = this.sessions.get(sessionId);
    return session?.decisionTree ?? null;
  }

  // =========================================================================
  // Snapshot & Statistics
  // =========================================================================

  /**
   * Get current dashboard snapshot
   */
  getSnapshot(): DashboardSnapshot {
    const activeSessions = this.getActiveSessions();

    // Count active executions
    let activeExecutions = 0;
    for (const session of activeSessions) {
      activeExecutions += session.executions.filter(
        (e) => e.state !== "completed" && e.state !== "failed",
      ).length;
    }

    // Count active sub-agents
    let activeSubAgents = 0;
    for (const session of activeSessions) {
      activeSubAgents += session.subAgents.filter(
        (s) => s.state !== "completed" && s.state !== "failed",
      ).length;
    }

    // Count recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let recentErrors = 0;
    for (const session of this.sessions.values()) {
      recentErrors += session.errors.filter((e) => e.timestamp >= oneHourAgo).length;
    }

    // Sessions by channel
    const sessionsByChannel: Record<string, number> = {};
    for (const session of activeSessions) {
      const channel = session.channel ?? "unknown";
      sessionsByChannel[channel] = (sessionsByChannel[channel] ?? 0) + 1;
    }

    // Top agents by usage
    const agentUsage = new Map<string, number>();
    for (const session of this.sessions.values()) {
      const current = agentUsage.get(session.agentId) ?? 0;
      agentUsage.set(session.agentId, current + session.tokenBudget.usedTokens);
    }
    const topAgentsByUsage = Array.from(agentUsage.entries())
      .map(([agentId, tokens]) => ({ agentId, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    return {
      timestamp: new Date(),
      activeSessions: activeSessions.length,
      activeExecutions,
      tokensToday: { ...this.dailyStats.tokens },
      costToday: { ...this.dailyStats.cost },
      activeSubAgents,
      recentErrors,
      sessionsByChannel,
      topAgentsByUsage,
    };
  }

  /**
   * Get tool invocation statistics
   */
  getToolStats(sessionId?: string): Map<string, { count: number; avgDuration: number; errorRate: number }> {
    const stats = new Map<string, { count: number; totalDuration: number; errors: number }>();

    const sessions = sessionId
      ? [this.sessions.get(sessionId)].filter(Boolean)
      : Array.from(this.sessions.values());

    for (const session of sessions) {
      if (!session) continue;

      for (const invocation of session.toolInvocations) {
        const current = stats.get(invocation.toolName) ?? {
          count: 0,
          totalDuration: 0,
          errors: 0,
        };

        current.count++;
        if (invocation.durationMs) {
          current.totalDuration += invocation.durationMs;
        }
        if (invocation.status === "failed") {
          current.errors++;
        }

        stats.set(invocation.toolName, current);
      }
    }

    const result = new Map<string, { count: number; avgDuration: number; errorRate: number }>();
    for (const [tool, data] of stats) {
      result.set(tool, {
        count: data.count,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
        errorRate: data.count > 0 ? data.errors / data.count : 0,
      });
    }

    return result;
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private findToolInvocation(invocationId: string): ToolInvocation | null {
    for (const session of this.sessions.values()) {
      const invocation = session.toolInvocations.find((i) => i.id === invocationId);
      if (invocation) return invocation;
    }
    return null;
  }

  private calculateSessionMetrics(session: DebugSession): void {
    const completedInvocations = session.toolInvocations.filter(
      (i) => i.status === "completed" && i.durationMs,
    );

    if (completedInvocations.length > 0) {
      const totalDuration = completedInvocations.reduce((sum, i) => sum + (i.durationMs ?? 0), 0);
      session.metrics.avgToolDuration = totalDuration / completedInvocations.length;
    }

    // Calculate total time
    if (session.endedAt && session.startedAt) {
      session.metrics.totalTime = session.endedAt.getTime() - session.startedAt.getTime();

      // Calculate tokens per second
      if (session.tokenBudget.usedTokens > 0 && session.metrics.totalTime > 0) {
        session.metrics.tokensPerSecond =
          session.tokenBudget.usedTokens / (session.metrics.totalTime / 1000);
      }
    }
  }

  private updateDailyStats(usage: TokenUsage, inputCost: number, outputCost: number): void {
    const today = new Date().toISOString().split("T")[0];

    // Reset if new day
    if (this.dailyStats.date !== today) {
      this.dailyStats = {
        date: today,
        tokens: { input: 0, output: 0, total: 0 },
        cost: { inputCost: 0, outputCost: 0, totalCost: 0, currency: "USD" },
      };
    }

    this.dailyStats.tokens.input += usage.input;
    this.dailyStats.tokens.output += usage.output;
    this.dailyStats.tokens.total += usage.total;
    this.dailyStats.cost.inputCost += inputCost;
    this.dailyStats.cost.outputCost += outputCost;
    this.dailyStats.cost.totalCost = this.dailyStats.cost.inputCost + this.dailyStats.cost.outputCost;
  }

  private enforceSessionLimit(): void {
    const maxSessions = this.config.maxSessions ?? 100;

    if (this.sessions.size > maxSessions) {
      // Remove oldest inactive sessions
      const sorted = Array.from(this.sessions.entries())
        .filter(([_, s]) => !s.isActive)
        .sort((a, b) => a[1].startedAt.getTime() - b[1].startedAt.getTime());

      const toRemove = sorted.slice(0, this.sessions.size - maxSessions);
      for (const [id] of toRemove) {
        this.sessions.delete(id);
      }
    }
  }

  private emitEvent<K extends keyof DebugEvents>(event: K, data: DebugEvents[K]): void {
    this.emit(event, data);
  }
}
