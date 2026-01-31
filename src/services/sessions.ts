import { getServerClient } from '@/lib/supabaseClient';
import type { Message, Session } from '@/types/db';

export async function findOrCreateSession(bot_id: string, external_user_id: string): Promise<Session> {
  const sb = getServerClient();
  const { data: found } = await sb
    .from('sessions')
    .select('*')
    .eq('bot_id', bot_id)
    .eq('external_user_id', external_user_id)
    .single();
  if (found) return found as any as Session;
  const { data, error } = await sb
    .from('sessions')
    .insert({ bot_id, external_user_id })
    .select('*')
    .single();
  if (error) throw error;
  return data as any as Session;
}

export async function appendMessage(input: { session_id: string; bot_id: string; role: string; content?: string | null; payload?: any; }): Promise<Message> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('messages')
    .insert({
      session_id: input.session_id,
      bot_id: input.bot_id,
      role: input.role,
      content: input.content ?? null,
      payload: input.payload ?? {},
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as any as Message;
}

export async function listMessages(session_id: string, limit = 50): Promise<Message[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as any) as Message[];
}

