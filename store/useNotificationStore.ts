import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  enabled: boolean;
  notifyNewPost: boolean;
  notifyComment: boolean;
  inbox: InboxNotification[];
  setEnabled: (enabled: boolean) => void;
  setNotifyNewPost: (v: boolean) => void;
  setNotifyComment: (v: boolean) => void;
  addInboxNotification: (notification: Omit<InboxNotification, "read">) => void;
  markAllInboxRead: () => void;
  markInboxRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      notifyNewPost: true,
      notifyComment: true,
      inbox: [],
      setEnabled: (enabled) => set({ enabled }),
      setNotifyNewPost: (notifyNewPost) => set({ notifyNewPost }),
      setNotifyComment: (notifyComment) => set({ notifyComment }),
      addInboxNotification: (notification) => set((state) => {
        const duplicate = state.inbox.find((item) =>
          item.id === notification.id ||
          (
            item.url === notification.url &&
            item.title === notification.title &&
            Math.abs(new Date(item.createdAt).getTime() - new Date(notification.createdAt).getTime()) < 60_000
          ));

        if (duplicate) {
          return state;
        }

        return {
          inbox: [
            { ...notification, read: false },
            ...state.inbox,
          ].slice(0, 3),
        };
      }),
      markAllInboxRead: () => set((state) => ({
        inbox: state.inbox.map((item) => ({ ...item, read: true })),
      })),
      markInboxRead: (id) => set((state) => ({
        inbox: state.inbox.map((item) => item.id === id ? { ...item, read: true } : item),
      })),
    }),
    { name: "daldidan-notifications" },
  ),
);
