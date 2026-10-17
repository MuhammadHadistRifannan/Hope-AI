import { useState, useEffect } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import AuthShell, { AuthField, authFieldButton, authLink, authSubmit } from "@/components/AuthShell";
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
    },
    masuk: {
      title: "Selamat Datang Kembali!",
      description: "Masuk untuk melanjutkan progres belajar Anda",
      submit: "Masuk Sekarang",
      ask: "Belum punya akun?",
      other: "Buat Akun Gratis",
    },
    daftar: {
      title: "Buat Akun Baru",
      description: "Lengkapi data diri untuk mulai belajar",
      submit: "Daftar Akun",
      ask: "Sudah punya akun?",
      other: "Masuk ke Akun Saya",
    },
  }[mode];

  return (
    <AuthShell title={copy.title} description={copy.description}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "daftar" && (
          <AuthField
            id="fullName"
            label="Nama Lengkap"
            icon={User}
            type="text"
            autoComplete="name"
            placeholder="Contoh: Budi Santoso"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        )}

        <AuthField
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
            <AuthField
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
                  className={authFieldButton}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              }
            />
            {mode === "masuk" && (
              <div className="text-right">
                <button type="button" onClick={() => setIsForgot(true)} className={`${authLink} text-sm`}>
                  Lupa password?
                </button>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className={authSubmit}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Memproses…
            </>
          ) : (
            <>
              {copy.submit} <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </>
          )}
        </button>

        {mode === "daftar" && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link to="/ketentuan" className="font-medium text-primary underline underline-offset-4">
              Ketentuan Penggunaan
            </Link>{" "}
            dan{" "}
            <Link to="/privasi" className="font-medium text-primary underline underline-offset-4">
              Kebijakan Privasi
            </Link>
            .
          </p>
        )}
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-500 dark:text-slate-400">{copy.ask}</p>
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
