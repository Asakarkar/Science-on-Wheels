import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nabygxqkdgsqywhhwtwn.supabase.co";

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ntRsPrcwTvIgbdPtlTI7pg_4BxA8E8s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
