"use client";

import { useEffect, useState } from "react";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

type LiveQueryOptions<T> = {
  initialData?: T | null;
  intervalMs?: number;
  revalidateOnMount?: boolean;
};

export function useLiveQuery<T>(url: string, options: LiveQueryOptions<T> = {}) {
  const initialData = options.initialData ?? null;
  const [state, setState] = useState<QueryState<T>>({
    data: initialData,
    isLoading: initialData === null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const intervalMs = options.intervalMs ?? 1000 * 60 * 2;
    const shouldFetchOnMount = options.revalidateOnMount ?? initialData === null;

    async function load(signal?: AbortSignal) {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      setState((current) => ({ ...current, isLoading: current.data === null, error: null }));
      try {
        const response = await fetch(url, { cache: "no-store", signal });
        if (!response.ok) {
          throw new Error("request_failed");
        }

        const json = (await response.json()) as T;
        if (!active) return;
        setState({ data: json, isLoading: false, error: null });
      } catch {
        if (signal?.aborted) return;
        if (!active) return;
        setState((current) => ({ ...current, isLoading: false, error: "live_fetch_failed" }));
      }
    }

    const initialController = new AbortController();
    if (shouldFetchOnMount) {
      load(initialController.signal);
    }

    const timer = window.setInterval(() => {
      const controller = new AbortController();
      load(controller.signal);
    }, intervalMs);

    return () => {
      active = false;
      initialController.abort();
      window.clearInterval(timer);
    };
  }, [initialData, options.intervalMs, options.revalidateOnMount, url]);

  return state;
}
