"use client";

import { useEffect, useState } from "react";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

export function useLiveQuery<T>(url: string, initialData: T | null = null) {
  const [state, setState] = useState<QueryState<T>>({
    data: initialData,
    isLoading: initialData === null,
    error: null,
  });

  useEffect(() => {
    let active = true;

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
    load(initialController.signal);

    const timer = window.setInterval(() => {
      const controller = new AbortController();
      load(controller.signal);
    }, 1000 * 60 * 2);

    return () => {
      active = false;
      initialController.abort();
      window.clearInterval(timer);
    };
  }, [url]);

  return state;
}
