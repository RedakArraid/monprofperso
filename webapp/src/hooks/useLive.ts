import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, tokenStore } from "@/lib/api";

/** `empty` is an empty state, never demonstration data. Requests are isolated by session. */
export function useLive<T>(path: string | null, empty: T) {
  const initial = useRef(empty);
  const [data, setData] = useState<T>(empty);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const session = tokenStore.get();

  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (!path) {
      setData(initial.current);
      setLoading(false);
      setOffline(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api<T>(path, { signal: controller.signal });
      if (controller.signal.aborted || tokenStore.get() !== session) return;
      setData(result ?? initial.current);
      setOffline(false);
    } catch (e) {
      if (controller.signal.aborted || tokenStore.get() !== session) return;
      setData(initial.current);
      setOffline(true);
      setError(e instanceof ApiError ? e.message : "Chargement impossible");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path, session]);

  useEffect(() => {
    setData(initial.current);
    void reload();
    return () => request.current?.abort();
  }, [reload]);

  return { data, offline, loading, error, reload, setData };
}
