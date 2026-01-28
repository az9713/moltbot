/**
 * Skills Executor
 *
 * Executes skills by spawning sub-agent sessions.
 */

import type {
  SkillDefinition,
  SkillExecutionConfig,
  SkillExecutionResult,
  SkillInvocation,
} from "./types.js";
import { getSkillsRegistry } from "./registry.js";

export type SkillExecutorOptions = {
  /** Default timeout in seconds */
  defaultTimeoutSec?: number;
  /** Default max turns */
  defaultMaxTurns?: number;
  /** Whether to run in sandbox by default */
  defaultSandboxed?: boolean;
  /** Spawn session function */
  spawnSession?: (params: SpawnSessionParams) => Promise<SpawnSessionResult>;
};

export type SpawnSessionParams = {
  agentId?: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  tools?: string[];
  maxTurns?: number;
  timeoutSec?: number;
  sandboxed?: boolean;
  context?: Record<string, unknown>;
};

export type SpawnSessionResult = {
  success: boolean;
  output?: string;
  error?: string;
  sessionId?: string;
  durationMs?: number;
  tokens?: { input: number; output: number };
};

export class SkillExecutor {
  private options: SkillExecutorOptions;

  constructor(options: SkillExecutorOptions = {}) {
    this.options = {
      defaultTimeoutSec: options.defaultTimeoutSec ?? 300,
      defaultMaxTurns: options.defaultMaxTurns ?? 20,
      defaultSandboxed: options.defaultSandboxed ?? true,
      spawnSession: options.spawnSession,
    };
  }

  /**
   * Execute a skill invocation
   */
  async execute(invocation: SkillInvocation): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    // Get skill definition
    const registry = getSkillsRegistry();
    const skill = registry.get(invocation.skillId);

    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${invocation.skillId}`,
        durationMs: Date.now() - startTime,
      };
    }

    if (!skill.enabled) {
      return {
        success: false,
        error: `Skill is disabled: ${invocation.skillId}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Merge execution config
    const config = this.mergeConfig(skill, invocation.config);

    // Build session parameters
    const params: SpawnSessionParams = {
      prompt: invocation.prompt,
      systemPrompt: skill.systemPrompt,
      model: config.model,
      tools: config.tools,
      maxTurns: config.maxTurns,
      timeoutSec: config.timeoutSec,
      sandboxed: config.sandboxed,
      context: invocation.context,
    };

    // Execute via spawn session
    if (!this.options.spawnSession) {
      return {
        success: false,
        error: "No session spawner configured",
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const result = await this.options.spawnSession(params);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: Date.now() - startTime,
        tokens: result.tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a skill by name with a prompt
   */
  async run(skillId: string, prompt: string, config?: SkillExecutionConfig): Promise<SkillExecutionResult> {
    return this.execute({
      skillId,
      prompt,
      config,
    });
  }

  /**
   * Merge skill defaults with invocation config
   */
  private mergeConfig(
    skill: SkillDefinition,
    config?: SkillExecutionConfig,
  ): Required<Omit<SkillExecutionConfig, "sessionScope">> & { sessionScope?: string } {
    return {
      maxTurns: config?.maxTurns ?? this.options.defaultMaxTurns ?? 20,
      timeoutSec: config?.timeoutSec ?? this.options.defaultTimeoutSec ?? 300,
      model: config?.model ?? skill.metadata.model?.primary,
      tools: config?.tools ?? skill.metadata.tools?.map((t) => t.name),
      sandboxed: config?.sandboxed ?? this.options.defaultSandboxed ?? true,
      sessionScope: config?.sessionScope,
    };
  }

  /**
   * Validate a skill can be executed
   */
  validate(skill: SkillDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!skill.systemPrompt?.trim()) {
      errors.push("Skill has no system prompt");
    }

    if (!skill.metadata.name) {
      errors.push("Skill has no name");
    }

    // Check required tools
    const requiredTools = skill.metadata.tools?.filter((t) => t.required) ?? [];
    // In a real implementation, we'd check if these tools are available

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
let executorInstance: SkillExecutor | null = null;

/**
 * Get the global skill executor
 */
export function getSkillExecutor(options?: SkillExecutorOptions): SkillExecutor {
  if (!executorInstance) {
    executorInstance = new SkillExecutor(options);
  }
  return executorInstance;
}

/**
 * Reset the executor (for testing)
 */
export function resetSkillExecutor(): void {
  executorInstance = null;
}
