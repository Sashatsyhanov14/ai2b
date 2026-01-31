export type BookingStatus = 'new' | 'confirmed' | 'cancelled' | string

export type Booking = {
  id: string
  unit_id: string
  start_utc: string
  end_utc: string
  status: BookingStatus
  guest_name?: string | null
  guest_phone?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string | null
}

export type BookingCreatePayload = {
  unit_id: string
  start_date?: string
  end_date?: string
  start_utc?: string
  end_utc?: string
  status?: BookingStatus
  guest_name?: string
  guest_phone?: string
  notes?: string
}

export type BookingUpdatePayload = Partial<Omit<BookingCreatePayload, 'unit_id'>>

