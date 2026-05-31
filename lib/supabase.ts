import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-url.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.warn('Supabase env vars missing, using placeholder credentials for build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
