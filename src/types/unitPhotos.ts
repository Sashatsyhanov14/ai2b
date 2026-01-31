export type UnitPhoto = {
  id: string
  unit_id: string
  url: string
  is_main?: boolean | null
  sort_order?: number | null
  created_at?: string
}

export type UnitPhotoCreatePayload = {
  url: string
  is_main?: boolean
  sort_order?: number
}

export type UnitPhotoUpdatePayload = Partial<UnitPhotoCreatePayload>

