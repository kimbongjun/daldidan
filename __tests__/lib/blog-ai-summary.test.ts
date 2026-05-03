import { describe, expect, it } from "vitest";
import { sanitizeBlogAiSummary } from "@/lib/blog-ai-summary";

describe("sanitizeBlogAiSummary", () => {
  it("trims quotes and whitespace", () => {
    expect(sanitizeBlogAiSummary('  "요약 문장입니다."  ', "fallback")).toBe("요약 문장입니다.");
  });

  it("falls back when summary is empty", () => {
    expect(sanitizeBlogAiSummary("   ", "fallback text")).toBe("fallback text");
  });

  it("limits the summary length", () => {
    const long = "가".repeat(220);
    expect(sanitizeBlogAiSummary(long, "fallback")).toHaveLength(50);
  });

  it("keeps only the first sentence", () => {
    expect(sanitizeBlogAiSummary("첫 문장입니다. 두 번째 문장입니다.", "fallback")).toBe("첫 문장입니다.");
  });

  it("reduces fallback to a single sentence too", () => {
    expect(sanitizeBlogAiSummary("", "첫 문장만 남깁니다. 두 번째는 제거")).toBe("첫 문장만 남깁니다.");
  });
});
