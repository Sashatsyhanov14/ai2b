import { z } from 'zod';

export const apartmentSchema = z.object({
  city: z.string().min(2),
  address: z.string().min(3),
  rooms: z.number().int().min(1).max(6),
  floor: z.number().int().optional(),
  floors_total: z.number().int().optional(),
  area_total: z.number().positive(),
  area_living: z.number().positive().optional(),
  area_kitchen: z.number().positive().optional(),
  price: z.number().positive(),
  status: z.enum(['active','reserved','sold']).default('active'),
  description: z.string().max(4000).optional(),
  repair_type: z.string().optional(),
  furniture: z.boolean().optional(),
  balcony: z.boolean().optional(),
  ceiling_height: z.number().positive().optional(),
});

export const projectUnitSchema = z.object({
  unit_name: z.string().min(1),
  area_from: z.number().positive().optional(),
  area_to: z.number().positive().optional(),
  price_from: z.number().positive().optional(),
  floor_range: z.string().optional(),
  notes: z.string().optional(),
});

export const projectSchema = z.object({
  project_name: z.string().min(2),
  developer_name: z.string().min(2),
  city: z.string().min(2),
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  handover_year: z.number().int().min(2020).max(2100),
  stage: z.enum(['pre-sales','construction','commissioned','unknown']).default('pre-sales'),
  sections: z.string().optional(),
  units: z.array(projectUnitSchema).optional(),
});

