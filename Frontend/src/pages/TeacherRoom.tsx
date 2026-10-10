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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { checkMaterial, visualReferences } from "@/lib/materialChecks";

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
  lastSeen: string | null; // kegiatan terakhir: kuis atau pembaruan belajar
};

// Alasan seorang siswa perlu perhatian; diurutkan dari yang paling mendesak
const attentionReasons = (student: Student) => {
  const reasons: string[] = [];
  const daysAway = student.lastSeen
    ? Math.floor((Date.now() - new Date(student.lastSeen).getTime()) / (24 * 3600 * 1000))
    : null;
  if (student.averageScore !== null && student.averageScore < 60) {
    reasons.push(`Rata-rata nilai kuis ${student.averageScore}%`);
  }
  if (daysAway === null) reasons.push("Belum pernah mengerjakan kuis");
  else if (daysAway >= 7) reasons.push(`Tidak aktif ${daysAway} hari`);
  return reasons;
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
  // Konfirmasi aksesibilitas oleh guru sebelum materi diterbitkan
  const [confirmVisuals, setConfirmVisuals] = useState(false);
  const [confirmColors, setConfirmColors] = useState(false);
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
      supabase.from("quiz_attempts").select("user_id, score, total, created_at"),
      supabase.from("document_quiz_attempts").select("user_id, score, total, created_at"),
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
            lastSeen:
              [profile.last_active_date, ...own.map((attempt) => attempt.created_at)]
                .filter((date): date is string => !!date)
                .sort()
                .pop() ?? null,
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

  const checks = checkMaterial(title, content);
  const references = visualReferences(content);
  // Wajib: judul, konfirmasi warna, dan konfirmasi gambar bila materi menyebut gambar.
  // Paragraf, kalimat, dan huruf kapital hanya saran.
  const readyToPublish =
    !!title.trim() &&
    !!content.trim() &&
    checks.find((check) => check.id === "title")!.ok &&
    confirmColors &&
    (references.length === 0 || confirmVisuals);

  const saveMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !title.trim() || !content.trim() || !readyToPublish) return;

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
    setConfirmVisuals(false);
    setConfirmColors(false);
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

  // Nilai rendah didahulukan, lalu yang paling lama tidak aktif
  const needsAttention = students
    .map((student) => ({ student, reasons: attentionReasons(student) }))
    .filter((item) => item.reasons.length > 0)
    .sort(
      (a, b) =>
        (a.student.averageScore ?? 101) - (b.student.averageScore ?? 101) ||
        (a.student.lastSeen ?? "").localeCompare(b.student.lastSeen ?? "")
    );

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeThisWeek = students.filter(
    (student) => student.lastSeen && new Date(student.lastSeen) >= weekAgo
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

        {/* Siswa yang perlu perhatian, paling atas agar langsung terlihat */}
        <Card className="p-4 md:p-6 mb-6" aria-labelledby="judul-perhatian">
          <h2 id="judul-perhatian" className="text-xl font-bold mb-1">
            Siswa yang Perlu Perhatian
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Nilai kuis rata-rata di bawah 60%, belum pernah mengerjakan kuis, atau tidak aktif 7 hari atau lebih.
          </p>
          {needsAttention.length === 0 ? (
            <p>Semua siswa sedang berjalan baik.</p>
          ) : (
            <ul className="divide-y">
              {needsAttention.slice(0, 8).map(({ student, reasons }) => (
                <li key={student.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{student.name}</span>
                  <span className="flex flex-wrap gap-2">
                    {reasons.map((reason) => (
                      <span
                        key={reason}
                        className="text-sm rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 px-3 py-1"
                      >
                        {reason}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {needsAttention.length > 8 && (
            <p className="text-sm text-muted-foreground mt-2">Dan {needsAttention.length - 8} siswa lainnya di tab Siswa.</p>
          )}
        </Card>

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
                        <TableCell>{student.lastSeen ? formatDate(student.lastSeen) : "Belum pernah"}</TableCell>
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
                  {/* Checklist aksesibilitas: otomatis dan konfirmasi guru */}
                  <fieldset className="rounded-xl border p-4 space-y-3" aria-describedby="checklist-help">
                    <legend className="px-1 font-semibold">Checklist aksesibilitas</legend>
                    <p id="checklist-help" className="text-sm text-muted-foreground">
                      Materi dibaca siswa dengan cara berbeda: didengar, dibaca dengan huruf besar, atau
                      disederhanakan. Periksa hal berikut sebelum menerbitkan.
                    </p>
                    <ul className="space-y-2">
                      {checks.map((check) => (
                        <li key={check.id} className="flex items-start gap-2 text-sm">
                          {check.ok ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" aria-hidden="true" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                          )}
                          <span>
                            <span className="sr-only">{check.ok ? "Lolos: " : "Perlu diperbaiki: "}</span>
                            {check.label}
                            {!check.ok && check.advice && (
                              <span className="block text-muted-foreground">{check.advice}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {references.length > 0 && (
                      <div className="flex items-start gap-3 pt-2 border-t">
                        <Checkbox
                          id="confirm-visuals"
                          checked={confirmVisuals}
                          onCheckedChange={(checked) => setConfirmVisuals(checked === true)}
                          className="mt-0.5"
                        />
                        <Label htmlFor="confirm-visuals" className="font-normal leading-snug">
                          Materi ini menyebut {references.join(", ")}. Isinya sudah saya jelaskan dengan
                          kata-kata, sehingga bisa dipahami tanpa melihatnya (wajib).
                        </Label>
                      </div>
                    )}
                    <div className="flex items-start gap-3 pt-2 border-t">
                      <Checkbox
                        id="confirm-colors"
                        checked={confirmColors}
                        onCheckedChange={(checked) => setConfirmColors(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="confirm-colors" className="font-normal leading-snug">
                        Informasi penting tidak hanya disampaikan lewat warna, letak, atau bentuk (wajib).
                      </Label>
                    </div>
                  </fieldset>

                  <Button type="submit" disabled={isSaving || !readyToPublish}>
                    {isSaving ? "Menyimpan..." : "Simpan dan Terbitkan"}
                  </Button>
                  {!readyToPublish && title.trim() && content.trim() && (
                    <p className="text-sm text-muted-foreground">
                      Centang konfirmasi di checklist untuk menerbitkan.
                    </p>
                  )}
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
