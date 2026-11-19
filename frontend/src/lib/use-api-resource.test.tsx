// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApiResource } from "./use-api-resource";
import { settle } from "@/test-utils";

type Call = { url: string; resolve: (body: unknown) => void; fail: () => void };

let container: HTMLDivElement;
let root: Root;
let calls: Call[];

function Probe({ path }: { path: string | null }) {
  return <output>{JSON.stringify(useApiResource<unknown>(path))}</output>;
}

function render(path: string | null) {
  root.render(<Probe path={path} />);
}

function state() {
  return JSON.parse(container.querySelector("output")?.textContent ?? "null");
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string) =>
        new Promise<Response>((resolve) => {
          calls.push({
            url,
            resolve: (body) => resolve(Response.json(body)),
            fail: () => resolve(new Response(null, { status: 500 })),
          });
        }),
    ),
  );
});

afterEach(() => {
  root.unmount();
  container.remove();
  vi.unstubAllGlobals();
});

async function loadA(body: unknown) {
  render("A");
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  calls[0].resolve(body);
  await vi.waitFor(() => expect(state()).toEqual({ data: body, loading: false, error: false }));
}

describe("useApiResource", () => {
  it("does not fetch with a null path", async () => {
    render(null);
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: false, error: false }));
    expect(calls).toHaveLength(0);
  });

  it("loads and exposes the data", async () => {
    render("A");
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: true, error: false }));
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url).toBe("A");
    calls[0].resolve([1]);
    await vi.waitFor(() => expect(state()).toEqual({ data: [1], loading: false, error: false }));
  });

  it("reports an error with null data", async () => {
    render("A");
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].fail();
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: false, error: true }));
  });

  it("keeps only the response of the current path", async () => {
    render("A");
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    render("B");
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].resolve("b");
    await vi.waitFor(() => expect(state()).toEqual({ data: "b", loading: false, error: false }));
    calls[0].resolve("a");
    await settle();
    expect(state()).toEqual({ data: "b", loading: false, error: false });
  });

  it("keeps the previous data while a new path loads", async () => {
    await loadA([1]);
    render("B");
    await vi.waitFor(() => expect(state()).toEqual({ data: [1], loading: true, error: false }));
  });

  it("keeps the last data when the path becomes null", async () => {
    await loadA([1]);
    render(null);
    await vi.waitFor(() => expect(state()).toEqual({ data: [1], loading: false, error: false }));
    expect(calls).toHaveLength(1);
  });

  it("discards an in-flight response when the path becomes null", async () => {
    await loadA([1]);
    render("B");
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    render(null);
    await vi.waitFor(() => expect(state()).toEqual({ data: [1], loading: false, error: false }));
    calls[1].resolve([2]);
    await settle();
    expect(state()).toEqual({ data: [1], loading: false, error: false });
  });

  it("refetches when the same path comes back after null", async () => {
    await loadA([1]);
    render(null);
    await settle();
    render("A");
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toBe("A");
    expect(state()).toEqual({ data: [1], loading: false, error: false });
    calls[1].resolve([3]);
    await vi.waitFor(() => expect(state()).toEqual({ data: [3], loading: false, error: false }));
  });

  it("keeps showing the error while the same path is refetched", async () => {
    render("A");
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].fail();
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: false, error: true }));
    render(null);
    await settle();
    render("A");
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(state()).toEqual({ data: null, loading: false, error: true });
  });
});
