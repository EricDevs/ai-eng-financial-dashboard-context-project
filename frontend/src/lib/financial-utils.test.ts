import { describe, expect, it } from "vitest";

import {
  computeKPIs,
  computeMonthlyData,
  formatCurrency,
  formatPercent,
  formatPeriodLabel,
  getDateRangeIssue,
  isValidDateRange,
} from "./financial-utils";
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

describe("date range utilities", () => {
  const bounds = { min_date: "2025-11-01", max_date: "2026-10-28" };

  it("validates the order of the range with inclusive bounds", () => {
    expect(isValidDateRange({})).toBe(true);
    expect(isValidDateRange({ start_date: "2026-02-01" })).toBe(true);
    expect(isValidDateRange({ start_date: "2026-01-31", end_date: "2026-01-31" })).toBe(true);
    expect(isValidDateRange({ start_date: "2026-02-01", end_date: "2026-01-31" })).toBe(false);
  });

  it("formats the period label with the dates as typed", () => {
    expect(formatPeriodLabel({})).toBeNull();
    expect(formatPeriodLabel({ start_date: "2026-01-01", end_date: "2026-01-31" })).toBe("2026-01-01 — 2026-01-31");
    expect(formatPeriodLabel({ start_date: "2026-01-01" })).toBe("From 2026-01-01");
    expect(formatPeriodLabel({ end_date: "2026-01-31" })).toBe("Until 2026-01-31");
    expect(formatPeriodLabel({ start_date: "2026-02-01", end_date: "2026-01-01" })).toBe("2026-02-01 — 2026-01-01");
  });

  it("reports the first issue that blocks a request", () => {
    expect(getDateRangeIssue({}, bounds)).toBeNull();
    expect(getDateRangeIssue({ start_date: "2025-11-01", end_date: "2026-10-28" }, bounds)).toBeNull();
    expect(getDateRangeIssue({ start_date: "0019-02-02" }, null)).toBe("incomplete");
    expect(getDateRangeIssue({ end_date: "0190-02-02", start_date: "2026-01-01" }, bounds)).toBe("incomplete");
    expect(getDateRangeIssue({ start_date: "2025-10-31" }, bounds)).toBe("outOfBounds");
    expect(getDateRangeIssue({ end_date: "2026-10-29" }, bounds)).toBe("outOfBounds");
    expect(getDateRangeIssue({ start_date: "2025-10-31" }, null)).toBeNull();
    expect(getDateRangeIssue({ start_date: "2026-02-01", end_date: "2026-01-01" }, bounds)).toBe("inverted");
    expect(getDateRangeIssue({ start_date: "2030-01-01", end_date: "2026-01-01" }, bounds)).toBe("outOfBounds");
  });
});
