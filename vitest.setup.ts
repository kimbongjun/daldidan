import "@testing-library/jest-dom";

// vitest jsdom 환경에서 localStorage가 undefined로 노출되는 경우가 있어
// (jsdom 29 + vitest 4 조합) 인메모리 Storage로 보강한다.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store = new Map();
    },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  if (!(target as { localStorage?: Storage }).localStorage) {
    Object.defineProperty(target, "localStorage", {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
  }
  if (!(target as { sessionStorage?: Storage }).sessionStorage) {
    Object.defineProperty(target, "sessionStorage", {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
  }
}
