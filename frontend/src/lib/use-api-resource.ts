import { useEffect, useState } from "react";

import { getJson } from "./api";

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

interface Settled<T> {
  path: string | null;
  data: T | null;
  error: boolean;
}

/**
 * Fetches `path` (route with query, used as key). A null path fetches nothing and
 * keeps the last data. Only the response for the current path is applied.
 */
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [settled, setSettled] = useState<Settled<T>>({ path: null, data: null, error: false });

  useEffect(() => {
    if (path === null) return;
    let ignore = false;
    getJson<T>(path)
      .then((data) => {
        if (!ignore) setSettled({ path, data, error: false });
      })
      .catch(() => {
        if (!ignore) setSettled({ path, data: null, error: true });
      });
    return () => {
      ignore = true;
    };
  }, [path]);

  const loading = path !== null && path !== settled.path;
  return { data: settled.data, loading, error: !loading && settled.error };
}
