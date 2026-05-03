import { describe, expect, it } from "vitest";
import { isLikelyCopiedSummary, sanitizeBlogAiSummary } from "@/lib/blog-ai-summary";

describe("sanitizeBlogAiSummary", () => {
  it("trims quotes and whitespace", () => {
    expect(sanitizeBlogAiSummary('  "요약 문장입니다."  ', "fallback")).toBe("요약 문장입니다.");
  });

  it("falls back when summary is empty", () => {
    expect(sanitizeBlogAiSummary("   ", "fallback text")).toBe("fallback text");
  });

  it("limits the summary length", () => {
    const long = "가".repeat(220);
    expect(sanitizeBlogAiSummary(long, "fallback")).toHaveLength(70);
  });

  it("keeps only the first sentence", () => {
    expect(sanitizeBlogAiSummary("첫 문장입니다. 두 번째 문장입니다.", "fallback")).toBe("첫 문장입니다.");
  });

  it("reduces fallback to a single sentence too", () => {
    expect(sanitizeBlogAiSummary("", "첫 문장만 남깁니다. 두 번째는 제거")).toBe("첫 문장만 남깁니다.");
  });

  it("detects summaries copied directly from the source", () => {
    const source = "이번 여행에서는 교토의 조용한 골목과 아침 시장, 오래된 찻집을 차례로 둘러봤습니다.";
    expect(isLikelyCopiedSummary("교토의 조용한 골목과 아침 시장, 오래된 찻집을 차례로 둘러본 여행기입니다.", source)).toBe(true);
  });

  it("allows summaries that reinterpret the source", () => {
    const source = "아기 수면 루틴을 바꾸고 밤중 수유 횟수를 줄이면서 가족의 생활 리듬이 조금씩 안정됐습니다.";
    expect(isLikelyCopiedSummary("수면 루틴 조정으로 육아 일상이 한결 안정된 과정을 담은 기록입니다.", source)).toBe(false);
  });
});
