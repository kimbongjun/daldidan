import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";
import { WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body = await request.json() as { response: unknown; credentialId: string };

  // credential 조회
  const { data: cred } = await admin
    .from("webauthn_credentials")
    .select("*")
    .eq("credential_id", body.credentialId)
    .maybeSingle();

  if (!cred) {
    return NextResponse.json({ error: "등록된 생체 인증 정보가 없습니다." }, { status: 404 });
  }

  // challenge 조회
  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("challenge")
    .eq("type", "authentication")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challengeRow) {
    return NextResponse.json({ error: "인증 세션이 만료되었습니다. 다시 시도해 주세요." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key as string, "base64url")),
        counter: cred.counter as number,
        transports: (cred.transports as AuthenticatorTransportFuture[]) ?? undefined,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `생체 인증 실패: ${(e as Error).message}` }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "생체 인증 검증에 실패했습니다." }, { status: 401 });
  }

  // counter 업데이트 (replay attack 방지)
  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq("credential_id", body.credentialId);

  // 사용한 challenge 삭제
  await admin.from("webauthn_challenges").delete().eq("challenge", challengeRow.challenge);

  // Supabase 세션 발급 — magic link 방식
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: cred.email as string,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: "세션 생성에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token });
}
