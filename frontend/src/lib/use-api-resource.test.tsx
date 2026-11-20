// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deferred, jsonResponse, mountRoot } from "@/test-helpers";
import { useApiResource } from "./use-api-resource";

function Probe({ path }: { path: string | null }) {
  return <pre data-path={path ?? ""}>{JSON.stringify(useApiResource<string>(path))}</pre>;
}

let view: ReturnType<typeof mountRoot>;

beforeEach(() => {
  view = mountRoot();
});

afterEach(() => {
  view.cleanup();
  vi.unstubAllGlobals();
});

const state = () => JSON.parse(view.container.textContent || "{}");
const tick = () => new Promise((done) => setTimeout(done, 0));

/** Renders `path` and waits until React committed it; a bare tick can let React skip it. */
async function show(path: string | null) {
  view.root.render(<Probe path={path} />);
  await vi.waitFor(() => expect(view.container.querySelector("pre")?.dataset.path).toBe(path ?? ""));
  await tick();
}

describe("useApiResource", () => {
  it("loads data and clears loading", async () => {
    const response = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => response.promise));

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: true, error: false }));

    response.resolve(jsonResponse("a"));
    await vi.waitFor(() => expect(state()).toEqual({ data: "a", loading: false, error: false }));
  });

  it("sets error and drops data on a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(null, 500))));

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state()).toEqual({ data: null, loading: false, error: true }));
  });

  it("keeps the last data and does not fetch when path is null", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse("a")));
    vi.stubGlobal("fetch", fetchMock);

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state().data).toBe("a"));

    view.root.render(<Probe path={null} />);
    await tick();
    expect(state()).toEqual({ data: "a", loading: false, error: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows only the response for the latest path", async () => {
    const a = deferred<Response>();
    const b = deferred<Response>();
    const fetchMock = vi.fn((url: string) => (url === "/a" ? a.promise : b.promise));
    vi.stubGlobal("fetch", fetchMock);

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/a"));
    view.root.render(<Probe path="/b" />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/b"));

    b.resolve(jsonResponse("b"));
    await vi.waitFor(() => expect(state()).toEqual({ data: "b", loading: false, error: false }));
    a.resolve(jsonResponse("a"));
    await tick();
    expect(state().data).toBe("b");
  });

  it("does not stay loading when returning to the last loaded path", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse("a")));
    vi.stubGlobal("fetch", fetchMock);

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state().data).toBe("a"));
    await show(null);
    await show("/a");
    expect(state()).toEqual({ data: "a", loading: false, error: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the last error when returning to a failed path", async () => {
    const retry = deferred<Response>();
    let calls = 0;
    const fetchMock = vi.fn(() => (++calls === 1 ? Promise.resolve(jsonResponse(null, 500)) : retry.promise));
    vi.stubGlobal("fetch", fetchMock);

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state().error).toBe(true));
    await show(null);
    await show("/a");
    expect(state()).toEqual({ data: null, loading: false, error: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the last data while a new path loads", async () => {
    const b = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((url: string) => (url === "/a" ? Promise.resolve(jsonResponse("a")) : b.promise)));

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state().data).toBe("a"));
    await show("/b");
    expect(state()).toEqual({ data: "a", loading: true, error: false });
  });

  it("discards a pending response when path becomes null", async () => {
    const b = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((url: string) => (url === "/a" ? Promise.resolve(jsonResponse("a")) : b.promise)));

    view.root.render(<Probe path="/a" />);
    await vi.waitFor(() => expect(state().data).toBe("a"));
    await show("/b");
    await show(null);

    b.resolve(jsonResponse("b"));
    await tick();
    expect(state()).toEqual({ data: "a", loading: false, error: false });
  });
});
