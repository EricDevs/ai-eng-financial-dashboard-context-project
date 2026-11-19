import { afterEach, describe, expect, it, vi } from "vitest";

import { buildQuery, getJson } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildQuery", () => {
  it("returns an empty string without parameters", () => {
    expect(buildQuery({})).toBe("");
  });

  it("keeps the key order and skips empty values", () => {
    expect(buildQuery({ threshold: 0.3, start_date: "2026-01-01", end_date: "2026-01-31" })).toBe(
      "?threshold=0.3&start_date=2026-01-01&end_date=2026-01-31",
    );
    expect(buildQuery({ start_date: "", end_date: "2026-01-31" })).toBe("?end_date=2026-01-31");
    expect(buildQuery({ start_date: undefined })).toBe("");
    expect(
      buildQuery({ operation_type: "income", limit: 5, business_type: "B2B", start_date: "2026-01-01" }),
    ).toBe("?operation_type=income&limit=5&business_type=B2B&start_date=2026-01-01");
  });
});

describe("getJson", () => {
  it("fetches the path and returns the parsed body", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json([])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getJson("/api/metrics")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/metrics");
  });

  it("rejects a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))));

    await expect(getJson("/api/metrics")).rejects.toThrow();
  });
});
