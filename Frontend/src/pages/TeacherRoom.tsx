import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpen, GraduationCap, Loader2, Trash2, Upload, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { API_URL, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/use-roles";

type Material = {
  id: string;
  level: string;
  title: string;
  isPublished: boolean;
  createdBy: string | null;
};

type Student = {
  id: string;
  name: string;
  xp: number;
  streak: number;
  lastActive: string | null;
  modulesCompleted: number;
  quizCount: number;
  averageScore: number | null;
};

const levelLabel: Record<string, string> = {
  mudah: "Tingkat Dasar",
  menengah: "Tingkat Menengah",
  sulit: "Tingkat Lanjut",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Ruang kerja guru dan pendamping: menambah materi untuk semua siswa dan
// memantau kemajuan belajar mereka.
export default function TeacherRoom() {
  const { isStaff, isAdmin, isLoading: isLoadingRoles } = useRoles();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalModules, setTotalModules] = useState(0);
  const [search, setSearch] = useState("");

  // Formulir materi baru
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("mudah");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from("materials")
      .select("id, level, title, is_published, created_by")
      .order("level")
      .order("sort_order");

    if (error) {
      console.error("Gagal memuat materi:", error);
      return;
    }
    setMaterials(
      data.map((row) => ({
        id: row.id,
        level: row.level,
        title: row.title,
        isPublished: row.is_published,
        createdBy: row.created_by,
      }))
    );
  };

  const loadStudents = async (currentUserId: string) => {
    const [profilesRes, progressRes, attemptsRes, documentAttemptsRes, modulesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, xp, streak, last_active_date")
        .order("full_name"),
      supabase.from("module_progress").select("user_id, status"),
      supabase.from("quiz_attempts").select("user_id, score, total"),
      supabase.from("document_quiz_attempts").select("user_id, score, total"),
      supabase.from("learning_modules").select("id").eq("is_published", true),
    ]);

    const failed = [profilesRes, progressRes, attemptsRes, documentAttemptsRes, modulesRes].find((res) => res.error);
    if (failed?.error) {
      console.error("Gagal memuat data siswa:", failed.error);
      toast({ title: "Gagal memuat data siswa", description: failed.error.message, variant: "destructive" });
      return;
    }

    setTotalModules(modulesRes.data?.length ?? 0);
    const attempts = [...(attemptsRes.data ?? []), ...(documentAttemptsRes.data ?? [])];

    setStudents(
      (profilesRes.data ?? [])
        .filter((profile) => profile.id !== currentUserId)
        .map((profile) => {
          const own = attempts.filter((attempt) => attempt.user_id === profile.id);
          const scored = own.reduce((sum, attempt) => sum + attempt.score, 0);
          const possible = own.reduce((sum, attempt) => sum + attempt.total, 0);
          return {
            id: profile.id,
            name: profile.full_name || "Tanpa nama",
            xp: profile.xp,
            streak: profile.streak,
            lastActive: profile.last_active_date,
            modulesCompleted: (progressRes.data ?? []).filter(
              (row) => row.user_id === profile.id && row.status === "completed"
            ).length,
            quizCount: own.length,
            averageScore: possible > 0 ? Math.round((scored / possible) * 100) : null,
          };
        })
    );
  };

  useEffect(() => {
    if (!isStaff) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadMaterials();
      loadStudents(user.id);
    });
  }, [isStaff]);

  // Mengisi kolom isi dari PDF, gambar, atau berkas teks
  const fillFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_URL}/scan/extract`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.text || "Gagal mengekstrak dokumen.");

      setContent(data.text ?? "");
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast({ title: "Teks berhasil diambil", description: "Periksa dan rapikan sebelum menyimpan." });
    } catch (error: any) {
      toast({ title: "Gagal membaca dokumen", description: error?.message, variant: "destructive" });
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !title.trim() || !content.trim()) return;

    setIsSaving(true);
    const sameLevel = materials.filter((material) => material.level === level).length;
    const { error } = await supabase.from("materials").insert({
      // Slug hanya huruf kecil, angka, dan tanda hubung
      slug: `g-${Date.now().toString(36)}`,
      level,
      sort_order: sameLevel + 1,
      title: title.trim(),
      content: content.trim(),
      created_by: userId,
    });
    setIsSaving(false);

    if (error) {
      toast({ title: "Gagal menyimpan materi", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Materi ditambahkan", description: `Siswa bisa membukanya di Flexa, ${levelLabel[level]}.` });
    setTitle("");
    setContent("");
    loadMaterials();
  };

  const togglePublished = async (material: Material, isPublished: boolean) => {
    const { error } = await supabase
      .from("materials")
      .update({ is_published: isPublished })
      .eq("id", material.id);

    if (error) {
      toast({ title: "Gagal mengubah materi", description: error.message, variant: "destructive" });
      return;
    }
    setMaterials(materials.map((m) => (m.id === material.id ? { ...m, isPublished } : m)));
  };

  const deleteMaterial = async (material: Material) => {
    if (!window.confirm(`Hapus materi "${material.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    const { error } = await supabase.from("materials").delete().eq("id", material.id);
    if (error) {
      toast({ title: "Gagal menghapus materi", description: error.message, variant: "destructive" });
      return;
    }
    setMaterials(materials.filter((m) => m.id !== material.id));
  };

  if (isLoadingRoles) {
    return (
      <p className="p-8 text-muted-foreground" role="status">
        Memeriksa akses...
      </p>
    );
  }

  // Hanya untuk guru dan admin; data di baliknya juga dijaga RLS
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeThisWeek = students.filter(
    (student) => student.lastActive && new Date(student.lastActive) >= weekAgo
  ).length;
  const withScores = students.filter((student) => student.averageScore !== null);
  const classAverage =
    withScores.length > 0
      ? Math.round(withScores.reduce((sum, student) => sum + (student.averageScore ?? 0), 0) / withScores.length)
      : null;

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Ruang Guru</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Tambahkan materi untuk siswa dan pantau kemajuan belajar mereka
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Siswa", value: students.length, icon: Users },
            { label: "Aktif 7 Hari Terakhir", value: activeThisWeek, icon: GraduationCap },
            { label: "Rata-rata Nilai Kuis", value: classAverage === null ? "-" : `${classAverage}%`, icon: BookOpen },
          ].map((stat) => (
            <Card key={stat.label} className="p-6">
              <stat.icon className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList>
            <TabsTrigger value="students">
              <Users className="w-4 h-4 mr-2" aria-hidden="true" />
              Kemajuan Siswa
            </TabsTrigger>
            <TabsTrigger value="materials">
              <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
              Materi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Kemajuan Siswa</h2>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama..."
                  aria-label="Cari siswa berdasarkan nama"
                  className="max-w-xs"
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Level Selesai</TableHead>
                      <TableHead>Kuis Dikerjakan</TableHead>
                      <TableHead>Rata-rata Nilai</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Streak</TableHead>
                      <TableHead>Terakhir Aktif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          {student.modulesCompleted} dari {totalModules}
                        </TableCell>
                        <TableCell>{student.quizCount}</TableCell>
                        <TableCell>{student.averageScore === null ? "-" : `${student.averageScore}%`}</TableCell>
                        <TableCell>{student.xp}</TableCell>
                        <TableCell>{student.streak} hari</TableCell>
                        <TableCell>{student.lastActive ? formatDate(student.lastActive) : "Belum pernah"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">Belum ada siswa yang cocok.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Tambah Materi</h2>
                <form onSubmit={saveMaterial} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="material-title">Judul</Label>
                    <Input
                      id="material-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Bab 12: Sistem Pernapasan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material-level">Tingkat</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger id="material-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(levelLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="material-content">Isi Materi</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.txt"
                        onChange={fillFromFile}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isExtracting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isExtracting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        {isExtracting ? "Membaca dokumen..." : "Isi dari PDF atau Foto"}
                      </Button>
                    </div>
                    <Textarea
                      id="material-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tulis materi di sini, atau ambil dari dokumen."
                      className="min-h-[220px]"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Siswa bisa mendengarkan materi ini, meminta ringkasan, bertanya ke NeoTutor, dan
                      mengerjakan kuis yang dibuat otomatis dari isinya.
                    </p>
                  </div>
                  <Button type="submit" disabled={isSaving || !title.trim() || !content.trim()}>
                    {isSaving ? "Menyimpan..." : "Simpan dan Terbitkan"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Daftar Materi</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Materi yang disembunyikan tidak tampil bagi siswa.
                </p>
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {materials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{material.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {levelLabel[material.level] ?? material.level}
                          {material.createdBy === userId && " · buatan Anda"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={material.isPublished}
                          onCheckedChange={(checked) => togglePublished(material, checked)}
                          aria-label={`Terbitkan materi ${material.title}`}
                        />
                        {/* Guru hanya menghapus materinya sendiri; admin boleh semuanya */}
                        {(isAdmin || material.createdBy === userId) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteMaterial(material)}
                            aria-label={`Hapus materi ${material.title}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
