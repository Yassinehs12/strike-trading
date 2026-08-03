import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// A handful of lib/ files are imported transitively through modules that
// construct the Supabase client at import time (constants.js -> supabaseClient.js).
// These placeholder values let that client construct without error in tests;
// no test in this project actually talks to Supabase.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    env: {
      VITE_SUPABASE_URL: "https://placeholder.supabase.co",
      VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
    },
  },
});
