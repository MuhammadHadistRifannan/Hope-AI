import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowRight, BookOpen, Flame, GraduationCap, MessageSquare, Mic, Sparkles, Star, Target, TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRoles } from "@/hooks/use-roles";
import { requestVoiceInput } from "@/lib/voiceCommands";
import AccessibilityBar from "@/components/AccessibilityBar";
import FeatureCards, { features } from "@/components/FeatureCards";

type ContinueItem = { label: string; title: string; href: string; icon: typeof BookOpen };
type Weekly = { quizzes: number; average: number | null; questions: number; activeDays: number };
type PostSummary = { id: string; author: string; content: string; createdAt: string; comments: number };

// Urutan kartu fitur menurut kebutuhan: yang paling berguna untuk pengguna tampil pertama
const featureOrder = (needs: string[]) => {
  if (needs.includes("tuli")) return ["isyarat", "flexa", "neotutor", "pathly", "forum", "eyeread"];
  if (needs.includes("netra")) return ["eyeread", "neotutor", "flexa", "pathly", "forum", "isyarat"];
  if (needs.includes("disleksia") || needs.includes("kognitif"))
    return ["flexa", "neotutor", "pathly", "eyeread", "isyarat", "forum"];
  return ["eyeread", "neotutor", "flexa", "pathly", "isyarat", "forum"];
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
};

