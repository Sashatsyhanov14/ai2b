export type UnitStatus = 'available' | 'reserved' | 'sold' | string

// Canonical Unit type matching public.units as closely as possible.
export type Unit = {
  id: string
  category: 'sale' | 'rent' | 'commercial' | 'land'
  title?: string | null
  city: string
  district?: string | null
  address: string
  rooms?: number | null
  floor?: number | null
  floors_total?: number | null
  area_m2?: number | null
  price?: number | null
  
  // Rental specific
  price_per_day?: number | null
  price_per_month?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  max_guests?: number | null
  
  status?: UnitStatus | null
  description?: string | null
  created_at?: string
  updated_at?: string | null
  features?: string[] | null
  photos?: string[] | null
  is_active?: boolean
  i18n?: Record<string, any>
}

export type UnitCreatePayload = {
  category: 'sale' | 'rent' | 'commercial' | 'land'
  title?: string
  city: string
  district?: string
  address: string
  rooms?: number | string
  floor?: number
  floors_total?: number
  area_m2?: number
  price?: number
  price_per_day?: number
  price_per_month?: number
  bedrooms?: number
  bathrooms?: number
  max_guests?: number
  description?: string
  features?: string[]
  photos?: string[]
  i18n?: Record<string, any>
}

// Partial updates; same mapping rules as create
export type UnitUpdatePayload = Partial<UnitCreatePayload>
