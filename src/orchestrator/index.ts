/**
 * Intelligent Agent Orchestrator
 *
 * A meta-agent that coordinates multiple specialized agents for complex tasks.
 *
 * Features:
 * - Automatic task decomposition
 * - Agent selection based on capabilities
 * - Parallel execution with dependency tracking
 * - Result aggregation and synthesis
 * - Cross-agent communication
 *
 * @example
 * ```typescript
 * import { Orchestrator, TaskQueue } from './orchestrator';
 *
 * const orchestrator = new Orchestrator({
 *   config: {
 *     agents: [
 *       { id: 'coordinator', role: 'coordinator', canSpawn: ['research', 'code'] },
 *       { id: 'research', role: 'specialist', skills: ['research', 'web'] },
 *       { id: 'code', role: 'specialist', skills: ['coding', 'testing'] },
 *     ],
 *   },
 *   executeAgent: async (params) => {
 *     // Your agent execution logic
 *     return { success: true, output: 'Result' };
 *   },
 * });
 *
 * // Execute a single task
 * const result = await orchestrator.executeTask({
 *   id: 'task-1',
 *   title: 'Research AI',
 *   description: 'Research current AI trends',
 *   priority: 'high',
 *   requiredSkills: ['research'],
 * });
 *
 * // Execute a workflow
 * const results = await orchestrator.executeWorkflow({
 *   id: 'workflow-1',
 *   name: 'Feature Development',
 *   tasks: [
 *     { id: 'research', title: 'Research', ... },
 *     { id: 'code', title: 'Implement', dependencies: [{ taskId: 'research' }], ... },
 *   ],
 * });
 * ```
 */

export {
  Orchestrator,
  type AgentExecutor,
  type OrchestratorOptions,
  type OrchestratorEvents,
} from "./orchestrator.js";

export { TaskQueue } from "./task-queue.js";

export type {
  OrchestratorAgentRole,
  OrchestratorAgentConfig,
  TaskPriority,
  TaskStatus,
  TaskDependency,
  TaskDefinition,
  TaskResult,
  TaskState,
  WorkflowDefinition,
  WorkflowState,
  DecompositionResult,
  AgentSelectionResult,
  OrchestratorConfig,
} from "./types.js";
