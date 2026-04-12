import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "daldidan-notifications" },
  ),
);
