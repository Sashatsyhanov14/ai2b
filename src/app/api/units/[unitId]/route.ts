import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { Unit, UnitUpdatePayload } from '@/types/units'

function mapIncomingToDb(payload: any): Partial<Unit> {
  const out: Partial<Unit> = {}
  if (payload.city != null) out.city = String(payload.city)
  if (payload.address != null) out.address = String(payload.address)
  if (payload.rooms != null) {
    if (typeof payload.rooms === 'string') {
      const s = payload.rooms.toLowerCase()
      if (s === 'studio') out.rooms = 0
      else if (s === '4+' || s === '4plus') out.rooms = 4
      else out.rooms = Number(payload.rooms)
    } else out.rooms = Number(payload.rooms)
  }
  if (payload.floor != null) out.floor = Number(payload.floor)
  if (payload.floors_total != null) out.floors_total = Number(payload.floors_total)
  if (payload.total_floors != null) out.floors_total = Number(payload.total_floors)
  if (payload.area_m2 != null) out.area = Number(payload.area_m2)
  if (payload.area != null) out.area = Number(payload.area)
  if (payload.price_total != null) out.price = Number(payload.price_total)
  if (payload.price != null) out.price = Number(payload.price)
  if (payload.status != null) out.status = String(payload.status)
  if (payload.project_id != null) out.project_id = payload.project_id ? String(payload.project_id) : null
  // is_rent removed
  if (payload.description != null) out.description = String(payload.description)
  if (payload.type != null) out.type = String(payload.type)
  return out
}

async function enrich(u: Unit, sb: ReturnType<typeof getServerClient>) {
  try {
    const { data: photos } = await sb
      .from('unit_photos')
      .select('unit_id,url,position,created_at')
      .eq('unit_id', u.id)
      .order('position', { ascending: true })
    if (photos && photos.length) {
      u.photos_count = photos.length
      u.main_photo_url = (photos as any[])[0]?.url ?? null
    }
  } catch { }

  try {
    if (u.project_id) {
      const { data } = await sb.from('developer_projects').select('name').eq('id', u.project_id).single()
      if (data) u.project_name = (data as any).name
    }
  } catch { }
  return u
}

type Params = { params: { unitId: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { data, error } = await sb.from('units').select('*').eq('id', params.unitId).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  const row = await enrich(data as Unit, sb)
  return NextResponse.json({ ok: true, data: row })
}

export async function PATCH(req: Request, { params }: Params) {
  let payload: UnitUpdatePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const sb = getServerClient()
  const patch = mapIncomingToDb(payload)
  const { data, error } = await sb.from('units').update(patch).eq('id', params.unitId).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  // Try soft delete first
  const now = new Date().toISOString()
  const soft = await sb.from('units').update({ deleted_at: now } as any).eq('id', params.unitId)
  if (!soft.error) return NextResponse.json({ ok: true, soft: true })
  // Fallback to real delete (column may not exist)
  const hard = await sb.from('units').delete().eq('id', params.unitId)
  if (hard.error) return NextResponse.json({ ok: false, error: hard.error.message }, { status: 400 })
  return NextResponse.json({ ok: true, soft: false })
}
