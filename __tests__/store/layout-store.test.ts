import { describe, expect, it } from "vitest";
import { MOBILE_WIDGET_ORDER } from "@/store/useLayoutStore";

describe("MOBILE_WIDGET_ORDER", () => {
  it("includes the lotto widget on the main screen", () => {
    expect(MOBILE_WIDGET_ORDER).toContain("lotto");
  });
});
