// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ViewTabs } from "./view-tabs";
import { settle } from "@/test-utils";

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

function tabs(): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')];
}

describe("ViewTabs", () => {
  it("renders a tablist with two tabs", async () => {
    root.render(<ViewTabs view="dashboard" onChange={() => {}} />);
    await settle();

    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabs().map((tab) => tab.textContent)).toEqual(["Dashboard", "B2B vs B2C"]);
    expect(tabs().map((tab) => tab.id)).toEqual(["tab-dashboard", "tab-comparison"]);
    expect(tabs().map((tab) => tab.getAttribute("aria-controls"))).toEqual(["view-panel", "view-panel"]);
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false"]);
  });

  it("reports the selected view", async () => {
    const onChange = vi.fn();
    root.render(<ViewTabs view="dashboard" onChange={onChange} />);
    await settle();

    tabs()[1].click();
    expect(onChange).toHaveBeenCalledWith("comparison");
  });
});