export default function Dashboard() {
  const { needs, screenReaderMode } = useSettings();
  const { isStaff } = useRoles();

  const [name, setName] = useState("");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Tunanetra dan pengguna pembaca layar: tata letak satu kolom tanpa dekorasi
  const linear = needs.includes("netra") || screenReaderMode;
  // Lebih nyaman mengetik: tidak ada ajakan memakai suara
  const typingFirst = needs.includes("wicara");
  // Disleksia: baris teks dibatasi sekitar 65 karakter
  const prose = needs.includes("disleksia") ? "max-w-prose" : "";

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [profileRes, modulesRes, progressRes, documentRes, sessionRes, quizRes, docQuizRes, chatRes, postsRes] =
        await Promise.all([
          supabase.from("profiles").select("full_name, xp, streak").eq("id", user.id).maybeSingle(),
          supabase.from("learning_modules").select("id, title, sort_order").eq("is_published", true).order("sort_order"),
          supabase.from("module_progress").select("module_id, status").eq("user_id", user.id),
          supabase.from("user_documents").select("title").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1),
          supabase.from("chat_sessions").select("title").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1),
          supabase.from("quiz_attempts").select("score, total, created_at").eq("user_id", user.id).gte("created_at", weekAgo),
          supabase.from("document_quiz_attempts").select("score, total, created_at").eq("user_id", user.id).gte("created_at", weekAgo),
          supabase.from("chat_messages").select("created_at").eq("user_id", user.id).eq("role", "user").gte("created_at", weekAgo),
          supabase.from("forum_posts").select("id, author_id, content, created_at").order("created_at", { ascending: false }).limit(3),
        ]);

      setName(profileRes.data?.full_name || user.email?.split("@")[0] || "Teman");
      setXp(profileRes.data?.xp ?? 0);
      setStreak(profileRes.data?.streak ?? 0);

      // Lanjutkan belajar: modul Pathly berikutnya, dokumen terakhir, percakapan terakhir
      const completed = new Set(
        (progressRes.data ?? []).filter((row) => row.status === "completed").map((row) => row.module_id)
      );
      const nextModule = (modulesRes.data ?? []).find((module) => !completed.has(module.id));
      const items: ContinueItem[] = [];
      if (nextModule) {
        items.push({
          label: completed.size === 0 ? "Mulai Peta Belajar" : "Lanjutkan Peta Belajar",
          title: nextModule.title,
          href: "/pathly",
          icon: TrendingUp,
        });
      }
      if (documentRes.data?.[0]) {
        items.push({ label: "Dokumen terakhir", title: documentRes.data[0].title, href: "/flexa", icon: BookOpen });
      }
      if (sessionRes.data?.[0]) {
        items.push({ label: "Percakapan terakhir", title: sessionRes.data[0].title, href: "/neotutor", icon: MessageSquare });
      }
      setContinueItems(items);

      // Ringkasan tujuh hari terakhir
      const attempts = [...(quizRes.data ?? []), ...(docQuizRes.data ?? [])].filter((a) => a.total > 0);
      const days = new Set(
        [...attempts, ...(chatRes.data ?? [])].map((row) => new Date(row.created_at).toDateString())
      );
      setWeekly({
        quizzes: attempts.length,
        average: attempts.length
          ? Math.round((attempts.reduce((sum, a) => sum + a.score / a.total, 0) / attempts.length) * 100)
          : null,
        questions: chatRes.data?.length ?? 0,
        activeDays: days.size,
      });

      // Aktivitas forum terbaru
      const postRows = postsRes.data ?? [];
      if (postRows.length) {
        const [authorsRes, counts] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", [...new Set(postRows.map((p) => p.author_id))]),
          supabase.from("forum_comments").select("post_id").in("post_id", postRows.map((p) => p.id)),
        ]);
        const authors = new Map((authorsRes.data ?? []).map((a) => [a.id, a.full_name || "Pengguna"]));
        setPosts(
          postRows.map((post) => ({
            id: post.id,
            author: authors.get(post.author_id) ?? "Pengguna",
            content: post.content,
            createdAt: post.created_at,
            comments: (counts.data ?? []).filter((c) => c.post_id === post.id).length,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const order = featureOrder(needs);

  return (
    <div className="p-2 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10">
      {/* Sapaan dan pengaturan cepat */}
      <header className="space-y-4">
        <div>
          <p className="text-muted-foreground">{greeting()},</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Halo, {name || "…"}</h1>
        </div>
        <AccessibilityBar />
      </header>

      {/* Ajakan perintah suara, paling menonjol untuk pengguna yang mengandalkan suara */}
      {linear && !typingFirst && (
        <section aria-labelledby="judul-suara">
          <h2 id="judul-suara" className="sr-only">
            Perintah suara
          </h2>
          <Button
            size="lg"
            className="w-full h-16 text-lg"
            onClick={requestVoiceInput}
            autoFocus={needs.includes("netra")}
          >
            <Mic className="w-6 h-6 mr-3" aria-hidden="true" />
            Tekan lalu ucapkan perintah (Alt+M). Katakan "bantuan" untuk daftar perintah
          </Button>
        </section>
      )}

      {/* Lanjutkan belajar */}
      <section aria-labelledby="judul-lanjut">
        <h2 id="judul-lanjut" className="text-xl md:text-2xl font-bold mb-4">
          Lanjutkan Belajar
        </h2>
        {loading ? (
          <p className="text-muted-foreground" role="status">
            Memuat...
          </p>
        ) : continueItems.length === 0 ? (
          <p className={`text-muted-foreground ${prose}`}>
            Belum ada kegiatan. Mulai dari Peta Belajar di Pathly, atau pindai bukumu dengan EyeRead.
          </p>
        ) : (
          <ul className={linear ? "space-y-3" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
            {continueItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <span className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">
                    <item.icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">{item.label}</span>
                    <span className="block font-semibold truncate">{item.title}</span>
                  </span>
                  <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fitur */}
      <section aria-labelledby="judul-fitur">
        <h2 id="judul-fitur" className="text-xl md:text-2xl font-bold mb-4">
          Fitur Belajar
        </h2>
        {linear ? (
          <ul className="space-y-3">
            {[...features]
              .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
              .map((feature) => (
                <li key={feature.key}>
                  <Link
                    to={feature.href}
                    className="block rounded-2xl border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="text-lg font-bold">{feature.name}</h3>
                    <p className={`text-muted-foreground ${prose}`}>{feature.description}</p>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <FeatureCards order={order} />
        )}
      </section>

      {/* Untuk guru dan admin */}
      {isStaff && (
        <section aria-labelledby="judul-guru">
          <h2 id="judul-guru" className="text-xl md:text-2xl font-bold mb-4">
            Untuk Guru
          </h2>
          <Link
            to="/guru"
            className="flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GraduationCap className="w-8 h-8 text-primary shrink-0" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-semibold">Ruang Guru</span>
              <span className="block text-sm text-muted-foreground">
                Lihat siswa yang perlu perhatian dan kelola materi
              </span>
            </span>
            <ArrowRight className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className={linear ? "space-y-8" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
        {/* Ringkasan minggu ini */}
        <section aria-labelledby="judul-minggu">
          <Card className="p-4 md:p-6 h-full">
            <h2 id="judul-minggu" className="text-xl font-bold mb-1">
              Minggu Ini
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Kegiatanmu dalam 7 hari terakhir</p>
            {weekly && (
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { label: "Hari aktif", value: `${weekly.activeDays} dari 7`, icon: Flame },
                  { label: "Kuis dikerjakan", value: String(weekly.quizzes), icon: Target },
                  { label: "Rata-rata nilai", value: weekly.average === null ? "–" : `${weekly.average}%`, icon: Star },
                  { label: "Pertanyaan ke NeoTutor", value: String(weekly.questions), icon: Sparkles },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/60 p-3">
                    <dt className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <stat.icon className="w-4 h-4" aria-hidden="true" /> {stat.label}
                    </dt>
                    <dd className="text-2xl font-bold mt-1">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Total {xp} XP · belajar beruntun {streak} hari
            </p>
          </Card>
        </section>

        {/* Forum */}
        <section aria-labelledby="judul-forum">
          <Card className="p-4 md:p-6 h-full">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 id="judul-forum" className="text-xl font-bold">
                Terbaru di EchoForum
              </h2>
              <Link to="/forum" className="text-sm font-medium text-primary hover:underline">
                Buka EchoForum
              </Link>
            </div>
            {posts.length === 0 ? (
              <p className="text-muted-foreground">{loading ? "Memuat..." : "Belum ada postingan."}</p>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="rounded-xl bg-muted/60 p-3">
                    <p className={`line-clamp-2 ${prose}`}>{post.content}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {post.author} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })} ·{" "}
                      {post.comments} komentar
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
