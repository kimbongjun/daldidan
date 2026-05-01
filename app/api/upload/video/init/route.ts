import { NextRequest, NextResponse } from "next/server";
import { getCloudflareStreamConfig } from "@/lib/cloudflare-stream";

export const runtime = "nodejs";
export const maxDuration = 30;

function b64(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { size?: unknown; name?: unknown };
    const size = Number(body.size);
    const name = String(body.name ?? "video");

    if (!Number.isFinite(size) || size <= 0) {
      return errorResponse("유효하지 않은 파일 크기입니다.", 400);
    }

    const { accountId, apiToken, maxDurationSeconds } = getCloudflareStreamConfig();

    const uploadMetadata = [
      `filename ${b64(name)}`,
      `maxdurationseconds ${b64(String(maxDurationSeconds))}`,
      `thumbnailtimestamppct ${b64("0.15")}`,
    ].join(",");

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(size),
          "Upload-Metadata": uploadMetadata,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return errorResponse(
        `Cloudflare Stream 업로드 초기화 실패 (${res.status}): ${text}`.trim(),
        res.status,
      );
    }

    const uploadUrl = res.headers.get("Location");
    const mediaId = res.headers.get("stream-media-id");

    if (!uploadUrl || !mediaId) {
      return errorResponse("Cloudflare Stream에서 업로드 URL 또는 media ID를 받지 못했습니다.", 502);
    }

    return NextResponse.json({ uploadUrl, mediaId });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "업로드 초기화에 실패했습니다.",
    );
  }
}
