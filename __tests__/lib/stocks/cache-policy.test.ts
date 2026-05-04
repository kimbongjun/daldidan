import { describe, expect, it } from "vitest";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";

describe("getKrxMarketWindow", () => {
  it("treats trading hours as open and rounds to the current 30-second bucket", () => {
    const windowInfo = getKrxMarketWindow(new Date("2026-05-04T01:12:00Z"));

    expect(windowInfo.open).toBe(true);
    expect(windowInfo.label).toBe("장중");
    expect(windowInfo.bucketKey).toBe(`2026-05-04:${Math.floor(new Date("2026-05-04T01:12:00Z").getTime() / 30_000)}`);
    expect(windowInfo.mostRecentTradingDay).toBe("2026-05-04");
    expect(windowInfo.nextRefreshAt).toBe("2026-05-04T01:12:30.000Z");
  });

  it("freezes after close until the next market open", () => {
    const windowInfo = getKrxMarketWindow(new Date("2026-05-04T08:00:00Z"));

    expect(windowInfo.open).toBe(false);
    expect(windowInfo.label).toBe("마감");
    expect(windowInfo.bucketKey).toBeNull();
    expect(windowInfo.mostRecentTradingDay).toBe("2026-05-04");
    expect(windowInfo.nextRefreshAt).toBe("2026-05-05T00:00:00.000Z");
  });

  it("uses the previous trading day before the market opens", () => {
    const windowInfo = getKrxMarketWindow(new Date("2026-05-05T23:30:00Z"));

    expect(windowInfo.open).toBe(false);
    expect(windowInfo.mostRecentTradingDay).toBe("2026-05-05");
    expect(windowInfo.nextRefreshAt).toBe("2026-05-06T00:00:00.000Z");
  });

  it("skips weekends when choosing the next open", () => {
    const windowInfo = getKrxMarketWindow(new Date("2026-05-09T03:00:00Z"));

    expect(windowInfo.open).toBe(false);
    expect(windowInfo.mostRecentTradingDay).toBe("2026-05-08");
    expect(windowInfo.nextRefreshAt).toBe("2026-05-11T00:00:00.000Z");
  });
});
