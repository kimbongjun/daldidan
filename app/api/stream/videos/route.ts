import { NextRequest, NextResponse } from "next/server";
import { listCloudflareStreamVideos } from "@/lib/cloudflare-stream";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    const videos = await listCloudflareStreamVideos({ limit: 50, search });
    return NextResponse.json({ videos }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "비디오 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
