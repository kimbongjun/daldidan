/**
 * AbortSignal.any 미지원 브라우저(Safari 17.4 미만 등) 폴백.
 * 미지원 환경에서는 react-query가 넘긴 signal을 우선 사용하고, 없으면 타임아웃 signal만 사용한다.
 */
export function anySignal(signals: (AbortSignal | undefined)[], timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  const present = signals.filter((s): s is AbortSignal => Boolean(s));
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([...present, timeout]);
  }
  return present[0] ?? timeout;
}
