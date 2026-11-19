// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { buttonByText, deferred, inputByLabel, jsonResponse, setInputValue } from "@/test-helpers";

// The charts are lazy chunks with Recharts; loading them in jsdom can exceed the 1 s default.
const LAZY_CHARTS = { timeout: 5000 };

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
    }, LAZY_CHARTS);

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

const FACETS = {
  operation_types: ["income", "outcome"],
  business_types: ["B2B", "B2C"],
  categories: ["sales", "others"],
  min_date: "2025-11-01",
  max_date: "2026-10-28",
};

const movement = (amount: number, operation_type: "income" | "outcome") => ({
  create_date: "2026-01-10",
  amount,
  operation_type,
  category: "sales",
  business_type: "B2B",
});
const ALL_MOVEMENTS = [movement(1000, "income"), movement(250, "outcome")];
const FILTERED_MOVEMENTS = [movement(100, "income"), movement(25, "outcome")];

const isMovementsUrl = (url: string) => url === "/api/metrics" || url.startsWith("/api/metrics?");

/** Routes the fake fetch by URL; `route` overrides the defaults when it returns a promise. */
function stubApi(route: (url: string) => Promise<Response> | undefined = () => undefined) {
  const fetchMock = vi.fn((url: string) => {
    const custom = route(url);
    if (custom) return custom;
    if (url === "/api/metrics/facets") return Promise.resolve(jsonResponse(FACETS));
    if (url === "/api/metrics") return Promise.resolve(jsonResponse(ALL_MOVEMENTS));
    if (isMovementsUrl(url)) return Promise.resolve(jsonResponse(FILTERED_MOVEMENTS));
    return Promise.resolve(jsonResponse([]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type FetchMock = ReturnType<typeof stubApi>;
const calledUrls = (fetchMock: FetchMock) => fetchMock.mock.calls.map(([url]) => url);
const movementCalls = (fetchMock: FetchMock) => calledUrls(fetchMock).filter(isMovementsUrl);
const tick = () => new Promise((done) => setTimeout(done, 0));
const kpiSection = () =>
  container.querySelector('section[aria-label="Key performance indicators"]');
const kpiValues = () =>
  [...(kpiSection()?.querySelectorAll("p.text-3xl") ?? [])].map((p) => p.textContent);

async function renderLoaded() {
  root.render(<App />);
  await vi.waitFor(() => expect(kpiValues()[0]).toBe("$1,000"));
}

async function setDate(label: "Start date" | "End date", value: string) {
  setInputValue(inputByLabel(container, label), value);
  await vi.waitFor(() => expect(inputByLabel(container, label).value).toBe(value));
}

describe("date range filter", () => {
  it("requests facets and unfiltered movements on load", async () => {
    const fetchMock = stubApi();
    await renderLoaded();

    expect(calledUrls(fetchMock)).toContain("/api/metrics/facets");
    expect(movementCalls(fetchMock)).toEqual(["/api/metrics"]);
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Available data: 2025-11-01 to 2026-10-28"),
    );
  });

  it("refetches with only the informed dates and recalculates KPIs", async () => {
    const fetchMock = stubApi();
    await renderLoaded();

    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() => {
      expect(movementCalls(fetchMock).at(-1)).toBe("/api/metrics?start_date=2026-01-01");
      expect(container.textContent).toContain("From 2026-01-01");
      expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]);
    });

    await setDate("End date", "2026-01-31");
    await vi.waitFor(() => {
      expect(movementCalls(fetchMock).at(-1)).toBe(
        "/api/metrics?start_date=2026-01-01&end_date=2026-01-31",
      );
      expect(container.textContent).toContain("2026-01-01 — 2026-01-31");
    });
  });

  it("blocks requests and keeps data on an inverted range", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setDate("End date", "2026-01-01");
    await vi.waitFor(() => expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]));
    const callsBefore = movementCalls(fetchMock).length;

    await setDate("Start date", "2026-02-01");
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Start date must be on or before end date."),
    );
    await tick();
    expect(movementCalls(fetchMock)).toHaveLength(callsBefore);
    expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]);
    expect(container.textContent).toContain("2026-02-01 — 2026-01-01");

    setInputValue(inputByLabel(container, "Start date"), "");
    await vi.waitFor(() => expect(container.textContent).toContain("Until 2026-01-01"));
    expect(kpiSection()?.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]);
  });

  it("shows dashes, empty charts and a notice for an empty range", async () => {
    stubApi((url) =>
      url.startsWith("/api/metrics?") ? Promise.resolve(jsonResponse([])) : undefined,
    );
    await renderLoaded();

    await setDate("Start date", "2026-10-28");
    await vi.waitFor(() => {
      expect(kpiValues()).toEqual(["—", "—", "—", "—"]);
      expect(container.querySelector('[role="status"]')?.textContent).toBe(
        "No movements found for the selected range.",
      );
      expect(container.textContent?.split("No data available to display")).toHaveLength(3);
    }, LAZY_CHARTS);
  });

  it("clears both dates and reloads without filters", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() => expect(container.textContent).toContain("From 2026-01-01"));

    buttonByText(container, "Clear dates").click();
    await vi.waitFor(() => {
      expect(movementCalls(fetchMock).at(-1)).toBe("/api/metrics");
      expect(container.textContent).toContain("2024 - Full Year");
      expect(kpiValues()).toEqual(["$1,000", "$250", "$750", "75.0%"]);
    });
  });

  it("works without the reference line when facets fails", async () => {
    stubApi((url) =>
      url === "/api/metrics/facets" ? Promise.resolve(jsonResponse(null, 500)) : undefined,
    );
    await renderLoaded();
    await tick();

    expect(container.textContent).not.toContain("Available data");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(inputByLabel(container, "Start date").hasAttribute("min")).toBe(false);
  });

  it("shows dashes and the banner when movements fail, and recovers", async () => {
    stubApi((url) =>
      url === "/api/metrics" ? Promise.resolve(jsonResponse(null, 500)) : undefined,
    );
    root.render(<App />);
    await vi.waitFor(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "No se pudo cargar",
      );
      expect(kpiValues()).toEqual(["—", "—", "—", "—"]);
    });

    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]);
    });
  });

  it("renders only the latest response", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    stubApi((url) => {
      if (url === "/api/metrics?start_date=2026-01-01") return first.promise;
      if (url === "/api/metrics?start_date=2026-01-02") return second.promise;
      return undefined;
    });
    await renderLoaded();

    await setDate("Start date", "2026-01-01");
    await setDate("Start date", "2026-01-02");
    second.resolve(jsonResponse([movement(500, "income")]));
    await vi.waitFor(() => expect(kpiValues()[0]).toBe("$500"));
    first.resolve(jsonResponse([movement(7, "income")]));
    await tick();
    expect(kpiValues()[0]).toBe("$500");
  });

  it("does not request while a year is typed nor for a date outside the range", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await vi.waitFor(() => expect(container.textContent).toContain("Available data"));

    // Chrome emits these values while the user types 02-02-1900 by hand.
    for (const start of ["0001-02-02", "0019-02-02", "0190-02-02", "1900-02-02"]) {
      await setDate("Start date", start);
    }
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Dates must be between 2025-11-01 and 2026-10-28.",
      ),
    );
    await tick();
    expect(movementCalls(fetchMock)).toEqual(["/api/metrics"]);
    expect(kpiValues()).toEqual(["$1,000", "$250", "$750", "75.0%"]);
  });

  it("never sends empty or invalid date params", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setDate("Start date", "2026-01-01");
    await setDate("End date", "2026-01-31");
    setInputValue(inputByLabel(container, "Start date"), "");
    await vi.waitFor(() =>
      expect(movementCalls(fetchMock).at(-1)).toBe("/api/metrics?end_date=2026-01-31"),
    );

    for (const url of movementCalls(fetchMock)) {
      expect(url).not.toMatch(/=(&|$)/);
      expect(url).not.toContain("undefined");
      expect(url).not.toMatch(/category|operation_type/);
    }
  });
});

