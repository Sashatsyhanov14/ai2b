"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Availability = 'available' | 'reserved' | 'sold';

export type DevProject = {
  id: string;
  name: string;
  developer: string;
  city: string;
  stage?: 'pit' | 'frame' | 'finishing' | 'commissioning';
  delivery: { q: 1 | 2 | 3 | 4; year: number };
  sections: string[];
  media: string[]; // URLs (data URLs for mock)
  created_at: string;
};

export type DevUnitType = {
  id: string;
  projectId: string;
  label: string; // 1к/2к/студия
  area_min: number;
  area_max: number;
  finish?: 'whitebox' | 'shell' | 'turnkey';
  price_from: number;
  price_per_m2?: number;
  floor_markup?: number; // ₽/этаж
  images: string[];
};

export type DevUnit = {
  id: string;
  projectId: string;
  section: string;
  floor: number;
  number: string; // лот №
  typeId: string;
  area_m2: number;
  price_total: number;
  status: Availability;
};

function genId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

export type GenerateUnitsConfig = {
  projectId: string;
  typeId: string;
  floorFrom: number;
  floorTo: number;
  sections: string[];
  perFloorCount: number;
  numberTemplate?: string; // e.g. `${floor}${index2}`
};

type DevState = {
  projects: DevProject[];
  types: DevUnitType[];
  units: DevUnit[];
  addProject: (p: Omit<DevProject, 'id' | 'created_at' | 'media'> & Partial<Pick<DevProject, 'media'>>) => string;
  updateProject: (id: string, patch: Partial<DevProject>) => void;
  removeProject: (id: string) => void;

  addType: (t: Omit<DevUnitType, 'id'>) => string;
  updateType: (id: string, patch: Partial<DevUnitType>) => void;
  removeType: (id: string) => void;

  addUnit: (u: Omit<DevUnit, 'id' | 'status'> & Partial<Pick<DevUnit, 'status'>>) => string;
  updateUnit: (id: string, patch: Partial<DevUnit>) => void;
  removeUnit: (id: string) => void;

  generateUnits: (cfg: GenerateUnitsConfig) => DevUnit[];
  clearAll: () => void;
};

function formatNumber(template: string, floor: number, index: number) {
  const pad = (n: number, d: number) => n.toString().padStart(d, '0');
  return template
    .replaceAll('${floor}', String(floor))
    .replaceAll('${index}', String(index))
    .replaceAll('${index2}', pad(index, 2))
    .replaceAll('${index3}', pad(index, 3));
}

export const useDevStore = create<DevState>()(
  persist(
    (set, get) => ({
      projects: [],
      types: [],
      units: [],

      addProject: (p) => {
        const id = genId('prj');
        const proj: DevProject = {
          id,
          name: p.name,
          developer: p.developer,
          city: p.city,
          stage: p.stage,
          delivery: p.delivery,
          sections: p.sections,
          media: p.media ?? [],
          created_at: new Date().toISOString(),
        };
        set({ projects: [proj, ...get().projects] });
        return id;
      },
      updateProject: (id, patch) =>
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      removeProject: (id) =>
        set({
          projects: get().projects.filter((p) => p.id !== id),
          types: get().types.filter((t) => t.projectId !== id),
          units: get().units.filter((u) => u.projectId !== id),
        }),

      addType: (t) => {
        const id = genId('typ');
        const type: DevUnitType = { ...t, id };
        set({ types: [type, ...get().types] });
        return id;
      },
      updateType: (id, patch) =>
        set({ types: get().types.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      removeType: (id) => set({ types: get().types.filter((t) => t.id !== id) }),

      addUnit: (u) => {
        const id = genId('u');
        const unit: DevUnit = { ...u, id, status: u.status ?? 'available' } as DevUnit;
        set({ units: [unit, ...get().units] });
        return id;
      },
      updateUnit: (id, patch) =>
        set({ units: get().units.map((u) => (u.id === id ? { ...u, ...patch } : u)) }),
      removeUnit: (id) => set({ units: get().units.filter((u) => u.id !== id) }),

      generateUnits: (cfg) => {
        const { projectId, typeId, floorFrom, floorTo, sections, perFloorCount } = cfg;
        const template = cfg.numberTemplate || '${floor}${index2}';
        const type = get().types.find((t) => t.id === typeId);
        if (!type) return [];
        const res: DevUnit[] = [];
        const avgArea = (type.area_min + type.area_max) / 2;
        for (let floor = floorFrom; floor <= floorTo; floor++) {
          for (const section of sections) {
            for (let i = 1; i <= perFloorCount; i++) {
              const price_total = type.price_from + Math.max(0, floor - 1) * (type.floor_markup ?? 0);
              const number = formatNumber(template, floor, i);
              res.push({
                id: genId('lot'),
                projectId,
                section,
                floor,
                number,
                typeId,
                area_m2: Math.round(avgArea * 10) / 10,
                price_total,
                status: 'available',
              });
            }
          }
        }
        set({ units: [...res, ...get().units] });
        return res;
      },

      clearAll: () => set({ projects: [], types: [], units: [] }),
    }),
    { name: 'estate-dev-v1' }
  )
);

