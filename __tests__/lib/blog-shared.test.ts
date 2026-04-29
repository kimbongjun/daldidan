import { describe, it, expect } from "vitest";
import {
  extractDescriptionFromHtml,
  formatBlogDate,
  formatBlogDateTime,
  getBlogActivityTimestamp,
} from "@/lib/blog-shared";

describe("extractDescriptionFromHtml", () => {
  it("strips HTML tags and returns plain text", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(extractDescriptionFromHtml(html)).toBe("Hello world");
  });

  it("collapses whitespace", () => {
    const html = "<p>  Hello  </p>  <p>  world  </p>";
    expect(extractDescriptionFromHtml(html)).toBe("Hello world");
  });

  it("truncates to maxLen (default 160)", () => {
    const html = `<p>${"a".repeat(200)}</p>`;
    expect(extractDescriptionFromHtml(html)).toHaveLength(160);
  });

  it("respects custom maxLen", () => {
    const html = `<p>${"b".repeat(100)}</p>`;
    expect(extractDescriptionFromHtml(html, 50)).toHaveLength(50);
  });

  it("returns empty string for empty input", () => {
    expect(extractDescriptionFromHtml("")).toBe("");
  });

  it("handles entities in tag attributes without leaking them", () => {
    const html = '<a href="https://example.com">link</a>';
    expect(extractDescriptionFromHtml(html)).toBe("link");
  });
});

describe("formatBlogDate", () => {
  it("returns a formatted Korean date string", () => {
    const result = formatBlogDate("2024-01-15T00:00:00Z");
    expect(result).toMatch(/2024년/);
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/15일/);
  });

  it("returns the input as-is when invalid", () => {
    expect(formatBlogDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatBlogDateTime", () => {
  it("includes date and time components", () => {
    const result = formatBlogDateTime("2024-06-01T09:30:00Z");
    expect(result).toMatch(/2024년/);
    // 시간 표현: "06:30" 또는 "오후 06시 30분" 형태
    expect(result).toMatch(/\d{1,2}[:시]/);
  });

  it("returns input for invalid date", () => {
    expect(formatBlogDateTime("bad")).toBe("bad");
  });
});

describe("getBlogActivityTimestamp", () => {
  it("returns updatedAt when present", () => {
    const post = { createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-06-01T00:00:00Z" };
    expect(getBlogActivityTimestamp(post)).toBe("2024-06-01T00:00:00Z");
  });

  it("falls back to createdAt when updatedAt is null", () => {
    const post = { createdAt: "2024-01-01T00:00:00Z", updatedAt: null };
    expect(getBlogActivityTimestamp(post)).toBe("2024-01-01T00:00:00Z");
  });
});
