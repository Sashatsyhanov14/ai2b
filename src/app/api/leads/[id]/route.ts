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

  // Handle snooze: if body.snooze = true, set snoozed_until to 24h from now
  if (body.snooze === true) {
    const now = new Date()
    const snoozeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24 hours
    patch.snoozed_until = snoozeUntil.toISOString()
  } else if (body.snooze === false) {
    // Unsnooze
    patch.snoozed_until = null
  }

  const sb = getServerClient()
  const { data, error } = await sb.from('leads').update(patch).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { error, count } = await sb.from('leads').delete({ count: 'exact' }).eq('id', params.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  if (count === 0) return NextResponse.json({ ok: false, error: 'Нет прав или запись не найдена. Проверьте RLS-политику (anon role) в Supabase.' }, { status: 403 })
  return NextResponse.json({ ok: true, deleted: true })
}

