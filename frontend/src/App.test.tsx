// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { AlertsResponse, FacetsResponse, TopCategoriesResponse } from "@/lib/api-types";
import type { BusinessType, FinancialMovement } from "@/lib/financial-types";
import { changeInput, inputByLabel, settle } from "@/test-utils";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
  vi.unstubAllGlobals();
});

function busyStates(): (string | null)[] {
  return [...container.querySelectorAll("section")].map((section) =>
    section.getAttribute("aria-busy"),
  );
}

describe("App loading and error states", () => {
  it("marks both dashboard sections busy while data is loading", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    root.render(<App />);

    await vi.waitFor(() => {
      expect(busyStates()).toEqual(["true", "true", "true"]);
    });
  });

  it("announces a load error in Spanish and keeps the heading structure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );

    root.render(<App />);

    await vi.waitFor(() => {
      const headings = [...container.querySelectorAll("h2")].map(
        (heading) => heading.textContent,
      );
      expect(headings).toContain("Income vs. Outcome");
      expect(headings).toContain("Profit Margin %");
    }, { timeout: 3000 }); // Q-26: the lazy chart chunk can take over 1 s under a parallel suite.

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.getAttribute("lang")).toBe("es");
    expect(alert?.textContent).toContain("No se pudo cargar");
    expect(busyStates()).toEqual(["false", "false", "false"]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(
      [...container.querySelectorAll("h2")].map((heading) => heading.textContent),
    ).toEqual([
      "Total Income",
      "Total Outcome",
      "Profit",
      "Profit Margin",
      "Income vs. Outcome",
      "Profit Margin %",
      "Anomaly Alerts",
    ]);
  });
});

type Handler = (url: string) => Promise<Response>;

let requested: string[] = [];

/** Stubs fetch by path (without query) and records every requested URL. */
function routeFetch(routes: Record<string, Handler>) {
  requested = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      requested.push(url);
      const handler = routes[url.split("?")[0]];
      return handler ? handler(url) : Promise.resolve(new Response(null, { status: 404 }));
    }),
  );
}

/** URLs requested to the movements endpoint, without the other routes. */
function movementRequests(): string[] {
  return requested.filter((url) => url.split("?")[0] === "/api/metrics");
}

function ok(body: unknown): Handler {
  return () => Promise.resolve(Response.json(body));
}

function failing(): Handler {
  return () => Promise.resolve(new Response(null, { status: 500 }));
}

