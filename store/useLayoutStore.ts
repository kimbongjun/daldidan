import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WidgetId =
  | "fortune"
  | "lotto"
  | "blog"
  | "budget"
  | "calendar"
  | "stock"
  | "realestate";

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "fortune",
  "lotto",
  "blog",
  "budget",
  "calendar",
  "stock",
  "realestate",
];

export const MOBILE_WIDGET_ORDER: WidgetId[] = [
  "blog",
  "calendar",
  "budget",
  "lotto",
  "stock",
  "fortune",
  "realestate",
];

const WIDGET_IDS = new Set<WidgetId>(DEFAULT_WIDGET_ORDER);

interface LayoutState {
  widgetOrder: WidgetId[];
  setWidgetOrder: (ids: WidgetId[]) => void;
}

type LegacyLayoutState = {
  mainOrder?: WidgetId[];
  fullOrder?: WidgetId[];
};

function normalizeWidgetOrder(widgetOrder?: WidgetId[]): WidgetId[] {
  const source = widgetOrder ?? [];
  const valid = source.filter((id): id is WidgetId => WIDGET_IDS.has(id));
  const deduped = valid.filter((id, index) => valid.indexOf(id) === index);
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !deduped.includes(id));
  return [...deduped, ...missing];
}

function migrateLayoutState(persisted: unknown): Pick<LayoutState, "widgetOrder"> {
  const state = (persisted ?? {}) as Partial<LayoutState> & LegacyLayoutState;

  if (Array.isArray(state.widgetOrder)) {
    return {
      widgetOrder: normalizeWidgetOrder(state.widgetOrder),
    };
  }

  const combined = [
    ...(Array.isArray(state.mainOrder) ? state.mainOrder : []),
    ...(Array.isArray(state.fullOrder) ? state.fullOrder : []),
  ];

  return {
    widgetOrder: normalizeWidgetOrder(combined),
  };
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      setWidgetOrder: (widgetOrder) => set({ widgetOrder: normalizeWidgetOrder(widgetOrder) }),
    }),
    {
      name: "daldidan-layout",
      skipHydration: true,
      version: 2,
      migrate: async (persisted) => migrateLayoutState(persisted),
    },
  ),
);
