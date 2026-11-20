// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AlertsTable } from "./alerts-table";
import type { AlertsResponse } from "@/lib/api-types";
import { changeInput, inputByLabel, settle } from "@/test-utils";

// Not in chronological order on purpose: the table must keep the API order.
const alerts: AlertsResponse = [
  { period: "2026-03", outcome_total: 88073.5, baseline_average: 55334.29, increase_ratio: 0.5917 },
  { period: "2025-12", outcome_total: 90000, baseline_average: 36058.3, increase_ratio: 1.4968 },
];

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
});

async function renderTable(props: {
  alerts?: AlertsResponse | null;
  appliedThreshold?: number;
  thresholdText?: string;
  onThresholdChange?: (text: string) => void;
  loading?: boolean;
  error?: boolean;
}) {
  root.render(
    <AlertsTable
      alerts={props.alerts === undefined ? alerts : props.alerts}
      appliedThreshold={props.appliedThreshold ?? 0.3}
      thresholdText={props.thresholdText ?? "0.3"}
      onThresholdChange={props.onThresholdChange ?? (() => {})}
      loading={props.loading}
      error={props.error}
    />,
  );
  await settle();
}

function thresholdInput(): HTMLInputElement {
  const input = inputByLabel(container, "Alert threshold");
  if (!input) throw new Error("Alert threshold input not found");
  return input;
}

function bodyRows(): HTMLTableRowElement[] {
  return [...container.querySelectorAll<HTMLTableRowElement>("tbody tr")];
}

function cellTexts(row: HTMLTableRowElement): string[] {
  return [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? "");
}

function alertTexts(): string[] {
  return [...container.querySelectorAll('[role="alert"]')].map((node) => node.textContent ?? "");
}

describe("AlertsTable", () => {
  it("renders title, help line and threshold input", async () => {
    await renderTable({});

    expect(container.querySelector("h2")?.textContent).toBe("Anomaly Alerts");
    expect(container.textContent).toContain("Average outcome of all earlier periods in the selected range.");
    const input = thresholdInput();
    expect(input.type).toBe("number");
    expect(input.getAttribute("min")).toBe("0.01");
    expect(input.getAttribute("max")).toBe("1");
    expect(input.getAttribute("step")).toBe("0.01");
    expect(input.value).toBe("0.3");
    expect(container.textContent).toContain("Ratio between 0.01 and 1.0 (default 0.3).");
  });

  it("renders rows formatted and in API order", async () => {
    await renderTable({});

    const headers = [...container.querySelectorAll("thead th")].map((cell) => cell.textContent);
    expect(headers).toEqual(["Period", "Outcome", "Avg. of previous periods", "Increase"]);
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])).toEqual(["2026-03", "$88,074", "$55,334", "59.2%"]);
    expect(cellTexts(rows[1])[0]).toBe("2025-12");
  });

  it("keeps the table head on an empty result", async () => {
    await renderTable({ alerts: [], appliedThreshold: 0.3 });

    expect(container.querySelector("thead")).not.toBeNull();
    const cells = container.querySelectorAll("tbody td");
    expect(cells).toHaveLength(1);
    expect((cells[0] as HTMLTableCellElement).colSpan).toBe(4);
    const status = cells[0].querySelector('[role="status"]');
    expect(status?.textContent).toContain("No anomalies detected for the current threshold (30.0%).");
    expect(status?.textContent).toContain("Try a lower threshold or a wider date range.");
  });

  it("shows three skeleton rows while loading", async () => {
    await renderTable({ alerts: null, loading: true });

    expect(container.querySelector("thead")).not.toBeNull();
    const rows = bodyRows();
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      expect(cells).toHaveLength(1);
      expect(cells[0].colSpan).toBe(4);
      expect(cells[0].querySelector('[data-slot="skeleton"]')).not.toBeNull();
    }
    expect(thresholdInput().disabled).toBe(false);
  });

  it("shows a load error instead of the table", async () => {
    await renderTable({ alerts: null, error: true });

    expect(alertTexts()).toEqual(["Could not load anomaly alerts."]);
    expect(container.querySelector("table")).toBeNull();
  });

  it("prefers loading over error", async () => {
    await renderTable({ alerts: null, loading: true, error: true });

    expect(container.querySelectorAll('tbody [data-slot="skeleton"]')).toHaveLength(3);
    expect(container.textContent).not.toContain("Could not load anomaly alerts.");
  });

  it("flags an invalid threshold and keeps the last rows", async () => {
    await renderTable({ thresholdText: "5" });

    expect(alertTexts()).toEqual(["Enter a value between 0.01 and 1.0."]);
    expect(thresholdInput().getAttribute("aria-invalid")).toBe("true");
    expect(bodyRows()).toHaveLength(2);
  });

  it("reports threshold edits", async () => {
    const onThresholdChange = vi.fn();
    await renderTable({ onThresholdChange });

    changeInput(thresholdInput(), "0.5");
    expect(onThresholdChange).toHaveBeenCalledWith("0.5");
  });
});