function deferred() {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// FIN fixture: income 100 and outcome 25 -> profit 75 and margin 75 %. Not the API dataset.
const movements: FinancialMovement[] = [
  { create_date: "2026-01-10", amount: 100, operation_type: "income", category: "sales", business_type: "B2B" },
  { create_date: "2026-01-15", amount: 25, operation_type: "outcome", category: "suppliers", business_type: "B2C" },
];

const facets: FacetsResponse = {
  operation_types: ["income", "outcome"],
  business_types: ["B2B", "B2C"],
  categories: ["sales", "suppliers"],
  min_date: "2025-11-01",
  max_date: "2026-10-28",
};

// Same fixture as the AlertsTable test; not the API dataset.
const alertsFixture: AlertsResponse = [
  { period: "2026-03", outcome_total: 88073.5, baseline_average: 55334.29, increase_ratio: 0.5917 },
  { period: "2025-12", outcome_total: 90000, baseline_average: 36058.3, increase_ratio: 1.4968 },
];

const filledKPIs = ["$100", "$25", "$75", "75.0%"];
const emptyKPIs = ["—", "—", "—", "—"];

function kpiValues(): string[] {
  return [
    ...container.querySelectorAll('section[aria-label="Key performance indicators"] p.text-3xl'),
  ].map((node) => node.textContent ?? "");
}

function headerText(): string {
  return container.querySelector("header")?.textContent ?? "";
}

function alertTexts(): string[] {
  return [...container.querySelectorAll('[role="alert"]')].map((node) => node.textContent ?? "");
}

function emptyNotice(): Element | undefined {
  return [...container.querySelectorAll('[role="status"]')].find(
    (node) => node.textContent === "No movements found for the selected range.",
  );
}

function dateInput(label: "Start date" | "End date"): HTMLInputElement {
  const input = inputByLabel(container, label);
  if (!input) throw new Error(`${label} input not found`);
  return input;
}

async function typeDate(label: "Start date" | "End date", value: string) {
  changeInput(dateInput(label), value);
  await settle();
}

async function renderLoaded(routes: Record<string, Handler>) {
  routeFetch(routes);
  root.render(<App />);
  await vi.waitFor(() => expect(kpiValues()).toEqual(filledKPIs));
}

describe("F1 date range filter", () => {
  it("requests facets and unfiltered movements on mount", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });

    expect(requested.filter((url) => !url.startsWith("/api/metrics/alerts")).sort()).toEqual(["/api/metrics", "/api/metrics/facets"]);
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Available data: 2025-11-01 to 2026-10-28"),
    );
    expect(headerText()).toContain("2024 - Full Year");
  });

  it("refetches with only the informed dates", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });

    await typeDate("Start date", "2026-01-01");
    expect(movementRequests().at(-1)).toBe("/api/metrics?start_date=2026-01-01");
    expect(headerText()).toContain("From 2026-01-01");

    await typeDate("End date", "2026-01-31");
    expect(movementRequests().at(-1)).toBe("/api/metrics?start_date=2026-01-01&end_date=2026-01-31");
    expect(headerText()).toContain("2026-01-01 — 2026-01-31");
    await vi.waitFor(() => expect(kpiValues()).toEqual(filledKPIs));
  });

  it("accepts a single-day range", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });

    await typeDate("Start date", "2026-01-15");
    await typeDate("End date", "2026-01-15");
    expect(movementRequests().at(-1)).toBe("/api/metrics?start_date=2026-01-15&end_date=2026-01-15");
    expect(alertTexts()).toEqual([]);
  });

  it("keeps the last data on an inverted range", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });
    await typeDate("Start date", "2026-02-01");
    await vi.waitFor(() => expect(kpiValues()).toEqual(filledKPIs));
    const count = requested.length;

    await typeDate("End date", "2026-01-01");
    expect(requested).toHaveLength(count);
    expect(alertTexts()).toEqual(["Start date must be on or before end date."]);
    expect(kpiValues()).toEqual(filledKPIs);
    expect(headerText()).toContain("2026-02-01 — 2026-01-01");
  });

  it("does not request while the year is being typed", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });
    await vi.waitFor(() => expect(container.textContent).toContain("Available data"));
    const count = requested.length;

    for (const partial of ["0001-02-02", "0019-02-02", "0190-02-02"]) {
      await typeDate("Start date", partial);
      expect(requested).toHaveLength(count);
      expect(alertTexts()).toEqual([]);
    }

    await typeDate("Start date", "1900-02-02");
    expect(requested).toHaveLength(count);
    expect(alertTexts()).toEqual(["Dates must be between 2025-11-01 and 2026-10-28."]);
  });

  it("blocks a date that becomes out of bounds when facets arrives", async () => {
    const pendingFacets = deferred();
    await renderLoaded({ "/api/metrics/facets": () => pendingFacets.promise, "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });

    await typeDate("Start date", "2030-01-01");
    expect(movementRequests().at(-1)).toBe("/api/metrics?start_date=2030-01-01");

    pendingFacets.resolve(Response.json(facets));
    await vi.waitFor(() =>
      expect(alertTexts()).toEqual(["Dates must be between 2025-11-01 and 2026-10-28."]),
    );
    const count = requested.length;
    await typeDate("End date", "2030-01-05");
    expect(requested).toHaveLength(count);
  });

  it("shows the empty range state", async () => {
    routeFetch({ "/api/metrics/facets": ok(facets), "/api/metrics": ok([]), "/api/metrics/alerts": ok(alertsFixture) });
    root.render(<App />);

    await vi.waitFor(() => expect(emptyNotice()).toBeDefined());
    expect(kpiValues()).toEqual(emptyKPIs);
    await vi.waitFor(() =>
      expect(container.textContent?.split("No data available to display")).toHaveLength(3),
    );
  });

  it("hides the empty notice while reloading", async () => {
    const pendingReload = deferred();
    let movementCalls = 0;
    routeFetch({
      "/api/metrics/facets": ok(facets),
      "/api/metrics": () => (++movementCalls === 1 ? Promise.resolve(Response.json([])) : pendingReload.promise),
      "/api/metrics/alerts": ok(alertsFixture),
    });
    root.render(<App />);
    await vi.waitFor(() => expect(emptyNotice()).toBeDefined());

    await typeDate("Start date", "2026-01-01");
    expect(movementRequests().at(-1)).toBe("/api/metrics?start_date=2026-01-01");
    expect(emptyNotice()).toBeUndefined();

    pendingReload.resolve(Response.json([]));
    await vi.waitFor(() => expect(emptyNotice()).toBeDefined());
  });

  it("works without facets", async () => {
    await renderLoaded({ "/api/metrics/facets": failing(), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });
    await settle();

    expect(container.textContent).not.toContain("Available data");
    expect(alertTexts()).toEqual([]);
    expect(dateInput("Start date").hasAttribute("min")).toBe(false);
  });

  it("clears both dates", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });
    await typeDate("Start date", "2026-01-01");

    const clear = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Clear dates"),
    );
    clear?.click();
    await settle();
    expect(movementRequests().at(-1)).toBe("/api/metrics");
    expect(headerText()).toContain("2024 - Full Year");
  });

  it("omits an emptied date", async () => {
    await renderLoaded({ "/api/metrics/facets": ok(facets), "/api/metrics": ok(movements), "/api/metrics/alerts": ok(alertsFixture) });
    await typeDate("Start date", "2026-01-01");

    await typeDate("Start date", "");
    expect(movementRequests().at(-1)).toBe("/api/metrics");
  });
});

