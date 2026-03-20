import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function createSupabaseServerClient() {
  return createSupabaseClient(url, serviceKey)
}

// Alias used across legacy imports
export const createClient = createSupabaseServerClient
