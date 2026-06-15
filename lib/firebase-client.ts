// FCM(Firebase Cloud Messaging)은 푸시 구독을 실제로 켤 때만 필요하다.
// firebase SDK(~200KB+)가 메인 번들에 정적으로 묶이지 않도록, firebase/app·
// firebase/messaging 은 모두 동적 import 로만 로드한다. 아래 export 들은 호출
// 시점에 비로소 청크를 내려받으므로 초기 로딩에는 영향을 주지 않는다.
import type { Messaging, MessagePayload, Unsubscribe } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function getFirebaseApp() {
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

/** FCM 지원 여부 확인 후 Messaging 인스턴스 반환. 미지원 환경이면 null */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;
    const app = await getFirebaseApp();
    return getMessaging(app);
  } catch {
    return null;
  }
}

// ── firebase/messaging 함수 래퍼 ──────────────────────────────────
// 호출부(Header 등)가 "firebase/messaging" 을 정적 import 하면 SDK 가 메인
// 번들에 끌려온다. 아래 래퍼를 통해서만 접근하게 해 동적 로드를 보장한다.

export async function onForegroundMessage(
  messaging: Messaging,
  handler: (payload: MessagePayload) => void,
): Promise<Unsubscribe> {
  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, handler);
}

export async function getFcmToken(
  messaging: Messaging,
  options: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration },
): Promise<string> {
  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, options);
}

export async function deleteFcmToken(messaging: Messaging): Promise<boolean> {
  const { deleteToken } = await import("firebase/messaging");
  return deleteToken(messaging);
}
