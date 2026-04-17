import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/transactions?month=YYYY-MM&limit=N — 전체 거래 목록 (공유 가계부)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  const limitParam = searchParams.get("limit");

  let query = supabase
    .from("transactions")
    .select("id, user_id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date, profiles(display_name)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    // 해당 월의 마지막 날 계산
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("date", startDate).lte("date", endDate);
  }

  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (!isNaN(n) && n > 0) query = query.limit(n);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 등록자 이름 확정: display_name 없는 유저는 email 앞부분으로 폴백
  const rows = data ?? [];
  const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))];
  const adminClient = createAdminClient();
  const emailMap: Record<string, string> = {};
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      const { data: u } = await adminClient.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap[uid] = u.user.email;
    }),
  );

  const enriched = rows.map((r) => ({
    ...r,
    author_display:
      (r.profiles as unknown as { display_name: string | null } | null)?.display_name ||
      (emailMap[r.user_id] ? emailMap[r.user_id].split("@")[0] : "사용자"),
  }));

  return NextResponse.json(enriched);
}

// POST /api/transactions — 신규 거래 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    type: "income" | "expense";
    category: string;
    buyer?: string;
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
    .select("id, user_id, type, category, buyer, merchant_name, location, receipt_image_url, amount, note, date, profiles(display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 새로 등록한 거래의 등록자 이름 확정
  const adminClient2 = createAdminClient();
  const { data: newUser } = await adminClient2.auth.admin.getUserById(user.id);
  const profileName = (data!.profiles as unknown as { display_name: string | null } | null)?.display_name;
  const emailFallback = newUser?.user?.email ? newUser.user.email.split("@")[0] : "사용자";
  const enrichedNew = {
    ...data!,
    author_display: profileName || emailFallback,
  };

  return NextResponse.json(enrichedNew, { status: 201 });
}
