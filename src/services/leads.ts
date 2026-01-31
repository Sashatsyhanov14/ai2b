import { getServerClient } from '@/lib/supabaseClient';
import type { Lead } from '@/types/db';

export async function listLeads(): Promise<Lead[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) as Lead[];
}

export async function createLead(input: Partial<Lead>): Promise<Lead> {
  const sb = getServerClient();
  const payload: any = {
    source_bot_id: input.source_bot_id ?? null,
    name: input.name ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: input.source ?? null,
    data: input.data ?? {},
    status: input.status ?? 'new',
  };
  const { data, error } = await sb.from('leads').insert(payload).select('*').single();
  if (error) throw error;
  return data as any as Lead;
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  const sb = getServerClient();
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

