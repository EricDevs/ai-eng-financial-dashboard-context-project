import { lazy, Suspense, useState } from "react";
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { GroupTopTable } from "@/components/dashboard/group-top-table";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { ViewTabs } from "@/components/dashboard/view-tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildQuery } from "@/lib/api";
import { type AlertsResponse, type FacetsResponse } from "@/lib/api-types";
import { type AppView, type FinancialMovement } from "@/lib/financial-types";
import {
  computeKPIs,
  computeMonthlyData,
  formatPeriodLabel,
  getDateRangeIssue,
  parseThreshold,
  THRESHOLD_DEFAULT,
} from "@/lib/financial-utils";
import { type DateRangeFilter } from "@/lib/param-types";
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
// The comparison view also uses Recharts; it gets its own chunk (spec DEC-13).
const ComparisonPage = lazy(() =>
  import("@/components/dashboard/comparison-page").then((m) => ({
    default: m.ComparisonPage,
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

/** Same markup as the comparison loading state, so the swap causes no layout shift (spec DEC-23). */
function ComparisonFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GroupTopTable businessType="B2B" rows={[]} loading />
        <GroupTopTable businessType="B2C" rows={[]} loading />
      </div>
      <ChartFallback />
    </div>
  );
}

function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [filter, setFilter] = useState<DateRangeFilter>({});
  const facets = useApiResource<FacetsResponse>("/api/metrics/facets");
  const bounds = facets.data
    ? { min_date: facets.data.min_date, max_date: facets.data.max_date }
    : null;
  const onDashboard = view === "dashboard";
  // Dashboard data is only requested while its tab is active (spec DEC-12).
  const requestable = onDashboard && getDateRangeIssue(filter, bounds) === null;
  const movements = useApiResource<FinancialMovement[]>(
    requestable ? `/api/metrics${buildQuery(filter)}` : null,
  );

  const [thresholdText, setThresholdText] = useState(String(THRESHOLD_DEFAULT));
  const [appliedThreshold, setAppliedThreshold] = useState(THRESHOLD_DEFAULT);
  const alerts = useApiResource<AlertsResponse>(
    requestable
      ? `/api/metrics/alerts${buildQuery({ threshold: appliedThreshold, ...filter })}`
      : null,
  );

  /** Keeps the typed text; applies it only when valid, even with a filter that cannot be requested (DEC-08). */
  function handleThresholdChange(text: string) {
    setThresholdText(text);
    const threshold = parseThreshold(text);
    if (threshold !== null) setAppliedThreshold(threshold);
  }

  const metrics = movements.data?.length ? computeKPIs(movements.data) : null;
  const monthlyData = movements.data ? computeMonthlyData(movements.data) : [];
  const noMovements = !movements.loading && movements.data?.length === 0;

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <DashboardHeader period={formatPeriodLabel(filter) ?? "2024 - Full Year"} />

          <ViewTabs view={view} onChange={setView} />

          <DateRangePicker
            value={filter}
            onChange={setFilter}
            bounds={bounds}
            boundsLoading={facets.loading}
          />

          <div
            id="view-panel"
            role="tabpanel"
            aria-labelledby={`tab-${view}`}
            className="flex flex-col gap-8"
          >
            {onDashboard ? (
              <>
                {noMovements ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    No movements found for the selected range.
                  </p>
                ) : null}

                {movements.error ? (
                  <div
                    role="alert"
                    lang="es"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground"
                  >
                    No se pudo cargar la informacion financiera. Revisa la API de backend.
                  </div>
                ) : null}

                <section aria-label="Key performance indicators" aria-busy={movements.loading}>
                  <KPIRow metrics={metrics} loading={movements.loading} />
                </section>

                <section
                  aria-label="Financial charts"
                  aria-busy={movements.loading}
                  className="grid grid-cols-1 gap-4 xl:grid-cols-2"
                >
                  <Suspense fallback={<ChartFallback />}>
                    <IncomeOutcomeChart data={monthlyData} loading={movements.loading} />
                  </Suspense>
                  <Suspense fallback={<ChartFallback />}>
                    <ProfitPercentChart data={monthlyData} loading={movements.loading} />
                  </Suspense>
                </section>

                <section aria-label="Anomaly alerts" aria-busy={alerts.loading}>
                  <AlertsTable
                    alerts={alerts.data}
                    appliedThreshold={appliedThreshold}
                    thresholdText={thresholdText}
                    onThresholdChange={handleThresholdChange}
                    loading={alerts.loading}
                    error={alerts.error}
                  />
                </section>
              </>
            ) : (
              <Suspense fallback={<ComparisonFallback />}>
                <ComparisonPage filter={filter} bounds={bounds} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
