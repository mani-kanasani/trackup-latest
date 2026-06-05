import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig';

const config = getSupabaseConfig();

// When there is no config yet, App renders the Supabase setup screen and none of
// the auth/data providers mount, so this client is never dereferenced until the
// user has connected a project (after which the app reloads with a real client).
export const supabase: SupabaseClient = config
  ? createClient(config.url, config.anonKey)
  : (null as unknown as SupabaseClient);