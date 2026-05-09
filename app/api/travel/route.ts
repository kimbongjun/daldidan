import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("travel_locations")
    .select("id, user_id, country, city, lat, lng, travel_date, photo_url, note, continent, created_at")
    .order("travel_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    country: string;
    city: string;
    lat: number;
    lng: number;
    travel_date: string;
    photo_url?: string | null;
    note?: string | null;
    continent?: string | null;
  };

  if (!body.country?.trim()) return NextResponse.json({ error: "국가를 입력하세요." }, { status: 400 });
  if (!body.city?.trim()) return NextResponse.json({ error: "도시를 입력하세요." }, { status: 400 });
  if (!body.travel_date) return NextResponse.json({ error: "날짜를 입력하세요." }, { status: 400 });
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "좌표가 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("travel_locations")
    .insert({
      user_id: user.id,
      country: body.country.trim(),
      city: body.city.trim(),
      lat: body.lat,
      lng: body.lng,
      travel_date: body.travel_date,
      photo_url: body.photo_url ?? null,
      note: body.note?.trim() ?? null,
      continent: body.continent ?? null,
    })
    .select("id, user_id, country, city, lat, lng, travel_date, photo_url, note, continent, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
