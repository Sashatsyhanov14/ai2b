import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { Unit, UnitUpdatePayload } from '@/types/units'
import { normalizeCity } from '@/lib/cityNormalizer'
import { runUnitTranslationAgent } from '@/services/bot/ai/agents'

function mapIncomingToDb(payload: any, baseEn: any, i18nData: any): Partial<Unit> {
  const out: Partial<Unit> = {}

  if (baseEn.title != null) out.title = String(baseEn.title)
  else if (payload.title != null) out.title = String(payload.title)

  if (baseEn.city != null) out.city = normalizeCity(String(baseEn.city))
  else if (payload.city != null) out.city = normalizeCity(String(payload.city))

  if (baseEn.address != null) out.address = String(baseEn.address)
  else if (payload.address != null) out.address = String(payload.address)

  if (baseEn.district != null) out.district = String(baseEn.district)
  else if (payload.district != null) out.district = String(payload.district)

  if (baseEn.description != null) out.description = String(baseEn.description)
  else if (payload.description != null) out.description = String(payload.description)

  if (i18nData != null) out.i18n = i18nData

  if (payload.rooms != null) {
    if (typeof payload.rooms === 'string') {
      const s = payload.rooms.toLowerCase()
      if (s === 'studio' || s === 'студия') out.rooms = 0
      else if (s === '4+' || s === '4plus') out.rooms = 4
      else out.rooms = Number(payload.rooms)
    } else out.rooms = Number(payload.rooms)
  }
  if (payload.floor != null) out.floor = Number(payload.floor)
  if (payload.floors_total != null) out.floors_total = Number(payload.floors_total)
  if (payload.total_floors != null) out.floors_total = Number(payload.total_floors)
  if (payload.area_m2 != null) out.area_m2 = Number(payload.area_m2)
  if (payload.area != null) out.area_m2 = Number(payload.area)
  if (payload.price_total != null) out.price = Number(payload.price_total)
  if (payload.price != null) out.price = Number(payload.price)
  if (payload.status != null) out.status = String(payload.status)
  if (payload.ai_instructions != null) (out as any).ai_instructions = String(payload.ai_instructions)
  if (payload.features != null) out.features = payload.features
  
  if (payload.photos != null) out.photos = payload.photos
  if (payload.transactions != null) out.transactions = payload.transactions

  return out
}


type Params = { params: { unitId: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { data, error } = await sb.from('units').select('*').eq('id', params.unitId).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  const row = data as Unit
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

  // Process translation using AI if textual fields are being updated
  let baseEn = {};
  let i18nData = null;
  if (payload.title || payload.city || payload.district || payload.address || payload.description) {
    console.log(`[API Units ${params.unitId}] Running Unit Translation Agent for update...`);
    const categoryName = payload.category || 'property';
    const translationResult = await runUnitTranslationAgent({
      title: payload.title || (payload.city ? `${categoryName} in ${payload.city}` : undefined),
      city: payload.city,
      district: payload.district,
      address: payload.address,
      description: payload.description,
    });
    baseEn = translationResult?.base_en || {};
    i18nData = translationResult?.i18n || { ru: {}, tr: {} };
  }

  const patch = mapIncomingToDb(payload, baseEn, i18nData)

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
