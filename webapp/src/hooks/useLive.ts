import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function useLive<T>(path: string | null, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api<T>(path);
      setData((r as T) ?? fallback);
      setOffline(false);
    } catch (e) {
      setOffline(true);
      setData(fallback);
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps -- fallback is module-stable

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, offline, loading, error, reload, setData };
}
