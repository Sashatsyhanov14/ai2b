import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { Booking, BookingCreatePayload } from '@/types/bookings'

function toISODateStart(d: string) { return new Date(d + 'T00:00:00Z').toISOString() }
function toISODateEnd(d: string) { return new Date(new Date(d + 'T00:00:00Z').getTime() + 24*60*60*1000).toISOString() }

function mapIncoming(payload: any) {
  const out: any = {}
  if (payload.unit_id) out.unit_id = String(payload.unit_id)
  const s = payload.start_utc || (payload.start_date ? toISODateStart(payload.start_date) : undefined)
  const e = payload.end_utc || (payload.end_date ? toISODateEnd(payload.end_date) : undefined)
  if (s) out.start_utc = s
  if (e) out.end_utc = e
  if (payload.status) out.status = String(payload.status)
  if (payload.guest_name != null) out.guest_name = payload.guest_name ? String(payload.guest_name) : null
  if (payload.guest_phone != null) out.guest_phone = payload.guest_phone ? String(payload.guest_phone) : null
  if (payload.notes != null) out.notes = payload.notes ? String(payload.notes) : null
  return out
}

export async function GET(req: Request) {
  const sb = getServerClient()
  const url = new URL(req.url)
  const from = url.searchParams.get('from') // ISO date (yyyy-mm-dd)
  const to = url.searchParams.get('to')
  const status = url.searchParams.get('status')
  const city = url.searchParams.get('city')
  const unitId = url.searchParams.get('unit_id')
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || '50')))

  // Select both possible column variants to be resilient (start_date/end_date or start_utc/end_utc)
  let sel = 'id, unit_id, start_date, end_date, start_utc, end_utc, status, guest_name, guest_phone, notes, created_at'
  let q = sb.from('bookings').select(sel, { count: 'exact' }).order('start_date', { ascending: true })

  if (from) q = q.gte('start_utc', toISODateStart(from))
  if (to) q = q.lte('end_utc', toISODateEnd(to))
  if (status) q = q.eq('status', status)
  if (unitId) q = q.eq('unit_id', unitId)

  // Filter by city via join
  if (city) {
    sel += ', units!inner(city)'
    q = sb.from('bookings').select(sel, { count: 'exact' })
      .order('start_date', { ascending: true })
      .eq('units.city', city)
  }

  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1
  q = q.range(rangeFrom, rangeTo)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  // Normalize dates to start_utc/end_utc ISO for UI compatibility
  const rows = (data || []).map((b: any) => {
    const start_iso = b.start_utc ?? (b.start_date ? new Date(b.start_date + 'T00:00:00Z').toISOString() : null)
    const end_iso = b.end_utc ?? (b.end_date ? new Date(new Date(b.end_date + 'T00:00:00Z').getTime() + 86400000).toISOString() : null)
    return { ...b, start_utc: start_iso, end_utc: end_iso }
  })
  return NextResponse.json({ ok: true, data: rows as Booking[], meta: { page, limit, total: count ?? 0 } })
}

export async function POST(req: Request) {
  let payload: BookingCreatePayload
  try { payload = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (!payload.unit_id) return NextResponse.json({ ok: false, error: 'unit_id is required' }, { status: 400 })
  const row = mapIncoming(payload)
  if (!row.start_utc || !row.end_utc) return NextResponse.json({ ok: false, error: 'start_date/start_utc and end_date/end_utc are required' }, { status: 400 })
  if (new Date(row.end_utc) <= new Date(row.start_utc)) return NextResponse.json({ ok: false, error: 'end must be after start' }, { status: 400 })

  const sb = getServerClient()
  // Try to store in date columns primarily, fallback to utc columns if present
  const toInsert: any = { unit_id: row.unit_id, status: row.status ?? 'new', guest_name: row.guest_name ?? null, guest_phone: row.guest_phone ?? null, notes: row.notes ?? null }
  if (row.start_utc) { toInsert.start_utc = row.start_utc; toInsert.start_date = row.start_utc.slice(0,10) }
  if (row.end_utc) { toInsert.end_utc = row.end_utc; toInsert.end_date = row.end_utc.slice(0,10) }
  const { data, error } = await sb.from('bookings').insert(toInsert).select('id').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}
