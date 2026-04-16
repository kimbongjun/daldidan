import { createAdminClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase-admin";

/**
 * Supabase push_subscriptions 테이블에 저장된 모든 FCM 토큰에 푸시 알림 발송.
 * 만료된 토큰은 자동으로 DB에서 제거한다.
 */
export async function sendPushToAllSubscribers(params: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}): Promise<{ sent: number; failed: number }> {
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    return { sent: 0, failed: 0 };
  }

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("fcm_token");

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const tokens = subscriptions.map((s) => s.fcm_token);
  const messaging = getAdminMessaging();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  // FCM 멀티캐스트는 최대 500개/요청
  const BATCH_SIZE = 500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        webpush: {
          notification: {
            title: params.title,
            body: params.body,
            icon: params.icon ?? `${siteUrl}/favicon.ico`,
            badge: `${siteUrl}/favicon.ico`,
          },
          fcmOptions: {
            link: params.url ? `${siteUrl}${params.url}` : `${siteUrl}/blog`,
          },
        },
        // iOS (APNs) 설정
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
      });

      sent += response.successCount;
      failed += response.failureCount;

      // 만료·무효 토큰 일괄 삭제
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === "messaging/registration-token-not-registered" ||
            resp.error?.code === "messaging/invalid-registration-token")
        ) {
          invalidTokens.push(batch[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("fcm_token", invalidTokens);
      }
    } catch (err) {
      console.error("[FCM] multicast error:", err);
      failed += batch.length;
    }
  }

  return { sent, failed };
}
