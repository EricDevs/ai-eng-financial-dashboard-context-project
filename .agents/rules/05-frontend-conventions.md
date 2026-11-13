# FE - Frontend types, local style and presentation

## Scope and purpose

Apply to frontend TypeScript/TSX, CSS, formatters, components and tests,
including components rather than excluding them with an unsupported glob.
Preserve local style, type safety and UI behavior. Implements R03, R10, R11,
R12 and R13.

## Repository facts and rationale

- [App.tsx](../../frontend/src/App.tsx) prepares data; dashboard components
  receive props and use Card/Skeleton and theme
  [tokens](../../frontend/src/index.css).
- [financial-utils.ts](../../frontend/src/lib/financial-utils.ts) owns
  formatCurrency (en-US/USD, no decimals) and formatPercent (one decimal).
- [Dashboard files](../../frontend/src/components/dashboard) use kebab-case
  filenames, PascalCase exports and both aliases and relative imports.
  App.tsx is an entry-point exception. Quotes/semicolons vary by file.
- [Vite](../../frontend/vite.config.ts) and
  [TypeScript](../../frontend/tsconfig.app.json) both resolve @ to src.
  TypeScript enables unused/fallthrough checks but does not declare strict.

## Instructions

1. Reuse props-based components, Card, Skeleton, cn, Lucide icons and existing
   tokens. Keep fetch/data preparation at the page or data layer.
2. Preserve loading, empty and error behavior when touching presentation;
   distinguish no data from valid zero values. Do not silently fix existing
   state-detection behavior outside the task.
3. Reuse shared currency/percent formatters rather than duplicating display
   formulas. Do not change locale, currency or language incidentally.
4. Match naming, imports and formatting of the touched folder/file; preserve
   entry-point exceptions. Keep @ resolution aligned in Vite and TS if changed.
   No global reformatting or new formatting tooling without agreement.
5. Prefer proper types/type-only imports. Do not weaken compiler checks,
   introduce `any`, broad casts or suppressions to make checks pass.

## Checks and limits

Run focused tests, lint and build as applicable under WF. For a changed UI,
also observe the affected loading/data/empty/error paths and the interaction
that changed (for a tooltip, hover it). Record fixtures and actual output.
Build success alone is not visual validation. Do not claim unrelated bugs,
screen sizes, accessibility or all numeric cases were verified.