const ALERT = {
  period: "2026-03",
  outcome_total: 88075.59,
  baseline_average: 55334.29,
  increase_ratio: 0.5917,
};
const alertCalls = (fetchMock: FetchMock) =>
  calledUrls(fetchMock).filter((url) => url.startsWith("/api/metrics/alerts"));
const alertRows = () =>
  [...container.querySelectorAll('section[aria-label="Anomaly alerts"] tbody tr')].map(
    (row) => row.querySelector("td")?.textContent,
  );

async function setThreshold(value: string) {
  setInputValue(inputByLabel(container, "Alert threshold"), value);
  await vi.waitFor(() => expect(inputByLabel(container, "Alert threshold").value).toBe(value));
}

describe("anomaly alerts", () => {
  it("requests alerts with the default threshold on load", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await vi.waitFor(() =>
      expect(alertCalls(fetchMock)).toEqual(["/api/metrics/alerts?threshold=0.3"]),
    );
  });

  it("refetches with a valid threshold", async () => {
    const fetchMock = stubApi();
    await renderLoaded();

    for (const [text, url] of [
      ["0.5", "/api/metrics/alerts?threshold=0.5"],
      ["0.01", "/api/metrics/alerts?threshold=0.01"],
      ["1.0", "/api/metrics/alerts?threshold=1"],
    ]) {
      await setThreshold(text);
      await vi.waitFor(() => expect(alertCalls(fetchMock).at(-1)).toBe(url));
    }
  });

  it("does not request with an invalid threshold", async () => {
    const fetchMock = stubApi((url) =>
      url.startsWith("/api/metrics/alerts") ? Promise.resolve(jsonResponse([ALERT])) : undefined,
    );
    await renderLoaded();
    await vi.waitFor(() => expect(alertRows()).toEqual(["2026-03"]));
    const callsBefore = alertCalls(fetchMock).length;

    for (const text of ["", "0", "5"]) {
      await setThreshold(text);
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Enter a value between 0.01 and 1.0."),
      );
    }
    await tick();
    expect(alertCalls(fetchMock)).toHaveLength(callsBefore);
    expect(alertRows()).toEqual(["2026-03"]);
  });

  it("refetches alerts when the date filter changes", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setThreshold("0.5");
    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() =>
      expect(alertCalls(fetchMock).at(-1)).toBe(
        "/api/metrics/alerts?threshold=0.5&start_date=2026-01-01",
      ),
    );
  });

  it("does not request alerts with a date filter that cannot be requested", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await vi.waitFor(() => expect(container.textContent).toContain("Available data"));
    await setDate("End date", "2026-01-01");
    await vi.waitFor(() =>
      expect(alertCalls(fetchMock).at(-1)).toBe("/api/metrics/alerts?threshold=0.3&end_date=2026-01-01"),
    );
    const callsBefore = alertCalls(fetchMock).length;

    for (const start of ["2026-02-01", "0019-02-02", "1900-02-02"]) {
      await setDate("Start date", start);
    }
    await tick();
    expect(alertCalls(fetchMock)).toHaveLength(callsBefore);
  });

  it("applies a threshold typed during an invalid range once fixed", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setDate("Start date", "2026-02-01");
    await setDate("End date", "2026-01-01");
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Start date must be on or before end date."),
    );
    await setThreshold("0.4");
    await tick();
    expect(alertCalls(fetchMock).some((url) => url.includes("threshold=0.4"))).toBe(false);

    await setDate("Start date", "2025-12-01");
    await vi.waitFor(() =>
      expect(alertCalls(fetchMock).at(-1)).toBe(
        "/api/metrics/alerts?threshold=0.4&start_date=2025-12-01&end_date=2026-01-01",
      ),
    );
  });

  it("keeps alert errors inside the card", async () => {
    stubApi((url) => {
      if (url === "/api/metrics/alerts?threshold=0.3") return Promise.resolve(jsonResponse(null, 500));
      if (url.startsWith("/api/metrics/alerts")) return Promise.resolve(jsonResponse([ALERT]));
      return undefined;
    });
    await renderLoaded();
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Could not load anomaly alerts."),
    );
    expect(container.textContent).not.toContain("No se pudo cargar");
    expect(kpiValues()).toEqual(["$1,000", "$250", "$750", "75.0%"]);

    await setThreshold("0.4");
    await vi.waitFor(() => {
      expect(container.textContent).not.toContain("Could not load anomaly alerts.");
      expect(alertRows()).toEqual(["2026-03"]);
    });
  });

  it("renders only the latest alerts response", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    stubApi((url) => {
      if (url === "/api/metrics/alerts?threshold=0.4") return first.promise;
      if (url === "/api/metrics/alerts?threshold=0.5") return second.promise;
      return undefined;
    });
    await renderLoaded();

    await setThreshold("0.4");
    await setThreshold("0.5");
    second.resolve(jsonResponse([{ ...ALERT, period: "2026-06" }]));
    await vi.waitFor(() => expect(alertRows()).toEqual(["2026-06"]));
    first.resolve(jsonResponse([{ ...ALERT, period: "2025-12" }]));
    await tick();
    expect(alertRows()).toEqual(["2026-06"]);
  });

  it("never sends group_by or business_type to alerts", async () => {
    const fetchMock = stubApi();
    await renderLoaded();
    await setThreshold("0.5");
    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() => expect(alertCalls(fetchMock).length).toBeGreaterThan(1));

    for (const url of alertCalls(fetchMock)) {
      expect(url).not.toMatch(/group_by|business_type/);
    }
  });
});

