import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowRight, BookOpen, Flame, GraduationCap, MessageSquare, Mic, Palette, Sparkles, Star, Target, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRoles } from "@/hooks/use-roles";
import { requestVoiceInput, runVoiceCommand } from "@/lib/voiceCommands";
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
  const { needs, screenReaderMode, effectiveReduceMotion } = useSettings();
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

  const heading = "px-title text-lg md:text-xl mb-4";

  return (
    <div className="p-2 md:p-6 lg:p-8 w-full max-w-[1680px] mx-auto space-y-8 md:space-y-10">
      {/* Sapaan dan pengaturan cepat */}
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          {!linear && <img src={effectiveReduceMotion ? "/anim/penguin-still.webp" : "/anim/penguin.webp"} alt="" width={80} height={80} className="h-16 w-16 shrink-0 object-contain md:h-20 md:w-20" />}
          <div className="min-w-0">
            <p className="text-muted-foreground">{greeting()},</p>
            <h1 className="px-title text-2xl md:text-3xl text-foreground break-words">Halo, {name || "…"}</h1>
          </div>
        </div>
        <AccessibilityBar />
      </header>

      {/* Ajakan perintah suara, paling menonjol untuk pengguna yang mengandalkan suara */}
      {linear && !typingFirst && (
        <section aria-labelledby="judul-suara">
          <h2 id="judul-suara" className="sr-only">
            Perintah suara
          </h2>
          <button
            type="button"
            onClick={requestVoiceInput}
            autoFocus={needs.includes("netra")}
            className="px-card flex min-h-16 w-full items-center gap-3 !bg-primary p-4 text-left text-lg font-semibold !text-primary-foreground"
          >
            <Mic className="h-6 w-6 shrink-0" aria-hidden="true" />
            Tekan lalu ucapkan perintah (Alt+M). Katakan "bantuan" untuk daftar perintah
          </button>
        </section>
      )}

      {/* Perintah suara untuk semua pengguna: contoh yang bisa langsung dicoba dengan sekali klik */}
      {!linear && !typingFirst && (
        <section aria-labelledby="judul-coba-suara" className="px-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <button
            type="button"
            onClick={requestVoiceInput}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
            aria-label="Mulai perintah suara"
          >
            <Mic className="h-7 w-7" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="judul-coba-suara" className="px-title text-lg md:text-xl">
              Pakai Hope.Ai dengan suara
            </h2>
            <p className={`mt-1 text-muted-foreground ${prose}`}>
              Tekan mikrofon atau <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold">Alt+M</kbd>, lalu ucapkan perintah. Atau klik contoh di bawah untuk melihat hasilnya.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["buka EyeRead", "buka NeoTutor", "bacakan halaman ini", "bantuan"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => runVoiceCommand(example)}
                  className="inline-flex min-h-10 items-center rounded-full border border-primary/30 px-3.5 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lanjutkan belajar */}
      {/* Pengguna buta warna langsung ditunjukkan alat yang dibuat untuk mereka */}
      {needs.includes("buta_warna") && (
        <Link to="/eyeread?alat=warna" className="px-card flex items-center gap-4 p-4 md:p-5">
          <span className="px-tile flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
            <Palette className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block px-title text-lg">Kenali Warna</span>
            <span className={`block text-muted-foreground ${prose}`}>
              Arahkan kamera ke benda atau pakaian, Hope.Ai menyebutkan warnanya.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      <section aria-labelledby="judul-lanjut">
        <h2 id="judul-lanjut" className={heading}>
          Lanjutkan Belajar
        </h2>
        {loading ? (
          <p className="text-muted-foreground" role="status">
            Memuat…
          </p>
        ) : continueItems.length === 0 ? (
          <p className={`text-muted-foreground ${prose}`}>
            Belum ada kegiatan. Mulai dari Peta Belajar di Pathly, atau pindai bukumu dengan EyeRead.
          </p>
        ) : (
          <ul className={linear ? "space-y-3" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
            {continueItems.map((item) => (
              <li key={item.label}>
                <Link to={item.href} className="px-card flex items-center gap-4 p-4">
                  <span className="px-tile flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">{item.label}</span>
                    <span className="block truncate font-semibold">{item.title}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fitur */}
      <section aria-labelledby="judul-fitur">
        <h2 id="judul-fitur" className={heading}>
          Fitur Belajar
        </h2>
        {linear ? (
          <ul className="space-y-3">
            {[...features]
              .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
              .map((feature) => (
                <li key={feature.key}>
                  <Link to={feature.href} className="px-card block p-4">
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
          <h2 id="judul-guru" className={heading}>
            Untuk Guru
          </h2>
          <Link to="/guru" className="px-card flex items-center gap-4 p-4">
            <span className="px-tile flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Ruang Guru</span>
              <span className="block text-sm text-muted-foreground">Lihat siswa yang perlu perhatian dan kelola materi</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className={linear ? "space-y-8" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
        {/* Ringkasan minggu ini */}
        <section aria-labelledby="judul-minggu" className="px-card p-4 md:p-6">
          <h2 id="judul-minggu" className="px-title text-lg md:text-xl">
            Minggu Ini
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Kegiatanmu dalam 7 hari terakhir</p>
          {weekly && (
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Hari aktif", value: `${weekly.activeDays} dari 7`, icon: Flame },
                { label: "Kuis dikerjakan", value: String(weekly.quizzes), icon: Target },
                { label: "Rata-rata nilai", value: weekly.average === null ? "–" : `${weekly.average}%`, icon: Star },
                { label: "Pertanyaan ke NeoTutor", value: String(weekly.questions), icon: Sparkles },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-muted/50 p-3">
                  <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <stat.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {stat.label}
                  </dt>
                  <dd className="px-title mt-2 text-xl md:text-2xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Total {xp} XP · belajar beruntun {streak} hari
          </p>
        </section>

        {/* Forum */}
        <section aria-labelledby="judul-forum" className="px-card p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="judul-forum" className="px-title text-lg md:text-xl">
              Terbaru di EchoForum
            </h2>
            <Link to="/forum" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">
              Buka EchoForum
            </Link>
          </div>
          {posts.length === 0 ? (
            <p className="text-muted-foreground">{loading ? "Memuat…" : "Belum ada postingan."}</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li key={post.id} className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className={`line-clamp-2 ${prose}`}>{post.content}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {post.author} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: idLocale })} ·{" "}
                    {post.comments} komentar
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
