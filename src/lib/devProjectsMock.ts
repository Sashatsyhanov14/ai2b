// Simple browser-only mock storage for developer projects
export type Project = {
  id: string;
  name: string; // ЖК
  developer: string;
  city: string;
  stage?: 'котлован'|'каркас'|'отделка'|'ввод';
  quarter?: 1|2|3|4;
  year?: number;
  sections: string[]; // e.g. ["A","B"] or ["1","2"]
  media: string[]; // image URLs
  types: ProjectType[];
  lots: Lot[];
  created_at: string;
};

export type ProjectType = {
  id: string;
  title: string; // Студия/1к/2к...
  area_from: number;
  area_to: number;
  finish: 'whitebox'|'черновая'|'с отделкой';
  price_from: number; // ₽
  price_per_m2?: number; // ₽
  floor_markup?: number; // ₽ per floor
  images: string[];
};

export type Lot = {
  id: string;
  number: string; // шаблонный номер
  section: string;
  floor: number;
  type_id: string; // relation to ProjectType
  area: number;
  price: number;
  status: 'available'|'reserved'|'sold';
};

const KEY = 'ai2b_dev_projects_v1';

function now() { return new Date().toISOString(); }

function loadAll(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveAll(items: Project[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listProjects(): Project[] { return loadAll(); }

export function getProject(id: string): Project | undefined {
  return loadAll().find(p => p.id === id);
}

export function createProject(p: Omit<Project,'id'|'created_at'|'types'|'lots'|'media'> & { media?: string[] }): Project {
  const items = loadAll();
  const id = cryptoRandomId();
  const proj: Project = { ...p, id, created_at: now(), types: [], lots: [], media: p.media ?? [] } as Project;
  items.push(proj);
  saveAll(items);
  return proj;
}

export function updateProject(id: string, patch: Partial<Project>): Project | undefined {
  const items = loadAll();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  items[idx] = { ...items[idx], ...patch };
  saveAll(items);
  return items[idx];
}

export function addType(id: string, t: Omit<ProjectType,'id'>): ProjectType | undefined {
  const items = loadAll();
  const proj = items.find(p => p.id === id);
  if (!proj) return undefined;
  const type: ProjectType = { ...t, id: cryptoRandomId() };
  proj.types.push(type);
  saveAll(items);
  return type;
}

export function generateLots(id: string, options: {
  floor_from: number; floor_to: number;
  sections: string[];
  type_id: string;
  per_floor: number; // number of lots per floor
  number_template?: string; // ${floor}${index2}
  price_from: number; floor_markup?: number; // price_from + (floor-1)*floor_markup
  area: number;
}): Lot[] | undefined {
  const items = loadAll();
  const proj = items.find(p => p.id === id);
  if (!proj) return undefined;
  const created: Lot[] = [];
  const tpl = options.number_template || '${floor}${index2}';
  for (let f = options.floor_from; f <= options.floor_to; f++) {
    for (let s of options.sections) {
      for (let k = 1; k <= options.per_floor; k++) {
        const index2 = String(k).padStart(2, '0');
        const number = tpl.replace('${floor}', String(f)).replace('${index2}', index2).replace('${section}', s);
        const price = options.price_from + (f - 1) * (options.floor_markup || 0);
        created.push({ id: cryptoRandomId(), number, section: s, floor: f, type_id: options.type_id, area: options.area, price, status: 'available' });
      }
    }
  }
  proj.lots.push(...created);
  saveAll(items);
  return created;
}

export function removeProject(id: string) {
  const items = loadAll().filter(p => p.id !== id);
  saveAll(items);
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

