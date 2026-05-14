import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();

  // 기존 등록된 credential 제외
  const { data: existing } = await admin
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: WEBAUTHN_RP_ID,
    userName: user.email ?? user.id,
    userDisplayName: user.email ?? "달디단 유저",
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: c.transports ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  // challenge 저장 (5분 TTL)
  await admin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    user_id: user.id,
    type: "registration",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return NextResponse.json(options);
}
