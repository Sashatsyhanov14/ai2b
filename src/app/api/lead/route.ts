import { NextResponse } from 'next/server'
export async function POST(req: Request){
  const body = await req.json().catch(()=>({}))
  console.log('lead:', body) // тут позже подключим Supabase insert
  return NextResponse.json({ ok: true })
}
