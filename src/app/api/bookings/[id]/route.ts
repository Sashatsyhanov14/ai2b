import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { BookingUpdatePayload } from '@/types/bookings'

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('bookings')
    .select('id,unit_id,start_utc,end_utc,status,guest_name,guest_phone,notes,created_at')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: Request, { params }: Params) {
  let payload: BookingUpdatePayload
  try { payload = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const row: any = {}
  if (payload.start_utc) row.start_utc = String(payload.start_utc)
  if (payload.end_utc) row.end_utc = String(payload.end_utc)
  if (payload.start_date && !row.start_utc) row.start_utc = new Date(payload.start_date + 'T00:00:00Z').toISOString()
  if (payload.end_date && !row.end_utc) row.end_utc = new Date(new Date(payload.end_date + 'T00:00:00Z').getTime() + 86400000).toISOString()
  if (payload.status) row.status = String(payload.status)
  if (payload.guest_name != null) row.guest_name = payload.guest_name ? String(payload.guest_name) : null
  if (payload.guest_phone != null) row.guest_phone = payload.guest_phone ? String(payload.guest_phone) : null
  if (payload.notes != null) row.notes = payload.notes ? String(payload.notes) : null

  if (row.start_utc && row.end_utc && new Date(row.end_utc) <= new Date(row.start_utc))
    return NextResponse.json({ ok: false, error: 'end must be after start' }, { status: 400 })

  const sb = getServerClient()
  // Also fill date fields if present
  if (row.start_utc && !row.start_date) row.start_date = row.start_utc.slice(0,10)
  if (row.end_utc && !row.end_date) row.end_date = row.end_utc.slice(0,10)
  const { data, error } = await sb.from('bookings').update(row).eq('id', params.id).select('id').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { error } = await sb.from('bookings').delete().eq('id', params.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
