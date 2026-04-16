import { createAdminClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase-admin";

interface PushSubscriptionRow {
  fcm_token: string;
  device_type: "web" | "ios" | "android";
  updated_at?: string | null;
}

interface PushDispatchParams {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  origin?: string;
}

interface PushDispatchResult {
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

async function deleteInvalidTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  const supabase = createAdminClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .in("fcm_token", tokens);
}

function buildWebpushPayload(params: PushDispatchParams) {
  const siteUrl = params.origin ? trimTrailingSlash(params.origin) : getBaseSiteUrl();
  const targetUrl = toAbsoluteUrl(params.url ?? "/blog", siteUrl);
  const fallbackPath = params.url?.startsWith("/") ? params.url : "/blog";
  const iconUrl = toAbsoluteUrl(params.icon ?? "/favicon.ico", siteUrl) ?? "/favicon.ico";
  const badgeUrl = toAbsoluteUrl("/favicon.ico", siteUrl) ?? "/favicon.ico";

  return {
    webpush: {
      notification: {
        title: params.title,
        body: params.body,
        icon: iconUrl,
        badge: badgeUrl,
      },
      data: {
        title: params.title,
        body: params.body,
        icon: iconUrl,
        badge: badgeUrl,
        url: targetUrl ?? fallbackPath,
      },
      ...(targetUrl ? { fcmOptions: { link: targetUrl } } : {}),
    },
    apns: {
      payload: {
        aps: {
          alert: { title: params.title, body: params.body },
          sound: "default",
        },
      },
      fcmOptions: {
        imageUrl: params.icon,
      },
    },
  };
}

async function dispatchPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  params: PushDispatchParams,
): Promise<PushDispatchResult> {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, details: [] };
  }

  const messaging = getAdminMessaging();
  const BATCH_SIZE = 500;
  let sent = 0;
  let failed = 0;
  const details: PushDispatchResult["details"] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch.map((item) => item.fcm_token),
        ...buildWebpushPayload(params),
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        const subscription = batch[idx];
        const errorCode = resp.success ? null : (resp.error?.code ?? null);
        const errorMessage = resp.success ? null : (resp.error?.message ?? null);

        details.push({
          tokenPrefix: subscription.fcm_token.slice(0, 12),
          deviceType: subscription.device_type,
          success: resp.success,
          errorCode,
          errorMessage,
        });

        if (
          !resp.success &&
          (errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token")
        ) {
          invalidTokens.push(subscription.fcm_token);
        }
      });
    } catch (err) {
      console.error("[FCM] multicast error:", err);
      failed += batch.length;
      batch.forEach((subscription) => {
        details.push({
          tokenPrefix: subscription.fcm_token.slice(0, 12),
          deviceType: subscription.device_type,
          success: false,
          errorCode: "multicast-error",
          errorMessage: err instanceof Error ? err.message : "unknown error",
        });
      });
    }
  }

  await deleteInvalidTokens(invalidTokens);
  return { sent, failed, details };
}

async function getAllSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("fcm_token, device_type, updated_at");

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
    .select("fcm_token, device_type, updated_at")
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
