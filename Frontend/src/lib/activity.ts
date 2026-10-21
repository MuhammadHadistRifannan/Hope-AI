import { supabase } from "@/integrations/supabase/client";

// Tanggal lokal format YYYY-MM-DD, untuk menghitung streak harian
export const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
};

// Tambah XP dan perbarui streak harian di profil. Dipakai Pathly (kuis, permainan)
// dan Flexa (Jelaskan dengan suaramu). Mengembalikan nilai baru, atau null bila gagal.
export const recordActivity = async (userId: string, xpGain: number) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, streak, last_active_date")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const today = localDate();
  const streak =
    profile.last_active_date === today
      ? Math.max(profile.streak, 1)
      : profile.last_active_date === localDate(-1)
      ? profile.streak + 1
      : 1;
  const xp = profile.xp + xpGain;

  const { error } = await supabase
    .from("profiles")
    .update({ xp, streak, last_active_date: today })
    .eq("id", userId);
  if (error) {
    console.error("Gagal menyimpan XP:", error);
    return null;
  }
  return { xp, streak };
};
