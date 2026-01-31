import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { UnitPhotoCreatePayload } from '@/types/unitPhotos'

type Params = { params: { unitId: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = getServerClient()
  // prefer unit_photos; if table missing, fallback to property_photos
  let { data, error } = await sb.from('unit_photos').select('*').eq('unit_id', params.unitId).order('sort_order', { ascending: true })
  if (error && /unit_photos/.test(error.message || '')) {
    const r = await sb.from('property_photos').select('id,url,position,created_at').eq('rental_unit_id', params.unitId).order('position',{ascending:true})
    data = (r.data || []).map((p:any)=>({ id:p.id, unit_id: params.unitId, url:p.url, is_main: null, sort_order: p.position, created_at: p.created_at }))
    error = r.error
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: Request, { params }: Params) {
  let body: UnitPhotoCreatePayload
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (!body?.url) return NextResponse.json({ ok: false, error: 'url is required' }, { status: 400 })
  const sb = getServerClient()
  // If marking as main, unset others first
  if (body.is_main) {
    await sb.from('unit_photos').update({ is_main: false }).eq('unit_id', params.unitId)
  }
  const { data, error } = await sb.from('unit_photos').insert({ unit_id: params.unitId, url: body.url, is_main: body.is_main ?? false, sort_order: body.sort_order ?? null }).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

