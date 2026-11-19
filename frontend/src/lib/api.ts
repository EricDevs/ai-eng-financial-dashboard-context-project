import type { AlertsParams, TopCategoriesParams } from "./param-types";

/** API base: VITE_API_BASE_URL, or "" to use the Vite proxy. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/** "" without parameters; otherwise "?a=b&..." in key order, skipping undefined and "". */
export function buildQuery(params: AlertsParams | TopCategoriesParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** GET API_BASE_URL + path; throws on a non-2xx response. */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed: ${response.status}`);
  }
  return response.json();
}
