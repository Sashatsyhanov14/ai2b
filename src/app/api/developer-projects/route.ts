import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'
import type { DeveloperProject, DeveloperProjectCreatePayload } from '@/types/developerProjects'

function mapIncoming(payload: any): Partial<DeveloperProject> {
  const out: Partial<DeveloperProject> = {}
  if (payload.name != null) out.name = String(payload.name)
  if (payload.city != null) out.city = String(payload.city)
  if (payload.district != null) out.district = payload.district ? String(payload.district) : null
  if (payload.builder_name != null) out.builder_name = payload.builder_name ? String(payload.builder_name) : null
  if (payload.stage != null) out.stage = String(payload.stage)
  if (payload.quarter != null) out.quarter = Number(payload.quarter) as any
  if (payload.year != null) out.year = Number(payload.year)
  if (payload.sections != null) out.sections = payload.sections ? String(payload.sections) : null
  if (payload.description != null) out.description = payload.description ? String(payload.description) : null
  if (payload.media != null) out.media = Array.isArray(payload.media) ? payload.media.map(String) : null
  return out
}

export async function GET(req: Request) {
  const sb = getServerClient()
  const url = new URL(req.url)
  const city = url.searchParams.get('city')
  const stage = url.searchParams.get('stage')

  let q = sb.from('developer_projects').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (city) q = q.eq('city', city)
  if (stage) q = q.eq('stage', stage)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data: data as DeveloperProject[] })
}

export async function POST(req: Request) {
  let payload: DeveloperProjectCreatePayload
  try { payload = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const row = mapIncoming(payload)
  if (!row.name || !row.city) return NextResponse.json({ ok: false, error: 'name and city are required' }, { status: 400 })
  const sb = getServerClient()
  const { data, error } = await sb.from('developer_projects').insert(row).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}
