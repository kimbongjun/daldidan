import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InspectionWriteForm from "@/components/inspection/InspectionWriteForm";
import { createClient } from "@/lib/supabase/server";

const ACCENT = "#5CABF2";

export default async function InspectionWritePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inspection/write");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title="임장기록 작성"
          subtitle="현장에서 확인한 정보를 꼼꼼히 기록해 보세요"
          accentColor={ACCENT}
          backHref="/inspection"
        />
        <InspectionWriteForm />
      </div>
    </div>
  );
}
