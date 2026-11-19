import { useEffect, useState } from "react";

import { getJson } from "./api";

type SettledResult<T> = { path: string | null; data: T | null; error: boolean };

/**
 * Requests `path` (the route with its query, used as the key) and exposes the last settled result.
 * A null path requests nothing. `loading` is true while the last result belongs to another path,
 * so returning to the path of the last result refetches it while that result stays visible.
 * Responses for a path that is no longer current are discarded.
 */
export function useApiResource<T>(path: string | null): {
  data: T | null;
  loading: boolean;
  error: boolean;
} {
  const [result, setResult] = useState<SettledResult<T>>({ path: null, data: null, error: false });

  useEffect(() => {
    if (path === null) return;
    let current = true;
    getJson<T>(path)
      .then((data) => {
        if (current) setResult({ path, data, error: false });
      })
      .catch(() => {
        if (current) setResult({ path, data: null, error: true });
      });
    return () => {
      current = false;
    };
  }, [path]);

  return {
    data: result.data,
    loading: path !== null && result.path !== path,
    error: result.error,
  };
}
