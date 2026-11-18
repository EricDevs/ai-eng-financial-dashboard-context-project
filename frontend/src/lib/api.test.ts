import { afterEach, describe, expect, it, vi } from "vitest";

import { buildQuery, getJson } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildQuery", () => {
  it("omits undefined and empty values", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ start_date: undefined })).toBe("");
    expect(buildQuery({ start_date: "", end_date: "2026-01-31" })).toBe("?end_date=2026-01-31");
  });

  it("keeps key order and serializes numbers", () => {
    expect(buildQuery({ threshold: 0.3, start_date: "2026-01-01" })).toBe(
      "?threshold=0.3&start_date=2026-01-01",
    );
    expect(buildQuery({ operation_type: "income", limit: 5, business_type: "B2B" })).toBe(
      "?operation_type=income&limit=5&business_type=B2B",
    );
  });
});

describe("getJson", () => {
  it("returns the parsed body", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: 1 }))));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getJson("/api/x")).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/api/x");
  });

  it("rejects on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 422 }))));

    await expect(getJson("/api/x")).rejects.toThrow("422");
  });
});
