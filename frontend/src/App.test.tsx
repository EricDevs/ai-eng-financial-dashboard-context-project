// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

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
      expect(busyStates()).toEqual(["true", "true"]);
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
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.getAttribute("lang")).toBe("es");
    expect(alert?.textContent).toContain("No se pudo cargar");
    expect(busyStates()).toEqual(["false", "false"]);
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
    ]);
  });
});
