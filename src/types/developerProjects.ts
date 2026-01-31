export type DeveloperProjectStage = 'pre-sales' | 'construction' | 'commissioned' | 'unknown' | string

export type DeveloperProject = {
  id: string
  name: string
  city: string
  district?: string | null
  builder_name?: string | null
  stage?: DeveloperProjectStage | null
  quarter?: 1|2|3|4 | null
  year?: number | null
  sections?: string | null
  description?: string | null
  media?: string[] | null
  created_at?: string
  updated_at?: string | null
}

export type DeveloperProjectCreatePayload = {
  name: string
  city: string
  district?: string
  builder_name?: string
  stage?: DeveloperProjectStage
  quarter?: 1|2|3|4
  year?: number
  sections?: string
  description?: string
  media?: string[]
}

export type DeveloperProjectUpdatePayload = Partial<DeveloperProjectCreatePayload>
