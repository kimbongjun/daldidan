import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function isMissingColumnError(error: { message?: string } | null, column: string) {
  const message = error?.message ?? "";
  return (
    message.includes(`column profiles.${column} does not exist`) ||
    message.includes(`Could not find the '${column}' column of 'profiles'`)
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, birth_year, gender, birth_hour")
    .eq("id", user.id)
    .maybeSingle();

  if (isMissingColumnError(error, "avatar_url")) {
    const fallback = await supabase
      .from("profiles")
      .select("display_name, birth_year, gender, birth_hour")
      .eq("id", user.id)
      .maybeSingle();
    profile = fallback.data ? { ...fallback.data, avatar_url: null } : fallback.data;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    email: user.email ?? "",
    display_name: profile?.display_name ?? "",
    avatar_url: profile?.avatar_url ?? null,
    birth_year: profile?.birth_year ?? null,
    gender: profile?.gender ?? null,
    birth_hour: profile?.birth_hour ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json() as {
    display_name?: string;
    avatar_url?: string | null;
    birth_year?: number | null;
    gender?: string | null;
    birth_hour?: number | null;
  };

  const updates: Record<string, unknown> = {};

  if (body.display_name !== undefined) {
    const displayName = body.display_name.trim();
    if (!displayName) {
      return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
    }
    if (displayName.length > 30) {
      return NextResponse.json({ error: "닉네임은 30자 이하로 입력해주세요." }, { status: 400 });
    }
    updates.display_name = displayName;
  }

  if (body.birth_year !== undefined) {
    if (body.birth_year !== null && (body.birth_year < 1900 || body.birth_year > 2100)) {
      return NextResponse.json({ error: "올바른 출생 연도를 입력해주세요." }, { status: 400 });
    }
    updates.birth_year = body.birth_year;
  }

  if (body.gender !== undefined) {
    if (body.gender !== null && !["남성", "여성", "기타"].includes(body.gender)) {
      return NextResponse.json({ error: "올바른 성별을 선택해주세요." }, { status: 400 });
    }
    updates.gender = body.gender;
  }

  if (body.birth_hour !== undefined) {
    if (body.birth_hour !== null && (body.birth_hour < 0 || body.birth_hour > 23)) {
      return NextResponse.json({ error: "올바른 태어난 시를 입력해주세요." }, { status: 400 });
    }
    updates.birth_hour = body.birth_hour;
  }

  if (body.avatar_url !== undefined) {
    const avatarUrl = body.avatar_url?.trim() ?? "";
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return NextResponse.json({ error: "올바른 아바타 이미지 URL을 입력해주세요." }, { status: 400 });
    }
    updates.avatar_url = avatarUrl || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...updates });
}
