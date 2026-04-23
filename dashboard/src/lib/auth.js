import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REDIRECT_URI = import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/dashboard` : window.location.origin + '/dashboard';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function confirmSignUp(email, code) {
  // Supabase uses magic links or OTPs for confirmation, 
  // but if you are using standard email confirmation links, it's handeld automatically via redirect.
  // For standard OTP verification:
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Redirects the browser directly to the Supabase OAuth provider
export async function signInWithSSO(provider) {
  // provider is typically 'google' or 'github' (lowercase for Supabase)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider.toLowerCase(),
    options: {
      redirectTo: REDIRECT_URI,
    }
  });
  if (error) throw error;
}
