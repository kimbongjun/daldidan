// WebAuthn relying party 설정
// 프로덕션: NEXT_PUBLIC_SITE_URL 기반, 로컬: localhost

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return "localhost"; }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const WEBAUTHN_RP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "달디단";
export const WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID ?? getHostname(siteUrl);
export const WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN ?? siteUrl;
