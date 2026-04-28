import { NextResponse } from "next/server";

/**
 * GET /api/firebase-messaging-sw
 * Firebase 설정을 환경변수에서 주입한 서비스워커 스크립트를 동적으로 제공.
 * next.config.ts의 rewrite로 /firebase-messaging-sw.js → 이 경로로 매핑됨.
 */
export async function GET() {
  const config = JSON.stringify({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });

  const swContent = `
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// SW 수명 주기: 새 버전이 있으면 waiting 없이 즉시 활성화
// iOS에서 SW가 "waiting" 상태에 걸려 토큰 수집이 안 되는 문제 해결
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

firebase.initializeApp(${config});

const messaging = firebase.messaging();

// 앱이 백그라운드이거나 닫혀 있을 때 수신
messaging.onBackgroundMessage(function(payload) {
  const title = payload.data?.title ?? payload.notification?.title ?? '달디단';
  const body  = payload.data?.body ?? payload.notification?.body ?? '새 알림이 있습니다';
  const icon  = payload.data?.icon ?? payload.notification?.icon ?? '/favicon.ico';
  const badge = payload.data?.badge ?? '/favicon.ico';
  const url   = payload.data?.url ?? payload.fcmOptions?.link ?? '/blog';

  // 열려 있는 탭에도 전달 (포그라운드 클라이언트 in-app 알림 표시용)
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
    clientList.forEach(function(client) {
      client.postMessage({
        type: 'blog-notification',
        payload: { title, body, url, createdAt: new Date().toISOString() },
      });
    });
  });

  // 시스템 알림 표시 — Android Chrome 백그라운드 수신의 핵심
  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    data: { url },
    requireInteraction: false,
  });
});

// 알림 클릭 → 해당 URL로 이동
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/blog';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // 이미 해당 URL을 보고 있는 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.endsWith(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창/탭으로 열기
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
`;

  return new NextResponse(swContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 루트 스코프 허용 — 모든 페이지 푸시 수신
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
