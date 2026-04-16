import { createAdminClient } from "@/lib/supabase/server";
import { sendFcmMessage } from "@/lib/firebase-admin";

interface PushSubscriptionRow {
  fcm_token: string;
  device_type: "web" | "ios" | "android";
  user_id?: string | null;
  user_agent?: string | null;
  updated_at?: string | null;
}

interface PushDispatchParams {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  origin?: string;
}

export interface PushDispatchResult {
  sent: number;
  failed: number;
  details: Array<{
    tokenPrefix: string;
    deviceType?: string;
    success: boolean;
    errorCode: string | null;
    errorMessage: string | null;
  }>;
}

function extractInstallationId(userAgent?: string | null) {
  if (!userAgent) return null;
  const match = userAgent.match(/\[iid:([^\]]+)\]/);
  return match?.[1] ?? null;
}

function normalizeUserAgentSignature(userAgent?: string | null) {
  if (!userAgent) return "unknown";

  const raw = userAgent.replace(/\s*\[iid:[^\]]+\]\s*/g, "").toLowerCase();
  const browser =
    raw.includes("edg/") ? "edge" :
    raw.includes("firefox/") ? "firefox" :
    raw.includes("samsungbrowser/") ? "samsung" :
    raw.includes("chrome/") ? "chrome" :
    raw.includes("safari/") ? "safari" :
    "other";
  const os =
    raw.includes("android") ? "android" :
    raw.includes("iphone") || raw.includes("ipad") || raw.includes("ios") ? "ios" :
    raw.includes("mac os x") ? "mac" :
    raw.includes("windows") ? "windows" :
    "other";
  const deviceClass =
    raw.includes("mobile") ? "mobile" :
    raw.includes("tablet") || raw.includes("ipad") ? "tablet" :
    "desktop";

  return `${browser}:${os}:${deviceClass}`;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function getBaseSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  return candidate ? trimTrailingSlash(candidate) : "";
}

function toAbsoluteUrl(pathOrUrl: string | undefined, baseUrl: string) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!baseUrl) return undefined;
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${normalizedPath}`;
}

function buildSubscriptionDedupKey(subscription: PushSubscriptionRow) {
  const installationId = extractInstallationId(subscription.user_agent);
  if (installationId) {
    return `installation:${installationId}`;
  }

  if (subscription.user_id) {
    return `user:${subscription.user_id}:${subscription.device_type}:${normalizeUserAgentSignature(subscription.user_agent)}`;
  }

  return `token:${subscription.fcm_token}`;
}

function dedupeSubscriptions(subscriptions: PushSubscriptionRow[]) {
  const sorted = [...subscriptions].sort((a, b) => {
    const left = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const right = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return right - left;
  });

  const seen = new Set<string>();
  const unique: PushSubscriptionRow[] = [];
  const redundantTokens: string[] = [];

  for (const subscription of sorted) {
    const key = buildSubscriptionDedupKey(subscription);
    if (seen.has(key)) {
      redundantTokens.push(subscription.fcm_token);
      continue;
    }
    seen.add(key);
    unique.push(subscription);
  }

  return { unique, redundantTokens };
}

async function deleteTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  const supabase = createAdminClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .in("fcm_token", tokens);
}

async function dispatchPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  params: PushDispatchParams,
): Promise<PushDispatchResult> {
  const { unique: uniqueSubscriptions, redundantTokens } = dedupeSubscriptions(subscriptions);
  await deleteTokens(redundantTokens);

  if (uniqueSubscriptions.length === 0) {
    return { sent: 0, failed: 0, details: [] };
  }

  const siteUrl = params.origin ? trimTrailingSlash(params.origin) : getBaseSiteUrl();
  const targetUrl = toAbsoluteUrl(params.url ?? "/blog", siteUrl);
  const fallbackPath = params.url?.startsWith("/") ? params.url : "/blog";
  const iconUrl = toAbsoluteUrl(params.icon ?? "/favicon.ico", siteUrl) ?? "/favicon.ico";
  const badgeUrl = toAbsoluteUrl("/favicon.ico", siteUrl) ?? "/favicon.ico";
  const messageUrl = targetUrl ?? fallbackPath;
  const BATCH_SIZE = 20;
  let sent = 0;
  let failed = 0;
  const details: PushDispatchResult["details"] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < uniqueSubscriptions.length; i += BATCH_SIZE) {
    const batch = uniqueSubscriptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (subscription) => {
      try {
        return await sendFcmMessage({
          token: subscription.fcm_token,
          title: params.title,
          body: params.body,
          iconUrl,
          badgeUrl,
          url: messageUrl,
          imageUrl: params.icon,
        });
      } catch (error) {
        details.push({
          tokenPrefix: subscription.fcm_token.slice(0, 12),
          deviceType: subscription.device_type,
          success: false,
          errorCode: "send-failed",
          errorMessage: error instanceof Error ? error.message : "unknown error",
        });
        return null;
      }
    }));

    results.forEach((result, idx) => {
      if (!result) {
        failed += 1;
        return;
      }

      const subscription = batch[idx];
      if (result.success) {
        sent += 1;
        details.push({
          tokenPrefix: subscription.fcm_token.slice(0, 12),
          deviceType: subscription.device_type,
          success: true,
          errorCode: null,
          errorMessage: null,
        });
        return;
      }

      failed += 1;
      details.push({
        tokenPrefix: subscription.fcm_token.slice(0, 12),
        deviceType: subscription.device_type,
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });

      if (
        result.errorCode === "UNREGISTERED" ||
        result.errorCode === "INVALID_ARGUMENT"
      ) {
        const lowerMessage = result.errorMessage?.toLowerCase() ?? "";
        if (
          lowerMessage.includes("registration token") ||
          lowerMessage.includes("not registered") ||
          lowerMessage.includes("requested entity was not found")
        ) {
          invalidTokens.push(subscription.fcm_token);
        }
      }
    });
  }

  await deleteTokens(invalidTokens);
  return { sent, failed, details };
}

async function getAllSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("fcm_token, device_type, user_id, user_agent, updated_at");

  if (error || !subscriptions) return [];
  return subscriptions;
}

export async function sendPushToAllSubscribers(
  params: PushDispatchParams,
): Promise<{ sent: number; failed: number }> {
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await getAllSubscriptions();
  const result = await dispatchPushToSubscriptions(subscriptions, params);
  return { sent: result.sent, failed: result.failed };
}

export async function sendPushDebugToLatestSubscribers(
  params: PushDispatchParams & { limit?: number },
): Promise<PushDispatchResult> {
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("fcm_token, device_type, user_id, user_agent, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !subscriptions) {
    return {
      sent: 0,
      failed: 0,
      details: [{
        tokenPrefix: "",
        success: false,
        errorCode: "subscriptions-query-failed",
        errorMessage: error?.message ?? "failed to load subscriptions",
      }],
    };
  }

  return dispatchPushToSubscriptions(subscriptions, params);
}
