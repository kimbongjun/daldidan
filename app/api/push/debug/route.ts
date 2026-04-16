import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function hasValue(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("fcm_token, device_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  let firebaseAdminOk = false;
  let firebaseAdminError = "";
  try {
    getAdminMessaging();
    firebaseAdminOk = true;
  } catch (error) {
    firebaseAdminError = error instanceof Error ? error.message : "unknown";
  }

  return NextResponse.json({
    env: {
      nextPublicSiteUrl: hasValue(process.env.NEXT_PUBLIC_SITE_URL),
      supabaseServiceRoleKey: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
      firebaseAdminProjectId: hasValue(process.env.FIREBASE_ADMIN_PROJECT_ID),
      firebaseAdminClientEmail: hasValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
      firebaseAdminPrivateKey: hasValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      firebaseAdminCredentialsJson: hasValue(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON),
    },
    firebaseAdmin: {
      ok: firebaseAdminOk,
      error: firebaseAdminError || null,
    },
    subscriptions: {
      ok: !subscriptionsError,
      error: subscriptionsError?.message ?? null,
      count: subscriptions?.length ?? 0,
      latest: (subscriptions ?? []).map((item) => ({
        deviceType: item.device_type,
        updatedAt: item.updated_at,
        tokenPrefix: item.fcm_token.slice(0, 12),
      })),
    },
  });
}
