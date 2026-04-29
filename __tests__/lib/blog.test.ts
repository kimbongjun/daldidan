import { describe, it, expect } from "vitest";
import { slugifyBlogTitle, extractFirstImageFromHtml } from "@/lib/blog";

describe("slugifyBlogTitle", () => {
  it("converts spaces to hyphens", () => {
    expect(slugifyBlogTitle("Hello World")).toBe("hello-world");
  });

  it("preserves Korean characters", () => {
    expect(slugifyBlogTitle("안녕 세상")).toBe("안녕-세상");
  });

  it("strips special characters", () => {
    expect(slugifyBlogTitle("Hello! @World#")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugifyBlogTitle("Hello   World")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyBlogTitle("  hello  ")).toBe("hello");
  });

  it("falls back to blog-post for empty string", () => {
    expect(slugifyBlogTitle("   ")).toBe("blog-post");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugifyBlogTitle(long)).toHaveLength(60);
  });
});

describe("extractFirstImageFromHtml", () => {
  it("returns the first http(s) image src", () => {
    const html = '<img src="https://example.com/image.jpg" alt="test">';
    expect(extractFirstImageFromHtml(html)).toBe("https://example.com/image.jpg");
  });

  it("skips base64 data URLs", () => {
    const html = '<img src="data:image/png;base64,abc123"><img src="https://cdn.com/img.png">';
    expect(extractFirstImageFromHtml(html)).toBe("https://cdn.com/img.png");
  });

  it("returns null when no valid image exists", () => {
    expect(extractFirstImageFromHtml("<p>no images</p>")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractFirstImageFromHtml("")).toBeNull();
  });

  it("handles double and single quoted src attributes", () => {
    const html = "<img src='https://example.com/photo.jpg'>";
    expect(extractFirstImageFromHtml(html)).toBe("https://example.com/photo.jpg");
  });
});
