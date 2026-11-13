# WF - Scoped work and verifiable evidence

## Scope and purpose

Apply to every repository task, including documentation and rule exercises.
Keep changes within the request and distinguish inspected, executed, blocked
and proposed work. Implements phase 2 proposals R14, R16, R17, R22 and R24.

## Repository facts and rationale

- [AGENTS.md](../../AGENTS.md) routes local rules, skills and memory.
- [Frontend scripts](../../frontend/package.json) provide Vitest, ESLint and
  the TypeScript/Vite build. [Backend tests](../../backend/tests/test_routes.py)
  use pytest and TestClient.
- [Roadmap](../../docs/ROADMAP.md) separates proposal, validation, approval,
  commit and merge. One is not evidence of another.

## Instructions

1. Read AGENTS.md and applicable rule files before editing; name their IDs and
   scope. Match behavioral tests to their domain rules, not just file suffixes.
2. Inspect the worktree and preserve others' changes. Edit only authorized
   paths; do not fix existing product defects outside the agreed task.
3. Use existing helpers and runners. Add focused behavioral tests for a
   changed or newly specified edge case, not tests of trivial framework facts.
4. Execute the smallest relevant test first. For frontend implementation
   changes, also run lint and build. For documentation-only changes, check
   sources, links and diff; do not claim application runtime was tested.
5. Record exact commands, results and limits. A 200 response or a nonempty
   payload does not prove arithmetic or filters; a build does not prove UI.
6. If checks cannot run or a pre-existing defect appears, report it explicitly.
   Do not weaken assertions, change fixtures to hide that defect, invent a
   passing output, or install dependencies without a missing-dependency failure.
7. Keep canonical project docs under docs with working relative links.
   Record prompt, output, review and any real iteration in RulesChecks.
   Do not fabricate a failed iteration to make the record look iterative.
8. Do not commit, push, merge, activate extra tooling or start the next phase
   unless the task authorizes that operation.

## Checks and limits

- Frontend focused test: `npm --prefix frontend test -- src/lib/financial-utils.test.ts`.
- Frontend implementation: `npm --prefix frontend run lint` and `npm --prefix frontend run build`.
- Backend: `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`.
- Review `git diff --check` and the scoped diff. A blocked command remains
  blocked; another check is not a success-shaped substitute.
- In an exercise coordinated by another agent, checks can be run once by the
  coordinator after disjoint edits. State explicitly which were deferred.
