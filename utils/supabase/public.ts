import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cookie-less anon client for public reads (published content only).
 * Unlike the server client it doesn't read cookies, so pages using it can be
 * statically cached (ISR) instead of rendering on every request.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
