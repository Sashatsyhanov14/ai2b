export type Availability = 'available' | 'reserved' | 'sold';

export type SecondaryUnit = {
  id: string;
  city: string;
  address: string;
  rooms: 'studio'|'1'|'2'|'3'|'4+';
  floor: number;
  floors_total: number;
  area_m2: number;
  finish?: 'renovated'|'whitebox'|'shell';
  price_total: number;
  description?: string;
  photos: string[];
  status: Availability; // default 'available'
  created_at: string;   // ISO
};

