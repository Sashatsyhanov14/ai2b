import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

type Params = { params: { unitId: string, photoId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const sb = getServerClient()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const patch: any = {}
  if (body.sort_order != null) patch.sort_order = Number(body.sort_order)
  if (body.is_main != null) patch.is_main = !!body.is_main
  // If setting is_main true, unset others first
  if (patch.is_main === true) {
    await sb.from('unit_photos').update({ is_main: false }).eq('unit_id', params.unitId)
  }
  const { data, error } = await sb.from('unit_photos').update(patch).eq('id', params.photoId).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { error } = await sb.from('unit_photos').delete().eq('id', params.photoId)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

