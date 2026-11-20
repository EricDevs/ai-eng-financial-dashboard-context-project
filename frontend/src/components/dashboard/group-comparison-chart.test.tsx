// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GroupComparisonChart } from "./group-comparison-chart";
import type { GroupTotal } from "@/lib/financial-types";
import { settle } from "@/test-utils";

// In jsdom ResponsiveContainer measures 0 px and draws no bars or labels (DEC-38 is checked visually).
const bothZero: GroupTotal[] = [
  { business_type: "B2B", total_income: 0 },
  { business_type: "B2C", total_income: 0 },
];
const onlyB2C: GroupTotal[] = [
  { business_type: "B2B", total_income: 0 },
  { business_type: "B2C", total_income: 642606.15 },
];

const title = "Income: B2B vs B2C";
const description = "Total income of B2B and B2C in the selected range.";

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

async function renderChart(props: { totals?: GroupTotal[]; loading?: boolean; error?: boolean }) {
  root.render(<GroupComparisonChart totals={props.totals ?? onlyB2C} loading={props.loading} error={props.error} />);
  await settle();
}

describe("GroupComparisonChart", () => {
  it("uses the existing chart loading markup", async () => {
    await renderChart({ loading: true });

    expect(container.textContent).not.toContain(title);
    expect(container.querySelector('[data-slot="skeleton"].h-\\[280px\\]')).not.toBeNull();
  });

  it("shows the comparison error", async () => {
    await renderChart({ error: true });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load the comparison.");
    expect(container.querySelector("h2")?.textContent).toBe(title);
  });

  it("prefers loading over error", async () => {
    await renderChart({ loading: true, error: true });

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows the empty state when both totals are zero", async () => {
    await renderChart({ totals: bothZero });

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "No income to compare in the selected range.",
    );
    expect(container.querySelector("h2")?.textContent).toBe(title);
    expect(container.textContent).toContain(description);
  });

  it("renders the chart card when one group has income", async () => {
    await renderChart({ totals: onlyB2C });

    expect(container.querySelector("h2")?.textContent).toBe(title);
    expect(container.textContent).toContain(description);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
