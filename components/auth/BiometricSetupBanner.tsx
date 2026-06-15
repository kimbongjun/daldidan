"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { saveCredentialId } from "@/components/auth/BiometricLoginButton";
import { Fingerprint, X, Loader2, CheckCircle } from "lucide-react";

const LS_DISMISSED = "webauthn_setup_dismissed";

// localStorage의 credential ID 목록을 안전하게 읽는다.
// 손상된 값(legacy "undefined" 문자열, 빈 문자열 등)이 있어도 throw하지 않는다.
function readStoredCredentialIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("webauthn_credential_ids") ?? "[]");
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export default function BiometricSetupBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem(LS_DISMISSED) === "1";
    const isSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;
    // 이미 credential이 등록된 경우 배너 숨김
    // localStorage 값이 손상(legacy "undefined" 등)돼도 throw하지 않도록 방어
    const hasCredentials = readStoredCredentialIds().length > 0;
    setVisible(isSupported && !isDismissed && !hasCredentials);
  }, []);

  const dismiss = () => {
    localStorage.setItem(LS_DISMISSED, "1");
    setVisible(false);
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 등록 옵션 수신
      const optRes = await fetch("/api/auth/webauthn/register-options", { method: "POST" });
      if (!optRes.ok) {
        const d = await optRes.json() as { error?: string };
        throw new Error(d.error ?? "등록 옵션 오류");
      }
      const options = await optRes.json() as PublicKeyCredentialCreationOptionsJSON;

      // 2. 생체 인증 등록 실행
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // 3. 서버 검증 + 저장
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const verifyData = await verifyRes.json() as { ok?: boolean; credentialId?: string; error?: string };
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "등록 실패");

      // 4. localStorage에 credential ID 저장 (다음 방문 시 버튼 표시용)
      if (verifyData.credentialId) saveCredentialId(verifyData.credentialId);

      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("cancelled") || msg.includes("NotAllowed") || msg.includes("AbortError")) {
        setLoading(false);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: "rgba(92,171,242,0.1)",
        border: "1px solid rgba(92,171,242,0.25)",
        marginBottom: "1rem",
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(92,171,242,0.18)" }}>
        {done ? (
          <CheckCircle size={16} style={{ color: "#10B981" }} />
        ) : (
          <Fingerprint size={16} style={{ color: "#5CABF2" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {done ? (
          <p className="text-sm font-bold" style={{ color: "#10B981" }}>생체 인증이 등록되었습니다!</p>
        ) : (
          <>
            <p className="text-xs font-bold" style={{ color: "#5CABF2" }}>생체 인증으로 빠르게 로그인</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              다음부터 Face ID / 지문으로 간편 로그인하세요.
            </p>
          </>
        )}
        {error && <p className="text-[11px] mt-0.5" style={{ color: "#F43F5E" }}>{error}</p>}
      </div>

      {!done && (
        <button
          type="button"
          onClick={handleSetup}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "#5CABF2", color: "#fff" }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Fingerprint size={12} />}
          {loading ? "등록 중…" : "지금 등록"}
        </button>
      )}

      {!done && (
        <button type="button" onClick={dismiss} className="shrink-0 p-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
