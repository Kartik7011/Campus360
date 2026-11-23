import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Local sample data is an explicit development-only choice. Production always requires Supabase.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
