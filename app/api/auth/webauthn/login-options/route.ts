import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";
import { WEBAUTHN_RP_ID } from "@/lib/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body = await request.json() as { credentialIds?: string[] };

  const allowCredentials = (body.credentialIds ?? []).map((id) => ({ id }));

  const options = await generateAuthenticationOptions({
    rpID: WEBAUTHN_RP_ID,
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  // challenge 저장 (5분 TTL)
  await admin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    user_id: null,
    type: "authentication",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return NextResponse.json(options);
}
