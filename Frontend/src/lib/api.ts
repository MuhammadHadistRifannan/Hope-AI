import { supabase } from "@/integrations/supabase/client";

// Alamat backend HopeAI. Atur VITE_API_URL di .env untuk produksi.
export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5114"
).replace(/\/$/, "");

// Header untuk endpoint backend yang mewajibkan login
export const authHeaders = async (): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
};
