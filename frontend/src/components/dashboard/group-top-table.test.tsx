// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GroupTopTable } from "./group-top-table";
import type { TopCategoriesResponse } from "@/lib/api-types";
import type { BusinessType, GroupCategoryRow } from "@/lib/financial-types";
import { toGroupRows } from "@/lib/financial-utils";
import { settle } from "@/test-utils";

// B2B income from verification.md (full dataset on 2026-11-15).
const b2b: TopCategoriesResponse = [
  { category: "sales", operation_type: "income", total_amount: 557903.97 },
  { category: "others", operation_type: "income", total_amount: 57636.75 },
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
  businessType?: BusinessType;
  rows?: GroupCategoryRow[];
  loading?: boolean;
  error?: boolean;
}) {
  root.render(
    <GroupTopTable
      businessType={props.businessType ?? "B2B"}
      rows={props.rows ?? toGroupRows(b2b)}
      loading={props.loading}
      error={props.error}
    />,
  );
  await settle();
}

function expectTitleAndDescription(group: BusinessType) {
  expect(container.querySelector("h2")?.textContent).toBe(`${group} - Top income categories`);
  expect(container.textContent).toContain("Top 5 categories by total income");
}

describe("GroupTopTable", () => {
  it("renders title, description and rows", async () => {
    await renderTable({});

    expectTitleAndDescription("B2B");
    const headers = [...container.querySelectorAll("thead th")].map((cell) => cell.textContent);
    expect(headers).toEqual(["Category", "Total income", "Share of group"]);
    const rows = [...container.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(2);
    expect([...rows[0].querySelectorAll("td")].map((cell) => cell.textContent)).toEqual([
      "Sales",
      "$557,904",
      "90.6%",
    ]);
  });

  it("shows the empty state without a table", async () => {
    await renderTable({ rows: [] });

    expectTitleAndDescription("B2B");
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "No income in the selected range for B2B.",
    );
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows three skeleton bars while loading", async () => {
    await renderTable({ rows: [], loading: true });

    expectTitleAndDescription("B2B");
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows the group error", async () => {
    await renderTable({ businessType: "B2C", rows: [], error: true });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load B2C income data.");
    expect(container.querySelector("table")).toBeNull();
  });

  it("prefers loading over error", async () => {
    await renderTable({ rows: [], loading: true, error: true });

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
