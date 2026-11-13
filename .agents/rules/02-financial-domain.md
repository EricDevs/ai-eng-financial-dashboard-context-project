# FIN - Financial calculations and mock data

## Scope and purpose

Apply to financial formulas, amount representations, fixtures, mock generation
and their tests in backend/app and frontend/src/lib. Keep calculations testable
and preserve the distinction between fixture data and the active API.
Implements R01, R05, R06 and R07.

## Repository facts and rationale

- [financial-utils.ts](../../frontend/src/lib/financial-utils.ts) computes
  profit as income minus outcome and margin as profit / income * 100, returning
  zero margin without positive income. [App.tsx](../../frontend/src/App.tsx)
  fetches movements instead of importing the [local fixture](../../frontend/src/lib/mock-data.ts).
- [routes.py](../../backend/app/routes.py) uses float amounts, rounds summaries
  at output and generates mock data with a global random seed.
  These are existing limitations, not permission to migrate numeric types.

## Instructions

1. Reuse calculation helpers; keep formulas out of JSX and HTTP orchestration.
   If a new route needs shared domain logic, reuse or extract it in the scope
   of that change rather than duplicating the formula.
2. Preserve the existing amount and rounding contract unless a migration is
   explicitly agreed. Test independent expected amounts and distinguish
   internal precision from USD presentation without decimals.
3. Use small explicit movements for arithmetic tests. Check totals, net and
   zero-income behavior; for binary decimal arithmetic use a justified
   tolerance rather than asserting an exact float representation.
4. Do not substitute frontend mock-data for a failed API call or silently
   introduce an offline mode. Label a fixture's purpose and do not claim its
   dates or totals equal those of the generated API dataset.
5. Do not introduce global RNG seeding in new code. If changing generation is
   authorized, use a local RNG and verify both reproducibility with a controlled
   date and preservation of the caller's random state. Do not claim the existing
   generator is already isolated.

## Checks and limits

Run the focused financial utility or backend test under WF. A fixture with
income 100 and outcome 25 must produce net 75 and margin 75 percent. Empty
movements must keep the documented current zero/empty results. No test-only
task authorizes changing financial representation or replacing live data.
