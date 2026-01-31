import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { DeveloperProject, DeveloperProjectUpdatePayload } from '@/types/developerProjects'

function mapIncoming(payload: any): Partial<DeveloperProject> {
  const out: Partial<DeveloperProject> = {}
  if (payload.name != null) out.name = String(payload.name)
  if (payload.city != null) out.city = String(payload.city)
  if (payload.district != null) out.district = payload.district ? String(payload.district) : null
  if (payload.builder_name != null) out.builder_name = payload.builder_name ? String(payload.builder_name) : null
  if (payload.stage != null) out.stage = String(payload.stage)
  if (payload.quarter != null) out.quarter = Number(payload.quarter) as any
  if (payload.year != null) out.year = Number(payload.year)
  if (payload.description != null) out.description = payload.description ? String(payload.description) : null
  if (payload.media != null) out.media = Array.isArray(payload.media) ? payload.media.map(String) : null
  return out
}

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { data, error } = await sb.from('developer_projects').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: Request, { params }: Params) {
  let payload: DeveloperProjectUpdatePayload
  try { payload = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const sb = getServerClient()
  const patch = mapIncoming(payload)
  const { data, error } = await sb.from('developer_projects').update(patch).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const now = new Date().toISOString()
  const soft = await sb.from('developer_projects').update({ deleted_at: now } as any).eq('id', params.id)
  if (!soft.error) return NextResponse.json({ ok: true, soft: true })
  const hard = await sb.from('developer_projects').delete().eq('id', params.id)
  if (hard.error) return NextResponse.json({ ok: false, error: hard.error.message }, { status: 400 })
  return NextResponse.json({ ok: true, soft: false })
}

