import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
    travel_date?: string;
    photo_url?: string | null;
    note?: string | null;
    continent?: string | null;
    is_domestic?: boolean;
    province?: string | null;
    drive_link?: string | null;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.country !== undefined) updates.country = body.country.trim();
  if (body.city !== undefined) updates.city = body.city.trim();
  if (body.lat !== undefined) updates.lat = body.lat;
  if (body.lng !== undefined) updates.lng = body.lng;
  if (body.travel_date !== undefined) updates.travel_date = body.travel_date;
  if (body.photo_url !== undefined) updates.photo_url = body.photo_url;
  if (body.note !== undefined) updates.note = body.note?.trim() ?? null;
  if (body.continent !== undefined) updates.continent = body.continent;
  if (body.is_domestic !== undefined) updates.is_domestic = Boolean(body.is_domestic);
  if (body.province !== undefined) updates.province = body.province ?? null;
  if (body.drive_link !== undefined) updates.drive_link = body.drive_link ?? null;

  const { data, error } = await supabase
    .from("travel_locations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_id, country, city, lat, lng, travel_date, photo_url, note, continent, is_domestic, province, drive_link, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("travel_locations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
