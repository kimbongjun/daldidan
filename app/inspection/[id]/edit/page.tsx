import { notFound, redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InspectionWriteForm from "@/components/inspection/InspectionWriteForm";
import { getInspectionRecord } from "@/lib/inspection";
import { createClient } from "@/lib/supabase/server";

const ACCENT = "#5CABF2";

export default async function InspectionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/inspection/${id}/edit`);

  const record = await getInspectionRecord(id);
  if (!record) notFound();
  if (record.user_id !== user.id) redirect("/inspection");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title="임장기록 수정"
          subtitle={record.complex_name}
          accentColor={ACCENT}
          backHref={`/inspection/${id}`}
        />
        <InspectionWriteForm initialData={record} recordId={id} />
      </div>
    </div>
  );
}
