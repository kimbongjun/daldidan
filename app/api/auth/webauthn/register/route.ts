import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();
  const body = await request.json() as { response: unknown };

  // challenge 조회 및 만료 확인
  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("challenge")
    .eq("user_id", user.id)
    .eq("type", "registration")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challengeRow) {
    return NextResponse.json({ error: "인증 세션이 만료되었습니다. 다시 시도해 주세요." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
    });
  } catch (e) {
    return NextResponse.json({ error: `생체 인증 등록 실패: ${(e as Error).message}` }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "검증에 실패했습니다." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  // credential 저장
  const { error: insertError } = await admin.from("webauthn_credentials").insert({
    user_id: user.id,
    email: user.email,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? [],
  });

  // 사용한 challenge 삭제
  await admin.from("webauthn_challenges").delete().eq("challenge", challengeRow.challenge);

  if (insertError) {
    return NextResponse.json({ error: "자격증명 저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credentialId: credential.id });
}
