export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  authorName: string;
  publishedAt: string;
  viewCount: number;
  commentCount: number;
}

export interface BlogPostDetail extends BlogPostSummary {
  contentHtml: string;
}

export interface EditableBlogPost extends BlogPostDetail {
  contentJson: unknown;
}

export function extractDescriptionFromHtml(html: string, maxLen = 160): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
