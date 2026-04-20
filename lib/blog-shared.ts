export const BLOG_CATEGORIES = ["여행", "스윙", "일상", "육아", "재테크", "기타"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  authorName: string;
  createdAt: string;
  publishedAt: string;
  updatedAt: string | null;
  viewCount: number;
  commentCount: number;
  latestCommentAt: string | null;
  category: string | null;
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
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}

export function formatBlogDateTime(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",    
    timeZone: "Asia/Seoul",
  }).format(d);
}

export function getBlogActivityTimestamp(post: Pick<BlogPostSummary, "createdAt" | "updatedAt">) {
  return post.updatedAt ?? post.createdAt;
}
