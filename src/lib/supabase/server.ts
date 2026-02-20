// Phase 1 stub — Supabase server client added in Phase 2
export const createSupabaseServerClient = () => ({
  auth: { getSession: async () => ({ data: { session: null }, error: null }) },
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
})
export const createClient = createSupabaseServerClient
