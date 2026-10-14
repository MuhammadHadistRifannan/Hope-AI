import { useState, useEffect } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import AuthShell, { PixelField, authLink } from "@/components/AuthShell";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { nextPath } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Cek apakah ada parameter ?mode=signup di URL
  const initialMode = searchParams.get("mode") === "signup";
  // Halaman yang dituju setelah masuk, misalnya dari tombol "Coba EyeRead" di landing page
  const next = nextPath(searchParams.get("next"));

  // Jika mode=signup, maka isLogin = false (artinya mode daftar)
  const [isLogin, setIsLogin] = useState(!initialMode);
  // Mode lupa password: hanya meminta email, lalu mengirim tautan atur ulang
  const [isForgot, setIsForgot] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Reset form jika mode berubah
  useEffect(() => {
    setIsLogin(!initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        // Pesannya sama baik email terdaftar maupun tidak, agar tidak membocorkan siapa yang punya akun
        toast({
          title: "Periksa email Anda",
          description: "Jika email itu terdaftar, tautan untuk mengatur ulang password sudah dikirim. Cek juga folder spam.",
        });
        setIsForgot(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Selamat datang kembali!",
          description: "Anda berhasil masuk.",
        });
        navigate(next);
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });

        if (error) throw error;

        toast({
          title: "Pendaftaran berhasil!",
          description: "Akun Anda telah dibuat. Silakan masuk.",
        });
        setIsLogin(true); // Pindah ke login setelah sukses daftar
      }
    } catch (error: any) {
      toast({
        title: "Terjadi kesalahan",
        description: /banned/i.test(error.message ?? "")
          ? "Akun ini sedang diblokir. Hubungi admin untuk membukanya."
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mode = isForgot ? "lupa" : isLogin ? "masuk" : "daftar";
  const copy = {
    lupa: {
      title: "Lupa Password?",
      description: "Masukkan email akunmu. Kami akan mengirim tautan untuk membuat password baru.",
      submit: "Kirim Tautan",
      ask: "Sudah ingat password?",
      other: "Kembali ke halaman masuk",
      greetings: ["Tenang, lupa itu biasa.", "Tautan barunya kukirim lewat email."],
    },
    masuk: {
      title: "Selamat Datang Kembali!",
      description: "Masuk untuk melanjutkan belajarmu.",
      submit: "Masuk Sekarang",
      ask: "Belum punya akun?",
      other: "Buat akun gratis",
      greetings: ["Hai lagi! Siap lanjut belajar?", "Pelajaranmu masih menunggu.", "Satu langkah lagi, yuk masuk!"],
    },
    daftar: {
      title: "Buat Akun Baru",
      description: "Lengkapi data diri untuk mulai belajar. Gratis.",
      submit: "Daftar Akun",
      ask: "Sudah punya akun?",
      other: "Masuk ke akun saya",
      greetings: ["Yuk gabung! Gratis, tanpa iklan.", "Cuma butuh satu menit.", "Belajar dengan caramu sendiri."],
    },
  }[mode];

  return (
    <AuthShell title={copy.title} description={copy.description} greetings={copy.greetings}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "daftar" && (
          <PixelField
            id="fullName"
            label="Nama lengkap"
            icon={User}
            type="text"
            autoComplete="name"
            placeholder="Contoh: Budi Santoso"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        )}

        <PixelField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="nama@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        {mode !== "lupa" && (
          <div>
            <PixelField
              id="password"
              label="Password"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "masuk" ? "current-password" : "new-password"}
              placeholder="Minimal 6 karakter"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  className="inline-flex h-11 w-11 items-center justify-center text-[#0a1a4f]/60 hover:text-[#0a1a4f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              }
            />
            {mode === "masuk" && (
              <div className="text-right">
                <button type="button" onClick={() => setIsForgot(true)} className={`${authLink} text-sm md:text-base`}>
                  Lupa password?
                </button>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="pixel-button pixel-button-green pixel-button-md pixel-text w-full gap-3 disabled:opacity-60">
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Memproses…
            </>
          ) : (
            <>
              {copy.submit} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>

        {mode === "daftar" && (
          <p className="text-sm leading-relaxed text-white/85 md:text-base">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link to="/ketentuan" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">
              Ketentuan Penggunaan
            </Link>{" "}
            dan{" "}
            <Link to="/privasi" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">
              Kebijakan Privasi
            </Link>
            .
          </p>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 border-t-4 border-dotted border-white/25 pt-3 text-base md:text-lg">
        <span className="text-white/85">{copy.ask}</span>
        <button
          type="button"
          onClick={() => {
            if (isForgot) {
              setIsForgot(false);
              setIsLogin(true);
            } else {
              setIsLogin(!isLogin);
            }
          }}
          className={authLink}
        >
          {copy.other}
        </button>
      </div>
    </AuthShell>
  );
}
