/**
 * Agent Hooks System
 *
 * Event-driven hooks that intercept and modify agent behavior at key lifecycle points.
 *
 * Features:
 * - Hook events: agent:start, agent:stop, agent:error, tool:invoke, tool:result,
 *   token:threshold, message:received, message:sending, session:start, session:end
 * - Actions: allow, deny, require_approval, alert, log, transform, custom
 * - Configurable match conditions (tool, channel, time window, token threshold)
 * - Notification support (Telegram, Discord, Slack, webhook)
 * - Rate limiting for notifications
 *
 * @example
 * ```typescript
 * import { getAgentHooksRegistry, triggerToolInvoke, createHookContext } from './agent-hooks';
 *
 * // Configure hooks
 * const registry = getAgentHooksRegistry({
 *   enabled: true,
 *   hooks: [
 *     {
 *       name: 'Block rm commands',
 *       events: ['tool:invoke'],
 *       match: { tool: 'bash', 'args.*': '*rm*' },
 *       action: 'deny',
 *       message: 'rm commands are not allowed',
 *     },
 *   ],
 * });
 *
 * // Trigger hook before tool execution
 * const context = createHookContext({ agentId: 'main', sessionKey: 'telegram:123' });
 * const result = await triggerToolInvoke({
 *   context,
 *   toolName: 'bash',
 *   toolArgs: { command: 'rm -rf /' },
 * });
 *
 * if (!result.proceed) {
 *   console.log('Blocked:', result.blockReason);
 * }
 * ```
 */

export {
  AgentHooksRegistry,
  getAgentHooksRegistry,
  triggerAgentHook,
} from "./registry.js";

export {
  createHookContext,
  triggerAgentStart,
  triggerAgentStop,
  triggerAgentError,
  triggerToolInvoke,
  triggerToolResult,
  triggerTokenThreshold,
  triggerMessageReceived,
  triggerMessageSending,
  triggerSessionStart,
  triggerSessionEnd,
  triggerCompactionBefore,
  triggerCompactionAfter,
  TokenThresholdMonitor,
} from "./helpers.js";

export type {
  AgentHookEventType,
  AgentHookAction,
  AgentHookNotifyTarget,
  AgentHookMatchCondition,
  AgentHookConfig,
  AgentHooksConfig,
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
  AgentHookEvent,
  AgentHookResult,
  AgentHookHandler,
  RegisteredAgentHook,
} from "./types.js";
