import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/transactions/[id] — 거래 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
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
    .select("id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
