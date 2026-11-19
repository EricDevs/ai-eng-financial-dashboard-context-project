import { describe, expect, it } from "vitest";

import {
  computeKPIs,
  computeMonthlyData,
  formatCategoryLabel,
  formatCurrency,
  formatPercent,
  formatPeriodLabel,
  getDateRangeIssue,
  isValidDateRange,
  parseThreshold,
  sumTotals,
  toGroupRows,
} from "./financial-utils";
import type { TopCategoriesResponse } from "./api-types";
import type { FinancialMovement } from "./financial-types";

const sampleMovements: FinancialMovement[] = [
  {
    create_date: "2024-01-10",
    amount: 1000,
    operation_type: "income",
    category: "sales",
    business_type: "B2B",
  },
  {
    create_date: "2024-01-15",
    amount: 250,
    operation_type: "outcome",
    category: "suppliers",
    business_type: "B2B",
  },
  {
    create_date: "2024-02-01",
    amount: 500,
    operation_type: "income",
    category: "sales",
    business_type: "B2C",
  },
];

describe("computeKPIs", () => {
  it("calculates totals and profit values", () => {
    const metrics = computeKPIs(sampleMovements);

    expect(metrics).toEqual({
      totalIncome: 1500,
      totalOutcome: 250,
      profit: 1250,
      profitPercent: (1250 / 1500) * 100,
    });
  });

  it("returns 0 profitPercent when there is no income", () => {
    const onlyOutcomes: FinancialMovement[] = [
      {
        create_date: "2024-03-05",
        amount: 350,
        operation_type: "outcome",
        category: "operational",
        business_type: "B2B",
      },
    ];

    const metrics = computeKPIs(onlyOutcomes);
    expect(metrics.profitPercent).toBe(0);
  });
});

describe("computeMonthlyData", () => {
  it("returns chronological year-month points with aggregated totals", () => {
    const unsortedCrossYearMovements: FinancialMovement[] = [
      {
        create_date: "2026-01-08",
        amount: 300,
        operation_type: "income",
        category: "sales",
        business_type: "B2C",
      },
      {
        create_date: "2025-12-05",
        amount: 200,
        operation_type: "outcome",
        category: "operational",
        business_type: "B2B",
      },
      {
        create_date: "2025-12-03",
        amount: 1000,
        operation_type: "income",
        category: "sales",
        business_type: "B2B",
      },
    ];
    const monthlyData = computeMonthlyData(unsortedCrossYearMovements);

    expect(monthlyData).toHaveLength(2);
    expect(monthlyData[0]).toEqual({
      month: "Dec 2025",
      income: 1000,
      outcome: 200,
      profitPercent: 80,
    });
    expect(monthlyData[1]).toEqual({
      month: "Jan 2026",
      income: 300,
      outcome: 0,
      profitPercent: 100,
    });
  });

  it("keeps a first-of-month movement separate from the previous month's last day", () => {
    const monthBoundaryMovements: FinancialMovement[] = [
      {
        create_date: "2024-02-01",
        amount: 10,
        operation_type: "income",
        category: "sales",
        business_type: "B2C",
      },
      {
        create_date: "2024-01-31",
        amount: 7,
        operation_type: "outcome",
        category: "operational",
        business_type: "B2B",
      },
    ];

    const monthlyData = computeMonthlyData(monthBoundaryMovements);

    // Expected by hand from the movements above (no formula copied from financial-utils.ts):
    // Jan 2024: income 0, outcome 7, profit = 0 - 7 = -7, profitPercent = 0 (no income)
    // Feb 2024: income 10, outcome 0, profit = 10 - 0 = 10, profitPercent = (10 / 10) * 100 = 100
    expect(monthlyData).toHaveLength(2);
    expect(monthlyData[0]).toEqual({
      month: "Jan 2024",
      income: 0,
      outcome: 7,
      profitPercent: 0,
    });
    expect(monthlyData[1]).toEqual({
      month: "Feb 2024",
      income: 10,
      outcome: 0,
      profitPercent: 100,
    });
  });
});

describe("formatters", () => {
  it("formats currency without decimals", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235");
  });

  it("formats percent with one decimal", () => {
    expect(formatPercent(15.555)).toBe("15.6%");
  });
});

