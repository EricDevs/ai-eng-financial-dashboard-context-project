import type { AlertsParams, TopCategoriesParams } from "./param-types";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/** Query string in key order; skips undefined and empty values (an empty value returns 422). */
export function buildQuery(params: AlertsParams | TopCategoriesParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.append(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** GET API_BASE_URL + path; throws on a non-2xx response. */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return response.json();
}
