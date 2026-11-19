// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateRangePicker } from "./date-range-picker";
import type { DateRangeFilter } from "@/lib/param-types";
import { changeInput, inputByLabel, settle } from "@/test-utils";

const bounds = { min_date: "2025-11-01", max_date: "2026-10-28" };

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

async function renderPicker(props: {
  value?: DateRangeFilter;
  onChange?: (next: DateRangeFilter) => void;
  bounds?: typeof bounds | null;
  boundsLoading?: boolean;
}) {
  root.render(
    <DateRangePicker
      value={props.value ?? {}}
      onChange={props.onChange ?? (() => {})}
      bounds={props.bounds === undefined ? bounds : props.bounds}
      boundsLoading={props.boundsLoading}
    />,
  );
  await settle();
}

function start(): HTMLInputElement {
  const input = inputByLabel(container, "Start date");
  if (!input) throw new Error("Start date input not found");
  return input;
}

function end(): HTMLInputElement {
  const input = inputByLabel(container, "End date");
  if (!input) throw new Error("End date input not found");
  return input;
}

function alerts(): string[] {
  return [...container.querySelectorAll('[role="alert"]')].map((node) => node.textContent ?? "");
}

function clearButton(): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Clear dates"));
}

describe("DateRangePicker", () => {
  it("renders two empty labelled date inputs", async () => {
    await renderPicker({});
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Date range");
    for (const input of [start(), end()]) {
      expect(input.type).toBe("date");
      expect(input.value).toBe("");
    }
  });

  it("shows the available range and sets min and max", async () => {
    await renderPicker({});
    expect(container.textContent).toContain("Available data: 2025-11-01 to 2026-10-28");
    for (const input of [start(), end()]) {
      expect(input.getAttribute("min")).toBe("2025-11-01");
      expect(input.getAttribute("max")).toBe("2026-10-28");
    }
  });

  it("shows a skeleton while bounds load", async () => {
    await renderPicker({ bounds: null, boundsLoading: true });
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1);
    expect(start().hasAttribute("min")).toBe(false);
    expect(end().hasAttribute("max")).toBe(false);
    expect(start().disabled).toBe(false);
    expect(end().disabled).toBe(false);
  });

  it("hides the reference line without bounds", async () => {
    await renderPicker({ bounds: null });
    expect(container.textContent).not.toContain("Available data");
    expect(alerts()).toEqual([]);
  });

  it("reports a new start date", async () => {
    const onChange = vi.fn();
    await renderPicker({ value: { end_date: "2026-01-31" }, onChange });
    changeInput(start(), "2026-01-01");
    expect(onChange).toHaveBeenCalledWith({ start_date: "2026-01-01", end_date: "2026-01-31" });
  });

  it("omits the key of an emptied input", async () => {
    const onChange = vi.fn();
    await renderPicker({ value: { start_date: "2026-01-01", end_date: "2026-01-31" }, onChange });
    changeInput(start(), "");
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next).toEqual({ end_date: "2026-01-31" });
    expect("start_date" in next).toBe(false);
  });

  it("toggles Clear dates and moves the focus to Start date", async () => {
    await renderPicker({});
    expect(clearButton()).toBeUndefined();

    const onChange = vi.fn();
    await renderPicker({ value: { end_date: "2026-01-31" }, onChange });
    const button = clearButton();
    expect(button).toBeDefined();
    button?.click();
    expect(onChange).toHaveBeenCalledWith({});
    expect(document.activeElement).toBe(start());
  });

  it("warns about an inverted range", async () => {
    await renderPicker({ value: { start_date: "2026-02-01", end_date: "2026-01-01" } });
    expect(alerts()).toEqual(["Start date must be on or before end date."]);
    expect(start().getAttribute("aria-invalid")).toBe("true");
    expect(end().getAttribute("aria-invalid")).toBe("true");
  });

  it("warns about an out-of-bounds date", async () => {
    await renderPicker({ value: { start_date: "2025-10-31" } });
    expect(alerts()).toEqual(["Dates must be between 2025-11-01 and 2026-10-28."]);
    expect(start().getAttribute("aria-invalid")).toBe("true");
    expect(end().hasAttribute("aria-invalid")).toBe(false);
  });

  it("shows only the first problem", async () => {
    await renderPicker({ value: { start_date: "2030-01-01", end_date: "2026-01-01" } });
    expect(alerts()).toEqual(["Dates must be between 2025-11-01 and 2026-10-28."]);
    expect(start().getAttribute("aria-invalid")).toBe("true");
    expect(end().hasAttribute("aria-invalid")).toBe(false);
  });

  it("stays silent while a year is typed", async () => {
    await renderPicker({ value: { start_date: "0019-02-02" } });
    expect(alerts()).toEqual([]);
    expect(start().hasAttribute("aria-invalid")).toBe(false);
    expect(end().hasAttribute("aria-invalid")).toBe(false);
  });
});
