import { createClient } from '@supabase/supabase-js';
import { currentAccessToken } from '../lib/accessToken';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to your .env file.'
  );
}

// Authentication is custom, so supabase-js gets the token from us rather than
// from its own auth client. Without it every request is anon and RLS denies it.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  // Signed out, or between refreshes, we fall back to the publishable key so
  // requests stay well-formed; RLS then sees anon and denies them.
  accessToken: async () => (await currentAccessToken()) ?? supabaseKey,
});
