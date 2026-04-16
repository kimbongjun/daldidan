import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/transactions — 로그인 유저의 거래 목록
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/transactions — 신규 거래 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    type: "income" | "expense";
    category: string;
    buyer?: "공동" | "봉준" | "달희";
    merchantName?: string;
    location?: string;
    receiptImageUrl?: string | null;
    amount: number;
    note?: string;
    date?: string;
  };

  // 입력값 검증
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "금액은 0보다 커야 합니다." }, { status: 400 });
  }
  if (!["income", "expense"].includes(body.type)) {
    return NextResponse.json({ error: "거래 유형이 올바르지 않습니다." }, { status: 400 });
  }
  if (body.date && isNaN(new Date(body.date).getTime())) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: body.type,
      category: body.category,
      buyer: body.buyer ?? "공동",
      merchant_name: body.merchantName ?? "",
      location: body.location ?? "",
      receipt_image_url: body.receiptImageUrl ?? null,
      amount: body.amount,
      note: body.note ?? "",
      date: body.date ?? new Date().toISOString().slice(0, 10),
    })
    .select("id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
