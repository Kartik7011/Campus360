import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null when no .env.local is set up: the app then runs on sample data saved in the browser
export const supabase = url && anonKey ? createClient(url, anonKey) : null
