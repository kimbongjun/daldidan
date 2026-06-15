"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { Fingerprint, Loader2 } from "lucide-react";

const LS_KEY = "webauthn_credential_ids";

function getStoredCredentialIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

interface Props {
  next?: string;
}

export default function BiometricLoginButton({ next = "/" }: Props) {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // WebAuthn 지원 여부 + 등록된 credential 존재 여부 확인
    const isSupported =
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      getStoredCredentialIds().length > 0;
    setAvailable(isSupported);
  }, []);

  if (!available) return null;

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const credentialIds = getStoredCredentialIds();

      // 1. 서버에서 인증 옵션(challenge) 수신
      const optRes = await fetch("/api/auth/webauthn/login-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialIds }),
      });
      if (!optRes.ok) throw new Error("인증 옵션을 가져오지 못했습니다.");
      const options = await optRes.json() as PublicKeyCredentialRequestOptionsJSON;

      // 2. 생체 인증 실행 (브라우저 → Face ID / Touch ID / 지문)
      const assertionResponse = await startAuthentication({ optionsJSON: options });

      // 3. 서버에서 검증 + 세션 토큰 수신
      const verifyRes = await fetch("/api/auth/webauthn/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: assertionResponse,
          credentialId: assertionResponse.id,
        }),
      });
      const verifyData = await verifyRes.json() as { token_hash?: string; error?: string };
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "검증에 실패했습니다.");

      // 4. Supabase 세션 활성화
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: verifyData.token_hash!,
        type: "email",
      });
      if (sessionError) throw new Error(sessionError.message);

      router.push(next);
      router.refresh();
    } catch (e) {
      const msg = (e as Error).message;
      // 사용자가 취소한 경우 조용히 처리
      if (msg.includes("cancelled") || msg.includes("NotAllowed") || msg.includes("AbortError")) {
        setLoading(false);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleBiometricLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "rgba(92,171,242,0.15)", color: "#5CABF2", border: "1px solid rgba(92,171,242,0.35)" }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Fingerprint size={16} />
        )}
        {loading ? "인증 중…" : "생체 인증으로 로그인"}
      </button>

      {error && (
        <p className="text-xs text-center" style={{ color: "#F43F5E" }}>{error}</p>
      )}
    </div>
  );
}

// 등록 완료 후 호출: credential ID를 localStorage에 저장
export function saveCredentialId(credentialId: string) {
  try {
    const ids = getStoredCredentialIds();
    if (!ids.includes(credentialId)) {
      localStorage.setItem(LS_KEY, JSON.stringify([...ids, credentialId]));
    }
  } catch {
    /* Edge InPrivate·쿠키 차단 등 storage 비활성 환경에서는 무시 */
  }
}
