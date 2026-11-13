# Agent Guidance

Agents working on this project **must**:

- Look for **work instructions and rules** in the directory:  
  `./.agents/rules`

- Look for available **agent skills** in the directory:  
  `./.agents/skills`

- Look for the **project memory bank** in:  
  `./memory-bank`  
  _(if the directory exists)_

Before taking action (analyzing code, modifying files, or generating outputs), always review the latest files in these locations to ensure compliance with project conventions, context, and operational constraints.

## Rule routing

The rules below are plain Markdown instructions read through this file. No
editor-specific frontmatter, glob engine, or automatic activation is assumed.
Read [WF](.agents/rules/01-workflow-evidence.md) for every task, then read the
other matching rules before acting. Match both the files and the behavior of
the task; a test of API or calendar behavior also needs its domain rule.

| ID | Read when the task involves |
| --- | --- |
| [WF](.agents/rules/01-workflow-evidence.md) | Every task: scope, checks, evidence and documentation |
| [FIN](.agents/rules/02-financial-domain.md) | Financial formulas, amounts, mock data or their tests in backend/app and frontend/src/lib |
| [API](.agents/rules/03-api-contracts.md) | API handlers, filters, response models, frontend consumers/types or API tests |
| [CAL](.agents/rules/04-calendar-periods.md) | Calendar dates, aggregation periods, header periods or their tests |
| [FE](.agents/rules/05-frontend-conventions.md) | TypeScript/TSX, imports, formatters, dashboard components, CSS or frontend tests |
| [DX](.agents/rules/06-runtime-configuration.md) | Docker, Vite/proxy, dependencies, environment examples, CORS or startup documentation |

Before editing, name the rule IDs read and state their relevant scope. If a
referenced instruction cannot be read, report that limitation instead of
claiming it was loaded. Read `.agents/skills` and `memory-bank` if present;
their absence does not authorize inventing skills or project memory.

The source proposals are in [04 - Conventions](docs/validations/04%20-%20Conventions.md).
Record rule exercises, exact prompts, observed outputs, checks and limitations
in [05 - RulesChecks](docs/validations/05%20-%20RulesChecks.md). These files
define a manual read protocol, not proof that every client discovers AGENTS.md.

## Memory routing

Read these before starting a task that needs more than one turn of context,
or when asked for a product/status summary: [overview](memory-bank/overview.md)
(what the product does and its known product-level gap), [stack](memory-bank/stack.md)
(languages, frameworks, infra and already-verified commands) and
[status](memory-bank/status.md) (implemented vs. proven, known gaps, next
priorities and commit/integration history). Memory is factual evidence from
past phases, not a task queue; absence of a feature here does not authorize
building it. If a fact here conflicts with the current code or docs, trust
what you observe now and flag the memory file as stale instead of acting on it.
