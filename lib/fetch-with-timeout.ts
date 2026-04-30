const DEFAULT_TIMEOUT_MS = 8000;

export class FetchTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number, message = `Request timed out after ${timeoutMs}ms`) {
    super(message);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof FetchTimeoutError;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init.signal;

  if (upstreamSignal?.aborted) {
    throw upstreamSignal.reason ?? new Error("Request was aborted");
  }

  const handleAbort = () => {
    controller.abort(upstreamSignal?.reason ?? new Error("Request was aborted"));
  };

  upstreamSignal?.addEventListener("abort", handleAbort, { once: true });

  const timeoutError = new FetchTimeoutError(timeoutMs);
  const timeoutId = setTimeout(() => {
    controller.abort(timeoutError);
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason instanceof FetchTimeoutError) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", handleAbort);
  }
}
