const DEFAULT_POSTER_TIME = "1s";

export function getCloudflareStreamPublicConfig() {
  return {
    customerCode: process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() ?? "",
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
