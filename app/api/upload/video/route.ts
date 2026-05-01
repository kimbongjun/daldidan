import { NextRequest, NextResponse } from "next/server";
import {
  buildCloudflareStreamHlsUrl,
  buildCloudflareStreamThumbnailUrl,
  getCloudflareStreamConfig,
  getCloudflareStreamVideoDetails,
} from "@/lib/cloudflare-stream";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, apiToken } = getCloudflareStreamConfig();
    const tusResumable = request.headers.get("Tus-Resumable");
    const uploadLength = request.headers.get("Upload-Length");

    if (tusResumable !== "1.0.0") {
      return errorResponse("Cloudflare Stream TUS 업로드는 Tus-Resumable 1.0.0 헤더가 필요합니다.", 400);
    }

    if (!uploadLength) {
      return errorResponse("Cloudflare Stream TUS 업로드는 Upload-Length 헤더가 필요합니다.", 400);
    }

    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": tusResumable,
        "Upload-Length": uploadLength,
        ...(request.headers.get("Upload-Metadata")
          ? { "Upload-Metadata": request.headers.get("Upload-Metadata") as string }
          : {}),
        ...(request.headers.get("Upload-Creator")
          ? { "Upload-Creator": request.headers.get("Upload-Creator") as string }
          : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return errorResponse(`Cloudflare Stream 업로드 URL 생성 실패 (${upstream.status}) ${text}`.trim(), upstream.status);
    }

    const location = upstream.headers.get("Location");
    const mediaId = upstream.headers.get("stream-media-id");

    if (!location) {
      return errorResponse("Cloudflare Stream 업로드 URL을 받지 못했습니다.", 502);
    }

    return new NextResponse(null, {
      status: upstream.status,
      headers: {
        Location: location,
        "stream-media-id": mediaId ?? "",
        "Tus-Resumable": "1.0.0",
        "Access-Control-Expose-Headers": "Location,stream-media-id,Tus-Resumable",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Cloudflare Stream 업로드를 시작하지 못했습니다.");
  }
}

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid")?.trim();
  if (!uid) return errorResponse("Cloudflare Stream video uid가 필요합니다.", 400);

  try {
    const config = getCloudflareStreamConfig();
    const details = await getCloudflareStreamVideoDetails(uid);
    return NextResponse.json({
      uid,
      readyToStream: details.readyToStream ?? false,
      status: details.status?.state ?? "queued",
      pctComplete: details.status?.pctComplete ?? null,
      errorReasonCode: details.status?.errorReasonCode ?? null,
      errorReasonText: details.status?.errorReasonText ?? null,
      playback: {
        hls: details.playback?.hls ?? buildCloudflareStreamHlsUrl(config.customerCode, uid),
        dash: details.playback?.dash ?? null,
      },
      thumbnail: details.thumbnail ?? buildCloudflareStreamThumbnailUrl(config.customerCode, uid, { time: config.defaultPosterTime, height: 720 }),
      preview: details.preview ?? null,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Cloudflare Stream 비디오 상태를 조회하지 못했습니다.");
  }
}
