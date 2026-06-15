import { createJSONStorage, type StateStorage } from "zustand/middleware";

// Edge 트래킹 방지(Strict)·쿠키/사이트 데이터 차단·InPrivate 등 일부 환경에서는
// `localStorage` 프로퍼티 접근 자체가 SecurityError를 throw한다.
// 이 경우 Zustand persist의 기본 storage 가 하이드레이션 중 throw → 레이아웃
// 전역(ThemeProvider 등)이 죽어 화면이 통째로 흰 화면이 된다.
// 모든 접근을 try/catch로 감싸 실패 시 in-memory 폴백으로 조용히 동작시킨다.
const memoryStore = new Map<string, string>();

const safeStateStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memoryStore.get(name) ?? null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memoryStore.delete(name);
    }
  },
};

// Zustand persist 의 storage 옵션에 그대로 넘긴다.
export const safeJSONStorage = createJSONStorage(() => safeStateStorage);
