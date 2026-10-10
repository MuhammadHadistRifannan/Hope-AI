import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Cek apakah ada parameter ?mode=signup di URL
  const initialMode = searchParams.get("mode") === "signup";

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

  const penguinGif = "/gif/animasi-login.gif"; 

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
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
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

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600 via-blue-500 to-transparent -z-10 opacity-10" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        
        {/* Left Side - Animated Visual & Welcome Text */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col items-center justify-center text-center space-y-8"
        >
          {/* GIF Container with Glow Effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1, y: [0, -10, 0] }}
              transition={{ 
                scale: { duration: 0.5 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" } 
              }}
              className="relative z-10"
            >
              <img 
                src={penguinGif} 
                alt="" 
                className="w-80 h-80 object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>

          <div className="space-y-4 max-w-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-200 dark:border-white/10"
            >
              <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                AI untuk Pendidikan Inklusif
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              Belajar Jadi Lebih <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Menyenangkan</span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Belajar dengan cara yang paling cocok untukmu: lewat suara, teks, bahasa sederhana, atau isyarat, bersama Hope.Ai.
            </p>
          </div>
        </motion.div>

        {/* Right Side - Auth Form Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {/* Card Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-[2.5rem]" />
            
            <div className="relative z-10">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {isForgot ? "Lupa Password?" : isLogin ? "Selamat Datang Kembali!" : "Buat Akun Baru"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {isForgot
                    ? "Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru."
                    : isLogin
                    ? "Masuk untuk melanjutkan progres belajar Anda"
                    : "Lengkapi data diri untuk mulai belajar"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {!isLogin && !isForgot && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Contoh: Budi Santoso"
                          className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          required={!isLogin && !isForgot}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {!isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      className="pl-12 pr-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Lupa password?
                      </button>
                    </div>
                  )}
                </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isForgot ? "Kirim Tautan" : isLogin ? "Masuk Sekarang" : "Daftar Akun"}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-slate-500 dark:text-slate-400 mb-2">
                  {isForgot ? "Sudah ingat password?" : isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
                </p>
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
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all"
                >
                  {isForgot ? "Kembali ke Halaman Masuk" : isLogin ? "Buat Akun Gratis" : "Masuk ke Akun Saya"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}