import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import BiometricSetupBanner from "@/components/auth/BiometricSetupBanner";

// React 19 + jsdom 환경에서 동기 act 경고 억제용
// @ts-expect-error 테스트 전용 글로벌 플래그
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function enableWebAuthn() {
  // @ts-expect-error jsdom에는 PublicKeyCredential이 없으므로 주입
  window.PublicKeyCredential = function () {};
}

// 컴포넌트를 실제 client로 mount해 useEffect(크래시 지점)까지 실행한다.
function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<BiometricSetupBanner />);
  });
  return () => act(() => root.unmount());
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  // @ts-expect-error 테스트 정리: 주입한 글로벌 제거
  delete window.PublicKeyCredential;
});

describe("BiometricSetupBanner — 손상된 localStorage 방어", () => {
  // 배포본에서 client-side exception을 일으킨 정확한 값들.
  // mount 시 JSON.parse가 throw하면 전체 페이지가 죽었다.
  it.each(["undefined", "[object Object]", "", "{ broken", "null"])(
    "credential 값이 손상돼도(%j) throw하지 않는다",
    (value) => {
      enableWebAuthn();
      localStorage.setItem("webauthn_credential_ids", value);
      expect(() => mount()()).not.toThrow();
    },
  );

  it("정상 credential 배열은 정상 처리된다", () => {
    enableWebAuthn();
    localStorage.setItem("webauthn_credential_ids", JSON.stringify(["abc"]));
    expect(() => mount()()).not.toThrow();
  });
});
