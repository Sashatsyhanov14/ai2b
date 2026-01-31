export type UnitStatus = 'available' | 'reserved' | 'sold' | string

// Canonical Unit type matching public.units as closely as possible.
export type Unit = {
  id: string
  type?: string | null
  city: string
  address: string
  rooms?: number | null
  floor?: number | null
  floors_total?: number | null
  area?: number | null
  price?: number | null
  status?: UnitStatus | null
  project_id?: string | null
  is_rent?: boolean | null
  description?: string | null
  created_at?: string
  updated_at?: string | null

  // Computed fields
  photos_count?: number
  main_photo_url?: string | null
  project_name?: string | null
}

// Payload accepted by API when creating a unit (maps UI form -> DB columns)
export type UnitCreatePayload = {
  city: string
  address: string
  // UI may pass 'studio'|'4+' etc.; API will map to number
  rooms?: number | string
  floor?: number
  floors_total?: number
  area?: number
  price?: number
  status?: UnitStatus
  project_id?: string | null
  is_rent?: boolean
  description?: string
  type?: string
}

// Partial updates; same mapping rules as create
export type UnitUpdatePayload = Partial<UnitCreatePayload>
