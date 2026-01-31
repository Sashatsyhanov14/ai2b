"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Availability = 'available' | 'reserved' | 'sold';

export type SecondaryUnit = {
  id: string;
  city: string;
  address: string;
  rooms: 'studio' | '1' | '2' | '3' | '4+';
  floor: number;
  floors_total: number;
  area_m2: number;
  finish?: 'renovated' | 'whitebox' | 'shell';
  price_total: number;
  description?: string;
  photos: string[];
  status: Availability; // default 'available'
  created_at: string; // ISO
};

type SecondaryState = {
  units: SecondaryUnit[];
  addUnit: (u: Omit<SecondaryUnit, 'id' | 'created_at' | 'status'> & Partial<Pick<SecondaryUnit, 'status'>>) => string;
  updateUnit: (id: string, patch: Partial<SecondaryUnit>) => void;
  removeUnit: (id: string) => void;
  clearAll: () => void;
};

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'u_' + Math.random().toString(36).slice(2, 10);
}

export const useSecondaryStore = create<SecondaryState>()(
  persist(
    (set, get) => ({
      units: [],
      addUnit: (u) => {
        const id = genId();
        const unit: SecondaryUnit = {
          id,
          created_at: new Date().toISOString(),
          status: u.status ?? 'available',
          photos: u.photos ?? [],
          city: u.city,
          address: u.address,
          rooms: u.rooms,
          floor: u.floor,
          floors_total: u.floors_total,
          area_m2: u.area_m2,
          finish: u.finish,
          price_total: u.price_total,
          description: u.description,
        };
        set({ units: [unit, ...get().units] });
        return id;
      },
      updateUnit: (id, patch) => {
        set({
          units: get().units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        });
      },
      removeUnit: (id) => set({ units: get().units.filter((u) => u.id !== id) }),
      clearAll: () => set({ units: [] }),
    }),
    { name: 'estate-secondary-v1' }
  )
);

