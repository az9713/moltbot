/**
 * Proactive Task Scheduler
 *
 * Manages cron-based scheduling for proactive tasks.
 */

import type { ScheduleTrigger, ScheduledTaskInfo } from "./types.js";

// Simple cron parser for common patterns
export function parseCronExpression(expression: string): CronSchedule {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${expression} (expected 5 fields)`);
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

export type CronSchedule = {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
};

export type CronField = {
  type: "all" | "values" | "range" | "step";
  values?: number[];
  start?: number;
  end?: number;
  step?: number;
};

function parseField(field: string, min: number, max: number): CronField {
  if (field === "*") {
    return { type: "all" };
  }

  // Handle step (*/n or n/m)
  if (field.includes("/")) {
    const [base, stepStr] = field.split("/");
    const step = parseInt(stepStr, 10);

    if (base === "*") {
      return { type: "step", start: min, end: max, step };
    }

    const start = parseInt(base, 10);
    return { type: "step", start, end: max, step };
  }

  // Handle range (n-m)
  if (field.includes("-")) {
    const [startStr, endStr] = field.split("-");
    return {
      type: "range",
      start: parseInt(startStr, 10),
      end: parseInt(endStr, 10),
    };
  }

  // Handle list (n,m,o)
  if (field.includes(",")) {
    return {
      type: "values",
      values: field.split(",").map((v) => parseInt(v.trim(), 10)),
    };
  }

  // Single value
  return { type: "values", values: [parseInt(field, 10)] };
}

function matchesField(field: CronField, value: number): boolean {
  switch (field.type) {
    case "all":
      return true;
    case "values":
      return field.values?.includes(value) ?? false;
    case "range":
      return value >= (field.start ?? 0) && value <= (field.end ?? 0);
    case "step": {
      const start = field.start ?? 0;
      const step = field.step ?? 1;
      if (value < start) return false;
      return (value - start) % step === 0;
    }
    default:
      return false;
  }
}

function matchesSchedule(schedule: CronSchedule, date: Date): boolean {
  return (
    matchesField(schedule.minute, date.getMinutes()) &&
    matchesField(schedule.hour, date.getHours()) &&
    matchesField(schedule.dayOfMonth, date.getDate()) &&
    matchesField(schedule.month, date.getMonth() + 1) &&
    matchesField(schedule.dayOfWeek, date.getDay())
  );
}

/**
 * Calculate the next run time for a cron schedule
 */
export function getNextRunTime(schedule: CronSchedule, after: Date = new Date()): Date {
  const next = new Date(after);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1); // Start from next minute

  // Limit search to prevent infinite loops
  const maxIterations = 60 * 24 * 366; // Up to a year

  for (let i = 0; i < maxIterations; i++) {
    if (matchesSchedule(schedule, next)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  throw new Error("Could not find next run time within a year");
}

export type SchedulerCallback = (taskId: string) => void | Promise<void>;

export class ProactiveScheduler {
  private schedules: Map<string, CronSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private lastRuns: Map<string, Date> = new Map();
  private callback?: SchedulerCallback;
  private running = false;

  /**
   * Set the callback for when a task should run
   */
  onTrigger(callback: SchedulerCallback): void {
    this.callback = callback;
  }

  /**
   * Schedule a task
   */
  schedule(taskId: string, trigger: ScheduleTrigger): void {
    // Parse cron expression
    const schedule = parseCronExpression(trigger.cron);
    this.schedules.set(taskId, schedule);

    // Schedule next run
    if (this.running) {
      this.scheduleNext(taskId);
    }
  }

  /**
   * Unschedule a task
   */
  unschedule(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
    this.schedules.delete(taskId);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    this.running = true;

    for (const taskId of this.schedules.keys()) {
      this.scheduleNext(taskId);
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Schedule the next run of a task
   */
  private scheduleNext(taskId: string): void {
    const schedule = this.schedules.get(taskId);
    if (!schedule || !this.running) return;

    // Cancel existing timer
    const existingTimer = this.timers.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate next run
    const nextRun = getNextRunTime(schedule);
    const delay = nextRun.getTime() - Date.now();

    // Schedule execution
    const timer = setTimeout(async () => {
      if (!this.running) return;

      this.lastRuns.set(taskId, new Date());

      // Trigger callback
      try {
        await this.callback?.(taskId);
      } catch (error) {
        console.error(`[Scheduler] Error executing task ${taskId}:`, error);
      }

      // Schedule next run
      this.scheduleNext(taskId);
    }, delay);

    this.timers.set(taskId, timer);
  }

  /**
   * Get info about scheduled tasks
   */
  getScheduledTasks(): ScheduledTaskInfo[] {
    const tasks: ScheduledTaskInfo[] = [];

    for (const [taskId, schedule] of this.schedules) {
      tasks.push({
        taskId,
        nextRun: getNextRunTime(schedule),
        lastRun: this.lastRuns.get(taskId),
      });
    }

    return tasks.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
  }

  /**
   * Get next run time for a specific task
   */
  getNextRun(taskId: string): Date | undefined {
    const schedule = this.schedules.get(taskId);
    if (!schedule) return undefined;
    return getNextRunTime(schedule);
  }

  /**
   * Check if a task is scheduled
   */
  isScheduled(taskId: string): boolean {
    return this.schedules.has(taskId);
  }
}
