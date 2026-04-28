import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MainWidgetId = "blog" | "budget" | "calendar" | "fortune" | "lotto";
export type FullWidgetId = "stock" | "festival" | "realestate";

interface LayoutState {
  mainOrder: MainWidgetId[];
  fullOrder: FullWidgetId[];
  setMainOrder: (ids: MainWidgetId[]) => void;
  setFullOrder: (ids: FullWidgetId[]) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      mainOrder: ["blog", "budget", "calendar", "fortune", "lotto"],
      fullOrder: ["stock", "festival", "realestate"],
      setMainOrder: (mainOrder) => set({ mainOrder }),
      setFullOrder: (fullOrder) => set({ fullOrder }),
    }),
    { name: "daldidan-layout", skipHydration: true },
  ),
);