const TOP = "/api/metrics/categories/top?operation_type=income&limit=5&business_type=";
const topEntries = () => [
  { category: "sales", operation_type: "income", total_amount: 1000 },
  { category: "others", operation_type: "income", total_amount: 250 },
];
const withTop = (url: string) =>
  url.startsWith(TOP) ? Promise.resolve(jsonResponse(topEntries())) : undefined;
const tabPanel = () => container.querySelector('[role="tabpanel"]');
const dashboardCalls = (fetchMock: FetchMock) =>
  calledUrls(fetchMock).filter(
    (url) => isMovementsUrl(url) || url.startsWith("/api/metrics/alerts"),
  );

async function openComparison() {
  buttonByText(container, "B2B vs B2C").click();
  await vi.waitFor(
    () => expect(container.textContent).toContain("B2B - Top income categories"),
    LAZY_CHARTS,
  );
}

describe("view tabs", () => {
  it("starts on the dashboard tab", async () => {
    stubApi();
    await renderLoaded();

    expect(tabPanel()?.getAttribute("aria-labelledby")).toBe("tab-dashboard");
    expect(buttonByText(container, "Dashboard").getAttribute("aria-selected")).toBe("true");
  });

  it("switches to the comparison view and keeps the date picker", async () => {
    stubApi(withTop);
    await renderLoaded();
    await openComparison();

    expect(kpiSection()).toBeNull();
    expect(container.textContent).not.toContain("Anomaly Alerts");
    expect(tabPanel()?.getAttribute("aria-labelledby")).toBe("tab-comparison");
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(2);
    expect(tabPanel()?.querySelector('input[type="date"]')).toBeNull();
  });

  it("does not request dashboard data while comparing", async () => {
    const fetchMock = stubApi(withTop);
    await renderLoaded();
    await openComparison();
    const callsBefore = dashboardCalls(fetchMock).length;

    await setDate("Start date", "2026-01-01");
    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain(`${TOP}B2B&start_date=2026-01-01`),
    );
    expect(dashboardCalls(fetchMock)).toHaveLength(callsBefore);
  });

  it("returns to the dashboard with the same filter", async () => {
    const fetchMock = stubApi(withTop);
    await renderLoaded();
    await openComparison();
    await setDate("Start date", "2026-01-01");

    buttonByText(container, "Dashboard").click();
    await vi.waitFor(() => {
      expect(inputByLabel(container, "Start date").value).toBe("2026-01-01");
      expect(calledUrls(fetchMock)).toContain("/api/metrics?start_date=2026-01-01");
      expect(calledUrls(fetchMock)).toContain(
        "/api/metrics/alerts?threshold=0.3&start_date=2026-01-01",
      );
      expect(kpiValues()).toEqual(["$100", "$25", "$75", "75.0%"]);
    });
  });

  it("hides the movements banner and empty notice in the comparison view", async () => {
    stubApi((url) =>
      url === "/api/metrics" ? Promise.resolve(jsonResponse(null, 500)) : withTop(url),
    );
    root.render(<App />);
    await vi.waitFor(() => expect(container.textContent).toContain("No se pudo cargar"));
    await openComparison();
    expect(container.textContent).not.toContain("No se pudo cargar");

    root.unmount();
    root = createRoot(container);
    stubApi((url) =>
      url.startsWith("/api/metrics?") ? Promise.resolve(jsonResponse([])) : withTop(url),
    );
    await renderLoaded();
    await setDate("Start date", "2026-10-28");
    await vi.waitFor(() =>
      expect(container.textContent).toContain("No movements found for the selected range."),
    );
    await openComparison();
    expect(container.textContent).not.toContain("No movements found for the selected range.");
  });

  it("ignores comparison responses after leaving the tab", async () => {
    const gate = deferred<void>();
    const consoleError = vi.spyOn(console, "error");
    stubApi((url) =>
      url.startsWith(TOP) ? gate.promise.then(() => jsonResponse(topEntries())) : undefined,
    );
    await renderLoaded();
    buttonByText(container, "B2B vs B2C").click();
    await vi.waitFor(
      () => expect(tabPanel()?.getAttribute("aria-labelledby")).toBe("tab-comparison"),
      LAZY_CHARTS,
    );

    buttonByText(container, "Dashboard").click();
    await vi.waitFor(() => expect(kpiSection()).not.toBeNull());
    gate.resolve();
    await tick();

    expect(container.textContent).not.toContain("Top income categories");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
