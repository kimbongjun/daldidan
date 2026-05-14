import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PriceEntry } from "@/lib/inspection";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ record: data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: existing } = await supabase
    .from("inspection_records")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json() as {
    complex_name?: string;
    dong_ho?: string;
    address?: string;
    pyeong?: string;
    year_built?: number | null;
    total_units?: number | null;
    parking_count?: string;
    structure?: string;
    subway_access?: string;
    major_transport?: string;
    terrain?: string;
    harmful_facilities?: string;
    school_zone?: string;
    amenities?: string;
    nature_env?: string;
    building_gap?: string;
    community?: string;
    maintenance?: string;
    interior_condition?: string;
    price_info?: PriceEntry[];
    review?: string;
    image_urls?: string[];
  };

  if (!body.complex_name?.trim()) {
    return NextResponse.json({ error: "단지명을 입력해주세요." }, { status: 400 });
  }

  const { error } = await supabase
    .from("inspection_records")
    .update({
      complex_name: body.complex_name.trim(),
      dong_ho: body.dong_ho?.trim() || null,
      address: body.address?.trim() || null,
      pyeong: body.pyeong?.trim() || null,
      year_built: body.year_built ?? null,
      total_units: body.total_units ?? null,
      parking_count: body.parking_count?.trim() || null,
      structure: body.structure?.trim() || null,
      subway_access: body.subway_access?.trim() || null,
      major_transport: body.major_transport?.trim() || null,
      terrain: body.terrain?.trim() || null,
      harmful_facilities: body.harmful_facilities?.trim() || null,
      school_zone: body.school_zone?.trim() || null,
      amenities: body.amenities?.trim() || null,
      nature_env: body.nature_env?.trim() || null,
      building_gap: body.building_gap?.trim() || null,
      community: body.community?.trim() || null,
      maintenance: body.maintenance?.trim() || null,
      interior_condition: body.interior_condition?.trim() || null,
      price_info: body.price_info ?? [],
      review: body.review?.trim() || null,
      image_urls: body.image_urls ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: existing } = await supabase
    .from("inspection_records")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { error } = await supabase.from("inspection_records").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