describe("date range", () => {
  it("accepts empty, single-ended, equal and ordered ranges", () => {
    expect(isValidDateRange({})).toBe(true);
    expect(isValidDateRange({ start_date: "2026-01-01" })).toBe(true);
    expect(isValidDateRange({ end_date: "2026-01-31" })).toBe(true);
    expect(isValidDateRange({ start_date: "2026-01-15", end_date: "2026-01-15" })).toBe(true);
    expect(isValidDateRange({ start_date: "2025-12-31", end_date: "2026-01-01" })).toBe(true);
  });

  it("rejects a start date after the end date", () => {
    expect(isValidDateRange({ start_date: "2026-01-02", end_date: "2026-01-01" })).toBe(false);
  });

  it("labels the period with raw dates", () => {
    expect(formatPeriodLabel({})).toBeNull();
    expect(formatPeriodLabel({ start_date: "2026-01-01", end_date: "2026-01-31" })).toBe(
      "2026-01-01 — 2026-01-31",
    );
    expect(formatPeriodLabel({ start_date: "2026-01-01" })).toBe("From 2026-01-01");
    expect(formatPeriodLabel({ end_date: "2026-01-31" })).toBe("Until 2026-01-31");
  });

  it("labels an inverted range as typed", () => {
    expect(formatPeriodLabel({ start_date: "2026-02-01", end_date: "2026-01-01" })).toBe(
      "2026-02-01 — 2026-01-01",
    );
  });
});

describe("getDateRangeIssue", () => {
  const bounds = { min_date: "2025-11-01", max_date: "2026-10-28" };

  it("accepts ranges inside the bounds, including the limits", () => {
    expect(getDateRangeIssue({}, bounds)).toBeNull();
    expect(getDateRangeIssue({ start_date: "2025-11-01", end_date: "2026-10-28" }, bounds)).toBeNull();
  });

  it("treats a zero-padded year as a date still being typed", () => {
    // Chrome emits 0001, 0019, 0190 while the user types the year 1900.
    for (const start_date of ["0001-02-02", "0019-02-02", "0190-02-02"]) {
      expect(getDateRangeIssue({ start_date }, bounds)).toBe("incomplete");
      expect(getDateRangeIssue({ start_date }, null)).toBe("incomplete");
    }
  });

  it("rejects complete dates outside the bounds", () => {
    expect(getDateRangeIssue({ start_date: "1900-02-02" }, bounds)).toBe("outOfBounds");
    expect(getDateRangeIssue({ end_date: "2026-10-29" }, bounds)).toBe("outOfBounds");
    expect(getDateRangeIssue({ start_date: "2025-10-31" }, bounds)).toBe("outOfBounds");
  });

  it("does not check bounds when they are unknown", () => {
    expect(getDateRangeIssue({ start_date: "1900-02-02" }, null)).toBeNull();
  });

  it("reports out of bounds before an inverted range", () => {
    expect(getDateRangeIssue({ start_date: "2027-01-01", end_date: "2026-01-01" }, bounds)).toBe(
      "outOfBounds",
    );
  });

  it("reports an inverted range inside the bounds", () => {
    expect(getDateRangeIssue({ start_date: "2026-02-01", end_date: "2026-01-01" }, bounds)).toBe(
      "inverted",
    );
  });
});

describe("parseThreshold", () => {
  it("parses thresholds within 0.01 and 1 inclusive", () => {
    expect(parseThreshold("0.3")).toBe(0.3);
    expect(parseThreshold("0.01")).toBe(0.01);
    expect(parseThreshold("1")).toBe(1);
    expect(parseThreshold("1.0")).toBe(1);
  });

  it("rejects empty, non-numeric and out-of-range text", () => {
    for (const text of ["", " ", "abc", "0", "0.009", "1.01", "5", "-0.1", "Infinity"]) {
      expect(parseThreshold(text)).toBeNull();
    }
  });
});

describe("group rows and totals", () => {
  const b2b: TopCategoriesResponse = [
    { category: "sales", operation_type: "income", total_amount: 557903.97 },
    { category: "others", operation_type: "income", total_amount: 57636.75 },
  ];

  it("sums group totals", () => {
    expect(sumTotals(b2b)).toBeCloseTo(615540.72, 2);
    expect(sumTotals([])).toBe(0);
  });

  it("builds rows with shares in API order", () => {
    const rows = toGroupRows(b2b);
    expect(rows.map((row) => row.category)).toEqual(["sales", "others"]);
    expect(rows[0].share).toBeCloseTo(557903.97 / 615540.72, 6);
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10);
    expect(toGroupRows([])).toEqual([]);
  });

  it("uses a zero share when the group total is zero", () => {
    const rows = toGroupRows([{ category: "sales", operation_type: "income", total_amount: 0 }]);
    expect(rows[0].share).toBe(0);
  });

  it("capitalizes category labels", () => {
    expect(formatCategoryLabel("sales")).toBe("Sales");
    expect(formatCategoryLabel("others")).toBe("Others");
  });
});