const allRoutes = {
  "/api/metrics/facets": ok(facets),
  "/api/metrics": ok(movements),
  "/api/metrics/alerts": ok(alertsFixture),
};

const thresholdNotice = "Enter a value between 0.01 and 1.0.";

function alertRequests(): string[] {
  return requested.filter((url) => url.startsWith("/api/metrics/alerts"));
}

function alertPeriods(): string[] {
  return [
    ...container.querySelectorAll('section[aria-label="Anomaly alerts"] tbody tr td:first-child'),
  ].map((cell) => cell.textContent ?? "");
}

async function typeThreshold(text: string) {
  const input = inputByLabel(container, "Alert threshold");
  if (!input) throw new Error("Alert threshold input not found");
  changeInput(input, text);
  await settle();
}

async function renderWithAlerts(routes: Record<string, Handler> = allRoutes) {
  await renderLoaded(routes);
  await vi.waitFor(() => expect(alertPeriods()).toEqual(["2026-03", "2025-12"]));
}

describe("F2 anomaly alerts", () => {
  it("requests alerts with the default threshold on mount", async () => {
    await renderWithAlerts();

    expect(requested).toContain("/api/metrics/alerts?threshold=0.3");
  });

  it("refetches with a valid threshold", async () => {
    await renderWithAlerts();

    await typeThreshold("0.5");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=0.5");
    await typeThreshold("0.01");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=0.01");
    await typeThreshold("1");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=1");
  });

  it("requests a threshold outside the input step", async () => {
    await renderWithAlerts();

    await typeThreshold("0.015");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=0.015");
    expect(alertTexts()).not.toContain(thresholdNotice);
  });

  it("does not request with an invalid threshold", async () => {
    await renderWithAlerts();
    const count = alertRequests().length;

    for (const text of ["5", "0", ""]) {
      await typeThreshold(text);
      expect(alertRequests()).toHaveLength(count);
      expect(alertTexts()).toContain(thresholdNotice);
      expect(alertPeriods()).toEqual(["2026-03", "2025-12"]);
    }
  });

  it("refetches alerts when dates change", async () => {
    await renderWithAlerts();

    await typeDate("Start date", "2026-01-01");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=0.3&start_date=2026-01-01");
  });

  it("does not request alerts on an invalid range", async () => {
    await renderWithAlerts();
    await typeDate("Start date", "2026-02-01");
    const count = alertRequests().length;

    await typeDate("End date", "2026-01-01");
    expect(alertRequests()).toHaveLength(count);
    expect(alertPeriods()).toEqual(["2026-03", "2025-12"]);
  });

  it("applies a threshold typed during an invalid range", async () => {
    await renderWithAlerts();
    await typeDate("Start date", "2026-02-01");
    await typeDate("End date", "2026-01-01");
    const count = alertRequests().length;

    await typeThreshold("0.5");
    expect(alertRequests()).toHaveLength(count);

    await typeDate("End date", "2026-03-01");
    expect(alertRequests().at(-1)).toBe(
      "/api/metrics/alerts?threshold=0.5&start_date=2026-02-01&end_date=2026-03-01",
    );
  });

  it("uses the applied threshold when dates change", async () => {
    await renderWithAlerts();
    const count = alertRequests().length;

    await typeThreshold("5");
    expect(alertRequests()).toHaveLength(count);

    await typeDate("Start date", "2026-01-01");
    expect(alertRequests().at(-1)).toBe("/api/metrics/alerts?threshold=0.3&start_date=2026-01-01");
    expect(alertTexts()).toContain(thresholdNotice);
  });

  it("keeps alert errors inside the card", async () => {
    await renderLoaded({ ...allRoutes, "/api/metrics/alerts": failing() });

    await vi.waitFor(() => expect(alertTexts()).toContain("Could not load anomaly alerts."));
    expect(container.textContent).not.toContain("No se pudo cargar");
    expect(kpiValues()).toEqual(filledKPIs);
  });
});

