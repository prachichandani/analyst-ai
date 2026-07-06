import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase service role environment variables');
}

// Server-only client — bypasses RLS and Storage policies.
// Never import this in a client component or expose it to the browser.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);