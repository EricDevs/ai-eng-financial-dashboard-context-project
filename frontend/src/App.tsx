import { lazy, Suspense, useState } from "react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildQuery } from "@/lib/api";
import type { AlertsResponse, FacetsResponse } from "@/lib/api-types";
import { type FinancialMovement } from "@/lib/financial-types";
import {
  computeKPIs,
  computeMonthlyData,
  formatPeriodLabel,
  getDateRangeIssue,
  parseThreshold,
  THRESHOLD_DEFAULT,
} from "@/lib/financial-utils";
import type { DateRangeFilter } from "@/lib/param-types";
import { useApiResource } from "@/lib/use-api-resource";

// Charts pull in Recharts (~60% of the JS); load them in a separate chunk.
const IncomeOutcomeChart = lazy(() =>
  import("@/components/dashboard/income-outcome-chart").then((m) => ({
    default: m.IncomeOutcomeChart,
  })),
);
const ProfitPercentChart = lazy(() =>
  import("@/components/dashboard/profit-percent-chart").then((m) => ({
    default: m.ProfitPercentChart,
  })),
);

/** Same markup as the charts' own loading state, so the swap causes no layout shift. */
function ChartFallback() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <Skeleton className="h-5 w-52 my-0.5" />
        <Skeleton className="h-3 w-64 my-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function App() {
  const [filter, setFilter] = useState<DateRangeFilter>({});
  const facets = useApiResource<FacetsResponse>("/api/metrics/facets");
  const bounds = facets.data
    ? { min_date: facets.data.min_date, max_date: facets.data.max_date }
    : null;
  const dateIssue = getDateRangeIssue(filter, bounds);

  const movementsPath =
    dateIssue === null
      ? "/api/metrics" +
        buildQuery({ start_date: filter.start_date, end_date: filter.end_date })
      : null;
  const { data: movements, loading, error } =
    useApiResource<FinancialMovement[]>(movementsPath);

  const metrics = movements && movements.length > 0 ? computeKPIs(movements) : null;
  const monthlyData = computeMonthlyData(movements ?? []);
  const noMovements = !loading && movements !== null && movements.length === 0;

  const [thresholdText, setThresholdText] = useState(String(THRESHOLD_DEFAULT));
  const [appliedThreshold, setAppliedThreshold] = useState(THRESHOLD_DEFAULT);
  const alertsPath =
    dateIssue === null
      ? "/api/metrics/alerts" +
        buildQuery({
          threshold: appliedThreshold,
          start_date: filter.start_date,
          end_date: filter.end_date,
        })
      : null;
  const alerts = useApiResource<AlertsResponse>(alertsPath);

  function changeThreshold(text: string) {
    setThresholdText(text);
    const threshold = parseThreshold(text);
    if (threshold !== null) setAppliedThreshold(threshold);
  }

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <DashboardHeader period={formatPeriodLabel(filter) ?? "2024 - Full Year"} />

          <DateRangePicker
            value={filter}
            onChange={setFilter}
            bounds={bounds}
            boundsLoading={facets.loading}
          />

          {noMovements ? (
            <p role="status" className="text-sm text-muted-foreground">
              No movements found for the selected range.
            </p>
          ) : null}

          {error ? (
            <div
              role="alert"
              lang="es"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground"
            >
              No se pudo cargar la informacion financiera. Revisa la API de backend.
            </div>
          ) : null}

          <section aria-label="Key performance indicators" aria-busy={loading}>
            <KPIRow metrics={metrics} loading={loading} />
          </section>

          <section
            aria-label="Financial charts"
            aria-busy={loading}
            className="grid grid-cols-1 gap-4 xl:grid-cols-2"
          >
            <Suspense fallback={<ChartFallback />}>
              <IncomeOutcomeChart data={monthlyData} loading={loading} />
            </Suspense>
            <Suspense fallback={<ChartFallback />}>
              <ProfitPercentChart data={monthlyData} loading={loading} />
            </Suspense>
          </section>

          <section aria-label="Anomaly alerts" aria-busy={alerts.loading}>
            <AlertsTable
              alerts={alerts.data}
              appliedThreshold={appliedThreshold}
              thresholdText={thresholdText}
              onThresholdChange={changeThreshold}
              loading={alerts.loading}
              error={alerts.error}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
