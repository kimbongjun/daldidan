export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  authorName: string;
  publishedAt: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  contentHtml: string;
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
