import type { MemoryExtractor } from './MemoryExtractor.js'
import type { ExtractMemoryInput, MemorySuggestion } from './memoryTypes.js'

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

export class RuleBasedMemoryExtractor implements MemoryExtractor {
  async extract(input: ExtractMemoryInput): Promise<MemorySuggestion[]> {
    const suggestions: MemorySuggestion[] = []
    const text = normalize(input.userMessage)

    const push = (suggestion: MemorySuggestion) => {
      suggestions.push(suggestion)
    }

    if (/\buse pnpm\b/.test(text) || /\bi prefer pnpm\b/.test(text)) {
      push({
        scope: 'user',
        kind: 'preference',
        status: 'approved',
        content: 'User prefers pnpm.',
        normalizedKey: 'preference:package_manager',
        salience: 0.9,
        confidence: 0.98,
        source: 'user_explicit',
        tags: ['package_manager', 'pnpm'],
        metadata: {
          packageManager: 'pnpm',
          rememberedBecause: 'You explicitly asked Rina to use pnpm.',
        },
      })
    }

    if (/\buse yarn\b/.test(text) || /\bi prefer yarn\b/.test(text)) {
      push({
        scope: 'user',
        kind: 'preference',
        status: 'approved',
        content: 'User prefers yarn.',
        normalizedKey: 'preference:package_manager',
        salience: 0.9,
        confidence: 0.98,
        source: 'user_explicit',
        tags: ['package_manager', 'yarn'],
        metadata: {
          packageManager: 'yarn',
          rememberedBecause: 'You explicitly asked Rina to use yarn.',
        },
      })
    }

    if (/\bkeep (it )?short\b/.test(text) || /\bconcise\b/.test(text)) {
      push({
        scope: 'user',
        kind: 'preference',
        status: 'approved',
        content: 'User prefers concise responses.',
        normalizedKey: 'preference:verbosity',
        salience: 0.85,
        confidence: 0.96,
        source: 'user_explicit',
        tags: ['verbosity', 'concise'],
        metadata: {
          verbosity: 'low',
          rememberedBecause: 'You explicitly asked for concise responses.',
        },
      })
    }

    if (/\bdon['’]?t touch tests\b/.test(text) || /\bdon['’]?t edit tests\b/.test(text) || /\bask before touching tests\b/.test(text)) {
      push({
        scope: 'user',
        kind: 'constraint',
        status: 'approved',
        content: 'Do not modify test files without user approval.',
        normalizedKey: 'constraint:test_modifications',
        salience: 0.98,
        confidence: 0.99,
        source: 'user_explicit',
        tags: ['tests', 'approval_required'],
        metadata: {
          testEditsRequireApproval: true,
          rememberedBecause: 'You explicitly said test edits should require approval.',
        },
      })
    }

    if (/\bauto[- ]?fix\b/.test(text) && /\bbefore asking\b/.test(text)) {
      push({
        scope: 'user',
        kind: 'preference',
        status: 'approved',
        content: 'User prefers automatic fixes before follow-up questions when safe.',
        normalizedKey: 'preference:auto_fix_before_asking',
        salience: 0.82,
        confidence: 0.94,
        source: 'user_explicit',
        tags: ['autonomy', 'safe_autofix'],
        metadata: {
          autoFixBeforeAsking: true,
          rememberedBecause: 'You explicitly asked for safe autofix before follow-up questions.',
        },
      })
    }

    if (input.taskResult) {
      push({
        scope: 'episode',
        kind: 'task_outcome',
        status: 'approved',
        content: input.taskResult.summary,
        normalizedKey: null,
        salience: input.taskResult.success ? 0.7 : 0.8,
        confidence: 1,
        source: 'task_outcome',
        tags: ['task_outcome'],
        metadata: {
          success: input.taskResult.success,
          filesChanged: input.taskResult.filesChanged ?? [],
          commandsRun: input.taskResult.commandsRun ?? [],
          rememberedBecause: 'This task outcome may help future planning and recovery decisions.',
        },
      })

      if (/\b(env|environment)\s+vars?\b|\bmissing env\b|\bmissing environment\b/.test(input.taskResult.summary.toLowerCase())) {
        push({
          scope: 'workspace',
          kind: 'project_fact',
          status: 'suggested',
          content: 'This workspace may depend on environment configuration that can break builds or runs when values are missing.',
          normalizedKey: 'project_fact:environment_dependency',
          salience: 0.72,
          confidence: 0.74,
          source: 'assistant_inferred',
          tags: ['env', 'config', 'workspace'],
          metadata: {
            rememberedBecause: 'A recent task outcome mentioned missing environment variables.',
            derivedFrom: 'task_result_summary',
          },
        })
      }

      if (/\btsconfig\b|\bpath alias\b|\bpath aliases\b|\balias resolution\b/.test(input.taskResult.summary.toLowerCase())) {
        push({
          scope: 'workspace',
          kind: 'project_fact',
          status: 'suggested',
          content: 'This workspace may rely on tsconfig path aliases that are worth checking when builds or imports fail.',
          normalizedKey: 'project_fact:tsconfig_aliases',
          salience: 0.7,
          confidence: 0.76,
          source: 'assistant_inferred',
          tags: ['tsconfig', 'aliases', 'imports'],
          metadata: {
            rememberedBecause: 'A recent task outcome referenced tsconfig aliases or path resolution.',
            derivedFrom: 'task_result_summary',
          },
        })
      }

      if (/\bflaky tests?\b|\btests?\s+are\s+flaky\b/.test(input.taskResult.summary.toLowerCase())) {
        push({
          scope: 'workspace',
          kind: 'project_fact',
          status: 'suggested',
          content: 'This workspace may have flaky tests, so test failures may need extra verification before concluding the code is wrong.',
          normalizedKey: 'project_fact:flaky_tests',
          salience: 0.68,
          confidence: 0.7,
          source: 'assistant_inferred',
          tags: ['tests', 'flaky'],
          metadata: {
            rememberedBecause: 'A recent task outcome described flaky tests.',
            derivedFrom: 'task_result_summary',
          },
        })
      }
    }

    return suggestions
  }
}
