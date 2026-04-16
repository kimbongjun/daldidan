import { after, NextRequest, NextResponse } from "next/server";
import { canEditBlogPost, getBlogPostBySlug } from "@/lib/blog";
import { sendPushToAllSubscribers } from "@/lib/push-notification";

export const runtime = "nodejs";

const MANUAL_NOTIFY_TTL_MS = 60_000;

function getManualNotifyRegistry() {
  const globalStore = globalThis as typeof globalThis & {
    __daldidanManualNotifyRegistry?: Map<string, number>;
  };
  if (!globalStore.__daldidanManualNotifyRegistry) {
    globalStore.__daldidanManualNotifyRegistry = new Map<string, number>();
  }
  return globalStore.__daldidanManualNotifyRegistry;
}

function summarizeBody(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 87)}...`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const registry = getManualNotifyRegistry();
  const now = Date.now();
  const inFlightUntil = registry.get(slug) ?? 0;

  if (inFlightUntil > now) {
    return NextResponse.json({
      ok: true,
      queued: false,
      message: "이미 이 글의 알림 발송이 진행 중입니다.",
    }, { status: 202 });
  }

  const editable = await canEditBlogPost(slug);

  if (!editable) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: "글을 찾지 못했습니다." }, { status: 404 });
  }

  registry.set(slug, now + MANUAL_NOTIFY_TTL_MS);

  after(async () => {
    try {
      await sendPushToAllSubscribers({
        title: post.title,
        body: summarizeBody(post.description || "새 글을 확인해보세요."),
        url: `/blog/${encodeURIComponent(post.slug)}`,
        icon: post.thumbnailUrl ?? undefined,
        origin: request.nextUrl.origin,
      });
    } finally {
      registry.delete(slug);
    }
  });

  return NextResponse.json({
    ok: true,
    queued: true,
    message: "알림 발송을 시작했습니다.",
  }, { status: 202 });
}
