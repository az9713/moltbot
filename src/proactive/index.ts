/**
 * Proactive Agent System
 *
 * Agents that act autonomously based on triggers, schedules, and external events.
 *
 * Features:
 * - Schedule triggers (cron-based)
 * - Webhook triggers (external events)
 * - Channel event triggers (message patterns)
 * - File watch triggers (file changes)
 * - Threshold-based triggers (metrics)
 * - Configurable delivery targets
 * - Background execution
 *
 * @example
 * ```typescript
 * import { ProactiveManager } from './proactive';
 *
 * const manager = new ProactiveManager({
 *   config: {
 *     enabled: true,
 *     tasks: [
 *       {
 *         id: 'morning-briefing',
 *         trigger: { type: 'schedule', cron: '0 9 * * 1-5' },
 *         agent: 'main',
 *         prompt: 'Generate my morning briefing',
 *         deliver: { channel: 'telegram', to: '123456789' },
 *       },
 *       {
 *         id: 'pr-review',
 *         trigger: { type: 'webhook', path: '/github', event: 'pull_request.opened' },
 *         agent: 'code-reviewer',
 *         prompt: 'Review this PR: {{payload.pull_request.html_url}}',
 *       },
 *     ],
 *   },
 *   executeAgent: async (params) => {
 *     // Your agent execution logic
 *     return { success: true, output: 'Result' };
 *   },
 *   deliverMessage: async (target, message) => {
 *     // Your delivery logic
 *     return true;
 *   },
 * });
 *
 * manager.start();
 *
 * // Handle incoming webhooks
 * app.post('/hooks/:path', async (req, res) => {
 *   await manager.handleWebhook(req.params.path, 'POST', req.body);
 *   res.sendStatus(200);
 * });
 * ```
 */

export {
  ProactiveManager,
  type ProactiveManagerOptions,
  type ProactiveEvents,
} from "./manager.js";

export {
  ProactiveScheduler,
  parseCronExpression,
  getNextRunTime,
  type CronSchedule,
  type CronField,
  type SchedulerCallback,
} from "./scheduler.js";

export type {
  TriggerType,
  ScheduleTrigger,
  WebhookTrigger,
  ChannelTrigger,
  FileTrigger,
  ThresholdTrigger,
  ProactiveTrigger,
  DeliveryTarget,
  ProactiveTaskConfig,
  ProactiveConfig,
  TaskExecutionStatus,
  TaskExecution,
  ScheduledTaskInfo,
} from "./types.js";
