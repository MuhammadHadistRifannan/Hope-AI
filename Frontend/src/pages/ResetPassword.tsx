import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MIN_LENGTH = 6;

// Halaman tujuan tautan "atur ulang password" dari email. Supabase sudah
// memasukkan pengguna lewat tautan itu, jadi di sini tinggal mengisi password baru.
export default function ResetPassword({ hasSession }: { hasSession: boolean }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setMessage(`Password minimal ${MIN_LENGTH} karakter.`);
      return;
    }
    if (password !== confirm) {
      setMessage("Kedua password belum sama.");
      return;
    }

    setMessage("");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    toast({ title: "Password berhasil diganti", description: "Anda sudah masuk dengan password baru." });
    navigate("/", { replace: true });
  };

  const inputClass =
    "pl-12 pr-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl";

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100 dark:border-slate-800">
        {!hasSession ? (
          <div className="text-center" role="alert">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Tautan tidak berlaku</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Tautan atur ulang password ini sudah kedaluwarsa atau sudah pernah dipakai. Minta tautan
              baru dari halaman masuk.
            </p>
            <Button asChild className="w-full h-12 rounded-xl">
              <Link to="/auth">Ke Halaman Masuk</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Buat Password Baru</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Isi password baru untuk akun Anda, minimal {MIN_LENGTH} karakter.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300">Password baru</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300">Ulangi password baru</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={inputClass}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              <p className="min-h-[1.5rem] text-sm font-medium text-red-600" role="alert">
                {message}
              </p>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" aria-label="Menyimpan" /> : "Simpan Password"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
