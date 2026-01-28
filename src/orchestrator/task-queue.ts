/**
 * Task Queue
 *
 * Priority queue for orchestrator tasks with dependency tracking.
 */

import type { TaskState, TaskDefinition, TaskPriority, TaskStatus } from "./types.js";

const PRIORITY_VALUES: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class TaskQueue {
  private tasks: Map<string, TaskState> = new Map();
  private completedDependencies: Set<string> = new Set();

  /**
   * Add a task to the queue
   */
  add(task: TaskDefinition): TaskState {
    const state: TaskState = {
      task,
      status: "pending",
      createdAt: new Date(),
      retryCount: 0,
    };

    this.tasks.set(task.id, state);
    return state;
  }

  /**
   * Add multiple tasks to the queue
   */
  addAll(tasks: TaskDefinition[]): TaskState[] {
    return tasks.map((task) => this.add(task));
  }

  /**
   * Get a task by ID
   */
  get(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update task status
   */
  updateStatus(taskId: string, status: TaskStatus): void {
    const state = this.tasks.get(taskId);
    if (state) {
      state.status = status;

      if (status === "running" && !state.startedAt) {
        state.startedAt = new Date();
      }

      if (status === "completed" || status === "failed" || status === "cancelled") {
        state.completedAt = new Date();

        if (status === "completed") {
          this.completedDependencies.add(taskId);
        }
      }
    }
  }

  /**
   * Check if a task's dependencies are satisfied
   */
  areDependenciesSatisfied(taskId: string): boolean {
    const state = this.tasks.get(taskId);
    if (!state?.task.dependencies?.length) {
      return true;
    }

    return state.task.dependencies.every((dep) => this.completedDependencies.has(dep.taskId));
  }

  /**
   * Get the next ready task (highest priority with satisfied dependencies)
   */
  getNextReady(): TaskState | undefined {
    const readyTasks: TaskState[] = [];

    for (const state of this.tasks.values()) {
      if (
        (state.status === "pending" || state.status === "queued") &&
        this.areDependenciesSatisfied(state.task.id)
      ) {
        readyTasks.push(state);
      }
    }

    if (readyTasks.length === 0) {
      return undefined;
    }

    // Sort by priority and creation time
    readyTasks.sort((a, b) => {
      const priorityDiff =
        PRIORITY_VALUES[a.task.priority] - PRIORITY_VALUES[b.task.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return readyTasks[0];
  }

  /**
   * Get all ready tasks up to a limit
   */
  getReadyTasks(limit: number = 10): TaskState[] {
    const ready: TaskState[] = [];

    for (const state of this.tasks.values()) {
      if (ready.length >= limit) break;

      if (
        (state.status === "pending" || state.status === "queued") &&
        this.areDependenciesSatisfied(state.task.id)
      ) {
        ready.push(state);
      }
    }

    // Sort by priority
    ready.sort((a, b) => {
      const priorityDiff =
        PRIORITY_VALUES[a.task.priority] - PRIORITY_VALUES[b.task.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return ready;
  }

  /**
   * Get tasks that are currently running
   */
  getRunningTasks(): TaskState[] {
    return Array.from(this.tasks.values()).filter((s) => s.status === "running");
  }

  /**
   * Get tasks that are blocked by dependencies
   */
  getBlockedTasks(): TaskState[] {
    return Array.from(this.tasks.values()).filter(
      (s) =>
        (s.status === "pending" || s.status === "queued") &&
        !this.areDependenciesSatisfied(s.task.id),
    );
  }

  /**
   * Get all tasks with a specific status
   */
  getByStatus(status: TaskStatus): TaskState[] {
    return Array.from(this.tasks.values()).filter((s) => s.status === status);
  }

  /**
   * Get all tasks
   */
  getAll(): TaskState[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    return Array.from(this.tasks.values()).every(
      (s) => s.status === "completed" || s.status === "failed" || s.status === "cancelled",
    );
  }

  /**
   * Check if any task has failed
   */
  hasFailures(): boolean {
    return Array.from(this.tasks.values()).some((s) => s.status === "failed");
  }

  /**
   * Get count of tasks by status
   */
  getStatusCounts(): Record<TaskStatus, number> {
    const counts: Record<TaskStatus, number> = {
      pending: 0,
      queued: 0,
      running: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const state of this.tasks.values()) {
      counts[state.status]++;
    }

    return counts;
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): void {
    for (const state of this.tasks.values()) {
      if (state.status === "pending" || state.status === "queued") {
        state.status = "cancelled";
        state.completedAt = new Date();
      }
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.tasks.clear();
    this.completedDependencies.clear();
  }

  /**
   * Get queue size
   */
  get size(): number {
    return this.tasks.size;
  }
}
