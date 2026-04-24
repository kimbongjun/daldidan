import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// PATCH /api/transactions/[id] — 거래 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  // 입력값 검증
  if (body.amount !== undefined && (typeof body.amount !== "number" || body.amount <= 0)) {
    return NextResponse.json({ error: "금액은 0보다 커야 합니다." }, { status: 400 });
  }
  if (body.date !== undefined && typeof body.date === "string" && isNaN(new Date(body.date).getTime())) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const patch = {
    ...(body.type !== undefined ? { type: body.type } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.buyer !== undefined ? { buyer: body.buyer } : {}),
    ...(body.merchantName !== undefined ? { merchant_name: body.merchantName } : {}),
    ...(body.location !== undefined ? { location: body.location } : {}),
    ...(body.receiptImageUrl !== undefined ? { receipt_image_url: body.receiptImageUrl } : {}),
    ...(body.amount !== undefined ? { amount: body.amount } : {}),
    ...(body.note !== undefined ? { note: body.note } : {}),
    ...(body.date !== undefined ? { date: body.date } : {}),
  };

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date")
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // POST / GET 과 동일하게 author_display 를 flat 필드로 포함해 반환
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).single();
  let authorDisplay = profile?.display_name ?? "";
  if (!authorDisplay) {
    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    authorDisplay = authUser?.user?.email?.split("@")[0] ?? "사용자";
  }

  return NextResponse.json({ ...data, author_display: authorDisplay });
}

// DELETE /api/transactions/[id] — 거래 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error, count } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (count === 0) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  return new NextResponse(null, { status: 204 });
}
