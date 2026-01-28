/**
 * Agent Hooks Helper Functions
 *
 * Convenience functions for creating and triggering common hook events.
 */

import type {
  AgentHookContext,
  AgentStartEvent,
  AgentStopEvent,
  AgentErrorEvent,
  ToolInvokeEvent,
  ToolResultEvent,
  TokenThresholdEvent,
  MessageReceivedEvent,
  MessageSendingEvent,
  SessionStartEvent,
  SessionEndEvent,
  CompactionBeforeEvent,
  CompactionAfterEvent,
} from "./types.js";
import { triggerAgentHook } from "./registry.js";

/**
 * Create a hook context from common parameters
 */
export function createHookContext(params: {
  agentId: string;
  sessionKey: string;
  channel?: string;
  accountId?: string;
}): AgentHookContext {
  return {
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    channel: params.channel,
    accountId: params.accountId,
    timestamp: new Date(),
  };
}

/**
 * Trigger agent start hook
 */
export async function triggerAgentStart(params: {
  context: AgentHookContext;
  prompt: string;
  model?: string;
}): Promise<boolean> {
  const event: AgentStartEvent = {
    type: "agent:start",
    context: params.context,
    prompt: params.prompt,
    model: params.model,
  };

  const result = await triggerAgentHook(event);
  return result.proceed;
}

/**
 * Trigger agent stop hook
 */
