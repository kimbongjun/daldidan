"use client";

import { create } from "zustand";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";

interface TravelFilter {
  years: number[];
  continents: TravelContinent[];
}

interface TravelState {
  places: TravelPlace[];
  filter: TravelFilter;
  selectedPlace: TravelPlace | null;
  isAddModalOpen: boolean;
  isDetailModalOpen: boolean;
  editingPlace: TravelPlace | null;
  setPlaces: (places: TravelPlace[]) => void;
  setFilter: (filter: Partial<TravelFilter>) => void;
  setSelectedPlace: (place: TravelPlace | null) => void;
  openAddModal: (place?: TravelPlace) => void;
  closeAddModal: () => void;
  openDetailModal: (place: TravelPlace) => void;
  closeDetailModal: () => void;
}

export const useTravelStore = create<TravelState>()((set) => ({
  places: [],
  filter: { years: [], continents: [] },
  selectedPlace: null,
  isAddModalOpen: false,
  isDetailModalOpen: false,
  editingPlace: null,
  setPlaces: (places) => set({ places }),
  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  openAddModal: (place) => set({ isAddModalOpen: true, editingPlace: place ?? null }),
  closeAddModal: () => set({ isAddModalOpen: false, editingPlace: null }),
  openDetailModal: (place) => set({ isDetailModalOpen: true, selectedPlace: place }),
  closeDetailModal: () => set({ isDetailModalOpen: false, selectedPlace: null }),
}));
