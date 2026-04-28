import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarWidgetId = "budget" | "calendar" | "fortune" | "lotto";
export type FullWidgetId = "festival" | "realestate";

interface LayoutState {
  sidebarOrder: SidebarWidgetId[];
  fullOrder: FullWidgetId[];
  setSidebarOrder: (ids: SidebarWidgetId[]) => void;
  setFullOrder: (ids: FullWidgetId[]) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarOrder: ["budget", "calendar", "fortune", "lotto"],
      fullOrder: ["festival", "realestate"],
      setSidebarOrder: (sidebarOrder) => set({ sidebarOrder }),
      setFullOrder: (fullOrder) => set({ fullOrder }),
    }),
    { name: "daldidan-layout", skipHydration: true },
  ),
);