// Top income per group from verification.md (full dataset on 2026-11-15); not the current API dataset.
const b2bTop: TopCategoriesResponse = [
  { category: "sales", operation_type: "income", total_amount: 557903.97 },
  { category: "others", operation_type: "income", total_amount: 57636.75 },
];
const b2cTop: TopCategoriesResponse = [
  { category: "sales", operation_type: "income", total_amount: 574193.41 },
  { category: "others", operation_type: "income", total_amount: 68412.74 },
];

/** Answers `top` by the business_type of the URL. */
function topByGroup(groups: Record<BusinessType, Handler>): Handler {
  return (url) => groups[url.includes("business_type=B2B") ? "B2B" : "B2C"](url);
}

const comparisonRoutes = {
  ...allRoutes,
  "/api/metrics/categories/top": topByGroup({ B2B: ok(b2bTop), B2C: ok(b2cTop) }),
};

const topBase = "/api/metrics/categories/top?operation_type=income&limit=5&business_type=";
const comparisonEmptyStates = [
  "No income in the selected range for B2B.",
  "No income in the selected range for B2C.",
  "No income to compare in the selected range.",
];

function tab(label: "Dashboard" | "B2B vs B2C"): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')].find(
    (item) => item.textContent === label,
  );
  if (!button) throw new Error(`${label} tab not found`);
  return button;
}

async function selectTab(label: "Dashboard" | "B2B vs B2C") {
  tab(label).click();
  await settle();
}

function topRequests(): string[] {
  return requested.filter((url) => url.startsWith("/api/metrics/categories/top"));
}

function dashboardRequests(): string[] {
  return requested.filter((url) => url.startsWith("/api/metrics?") || url.startsWith("/api/metrics/alerts"));
}

function panelText(group: BusinessType): string {
  const panel = [...container.querySelectorAll('section[aria-label="Income by business type"] [data-slot="card"]')].find(
    (card) => card.querySelector("h2")?.textContent === `${group} - Top income categories`,
  );
  return panel?.textContent ?? "";
}

function statusTexts(): string[] {
  return [...container.querySelectorAll('#view-panel [role="status"]')].map((node) => node.textContent ?? "");
}

/** The first open downloads the lazy ComparisonPage chunk with Recharts; same wait budget as Q-26. */
async function waitForGroupRows() {
  await vi.waitFor(() => {
    expect(panelText("B2B")).toContain("Sales");
    expect(panelText("B2C")).toContain("Sales");
  }, { timeout: 3000 });
}

async function openComparison(routes: Record<string, Handler> = comparisonRoutes) {
  await renderWithAlerts(routes);
  await selectTab("B2B vs B2C");
  await waitForGroupRows();
}

