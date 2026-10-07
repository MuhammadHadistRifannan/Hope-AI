import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Users, BookOpen, MessageSquare, BarChart3,
  TrendingUp, Eye, Shield, Activity, Trash2, Ban, LineChart as LineChartIcon,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/use-roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Stats = {
  total_users: number;
  active_users_7d: number;
  active_modules: number;
  forum_posts: number;
  forum_comments: number;
  quiz_attempts: number;
  document_quiz_attempts: number;
  avg_quiz_score_pct: number;
  chat_messages: number;
  documents_scanned: number;
  documents_uploaded: number;
  game_plays: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  roles: AppRole[];
  xp: number;
  streak: number;
  lastActive: string | null;
  joined: string;
};

type ModuleRow = { id: number; title: string; topic: string; isPublished: boolean };

type PostRow = { id: string; author: string; content: string; createdAt: string };

type TrendRow = { day: string; signups: number; questions: number; quizzes: number; forum: number };

// Garis grafik tren; warna dipilih agar tetap terbedakan pada buta warna merah-hijau
const trendSeries = [
  { key: "questions", label: "Pertanyaan ke NeoTutor", color: "#2563eb", dash: undefined },
  { key: "quizzes", label: "Kuis dikerjakan", color: "#d97706", dash: "6 3" },
  { key: "forum", label: "Postingan dan komentar forum", color: "#7c3aed", dash: "2 3" },
  { key: "signups", label: "Pendaftar baru", color: "#0f766e", dash: "8 3 2 3" },
] as const;

const TREND_DAYS = 14;

