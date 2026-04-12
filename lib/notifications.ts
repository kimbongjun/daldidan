import { useNotificationStore } from "@/store/useNotificationStore";

export function supportsNativeNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function enableNativeNotifications() {
  if (!supportsNativeNotifications()) {
    return { ok: false as const, reason: "unsupported" as const };
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") {
    useNotificationStore.getState().setEnabled(false);
    return { ok: false as const, reason: permission };
  }

  useNotificationStore.getState().setEnabled(true);
  return { ok: true as const };
}

export function disableNativeNotifications() {
  useNotificationStore.getState().setEnabled(false);
}

export function getNativeNotificationPermission() {
  if (!supportsNativeNotifications()) return "unsupported";
  return window.Notification.permission;
}

export function sendNativeNotification(title: string, body: string) {
  if (!supportsNativeNotifications()) return false;
  if (!useNotificationStore.getState().enabled) return false;
  if (window.Notification.permission !== "granted") return false;

  new window.Notification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  });

  return true;
}
