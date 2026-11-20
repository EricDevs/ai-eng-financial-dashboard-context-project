// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { AlertsResponse, FacetsResponse } from "@/lib/api-types";
import type { FinancialMovement } from "@/lib/financial-types";
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

type Handler = () => Promise<Response>;

let requested: string[] = [];

/** Stubs fetch by path (without query) and records every requested URL. */
function routeFetch(routes: Record<string, Handler>) {
  requested = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      requested.push(url);
      const handler = routes[url.split("?")[0]];
      return handler ? handler() : Promise.resolve(new Response(null, { status: 404 }));
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
