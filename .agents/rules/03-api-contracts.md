# API - Contracts, filters and response behavior

## Scope and purpose

Apply to handlers, parameters, models and filters in backend/app/routes.py,
their tests, and consumed API types/calls in frontend/src. Prevent duplicated
filters and backend/client contract drift. Implements R02 and R04.

## Repository facts and rationale

[routes.py](../../backend/app/routes.py) defines Pydantic response models and
Literal values. The client maintains independent
[financial types](../../frontend/src/lib/financial-types.ts).
The main metrics route does not declare business_type; some analytics routes
do. B2B/B2C routes share date/category/operation filtering and sorted output.

## Instructions

1. Verify the actual handler signature and response model before claiming a
   filter exists. Do not infer support from another route. GroupBy currently
   exists only in the backend.
2. When changing a consumed field or literal, update producer, client type/call
   and focused tests together. Preserve snake_case API fields unless a contract
   change is authorized; do not add `any` or unchecked casts to hide drift.
3. Reuse filter_movements and chronological ordering when extending routes.
   Preserve inclusive date bounds, combined filters and the existing schema.
   Do not extract unrelated architecture during a test-only task.
4. For endpoint arithmetic/filter tests, use a small controlled dataset and
   TestClient, with expected values calculated independently. Patch the
   generator at app.routes for that test and restore it with pytest monkeypatch;
   do not rely on today's dates or random dataset totals.
5. Assert actual periods, amounts and excluded records as appropriate, not just
   status, keys or truthiness. Test invalid literals when changing validation.

## Checks and limits

Run the focused pytest case through WF; for changed client consumption also
run the relevant frontend tests/build. A test change alone must not alter
route signatures, literals or API fields. Reading OpenAPI or receiving 200
does not prove that the requested filter was applied.