describe("F3 B2B vs B2C view", () => {
  it("starts on the dashboard tab", async () => {
    await renderWithAlerts(comparisonRoutes);

    expect(tab("Dashboard").getAttribute("aria-selected")).toBe("true");
    expect(tab("B2B vs B2C").getAttribute("aria-selected")).toBe("false");
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe("tab-dashboard");
  });

  it("requests both groups when the view opens", async () => {
    await openComparison();

    expect(requested).toContain(`${topBase}B2B`);
    expect(requested).toContain(`${topBase}B2C`);
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe("tab-comparison");
  });

  it("replaces the dashboard content", async () => {
    await openComparison();

    expect(container.querySelector('section[aria-label="Key performance indicators"]')).toBeNull();
    expect(container.querySelector('section[aria-label="Anomaly alerts"]')).toBeNull();
    expect(container.querySelector('[role="group"][aria-label="Date range"]')).not.toBeNull();
  });

  it("sends the shared filter to both groups", async () => {
    await openComparison();

    await typeDate("Start date", "2026-01-01");
    expect(topRequests().slice(-2).sort()).toEqual([
      `${topBase}B2B&start_date=2026-01-01`,
      `${topBase}B2C&start_date=2026-01-01`,
    ]);
  });

  it("does not request dashboard data while comparing", async () => {
    await openComparison();
    const count = dashboardRequests().length;

    await typeDate("Start date", "2026-01-01");
    expect(dashboardRequests()).toHaveLength(count);
  });

  it("refetches the dashboard with the current filter", async () => {
    await openComparison();
    await typeDate("Start date", "2026-01-01");

    await selectTab("Dashboard");
    expect(requested).toContain("/api/metrics?start_date=2026-01-01");
    expect(requested).toContain("/api/metrics/alerts?threshold=0.3&start_date=2026-01-01");
    expect(dateInput("Start date").value).toBe("2026-01-01");
  });

  it("keeps the last result on an invalid range", async () => {
    await openComparison();
    await typeDate("Start date", "2026-02-01");
    await waitForGroupRows();
    const count = topRequests().length;

    await typeDate("End date", "2026-01-01");
    expect(topRequests()).toHaveLength(count);
    expect(panelText("B2B")).toContain("Sales");
    expect(panelText("B2C")).toContain("Sales");
  });

  it("opens with an invalid range", async () => {
    await renderWithAlerts(comparisonRoutes);
    await typeDate("Start date", "2026-02-01");
    await typeDate("End date", "2026-01-01");

    await selectTab("B2B vs B2C");
    await vi.waitFor(() => expect(statusTexts()).toEqual(comparisonEmptyStates), { timeout: 3000 });
    expect(topRequests()).toEqual([]);
  });

  it("opens with an out-of-bounds date", async () => {
    await renderWithAlerts(comparisonRoutes);
    await vi.waitFor(() => expect(container.textContent).toContain("Available data"));
    await typeDate("Start date", "2030-01-01");

    await selectTab("B2B vs B2C");
    await vi.waitFor(() => expect(statusTexts()).toEqual(comparisonEmptyStates), { timeout: 3000 });
    expect(topRequests()).toEqual([]);
  });

  it("shows empty states when it reopens with an invalid filter", async () => {
    await openComparison();
    const count = topRequests().length;
    await selectTab("Dashboard");
    await typeDate("Start date", "2026-02-01");
    await typeDate("End date", "2026-01-01");

    await selectTab("B2B vs B2C");
    await vi.waitFor(() => expect(statusTexts()).toEqual(comparisonEmptyStates));
    expect(topRequests()).toHaveLength(count);
  });

  it("isolates an empty group", async () => {
    await renderWithAlerts({
      ...comparisonRoutes,
      "/api/metrics/categories/top": topByGroup({ B2B: ok([]), B2C: ok(b2cTop) }),
    });

    await selectTab("B2B vs B2C");
    await vi.waitFor(() => expect(panelText("B2C")).toContain("Sales"), { timeout: 3000 });
    expect(panelText("B2B")).toContain("No income in the selected range for B2B.");
  });

  it("isolates a failed group", async () => {
    await renderWithAlerts({
      ...comparisonRoutes,
      "/api/metrics/categories/top": topByGroup({ B2B: ok(b2bTop), B2C: failing() }),
    });

    await selectTab("B2B vs B2C");
    await vi.waitFor(() => expect(panelText("B2B")).toContain("Sales"), { timeout: 3000 });
    await vi.waitFor(() =>
      expect(alertTexts()).toEqual(["Could not load B2C income data.", "Could not load the comparison."]),
    );
  });

  it("hides dashboard notices while comparing", async () => {
    routeFetch({ ...comparisonRoutes, "/api/metrics": failing() });
    root.render(<App />);
    await vi.waitFor(() => expect(container.textContent).toContain("No se pudo cargar"));

    await selectTab("B2B vs B2C");
    await waitForGroupRows();
    expect(container.textContent).not.toContain("No se pudo cargar");
  });
});
