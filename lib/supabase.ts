import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-url.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.warn('Supabase env vars missing, using placeholder credentials for build.');
}

const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const user = auth?.currentUser;
  const headers = new Headers(options.headers);

  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('x-firebase-uid', user.uid);
    } catch (e) {
      console.error('Failed to get Firebase token', e);
    }
  }

  return fetch(url, { ...options, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});