export async function triggerAgentStop(params: {
  context: AgentHookContext;
  success: boolean;
  durationMs: number;
  tokensUsed?: { input: number; output: number };
}): Promise<void> {
  const event: AgentStopEvent = {
    type: "agent:stop",
    context: params.context,
    success: params.success,
    durationMs: params.durationMs,
    tokensUsed: params.tokensUsed,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger agent error hook
 */
export async function triggerAgentError(params: {
  context: AgentHookContext;
  error: Error;
  recoverable: boolean;
}): Promise<void> {
  const event: AgentErrorEvent = {
    type: "agent:error",
    context: params.context,
    error: params.error,
    recoverable: params.recoverable,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger tool invoke hook and check if tool should proceed
 */
export async function triggerToolInvoke(params: {
  context: AgentHookContext;
  toolName: string;
  toolArgs: Record<string, unknown>;
}): Promise<{ proceed: boolean; blockReason?: string }> {
  const event: ToolInvokeEvent = {
    type: "tool:invoke",
    context: params.context,
    toolName: params.toolName,
    toolArgs: params.toolArgs,
  };

  const result = await triggerAgentHook(event);
  return {
    proceed: result.proceed,
    blockReason: result.blockReason,
  };
}

/**
 * Trigger tool result hook
 */
export async function triggerToolResult(params: {
  context: AgentHookContext;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}): Promise<void> {
  const event: ToolResultEvent = {
    type: "tool:result",
    context: params.context,
    toolName: params.toolName,
    toolArgs: params.toolArgs,
    result: params.result,
    durationMs: params.durationMs,
    success: params.success,
    error: params.error,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger token threshold hook
 */
export async function triggerTokenThreshold(params: {
  context: AgentHookContext;
  tokensUsed: number;
  maxTokens: number;
  level: "warning" | "critical";
}): Promise<void> {
  const percentage = (params.tokensUsed / params.maxTokens) * 100;

  const event: TokenThresholdEvent = {
    type: "token:threshold",
    context: params.context,
    tokensUsed: params.tokensUsed,
    maxTokens: params.maxTokens,
    percentage,
    level: params.level,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger message received hook
 */
export async function triggerMessageReceived(params: {
  context: AgentHookContext;
  from: string;
  content: string;
  messageId?: string;
}): Promise<boolean> {
  const event: MessageReceivedEvent = {
    type: "message:received",
    context: params.context,
    from: params.from,
    content: params.content,
    messageId: params.messageId,
  };

  const result = await triggerAgentHook(event);
  return result.proceed;
}

/**
 * Trigger message sending hook and check if message should be sent
 */
export async function triggerMessageSending(params: {
  context: AgentHookContext;
  to: string;
  content: string;
}): Promise<{ proceed: boolean; content?: string }> {
  const event: MessageSendingEvent = {
    type: "message:sending",
    context: params.context,
    to: params.to,
    content: params.content,
  };

  const result = await triggerAgentHook(event);

  // Check if content was transformed
  const transformedContent =
    result.transformed && "content" in result.transformed
      ? (result.transformed as { content?: string }).content
      : undefined;

  return {
    proceed: result.proceed,
    content: transformedContent ?? params.content,
  };
}

/**
 * Trigger session start hook
 */
export async function triggerSessionStart(params: {
  context: AgentHookContext;
  resumedFrom?: string;
}): Promise<void> {
  const event: SessionStartEvent = {
    type: "session:start",
    context: params.context,
    resumedFrom: params.resumedFrom,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger session end hook
 */
export async function triggerSessionEnd(params: {
  context: AgentHookContext;
  messageCount: number;
  durationMs: number;
}): Promise<void> {
  const event: SessionEndEvent = {
    type: "session:end",
    context: params.context,
    messageCount: params.messageCount,
    durationMs: params.durationMs,
  };

  await triggerAgentHook(event);
}

/**
 * Trigger compaction before hook
 */
export async function triggerCompactionBefore(params: {
  context: AgentHookContext;
  messageCount: number;
  tokenCount: number;
}): Promise<boolean> {
  const event: CompactionBeforeEvent = {
    type: "compaction:before",
    context: params.context,
    messageCount: params.messageCount,
    tokenCount: params.tokenCount,
  };

  const result = await triggerAgentHook(event);
  return result.proceed;
}

/**
 * Trigger compaction after hook
 */
export async function triggerCompactionAfter(params: {
  context: AgentHookContext;
  messageCount: number;
  tokenCount: number;
  compactedCount: number;
}): Promise<void> {
  const event: CompactionAfterEvent = {
    type: "compaction:after",
    context: params.context,
    messageCount: params.messageCount,
    tokenCount: params.tokenCount,
    compactedCount: params.compactedCount,
  };

  await triggerAgentHook(event);
}

/**
 * Token threshold monitor for automatic threshold detection
 */
export class TokenThresholdMonitor {
  private warningThreshold: number;
  private criticalThreshold: number;
  private lastWarningAt: number | null = null;
  private lastCriticalAt: number | null = null;
  private cooldownMs: number;

  constructor(options?: {
    warningThreshold?: number;
    criticalThreshold?: number;
    cooldownMs?: number;
  }) {
    this.warningThreshold = options?.warningThreshold ?? 70;
    this.criticalThreshold = options?.criticalThreshold ?? 90;
    this.cooldownMs = options?.cooldownMs ?? 60000;
  }

  /**
   * Check token usage and trigger threshold events if needed
   */
  async check(params: {
    context: AgentHookContext;
    tokensUsed: number;
    maxTokens: number;
  }): Promise<void> {
    const percentage = (params.tokensUsed / params.maxTokens) * 100;
    const now = Date.now();

    if (
      percentage >= this.criticalThreshold &&
      (!this.lastCriticalAt || now - this.lastCriticalAt > this.cooldownMs)
    ) {
      this.lastCriticalAt = now;
      await triggerTokenThreshold({
        context: params.context,
        tokensUsed: params.tokensUsed,
        maxTokens: params.maxTokens,
        level: "critical",
      });
    } else if (
      percentage >= this.warningThreshold &&
      percentage < this.criticalThreshold &&
      (!this.lastWarningAt || now - this.lastWarningAt > this.cooldownMs)
    ) {
      this.lastWarningAt = now;
      await triggerTokenThreshold({
        context: params.context,
        tokensUsed: params.tokensUsed,
        maxTokens: params.maxTokens,
        level: "warning",
      });
    }
  }

  /**
   * Reset the monitor state
   */
  reset(): void {
    this.lastWarningAt = null;
    this.lastCriticalAt = null;
  }
}
