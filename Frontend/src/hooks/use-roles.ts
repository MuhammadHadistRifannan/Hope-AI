import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/integrations/supabase/types";

// Peran pengguna yang sedang login. Penegakan sesungguhnya ada di RLS database;
// hook ini hanya untuk menentukan apa yang ditampilkan.
export function useRoles() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) console.error("Gagal memuat peran:", error);
      setRoles((data ?? []).map((row) => row.role));
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    roles,
    isLoading,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("teacher"),
  };
}