const roleLabel: Record<AppRole, string> = {
  student: "Siswa",
  teacher: "Guru",
  admin: "Admin",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function AdminDashboard() {
  const { isAdmin, isLoading: isLoadingRoles } = useRoles();
  const { toast } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [comments, setComments] = useState<PostRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) return;

    const load = async () => {
      const [statsRes, profilesRes, rolesRes, modulesRes, postsRes, accountsRes, commentsRes, trendsRes] = await Promise.all([
        supabase.rpc("admin_stats"),
        supabase
          .from("profiles")
          .select("id, full_name, xp, streak, last_active_date, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("learning_modules")
          .select("id, title, topic, is_published")
          .order("sort_order"),
        supabase
          .from("forum_posts")
          .select("id, author_id, content, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.rpc("admin_user_accounts"),
        supabase
          .from("forum_comments")
          .select("id, author_id, content, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.rpc("admin_trends", { _days: TREND_DAYS }),
      ]);

      const failed = [statsRes, profilesRes, rolesRes, modulesRes, postsRes, accountsRes, commentsRes, trendsRes].find((res) => res.error);
      if (failed?.error) {
        console.error("Gagal memuat dashboard admin:", failed.error);
        toast({
          title: "Gagal memuat data",
          description: failed.error.message,
          variant: "destructive",
        });
        return;
      }

      setStats(statsRes.data as unknown as Stats);
      setTrends((trendsRes.data as unknown as TrendRow[]) ?? []);

      const accounts = new Map((accountsRes.data ?? []).map((a) => [a.user_id, a]));

      const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name || "Tanpa nama"]));
      setUsers(
        (profilesRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.full_name || "Tanpa nama",
          email: accounts.get(p.id)?.email ?? "",
          isBlocked: accounts.get(p.id)?.is_blocked ?? false,
          roles: (rolesRes.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
          xp: p.xp,
          streak: p.streak,
          lastActive: p.last_active_date,
          joined: p.created_at,
        }))
      );
      setModules(
        (modulesRes.data ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          topic: m.topic,
          isPublished: m.is_published,
        }))
      );
      setPosts(
        (postsRes.data ?? []).map((p) => ({
          id: p.id,
          author: names.get(p.author_id) ?? "Pengguna",
          content: p.content,
          createdAt: p.created_at,
        }))
      );
      setComments(
        (commentsRes.data ?? []).map((c) => ({
          id: c.id,
          author: names.get(c.author_id) ?? "Pengguna",
          content: c.content,
          createdAt: c.created_at,
        }))
      );
    };

    load();
  }, [isAdmin, toast]);

  const togglePublished = async (module: ModuleRow, isPublished: boolean) => {
    const { error } = await supabase
      .from("learning_modules")
      .update({ is_published: isPublished })
      .eq("id", module.id);

    if (error) {
      toast({ title: "Gagal mengubah modul", description: error.message, variant: "destructive" });
      return;
    }
    setModules(modules.map((m) => (m.id === module.id ? { ...m, isPublished } : m)));
    toast({
      title: isPublished ? "Modul diterbitkan" : "Modul disembunyikan",
      description: module.title,
    });
  };

  // Guru bisa menambah materi dan melihat kemajuan siswa
  const toggleTeacher = async (user: UserRow, makeTeacher: boolean) => {
    const { error } = makeTeacher
      ? await supabase.from("user_roles").insert({ user_id: user.id, role: "teacher" })
      : await supabase.from("user_roles").delete().eq("user_id", user.id).eq("role", "teacher");

    if (error) {
      toast({ title: "Gagal mengubah peran", description: error.message, variant: "destructive" });
      return;
    }
    setUsers(
      users.map((u) =>
        u.id === user.id
          ? { ...u, roles: makeTeacher ? [...u.roles, "teacher"] : u.roles.filter((role) => role !== "teacher") }
          : u
      )
    );
    toast({ title: makeTeacher ? "Dijadikan guru" : "Peran guru dicabut", description: user.name });
  };

  const deletePost = async (post: PostRow) => {
    if (!window.confirm(`Hapus postingan dari ${post.author}? Tindakan ini tidak bisa dibatalkan.`)) return;

    const { error } = await supabase.from("forum_posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "Gagal menghapus postingan", description: error.message, variant: "destructive" });
      return;
    }
    setPosts(posts.filter((p) => p.id !== post.id));
    toast({ title: "Postingan dihapus" });
  };

  const deleteComment = async (comment: PostRow) => {
    if (!window.confirm(`Hapus komentar dari ${comment.author}? Tindakan ini tidak bisa dibatalkan.`)) return;

    const { error } = await supabase.from("forum_comments").delete().eq("id", comment.id);
    if (error) {
      toast({ title: "Gagal menghapus komentar", description: error.message, variant: "destructive" });
      return;
    }
    setComments(comments.filter((c) => c.id !== comment.id));
    toast({ title: "Komentar dihapus" });
  };

  // Akun yang diblokir tidak bisa masuk lagi; sesi yang masih berjalan berakhir paling lama satu jam
  const toggleBlocked = async (user: UserRow, block: boolean) => {
    if (block && !window.confirm(`Blokir akun ${user.name}? Pengguna ini tidak akan bisa masuk sampai blokirnya dibuka.`)) return;

    const { error } = await supabase.rpc("admin_set_user_blocked", { _user_id: user.id, _blocked: block });
    if (error) {
      toast({ title: block ? "Gagal memblokir akun" : "Gagal membuka blokir", description: error.message, variant: "destructive" });
      return;
    }
    setUsers(users.map((u) => (u.id === user.id ? { ...u, isBlocked: block } : u)));
    toast({ title: block ? "Akun diblokir" : "Blokir dibuka", description: user.name });
  };

  if (isLoadingRoles) {
    return (
      <p className="p-8 text-muted-foreground" role="status">
        Memeriksa akses...
      </p>
    );
  }

  // Halaman ini hanya untuk admin; data di baliknya juga dijaga RLS
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const statCards = [
    { label: "Total Pengguna", value: stats?.total_users, icon: Users },
    { label: "Aktif 7 Hari Terakhir", value: stats?.active_users_7d, icon: Activity },
    { label: "Modul Terbit", value: stats?.active_modules, icon: BookOpen },
    { label: "Postingan Forum", value: stats?.forum_posts, icon: MessageSquare },
  ];

  const usage = [
    { name: "EyeRead (dokumen dipindai)", count: stats?.documents_scanned ?? 0 },
    { name: "NeoTutor (pertanyaan)", count: stats?.chat_messages ?? 0 },
    { name: "Flexa (dokumen diunggah)", count: stats?.documents_uploaded ?? 0 },
    { name: "Pathly (kuis dikerjakan)", count: stats?.quiz_attempts ?? 0 },
    { name: "Kuis dari dokumen", count: stats?.document_quiz_attempts ?? 0 },
    { name: "Playground (game dimainkan)", count: stats?.game_plays ?? 0 },
    { name: "Forum (postingan dan komentar)", count: (stats?.forum_posts ?? 0) + (stats?.forum_comments ?? 0) },
  ];
  const maxUsage = Math.max(1, ...usage.map((u) => u.count));

  const keyword = search.trim().toLowerCase();
  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword)
  );

  const trendData = trends.map((row) => ({
    ...row,
    label: new Date(`${row.day}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Kelola aplikasi Hope.Ai
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-lg">
            <Shield className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="font-medium">Admin</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <stat.icon className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
                <div className="text-3xl font-bold mb-1">{stat.value ?? "…"}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" />
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" aria-hidden="true" />
              Pengguna
            </TabsTrigger>
            <TabsTrigger value="content">
              <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
              Konten
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="p-4 md:p-6 mb-6">
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-primary" aria-hidden="true" />
                Tren {TREND_DAYS} Hari Terakhir
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Jumlah kegiatan per hari (WIB).</p>
              <div className="h-72" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {trendSeries.map((series) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={series.label}
                        stroke={series.color}
                        strokeDasharray={series.dash}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Angka yang sama dalam bentuk tabel untuk pembaca layar */}
              <table className="sr-only">
                <caption>Kegiatan per hari selama {TREND_DAYS} hari terakhir</caption>
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    {trendSeries.map((series) => (
                      <th key={series.key} scope="col">{series.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((row) => (
                    <tr key={row.day}>
                      <th scope="row">{row.label}</th>
                      {trendSeries.map((series) => (
                        <td key={series.key}>{row[series.key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" aria-hidden="true" />
                  Pemakaian Fitur
                </h2>
                <div className="space-y-4">
                  {usage.map((feature) => (
                    <div key={feature.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{feature.name}</span>
                        <span className="text-muted-foreground">{feature.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(feature.count / maxUsage) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                  Hasil Belajar
                </h2>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <dt className="text-sm">Kuis dikerjakan</dt>
                    <dd className="font-bold">{stats ? stats.quiz_attempts + stats.document_quiz_attempts : "…"}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <dt className="text-sm">Rata-rata nilai kuis</dt>
                    <dd className="font-bold">{stats ? `${stats.avg_quiz_score_pct}%` : "…"}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm">Komentar forum</dt>
                    <dd className="font-bold">{stats?.forum_comments ?? "…"}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Daftar Pengguna</h2>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau email..."
                  aria-label="Cari pengguna berdasarkan nama atau email"
                  className="max-w-xs"
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Peran</TableHead>
                      <TableHead>Guru</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Streak</TableHead>
                      <TableHead>Terakhir Aktif</TableHead>
                      <TableHead>Bergabung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                          <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>{user.roles.map((role) => roleLabel[role]).join(", ") || "-"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={user.roles.includes("teacher")}
                            onCheckedChange={(checked) => toggleTeacher(user, checked)}
                            aria-label={`Jadikan ${user.name} guru`}
                          />
                        </TableCell>
                        <TableCell>
                          {user.roles.includes("admin") ? (
                            <span className="text-sm text-muted-foreground">Aktif</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={user.isBlocked ? "text-sm font-medium text-destructive" : "text-sm"}>
                                {user.isBlocked ? "Diblokir" : "Aktif"}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleBlocked(user, !user.isBlocked)}
                                aria-label={user.isBlocked ? `Buka blokir ${user.name}` : `Blokir ${user.name}`}
                              >
                                {!user.isBlocked && <Ban className="w-4 h-4 mr-1" aria-hidden="true" />}
                                {user.isBlocked ? "Buka Blokir" : "Blokir"}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{user.xp}</TableCell>
                        <TableCell>{user.streak} hari</TableCell>
                        <TableCell>{user.lastActive ? formatDate(user.lastActive) : "Belum pernah"}</TableCell>
                        <TableCell>{formatDate(user.joined)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">Tidak ada pengguna yang cocok.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
                  Modul Pathly
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Modul yang disembunyikan tidak tampil bagi siswa.
                </p>
                <div className="space-y-3">
                  {modules.map((module) => (
                    <div key={module.id} className="flex items-center justify-between gap-4 p-3 bg-muted rounded-lg">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{module.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{module.topic}</div>
                      </div>
                      <Switch
                        checked={module.isPublished}
                        onCheckedChange={(checked) => togglePublished(module, checked)}
                        aria-label={`Terbitkan modul ${module.title}`}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                  Moderasi Forum
                </h2>
                {posts.length === 0 ? (
                  <p className="text-muted-foreground">Belum ada postingan.</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div key={post.id} className="flex items-start justify-between gap-4 p-3 bg-muted rounded-lg">
                        <div className="min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{post.author}</span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{post.content}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deletePost(post)}
                          aria-label={`Hapus postingan dari ${post.author}`}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-bold mt-6 mb-3">Komentar Terbaru</h3>
                {comments.length === 0 ? (
                  <p className="text-muted-foreground">Belum ada komentar.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start justify-between gap-4 p-3 bg-muted rounded-lg">
                        <div className="min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: idLocale })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{comment.content}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteComment(comment)}
                          aria-label={`Hapus komentar dari ${comment.author}`}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
