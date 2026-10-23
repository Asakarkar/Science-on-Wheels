import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const supabaseUrl =
  env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nabygxqkdgsqywhhwtwn.supabase.co";

const supabaseAnonKey =
  env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ntRsPrcwTvIgbdPtlTI7pg_4BxA8E8s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
