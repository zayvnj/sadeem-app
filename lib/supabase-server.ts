import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-url.supabase.co' || supabaseServiceRoleKey === 'placeholder-key') {
  console.warn('Supabase service role env vars missing, using placeholder credentials for build.');
}

// Ensure this client is only used on the server side
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
