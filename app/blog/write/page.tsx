import PageHeader from "@/components/PageHeader";
import BlogWriteForm from "@/components/blog/BlogWriteForm";

const ACCENT = "#EA580C";

export default function BlogWritePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="블로그 작성" subtitle="노션처럼 정리된 흐름으로 글을 발행해보세요" accentColor={ACCENT} />
        <BlogWriteForm />
      </div>
    </div>
  );
}
