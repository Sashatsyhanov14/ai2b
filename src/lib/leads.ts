import { getServerClient } from '@/lib/supabaseClient'

export type BotLeadPayload = {
  name?: string
  phone?: string
  email?: string
  source?: 'telegram_bot'|'whatsapp'|'landing'|'manual'|string
  notes?: string
  meta?: Record<string, any>
  status?: 'new'|'in_work'|'done'|'spam'|string
}

export async function createLeadFromBot(payload: BotLeadPayload){
  const sb = getServerClient()
  const row = {
    name: payload.name ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    source: payload.source ?? 'telegram_bot',
    status: payload.status ?? 'new',
    notes: payload.notes ?? null,
    meta: payload.meta ?? null,
  }
  const { data, error } = await sb.from('leads').insert(row).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

