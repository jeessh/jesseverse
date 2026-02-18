import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a Supabase client for use in the browser.
 * Use this in Client Components.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a basic Supabase client.
 * For server-side usage, consider using createServerComponentClient from @supabase/ssr
 */
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Export a singleton for simple use cases
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signInWithPhone(phone: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
  });
  return { data, error };
}

export async function verifyOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}
