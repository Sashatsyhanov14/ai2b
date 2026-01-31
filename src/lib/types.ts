export type ApartmentInput = {
  city: string;
  address: string;
  rooms: number;
  floor?: number;
  floors_total?: number;
  area_total: number;
  area_living?: number;
  area_kitchen?: number;
  price: number;
  status?: 'active' | 'reserved' | 'sold';
  description?: string;
  photos?: File[];
  repair_type?: string;
  furniture?: boolean;
  balcony?: boolean;
  ceiling_height?: number;
};

export type ProjectUnit = {
  unit_name: string;
  area_from?: number;
  area_to?: number;
  price_from?: number;
  floor_range?: string;
  notes?: string;
};

export type ProjectInput = {
  project_name: string;
  developer_name: string;
  city: string;
  quarter: 1 | 2 | 3 | 4;
  handover_year: number;
  stage?: 'pre-sales' | 'construction' | 'commissioned' | 'unknown';
  sections?: string;
  renders?: File[];
  units?: ProjectUnit[];
};

