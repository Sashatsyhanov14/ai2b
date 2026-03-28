import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json()
  const sb = getServerClient()
  const { data, error } = await sb.from('faq').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const sb = getServerClient()
  const { error } = await sb.from('faq').delete().eq('id', params.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
