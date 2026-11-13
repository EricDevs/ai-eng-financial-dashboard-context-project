# CAL - Calendar dates and displayed periods

## Scope and purpose

Apply to date parsing, date filtering, month/week aggregation, displayed
periods and their tests across backend/app and frontend/src. Prevent timezone,
clock and hardcoded-period assumptions. Implements R08, R09 and R15.

## Repository facts and rationale

[financial-utils.ts](../../frontend/src/lib/financial-utils.ts) parses date-only
ISO strings into Date and reads local year/month. Negative UTC offsets can
move first-of-month records into the previous month.
[routes.py](../../backend/app/routes.py) uses date.today(), so seed 42 does not
freeze calendar dates. [App.tsx](../../frontend/src/App.tsx) and the
[header](../../frontend/src/components/dashboard/dashboard-header.tsx) currently
contain a fixed 2024 label. These known gaps are not implicitly fixed by tests.

## Instructions

1. Treat API YYYY-MM-DD values as calendar dates. When an implementation
   change is authorized, use explicit calendar parsing or consistent UTC
   accessors, not mixed UTC parsing/local getters.
2. Keep aggregation keys as sortable year-month values, independent of display
   labels; do not combine January from different years.
3. Use fixed dates and independently expected chronological results in tests.
   When testing a changed ISO/Date boundary, run the same case in UTC and a
   negative-offset zone. Test first/last days when claiming boundary correctness.
4. Control the reference date when testing generated periods. Restore patched
   time after the test; never infer a fixed year from the random seed.
5. Derive a changed header period from actual data/filters, with honest empty
   handling, only if that product change is authorized.
6. If an exercise exposes an existing timezone/period defect while fixes are
   out of scope, record the reproduction and the untested/blocked condition.
   Do not adjust dates merely to conceal a failure or leave an unapproved
   product change or a knowingly failing persistent test.

## Checks and limits

Use the focused Vitest/pytest case from WF and record the TZ value explicitly.
A mid-month or empty-data test does not validate first-day handling. A calendar
test does not prove the actual header period is correct; changed UI needs its
own observation. Documentation of a gap is not a runtime fix.
