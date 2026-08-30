import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — see README.md."
  );
}

// "Keep me signed in" support: this flag (itself always in localStorage,
// since it just needs to survive long enough to be read on the next auth
// call) decides whether the actual Supabase session token is written to
// localStorage (survives closing the browser) or sessionStorage (wiped
// when the tab/browser closes). Call setKeepSignedIn() from the login form
// before signing in.
const KEEP_SIGNED_IN_KEY = "strike_keep_signed_in";

export const setKeepSignedIn = (keep) => {
  try { localStorage.setItem(KEEP_SIGNED_IN_KEY, keep ? "true" : "false"); } catch {}
};

const getActiveStore = () => {
  let keep = true;
  try { keep = localStorage.getItem(KEEP_SIGNED_IN_KEY) !== "false"; } catch {}
  return keep ? window.localStorage : window.sessionStorage;
};

// Custom storage adapter for supabase-auth-js — same get/set/remove shape
// it expects, just backed by whichever store the user's preference points
// to instead of hardcoding localStorage.
const authStorage = {
  getItem: (key) => getActiveStore().getItem(key),
  setItem: (key, value) => getActiveStore().setItem(key, value),
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch {}
    try { window.sessionStorage.removeItem(key); } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true },
});

// Synchronous, best-effort check for "is there a saved session at all" —
// used purely to decide what to paint on the very first frame, before
// supabase.auth.getSession() has had a chance to resolve. supabase-js
// namespaces its storage key as `sb-<project-ref>-auth-token`, so rather
// than parse the project ref out of the URL we just look for anything
// matching that shape in either store. False positives/negatives here are
// harmless — the real getSession() call is still the source of truth and
// runs regardless; this only controls whether we show a spinner or jump
// straight to the logged-out landing page while we wait for it.
export const hasPersistedSession = () => {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && /^sb-.*-auth-token$/.test(key)) return true;
      }
    }
  } catch {}
  return false;
};
