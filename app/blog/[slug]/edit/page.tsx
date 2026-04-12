import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BlogWriteForm from "@/components/blog/BlogWriteForm";
import { getEditableBlogPostBySlug } from "@/lib/blog";

const ACCENT = "#EA580C";

export default async function BlogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getEditableBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="블로그 편집" subtitle="기존 글을 바로 수정할 수 있어요" accentColor={ACCENT} />
        <BlogWriteForm initialPost={post} />
      </div>
    </div>
  );
}
