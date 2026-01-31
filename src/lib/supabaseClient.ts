import { createClient, SupabaseClient } from '@supabase/supabase-js'

const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const NEXT_PUBLIC_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!NEXT_PUBLIC_URL || !NEXT_PUBLIC_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(NEXT_PUBLIC_URL, NEXT_PUBLIC_ANON_KEY)

let serverClient: SupabaseClient | null = null

export function getServerClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getServerClient is server-only')
  }

  const serverUrl = process.env.SUPABASE_URL ?? NEXT_PUBLIC_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    NEXT_PUBLIC_ANON_KEY

  if (!serverUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE')
  }

  if (!serverClient) {
    serverClient = createClient(serverUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return serverClient
}
