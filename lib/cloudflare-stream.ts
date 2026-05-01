import "server-only";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const DEFAULT_POSTER_TIME = "1s";
const DEFAULT_MAX_DURATION_SECONDS = 60 * 60;

export type CloudflareStreamStatus = "pendingupload" | "downloading" | "queued" | "inprogress" | "ready" | "error" | "live-inprogress";

type CloudflareConfig = {
  accountId: string;
  apiToken: string;
  customerCode: string;
  maxDurationSeconds: number;
  defaultPosterTime: string;
};

type CloudflareEnvelope<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
};

type CloudflareStreamVideoDetails = {
  uid?: string;
  readyToStream?: boolean;
  playback?: {
    hls?: string;
    dash?: string;
  };
  thumbnail?: string;
  preview?: string;
  status?: {
    state?: CloudflareStreamStatus;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getCloudflareStreamConfig(): CloudflareConfig {
  const accountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim() ?? "";
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ?? "";
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() ?? "";

  if (!accountId || !apiToken || !customerCode) {
    throw new Error("Cloudflare Stream 환경 변수가 설정되지 않았습니다.");
  }

  return {
    accountId,
    apiToken,
    customerCode,
    maxDurationSeconds: parsePositiveInt(process.env.CLOUDFLARE_STREAM_MAX_DURATION_SECONDS, DEFAULT_MAX_DURATION_SECONDS),
    defaultPosterTime: process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_POSTER_TIME?.trim() || DEFAULT_POSTER_TIME,
  };
}

export function getCloudflareStreamPublicConfig() {
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() ?? "";
  return {
    customerCode,
    defaultPosterTime: process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_POSTER_TIME?.trim() || DEFAULT_POSTER_TIME,
  };
}

export function buildCloudflareStreamBaseUrl(customerCode: string) {
  return `https://customer-${customerCode}.cloudflarestream.com`;
}

export function buildCloudflareStreamHlsUrl(customerCode: string, uid: string) {
  return `${buildCloudflareStreamBaseUrl(customerCode)}/${uid}/manifest/video.m3u8`;
}

export function buildCloudflareStreamThumbnailUrl(
  customerCode: string,
  uid: string,
  options: { time?: string; height?: number; width?: number; fit?: "crop" | "clip" | "scale" | "fill" } = {},
) {
  const url = new URL(`${buildCloudflareStreamBaseUrl(customerCode)}/${uid}/thumbnails/thumbnail.jpg`);
  url.searchParams.set("time", options.time || DEFAULT_POSTER_TIME);
  if (options.height) url.searchParams.set("height", String(options.height));
  if (options.width) url.searchParams.set("width", String(options.width));
  if (options.fit) url.searchParams.set("fit", options.fit);
  return url.toString();
}

export async function getCloudflareStreamVideoDetails(uid: string): Promise<CloudflareStreamVideoDetails> {
  const { accountId, apiToken } = getCloudflareStreamConfig();
  const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/${encodeURIComponent(uid)}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as CloudflareEnvelope<CloudflareStreamVideoDetails>;

  if (!response.ok || !payload.success || !payload.result) {
    const message = payload.errors?.[0]?.message || "Cloudflare Stream 비디오 정보를 조회하지 못했습니다.";
    throw new Error(message);
  }

  return payload.result;
}

export type CloudflareStreamListItem = {
  uid: string;
  thumbnail: string;
  meta: { name?: string };
  status: {
    state: CloudflareStreamStatus;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  duration?: number;
  created?: string;
  readyToStream: boolean;
};

export async function listCloudflareStreamVideos(options: {
  limit?: number;
  search?: string;
} = {}): Promise<CloudflareStreamListItem[]> {
  const { accountId, apiToken } = getCloudflareStreamConfig();
  const url = new URL(`${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream`);
  url.searchParams.set("per_page", String(options.limit ?? 50));
  if (options.search?.trim()) url.searchParams.set("search", options.search.trim());

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({})) as CloudflareEnvelope<CloudflareStreamListItem[]>;

  if (!res.ok || !payload.success) {
    const message = payload.errors?.[0]?.message ?? "비디오 목록을 조회하지 못했습니다.";
    throw new Error(message);
  }

  return payload.result ?? [];
}
