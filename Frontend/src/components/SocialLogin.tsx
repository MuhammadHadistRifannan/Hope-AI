import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROVIDER_NAME, isInAppBrowser, parseProviders, type SocialProvider } from "@/lib/socialAuth";

// Google sudah aktif di Supabase, jadi menjadi bawaan bila VITE_AUTH_PROVIDERS tidak diisi.
// Isi variabel itu untuk menambah penyedia lain, atau isi kosong ("") untuk menyembunyikan semua tombol.
const PROVIDERS = parseProviders(import.meta.env.VITE_AUTH_PROVIDERS ?? "google");

function ProviderLogo({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  if (provider === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
        <path fill="#fff" d="M16.67 15.56l.53-3.5h-3.33V9.81c0-.96.47-1.89 1.96-1.89h1.5V4.95s-1.37-.24-2.68-.24c-2.74 0-4.54 1.68-4.54 4.7v2.66H7.08v3.49h3.04V24a12.3 12.3 0 003.75 0v-8.44h2.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M16.37 12.73c.03 3.04 2.67 4.05 2.7 4.06-.02.07-.42 1.44-1.39 2.86-.84 1.22-1.71 2.44-3.08 2.47-1.35.02-1.78-.8-3.32-.8-1.54 0-2.02.78-3.3.83-1.32.05-2.33-1.32-3.18-2.54-1.73-2.5-3.05-7.05-1.28-10.13.88-1.53 2.45-2.5 4.16-2.52 1.3-.03 2.52.87 3.32.87.79 0 2.28-1.08 3.84-.92.65.03 2.49.27 3.67 1.99-.1.06-2.19 1.28-2.17 3.82zM13.85 4.3c.7-.85 1.17-2.03 1.04-3.2-1.01.04-2.23.67-2.95 1.52-.65.75-1.22 1.95-1.07 3.1 1.13.09 2.28-.57 2.98-1.42z" />
    </svg>
  );
}

// Tombol "Lanjutkan dengan …" di halaman masuk dan daftar. Setelah login, Supabase
// mengembalikan pengguna ke /auth?next=…, lalu aplikasi meneruskannya ke halaman tujuan.
export default function SocialLogin({ next }: { next: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const inApp = typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent);

  if (PROVIDERS.length === 0) return null;

  const signIn = async (provider: SocialProvider) => {
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}` },
    });
    // Bila berhasil, browser langsung berpindah ke halaman penyedia
    if (error) {
      setBusy(null);
      toast({
        title: `Gagal masuk dengan ${PROVIDER_NAME[provider]}`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Tautan disalin", description: "Tempel di Chrome atau Safari, lalu masuk dari sana." });
    } catch {
      toast({ title: "Salin tautan secara manual", description: window.location.href });
    }
  };

  return (
    <div className="space-y-3">
      {inApp && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="note">
          <p>
            Kamu membuka Hope.Ai dari dalam aplikasi (misalnya Instagram). Login dengan Google tidak bisa di sini. Buka
            halaman ini di <strong>Chrome</strong> atau <strong>Safari</strong>, atau daftar dengan email di bawah.
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Copy className="h-4 w-4" aria-hidden="true" /> Salin tautan halaman ini
          </button>
        </div>
      )}

      {PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => signIn(provider)}
          disabled={busy !== null}
          className={`flex h-12 w-full items-center justify-center gap-3 rounded-xl border text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 ${
            provider === "apple"
              ? "border-black bg-black text-white hover:bg-black/85 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          {busy === provider ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ProviderLogo provider={provider} />}
          Lanjutkan dengan {PROVIDER_NAME[provider]}
        </button>
      ))}

      <div className="flex items-center gap-3 py-1 text-sm text-slate-500 dark:text-slate-400" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        atau pakai email
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
