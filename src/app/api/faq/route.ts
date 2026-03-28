import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

export async function GET() {
  const sb = getServerClient()
  const { data, error } = await sb.from('faq').select('*').order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const sb = getServerClient()
  const { data, error } = await sb.from('faq').insert(body).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}
