import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use @supabase/supabase-js directly — @supabase/ssr is not installed
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
