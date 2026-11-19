import {
  type FinancialMovement,
  type KPIMetrics,
  type MonthlyDataPoint,
} from "./financial-types";
import type { DateRangeFilter } from "./param-types";

function toYearMonthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYearLabel(yearMonthKey: string): string {
  const [yearText, monthText] = yearMonthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function computeKPIs(movements: FinancialMovement[]): KPIMetrics {
  const totalIncome = movements
    .filter((m) => m.operation_type === "income")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOutcome = movements
    .filter((m) => m.operation_type === "outcome")
    .reduce((sum, m) => sum + m.amount, 0);

  const profit = totalIncome - totalOutcome;
  const profitPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  return { totalIncome, totalOutcome, profit, profitPercent };
}

export function computeMonthlyData(
  movements: FinancialMovement[],
): MonthlyDataPoint[] {
  const monthlyMap: Record<string, { income: number; outcome: number }> = {};

  for (const m of movements) {
    const yearMonthKey = toYearMonthKey(new Date(m.create_date));
    if (!monthlyMap[yearMonthKey]) {
      monthlyMap[yearMonthKey] = { income: 0, outcome: 0 };
    }

    if (m.operation_type === "income") {
      monthlyMap[yearMonthKey].income += m.amount;
    } else {
      monthlyMap[yearMonthKey].outcome += m.amount;
    }
  }

  return Object.keys(monthlyMap)
    .sort()
    .map((yearMonthKey) => {
      const { income, outcome } = monthlyMap[yearMonthKey];
      const profit = income - outcome;
      const profitPercent = income > 0 ? (profit / income) * 100 : 0;
      return {
        month: formatMonthYearLabel(yearMonthKey),
        income,
        outcome,
        profitPercent,
      };
    });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** True when a bound is missing or start_date <= end_date (YYYY-MM-DD compares chronologically). */
export function isValidDateRange(filter: DateRangeFilter): boolean {
  const { start_date, end_date } = filter;
  return !start_date || !end_date || start_date <= end_date;
}

export type DateBounds = { min_date: string; max_date: string };
export type DateRangeIssue = "incomplete" | "outOfBounds" | "inverted";

/**
 * Why the filter cannot be requested, or null when it can. A zero-padded year
 * (0001, 0019, 0190) is a date still being typed. Bounds are checked only when known.
 */
export function getDateRangeIssue(
  filter: DateRangeFilter,
  bounds: DateBounds | null,
): DateRangeIssue | null {
  const dates = [filter.start_date, filter.end_date].filter((date) => date !== undefined);
  if (dates.some((date) => date.startsWith("0"))) return "incomplete";
  if (bounds && dates.some((date) => date < bounds.min_date || date > bounds.max_date)) {
    return "outOfBounds";
  }
  return isValidDateRange(filter) ? null : "inverted";
}

/** Header label with raw YYYY-MM-DD dates; null without dates. Does not validate the range. */
export function formatPeriodLabel(filter: DateRangeFilter): string | null {
  const { start_date, end_date } = filter;
  if (start_date && end_date) return `${start_date} — ${end_date}`;
  if (start_date) return `From ${start_date}`;
  if (end_date) return `Until ${end_date}`;
  return null;
}

export const THRESHOLD_MIN = 0.01;
export const THRESHOLD_MAX = 1;
export const THRESHOLD_DEFAULT = 0.3;

/** Threshold if the text is a finite number within THRESHOLD_MIN..THRESHOLD_MAX (inclusive); otherwise null. */
export function parseThreshold(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  const inRange = Number.isFinite(value) && value >= THRESHOLD_MIN && value <= THRESHOLD_MAX;
  return inRange ? value : null;
}
