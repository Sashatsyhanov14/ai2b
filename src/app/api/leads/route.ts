import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  const sb = getServerClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const source = url.searchParams.get('source') || undefined
  const from = url.searchParams.get('from') || undefined // YYYY-MM-DD
  const to = url.searchParams.get('to') || undefined
  const q = url.searchParams.get('q') || undefined // name/phone/email search
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '50')))

  let query = sb.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)
  if (from) query = query.gte('created_at', new Date(from + 'T00:00:00Z').toISOString())
  if (to) query = query.lte('created_at', new Date(new Date(to + 'T00:00:00Z').getTime() + 86400000).toISOString())
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)

  const fromIdx = (page - 1) * limit
  const toIdx = fromIdx + limit - 1
  query = query.range(fromIdx, toIdx)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data: data || [], meta: { page, limit, total: count ?? 0 } })
}

export async function POST(req: Request) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const row: any = {
    name: body.name ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    source: body.source ?? 'manual',
    status: body.status ?? 'new',
    notes: body.notes ?? null,
    meta: body.meta ?? null,
  }
  const sb = getServerClient()
  const { data, error } = await sb.from('leads').insert(row).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}
