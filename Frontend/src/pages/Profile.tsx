import { useState, useEffect, useCallback, ChangeEvent } from "react";
import {
  User,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Target,
  Camera,
  Save,
  X,
  Loader2,
  LogOut,
  UploadCloud,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// --- TIPE DATA ---
interface ProfileData {
  id?: string;
  full_name: string;
  avatar_url: string;
  email: string;
  created_at?: string;
}

// Angka belajar pengguna, dihitung dari kegiatannya sendiri di database
type Learning = {
  xp: number;
  streak: number;
  modulesTotal: number;
  modulesCompleted: number;
  quizCount: number;
  quizAveragePct: number | null;
  hasPerfectQuiz: boolean;
  documentQuizCount: number;
  scans: number;
  questions: number;
  forumActivity: number;
  modules: { id: number; title: string; pct: number; completed: boolean }[];
};

const emptyLearning: Learning = {
  xp: 0,
  streak: 0,
  modulesTotal: 0,
  modulesCompleted: 0,
  quizCount: 0,
  quizAveragePct: null,
  hasPerfectQuiz: false,
  documentQuizCount: 0,
  scans: 0,
  questions: 0,
  forumActivity: 0,
  modules: [],
};

// Lencana diberikan dari kegiatan nyata; `progress` memberi tahu seberapa dekat pengguna
const buildAchievements = (l: Learning) => [
  { name: "Langkah Pertama", icon: "🚀", how: "Selesaikan 1 modul di Peta Belajar", earned: l.modulesCompleted >= 1, progress: `${Math.min(l.modulesCompleted, 1)}/1` },
  { name: "Penjelajah", icon: "🗺️", how: "Selesaikan 5 modul", earned: l.modulesCompleted >= 5, progress: `${Math.min(l.modulesCompleted, 5)}/5` },
  { name: "Tamat Peta Belajar", icon: "👑", how: "Selesaikan semua modul", earned: l.modulesTotal > 0 && l.modulesCompleted >= l.modulesTotal, progress: `${l.modulesCompleted}/${l.modulesTotal}` },
  { name: "Nilai Sempurna", icon: "💯", how: "Jawab benar semua soal dalam satu kuis", earned: l.hasPerfectQuiz, progress: "" },
  { name: "Kuis Mandiri", icon: "📝", how: "Kerjakan kuis dari dokumenmu sendiri", earned: l.documentQuizCount >= 1, progress: "" },
  { name: "Pemindai", icon: "📷", how: "Pindai 1 dokumen dengan EyeRead", earned: l.scans >= 1, progress: "" },
  { name: "Penanya Aktif", icon: "💬", how: "Ajukan 10 pertanyaan ke NeoTutor", earned: l.questions >= 10, progress: `${Math.min(l.questions, 10)}/10` },
  { name: "Penolong", icon: "🤝", how: "Tulis postingan atau komentar di forum", earned: l.forumActivity >= 1, progress: "" },
  { name: "Konsisten", icon: "🔥", how: "Belajar 3 hari berturut-turut", earned: l.streak >= 3, progress: `${Math.min(l.streak, 3)}/3` },
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State Utama
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State Data Profil
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    avatar_url: "",
    email: "",
  });

  const [learning, setLearning] = useState<Learning>(emptyLearning);

  // State Form Edit
  const [editForm, setEditForm] = useState({
    full_name: "",
    avatar_url: "", // URL lama atau URL setelah upload
  });

  // State Khusus File Upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- 1. FETCH DATA PROFILE ---
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const finalProfile = {
        full_name:
          profileData?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Siswa Baru",
        avatar_url: profileData?.avatar_url || "",
        email: user.email || "",
        created_at: new Date(user.created_at).getFullYear().toString(),
      };

      setProfile(finalProfile);
      setEditForm({
        full_name: finalProfile.full_name,
        avatar_url: finalProfile.avatar_url,
      });

      // Angka belajar: semuanya baris milik pengguna sendiri
      const countOnly = { count: "exact", head: true } as const;

      const [modulesRes, questionsRes, progressRes, attemptsRes, docAttemptsRes, scansRes, chatRes, postsRes, commentsRes] =
        await Promise.all([
          supabase.from("learning_modules").select("id, title, sort_order").eq("is_published", true).order("sort_order"),
          supabase.from("quiz_questions").select("module_id"),
          supabase.from("module_progress").select("module_id, status, best_score").eq("user_id", user.id),
          supabase.from("quiz_attempts").select("score, total").eq("user_id", user.id),
          supabase.from("document_quiz_attempts").select("score, total").eq("user_id", user.id),
          supabase.from("user_documents").select("id", countOnly).eq("user_id", user.id).eq("source", "scan"),
          supabase.from("chat_messages").select("id", countOnly).eq("user_id", user.id).eq("role", "user"),
          supabase.from("forum_posts").select("id", countOnly).eq("author_id", user.id),
          supabase.from("forum_comments").select("id", countOnly).eq("author_id", user.id),
        ]);

      const failed = [modulesRes, questionsRes, progressRes, attemptsRes, docAttemptsRes, scansRes, chatRes, postsRes, commentsRes].find((res) => res.error);
      if (failed?.error) console.error("Gagal memuat sebagian data belajar:", failed.error);

      const questionCount = new Map<number, number>();
      for (const row of questionsRes.data ?? []) {
        questionCount.set(row.module_id, (questionCount.get(row.module_id) ?? 0) + 1);
      }
      const progress = new Map((progressRes.data ?? []).map((row) => [row.module_id, row]));
      const attempts = [...(attemptsRes.data ?? []), ...(docAttemptsRes.data ?? [])].filter((a) => a.total > 0);

      setLearning({
        xp: profileData?.xp ?? 0,
        streak: profileData?.streak ?? 0,
        modulesTotal: modulesRes.data?.length ?? 0,
        modulesCompleted: (modulesRes.data ?? []).filter((m) => progress.get(m.id)?.status === "completed").length,
        quizCount: attempts.length,
        quizAveragePct: attempts.length
          ? Math.round((attempts.reduce((sum, a) => sum + a.score / a.total, 0) / attempts.length) * 100)
          : null,
        hasPerfectQuiz: attempts.some((a) => a.score === a.total),
        documentQuizCount: docAttemptsRes.data?.length ?? 0,
        scans: scansRes.count ?? 0,
        questions: chatRes.count ?? 0,
        forumActivity: (postsRes.count ?? 0) + (commentsRes.count ?? 0),
        modules: (modulesRes.data ?? [])
          .filter((m) => progress.has(m.id))
          .map((m) => {
            const total = questionCount.get(m.id) ?? 0;
            const row = progress.get(m.id)!;
            return {
              id: m.id,
              title: m.title,
              pct: total ? Math.min(100, Math.round((row.best_score / total) * 100)) : 0,
              completed: row.status === "completed",
            };
          }),
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Gagal memuat profil",
        description: "Periksa koneksi internet Anda.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- 2. HANDLE FILE SELECTION (PREVIEW) ---
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validasi ukuran (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File terlalu besar",
          description: "Maksimal ukuran file adalah 2MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      // Buat URL lokal sementara untuk preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // --- 3. HANDLE UPLOAD KE SUPABASE STORAGE ---
  const uploadAvatarToStorage = async (
    userId: string,
    file: File
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      // Gunakan timestamp agar nama file unik dan menghindari caching browser
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars") // Pastikan nama bucket di Supabase adalah 'avatars'
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // --- TAMBAHKAN LOG INI ---
      if (uploadError) {
        console.error("Detail Error Upload:", uploadError); // Cek Console browser (F12)
        throw uploadError;
      }

      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw new Error("Gagal mengupload gambar");
    }
  };

  // --- 4. HANDLE SAVE DATA ---
  const handleSave = async () => {
    if (!editForm.full_name.trim()) {
      toast({
        title: "Validasi Gagal",
        description: "Nama lengkap tidak boleh kosong.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi habis, silakan login kembali.");

      let finalAvatarUrl = editForm.avatar_url;

      // Jika ada file baru yang dipilih, upload dulu
      if (avatarFile) {
        const publicUrl = await uploadAvatarToStorage(user.id, avatarFile);
        if (publicUrl) finalAvatarUrl = publicUrl;
      }

      // Update Database
      const updates = {
        id: user.id,
        full_name: editForm.full_name,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;

      // Optimistic Update UI
      setProfile((prev) => ({
        ...prev,
        full_name: editForm.full_name,
        avatar_url: finalAvatarUrl,
      }));

      // Reset Form State
      setEditForm((prev) => ({ ...prev, avatar_url: finalAvatarUrl }));
      setAvatarFile(null);
      setPreviewUrl(null);
      setIsEditing(false);

      toast({
        title: "Berhasil!",
        description: "Profil berhasil diperbarui.",
      });
    } catch (error: any) {
      toast({
        title: "Gagal Menyimpan",
        description:
          error.message || "Terjadi kesalahan saat menyimpan profil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              Profil Saya
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Pantau kemajuan dan kelola akun Anda
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- LEFT COLUMN: PROFILE CARD --- */}
          <Card className="p-8 lg:col-span-1 h-fit shadow-lg border-primary/10">
            <div className="text-center flex flex-col items-center">
              <div
                className="relative mb-6 group cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay Edit Icon */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-1 text-foreground">
                {profile.full_name}
              </h2>
              <p className="text-primary font-medium mb-6 bg-primary/10 px-3 py-1 rounded-full text-sm">
                Siswa Hope.Ai
              </p>

              <div className="w-full space-y-4 mb-8 bg-muted/50 p-4 rounded-xl">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Bergabung {profile.created_at || "2024"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <User className="w-4 h-4 text-primary" />
                  <span>Akun Terverifikasi</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <Button className="w-full" onClick={() => setIsEditing(true)}>
                  Edit Profil
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </Button>
              </div>
            </div>
          </Card>

          {/* --- RIGHT COLUMN: STATS & ACHIEVEMENTS --- */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Modul Selesai", value: `${learning.modulesCompleted} / ${learning.modulesTotal}`, icon: BookOpen },
                {
                  label: learning.quizCount ? `Rata-rata dari ${learning.quizCount} kuis` : "Belum ada kuis",
                  value: learning.quizAveragePct === null ? "–" : `${learning.quizAveragePct}%`,
                  icon: Target,
                },
                { label: `Belajar beruntun · ${learning.xp} XP`, value: `${learning.streak} hari`, icon: Award },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow border-primary/5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="p-6 md:p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Progress Belajar
              </h3>
              <div className="mb-6">
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span>Peta Belajar</span>
                  <span className="text-muted-foreground">
                    {learning.modulesCompleted} dari {learning.modulesTotal} modul selesai
                  </span>
                </div>
                <Progress
                  value={learning.modulesTotal ? (learning.modulesCompleted / learning.modulesTotal) * 100 : 0}
                  className="h-2.5 bg-muted"
                  aria-label="Kemajuan Peta Belajar"
                />
              </div>
              {learning.modules.length === 0 ? (
                <p className="text-muted-foreground">
                  Belum ada modul yang dikerjakan. Mulai dari Peta Belajar di Pathly.
                </p>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm font-medium text-muted-foreground">Nilai terbaik per modul</p>
                  {learning.modules.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between mb-2 text-sm font-medium">
                        <span>
                          {item.title}
                          {item.completed && <span className="text-muted-foreground font-normal"> · selesai</span>}
                        </span>
                        <span className="text-muted-foreground">{item.pct}%</span>
                      </div>
                      <Progress
                        value={item.pct}
                        className="h-2.5 bg-muted"
                        aria-label={`Nilai terbaik ${item.title}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 md:p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Pencapaian
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {buildAchievements(learning).map((achievement, index) => (
                  <motion.div
                    key={achievement.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      p-4 rounded-xl border transition-all duration-300 flex flex-col items-center text-center gap-2
                      ${
                        achievement.earned
                          ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm"
                          : "bg-muted/50 border-muted grayscale opacity-80"
                      }
                    `}
                  >
                    <div className="text-4xl filter drop-shadow-sm" aria-hidden="true">
                      {achievement.icon}
                    </div>
                    <div className="text-sm font-semibold leading-tight">
                      {achievement.name}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">{achievement.how}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-primary">
                      {achievement.earned ? "Tercapai" : achievement.progress || "Belum tercapai"}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* --- EDIT PROFILE DIALOG (UPDATED) --- */}
      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!isSaving) {
            setIsEditing(open);
            // Reset preview jika dicancel
            if (!open) {
              setAvatarFile(null);
              setPreviewUrl(null);
              setEditForm((prev) => ({
                ...prev,
                avatar_url: profile.avatar_url,
              }));
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profil</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 cursor-pointer">
                  {/* Tampilkan Preview Lokal jika ada, jika tidak tampilkan URL Database */}
                  <AvatarImage
                    src={previewUrl || editForm.avatar_url}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>

                {/* Input File Tersembunyi */}
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isSaving}
                />

                {/* Tombol Overlay untuk Trigger Input */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Klik ikon awan atau foto untuk mengganti.
                <br />
                (Max 2MB, JPG/PNG)
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Nama Lengkap Anda"
                  className="bg-muted/50"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
