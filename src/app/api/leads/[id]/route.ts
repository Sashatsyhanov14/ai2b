import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const patch: any = {}
  if (body.status != null) patch.status = String(body.status)
  if (body.notes != null) patch.notes = body.notes ? String(body.notes) : null
  if (body.name != null) patch.name = body.name ? String(body.name) : null
  if (body.phone != null) patch.phone = body.phone ? String(body.phone) : null
  if (body.email != null) patch.email = body.email ? String(body.email) : null
  const sb = getServerClient()
  const { data, error } = await sb.from('leads').update(patch).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const now = new Date().toISOString()
  const soft = await sb.from('leads').update({ deleted_at: now } as any).eq('id', params.id)
  if (!soft.error) return NextResponse.json({ ok: true, soft: true })
  const hard = await sb.from('leads').delete().eq('id', params.id)
  if (hard.error) return NextResponse.json({ ok: false, error: hard.error.message }, { status: 400 })
  return NextResponse.json({ ok: true, soft: false })
}

