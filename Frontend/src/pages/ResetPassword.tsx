import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { AuthField, authFieldButton, authSubmit } from "@/components/AuthShell";
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

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={showPassword}
      className={authFieldButton}
    >
      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </button>
  );

  if (!hasSession) {
    return (
      <AuthShell
        title="Tautan tidak berlaku"
        description="Tautan atur ulang password ini sudah kedaluwarsa atau sudah pernah dipakai. Minta tautan baru dari halaman masuk."
      >
        <Link to="/auth" className={`${authSubmit} mt-7`}>
          Ke halaman masuk <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Buat Password Baru"
      description={`Isi password baru untuk akunmu, minimal ${MIN_LENGTH} karakter.`}
    >
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <AuthField
          id="new-password"
          label="Password baru"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          trailing={toggle}
        />
        <AuthField
          id="confirm-password"
          label="Ulangi password baru"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <p className="min-h-[1.5rem] text-sm font-medium text-destructive" role="alert">
          {message}
        </p>

        <button type="submit" disabled={saving} className={authSubmit}>
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Menyimpan…
            </>
          ) : (
            "Simpan Password"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
