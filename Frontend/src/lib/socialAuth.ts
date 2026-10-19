// Masuk dengan akun Google, Facebook, atau Apple lewat Supabase Auth.
// Penyedia yang tampil diatur dengan VITE_AUTH_PROVIDERS (misalnya
// "google,facebook,apple"); tanpa variabel itu yang tampil hanya Google, yang
// sudah diaktifkan di dasbor Supabase. Penyedia lain baru ditambahkan setelah
// benar-benar diaktifkan di sana.

export type SocialProvider = "google" | "facebook" | "apple";

export const SOCIAL_PROVIDERS: SocialProvider[] = ["google", "facebook", "apple"];

export const PROVIDER_NAME: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

export const parseProviders = (value: string | undefined): SocialProvider[] => {
  const wanted = new Set((value ?? "").split(",").map((item) => item.trim().toLowerCase()));
  return SOCIAL_PROVIDERS.filter((provider) => wanted.has(provider));
};

// Browser bawaan aplikasi (Instagram, Facebook, TikTok, LINE). Google menolak login
// di browser seperti ini, dan login lain sering kehilangan sesi saat kembali.
export const isInAppBrowser = (userAgent: string) => /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\//i.test(userAgent);
