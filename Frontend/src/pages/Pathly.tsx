import { useState, useEffect } from "react";
import { applyIndonesianVoice } from "@/lib/voice";
import { clickable } from "@/lib/a11y";
import {
  BookOpen,
  Lock,
  Star,
  CheckCircle2,
  Trophy,
  Crown,
  MapPin,
  X,
  Brain,
  Calculator,
  Flame,
  Zap,
  Timer,
  RefreshCcw,
  Volume2,
  Mic,
  Apple,
  Cherry,
  Banana,
  Grape,
  Citrus,
  Gamepad2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useSettings } from "@/context/SettingsContext";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { requestVoiceInput, useVoiceCommands } from "@/lib/voiceCommands";
import { visualCue } from "@/lib/cues";

// --- DATA LEVEL (PATHLY) - 10 LEVEL LENGKAP ---
// Modul, materi, dan soal Pathly dibaca dari database (learning_modules, quiz_questions).
// Bentuk objek di bawah dipakai oleh tampilan peta, materi, dan kuis.
type PathModule = {
  id: number;
  title: string;
  topic: string;
  status: "locked" | "unlocked" | "completed";
  position: string;
  color: string;
  bestScore: number;
  material: { title: string; content: string; summary: string };
  quiz: { q: string; options: string[]; a: string }[];
};

// Tanggal lokal format YYYY-MM-DD, untuk menghitung streak harian
const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
};

// --- DATA & HELPER GAME (PLAYGROUND) ---
// Warna modul disimpan di database sebagai nama kelas. Kelas itu harus tertulis
// di sini supaya ikut dibangun oleh Tailwind; warna lain memakai biru.
const moduleColors = new Set([
  "bg-blue-500", "bg-cyan-500", "bg-emerald-500", "bg-green-600", "bg-indigo-600",
  "bg-orange-500", "bg-pink-500", "bg-purple-500", "bg-red-500", "bg-yellow-500",
]);
const moduleColor = (color: string) => (moduleColors.has(color) ? color : "bg-blue-500");

const fruitIcons = [
  { icon: Apple, color: "text-red-500", name: "apel" },
  { icon: Cherry, color: "text-rose-600", name: "ceri" },
  { icon: Banana, color: "text-yellow-500", name: "pisang" },
  { icon: Grape, color: "text-purple-500", name: "anggur" },
  { icon: Citrus, color: "text-orange-500", name: "jeruk" },
];

const cardsData = [
  { id: 1, content: "🍎", matchId: 1, type: "icon" },
  { id: 2, content: "Apel", matchId: 1, type: "text" },
  { id: 3, content: "🐱", matchId: 2, type: "icon" },
  { id: 4, content: "Kucing", matchId: 2, type: "text" },
  { id: 5, content: "🚗", matchId: 3, type: "icon" },
  { id: 6, content: "Mobil", matchId: 3, type: "text" },
  { id: 7, content: "🌟", matchId: 4, type: "icon" },
  { id: 8, content: "Bintang", matchId: 4, type: "text" },
  { id: 9, content: "✈️", matchId: 6, type: "icon" },
  { id: 10, content: "Pesawat", matchId: 6, type: "text" },
];

// Component: Fruit Display
const FruitDisplay = ({
  count,
  fruitIndex,
}: {
  count: number;
  fruitIndex: number;
}) => {
  const FruitIcon = fruitIcons[fruitIndex].icon;
  const fruitColor = fruitIcons[fruitIndex].color;
  return (
    <div className="flex flex-wrap justify-center gap-1 bg-card p-3 border-[3px] border-foreground min-w-[80px] min-h-[80px] items-center">
      {count > 0 ? (
        Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring" }}
          >
            <FruitIcon
              className={`w-8 h-8 ${fruitColor} drop-shadow-sm fill-current opacity-90`}
            />
          </motion.div>
        ))
      ) : (
        <span className="text-3xl font-bold text-slate-300 dark:text-slate-600">
          0
        </span>
      )}
      <div className="w-full text-center text-xs font-bold text-slate-500 mt-1">
        {count}
      </div>
    </div>
  );
};

// --- HELPER UNTUK MEMUAT GAMBAR (LOGO) ---
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

export default function Pathly() {
  const { toast } = useToast();
  const { volume, autoPlayAudio, needs } = useSettings();

  const [mainMode, setMainMode] = useState<"menu" | "path" | "arena">("menu");

  // --- STATE PATHLY ---
  const [activeModule, setActiveModule] = useState<any>(null);
  const [pathView, setPathView] = useState<"map" | "material" | "quiz">("map");
  const [qIndex, setQIndex] = useState(0);
  const [pathScore, setPathScore] = useState(0);
  const [isPathCompleted, setIsPathCompleted] = useState(false);
  const [modulesState, setModulesState] = useState<PathModule[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Siswa Hebat Hope.Ai"); // Default Name

  // --- STATE GAME ---
  const [activeGameTab, setActiveGameTab] = useState("memory");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  // Memory Game State
  const [memIsPlaying, setMemIsPlaying] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [flippedCards, setFlippedCards] = useState<any[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [memScore, setMemScore] = useState(0);
  const [memTimeLeft, setMemTimeLeft] = useState(60);
  const [memGameOver, setMemGameOver] = useState(false);

  // Math Game State
  const [mathIsPlaying, setMathIsPlaying] = useState(false);
  const [mathQuestion, setMathQuestion] = useState({
    num1: 0,
    num2: 0,
    operator: "+",
    answer: 0,
    fruitIndex: 0,
  });
  const [mathOptions, setMathOptions] = useState<number[]>([]);
  const [mathScore, setMathScore] = useState(0);
  const [mathTimeLeft, setMathTimeLeft] = useState(45);
  const [mathGameOver, setMathGameOver] = useState(false);

  // --- FETCH USER NAME FROM SUPABASE ---
  useEffect(() => {
    const fetchProfileName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          loadPath(user.id);
          const { data } = await supabase
            .from("profiles")
            .select("full_name, xp, streak, last_active_date")
            .eq("id", user.id)
            .maybeSingle();
          if (data) {
            setXp(data.xp);
            // Streak hangus bila terakhir aktif sebelum kemarin
            const stillActive =
              data.last_active_date === localDate() ||
              data.last_active_date === localDate(-1);
            setStreak(stillActive ? data.streak : 0);
          }
          if (data?.full_name) {
            setUserName(data.full_name);
          } else if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
          } else if (user.email) {
            setUserName(user.email.split("@")[0]);
          }
        }
      } catch (error) {
        console.error("Gagal mengambil nama user:", error);
      }
    };
    fetchProfileName();
  }, []);

  // --- MODUL & PROGRES DARI DATABASE ---
  const loadPath = async (uid: string) => {
    const [modulesRes, questionsRes, progressRes] = await Promise.all([
      supabase.from("learning_modules").select("*").order("sort_order"),
      supabase.from("quiz_questions").select("*").order("sort_order"),
      supabase
        .from("module_progress")
        .select("module_id, status, best_score")
        .eq("user_id", uid),
    ]);

    if (modulesRes.error || questionsRes.error) {
      console.error("Gagal memuat modul:", modulesRes.error || questionsRes.error);
      toast({
        title: "Gagal memuat modul",
        description: "Periksa koneksi lalu muat ulang halaman.",
        variant: "destructive",
      });
      setIsLoadingModules(false);
      return;
    }

    const progress = new Map(
      (progressRes.data ?? []).map((row) => [row.module_id, row])
    );

    // Level terbuka bila itu level pertama atau level sebelumnya sudah selesai
    let previousCompleted = true;
    const built: PathModule[] = modulesRes.data.map((mod) => {
      const completed = progress.get(mod.id)?.status === "completed";
      const status = completed
        ? "completed"
        : previousCompleted
        ? "unlocked"
        : "locked";
      previousCompleted = completed;

      return {
        id: mod.id,
        title: mod.title,
        topic: mod.topic,
        status,
        position: mod.position,
        color: mod.color,
        bestScore: progress.get(mod.id)?.best_score ?? 0,
        material: {
          title: mod.material_title,
          content: mod.material_content,
          summary: mod.material_summary ?? "",
        },
        quiz: questionsRes.data
          .filter((question) => question.module_id === mod.id)
          .map((question) => ({
            q: question.question,
            options: question.options as string[],
            a: question.answer,
          })),
      };
    });

    setModulesState(built);
    setIsLoadingModules(false);
  };

  // Tambah XP dan perbarui streak harian di profil
  const recordActivity = async (xpGain: number) => {
    if (!userId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, streak, last_active_date")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return;

    const today = localDate();
    const newStreak =
      profile.last_active_date === today
        ? Math.max(profile.streak, 1)
        : profile.last_active_date === localDate(-1)
        ? profile.streak + 1
        : 1;
    const newXp = profile.xp + xpGain;

    const { error } = await supabase
      .from("profiles")
      .update({ xp: newXp, streak: newStreak, last_active_date: today })
      .eq("id", userId);
    if (error) {
      console.error("Gagal menyimpan XP:", error);
      return;
    }

    setXp(newXp);
    setStreak(newStreak);
  };

  const saveQuizResult = async (mod: PathModule, score: number) => {
    if (!userId) return;

    const [attemptRes, progressRes] = await Promise.all([
      supabase.from("quiz_attempts").insert({
        user_id: userId,
        module_id: mod.id,
        score,
        total: mod.quiz.length,
      }),
      supabase.from("module_progress").upsert({
        user_id: userId,
        module_id: mod.id,
        status: "completed",
        best_score: Math.max(mod.bestScore, score),
        completed_at: new Date().toISOString(),
      }),
    ]);

    if (attemptRes.error || progressRes.error) {
      console.error("Gagal menyimpan progres:", attemptRes.error || progressRes.error);
      toast({
        title: "Progres belum tersimpan",
        description: "Hasil kuis ini tidak tersimpan ke akun. Periksa koneksi.",
        variant: "destructive",
      });
      return;
    }

    await recordActivity(score * 10);
  };

  const saveGameScore = async (game: "memory" | "math", score: number, xpGain: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from("game_scores")
      .insert({ user_id: userId, game, score });
    if (error) {
      console.error("Gagal menyimpan skor game:", error);
      return;
    }

    await recordActivity(xpGain);
  };

  // --- AUDIO & TTS ---
  const playTone = (freq: number, duration: number) => {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = (volume / 100) * 0.1;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      applyIndonesianVoice(utterance);
      utterance.rate = 1.0;
      utterance.volume = volume / 100;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- GENERATE CERTIFICATE (DESAIN HOPE.AI PREMIUM DENGAN 3 LOGO) ---
  const handleDownloadCertificate = async () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      const centerX = width / 2;

      // --- PALET WARNA TEMA HOPE.AI ---
      const primaryBlue = "#2563EB"; // Warna Utama (Royal Blue)
      const accentPurple = "#000080"; // Warna Aksen (Purple-600)
      const textDark = "#1E293B"; // Warna Teks (Slate Dark)
      const textLight = "#64748B"; // Warna Teks Sekunder

      // 1. BACKGROUND PUTIH BERSIH
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, "F");

      // 2. ORNAMEN SUDUT GEOMETRIS
      // Kiri Atas
      doc.setFillColor(primaryBlue);
      doc.triangle(0, 0, 90, 0, 0, 90, "F");
      doc.setFillColor(accentPurple);
      doc.triangle(0, 0, 60, 0, 0, 60, "F");

      // Kanan Bawah (Cermin)
      doc.setFillColor(primaryBlue);
      doc.triangle(width, height, width - 90, height, width, height - 90, "F");
      doc.setFillColor(accentPurple);
      doc.triangle(width, height, width - 60, height, width, height - 60, "F");

      // 3. BINGKAI GANDA (Double Border)
      const marginOuter = 10;
      const marginInner = 13;

      // Bingkai Luar (Biru Tebal)
      doc.setDrawColor(primaryBlue);
      doc.setLineWidth(1.5);
      doc.rect(
        marginOuter,
        marginOuter,
        width - marginOuter * 2,
        height - marginOuter * 2
      );

      // Bingkai Dalam (Ungu Tipis)
      doc.setDrawColor(accentPurple);
      doc.setLineWidth(0.8);
      doc.rect(
        marginInner,
        marginInner,
        width - marginInner * 2,
        height - marginInner * 2
      );

      // 4. LENCANA (BADGE) "LULUSAN TERBAIK"
      const badgeX = width - 45;
      const badgeY = 45;
      const badgeRadius = 18;

      doc.setFillColor(accentPurple);
      doc.setDrawColor(accentPurple);
      doc.circle(badgeX, badgeY, badgeRadius, "FD");
      doc.setDrawColor("#FFFFFF");
      doc.setLineWidth(0.5);
      doc.circle(badgeX, badgeY, badgeRadius - 2, "S");
      doc.circle(badgeX, badgeY, badgeRadius - 4, "S");

      doc.setTextColor("#FFFFFF");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("LULUSAN", badgeX, badgeY - 2, { align: "center" });
      doc.setFontSize(11);
      doc.text("TERBAIK", badgeX, badgeY + 3, { align: "center" });
      doc.setFontSize(14);
      doc.text("★", badgeX, badgeY + 9, { align: "center" });

      // 5. KONTEN TEKS
      const contentStartY = 60;

      // Judul Sertifikat
      doc.setTextColor(primaryBlue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.text("CERTIFICATE", centerX, contentStartY, { align: "center" });

      doc.setTextColor(accentPurple);
      doc.setFontSize(18);
      doc.text("OF ACHIEVEMENT", centerX, contentStartY + 10, {
        align: "center",
      });

      // Garis Aksen Judul
      doc.setDrawColor(primaryBlue);
      doc.setLineWidth(0.5);
      doc.line(
        centerX - 40,
        contentStartY + 18,
        centerX + 40,
        contentStartY + 18
      );

      // Kata Pengantar
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(textLight);
      doc.text(
        "Sertifikat ini diberikan dengan bangga kepada:",
        centerX,
        contentStartY + 35,
        { align: "center" }
      );

      // NAMA PENERIMA (DINAMIS)
      doc.setFont("times", "bolditalic");
      doc.setFontSize(34);
      doc.setTextColor(textDark);
      doc.text(userName, centerX, contentStartY + 55, { align: "center" });

      // Garis Bawah Nama
      doc.setDrawColor(accentPurple);
      doc.setLineWidth(1);
      doc.line(
        centerX - 70,
        contentStartY + 62,
        centerX + 70,
        contentStartY + 62
      );

      // Deskripsi
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(textDark);
      doc.text(
        "Telah berhasil menyelesaikan seluruh jalur pembelajaran dan tantangan",
        centerX,
        contentStartY + 80,
        { align: "center" }
      );
      doc.text(
        "di aplikasi Pathly dengan dedikasi yang luar biasa.",
        centerX,
        contentStartY + 87,
        { align: "center" }
      );

      // 6. FOOTER (Tanggal & Tanda Tangan)
      const footerY = height - 45;

      // Tanggal (Kiri)
      const date = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.setFontSize(11);
      doc.setTextColor(textLight);
      doc.text("Diberikan pada:", 50, footerY - 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textDark);
      doc.text(date, 50, footerY + 5, { align: "center" });
      doc.setDrawColor(textLight);
      doc.setLineWidth(0.5);
      doc.line(30, footerY + 7, 70, footerY + 7);

      // Tanda Tangan (Kanan)
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textLight);
      doc.text("Direktur Hope.Ai", width - 50, footerY - 5, {
        align: "center",
      });
      doc.setFont("times", "italic");
      doc.setFontSize(16);
      doc.setTextColor(textDark);
      doc.text("Hope Admin", width - 50, footerY + 3, { align: "center" });
      doc.setDrawColor(textLight);
      doc.line(width - 70, footerY + 7, width - 30, footerY + 7);

      // --- 7. LOGO APLIKASI (PNC - HOPE.AI - PROTIC) ---
      try {
        // Path ke gambar (pastikan file ada di folder public/images/)
        const pncPath = "/images/Pnc.png";
        const hopePath = "/images/logo.png";
        const proticPath = "/images/Protic.png";

        // Muat semua gambar secara paralel
        const [pncImg, hopeImg, proticImg] = await Promise.all([
          loadImage(pncPath),
          loadImage(hopePath),
          loadImage(proticPath),
        ]);

        // Tentukan Lebar Target & Jarak Antar Logo
        const targetW_Side = 24; // Lebar untuk logo samping (PNC & Protic)
        const targetW_Center = 28; // Lebar untuk logo tengah (Hope.Ai) sedikit lebih besar
        const gap = 12; // Jarak antar logo (mm)

        // Hitung Tinggi Proporsional
        const pncH = (pncImg.height / pncImg.width) * targetW_Side;
        const hopeH = (hopeImg.height / hopeImg.width) * targetW_Center;
        const proticH = (proticImg.height / proticImg.width) * targetW_Side;

        // Tentukan Posisi Y Dasar (berdasarkan logo tertinggi agar sejajar vertikal tengah)
        const maxH = Math.max(pncH, hopeH, proticH);
        const baseY = height - marginInner - maxH - 10; // Posisi dari bawah

        // Hitung Posisi Y individu agar sejajar tengah secara vertikal
        const pncY = baseY + (maxH - pncH) / 2;
        const hopeY = baseY + (maxH - hopeH) / 2;
        const proticY = baseY + (maxH - proticH) / 2;

        // Hitung Posisi X
        const hopeX = centerX - targetW_Center / 2; // Tengah
        const pncX = hopeX - gap - targetW_Side; // Kiri dari tengah
        const proticX = hopeX + targetW_Center + gap; // Kanan dari tengah

        // Gambar Logo ke PDF
        doc.addImage(pncImg, "PNG", pncX, pncY, targetW_Side, pncH);
        doc.addImage(hopeImg, "PNG", hopeX, hopeY, targetW_Center, hopeH);
        doc.addImage(proticImg, "PNG", proticX, proticY, targetW_Side, proticH);
      } catch (e) {
        console.error("Gagal memuat salah satu logo:", e);
        // Fallback Teks jika gambar gagal dimuat
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(primaryBlue);
        doc.text("PNC | HOPE.AI | PROTIC", centerX, height - marginInner - 15, {
          align: "center",
        });
      }

      // 8. SIMPAN FILE
      doc.save("Sertifikat-Kelulusan-HopeAi.pdf");
      toast({
        title: "Sertifikat Siap! 🎓",
        description: "File PDF telah diunduh ke perangkat Anda.",
      });
    } catch (error) {
      console.error("Gagal membuat sertifikat:", error);
      toast({
        title: "Gagal Mengunduh",
        description: "Terjadi kesalahan teknis.",
        variant: "destructive",
      });
    }
  };
  // --- LOGIC PATHLY ---
  const handleNodeClick = (mod: any) => {
    if (mod.status === "locked") {
      toast({
        title: "Terkunci 🔒",
        description: "Selesaikan level sebelumnya!",
        variant: "destructive",
      });
      return;
    }
    setActiveModule(mod);
    setPathView("material");
    if (autoPlayAudio) readMaterial(mod);
  };

  // --- MODE SUARA PATHLY: materi dan soal dibacakan, jawaban bisa diucapkan ---
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  const questionText = (question: any, number: number, total: number) =>
    `Soal ${number} dari ${total}. ${question.q}. Pilihan: ` +
    question.options.map((opt: string, i: number) => `${optionLetters[i]}, ${opt}`).join(". ") +
    ".";

  const readMaterial = (mod: any) =>
    speak(`${mod.material.title}. ${mod.material.content}. Tips: ${mod.material.summary ?? ""}. Katakan mulai kuis bila sudah siap.`);

  const readQuestion = () => {
    if (!activeModule) return;
    speak(questionText(activeModule.quiz[qIndex], qIndex + 1, activeModule.quiz.length));
  };

  const startQuiz = (aloud: boolean) => {
    setPathView("quiz");
    if (aloud && activeModule) {
      speak(questionText(activeModule.quiz[qIndex], qIndex + 1, activeModule.quiz.length));
    }
  };

  const handlePathAnswer = (selected: string, aloud = autoPlayAudio) => {
    const currentQ = activeModule.quiz[qIndex];
    const isCorrect = selected === currentQ.a;
    // Hasil jawaban dan soal berikutnya diucapkan dalam satu giliran agar tidak saling memotong
    if (aloud) {
      const total = activeModule.quiz.length;
      const feedback = isCorrect ? "Benar!" : `Kurang tepat. Jawabannya ${currentQ.a}.`;
      const finalScore = pathScore + (isCorrect ? 1 : 0);
      speak(
        qIndex < total - 1
          ? `${feedback} ${questionText(activeModule.quiz[qIndex + 1], qIndex + 2, total)}`
          : `${feedback} Kuis selesai. Nilaimu ${finalScore} dari ${total}.`
      );
    }
    visualCue(isCorrect ? "Benar!" : "Kurang tepat", isCorrect ? "success" : "error");
    if (isCorrect) {
      setPathScore((prev) => prev + 1);
      toast({
        title: "Benar! 🎉",
        className: "bg-green-500 text-white border-none",
      });
    } else {
      toast({ title: "Kurang Tepat 😅", variant: "destructive" });
    }

    if (qIndex < activeModule.quiz.length - 1) {
      setQIndex((prev) => prev + 1);
    } else {
      setIsPathCompleted(true);
      confetti();
      const finalScore = pathScore + (isCorrect ? 1 : 0);
      saveQuizResult(activeModule, finalScore);

      // Unlock next level
      const idx = modulesState.findIndex((m) => m.id === activeModule.id);
      setModulesState(
        modulesState.map((m, i) => {
          if (i === idx) {
            return { ...m, status: "completed", bestScore: Math.max(m.bestScore, finalScore) };
          }
          if (i === idx + 1 && m.status === "locked") {
            return { ...m, status: "unlocked" };
          }
          return m;
        })
      );
    }
  };

  const resetPath = () => {
    setPathView("map");
    setActiveModule(null);
    setQIndex(0);
    setPathScore(0);
    setIsPathCompleted(false);
  };

  // Perintah suara di Pathly: "baca materi", "mulai kuis", "ulangi", lalu
  // "A" sampai "D" (atau isi pilihannya) untuk menjawab.
  useVoiceCommands((command) => {
    if (!activeModule || isPathCompleted) return false;

    if (pathView === "material") {
      if (/^(baca materi|bacakan materi|baca|bacakan|ulangi)$/.test(command)) {
        readMaterial(activeModule);
        return true;
      }
      if (/^(mulai kuis|mulai|kuis|lanjut)$/.test(command)) {
        startQuiz(true);
        return true;
      }
      return false;
    }

    if (pathView !== "quiz") return false;
    const current = activeModule.quiz[qIndex];

    if (/^(ulangi|ulang|bacakan soal|baca soal|baca|bacakan)$/.test(command)) {
      readQuestion();
      return true;
    }

    const choices: Record<string, number> = {
      a: 0, satu: 0, pertama: 0,
      b: 1, be: 1, dua: 1, kedua: 1,
      c: 2, ce: 2, tiga: 2, ketiga: 2,
      d: 3, de: 3, empat: 3, keempat: 3,
    };
    const word = command.replace(/^(jawab|pilih|pilihan|jawaban)\s+/, "");
    // Isi pilihan didahulukan: di soal berhitung "dua" berarti jawaban 2, bukan pilihan kedua
    const numberWords = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
    const plain = (text: string) => {
      const clean = text.toLowerCase().replace(/[.,!?]/g, "").trim();
      const asNumber = numberWords.indexOf(clean);
      return asNumber >= 0 ? String(asNumber) : clean;
    };
    let index = current.options.findIndex((opt: string) => plain(opt) === plain(word));
    if (index < 0) index = choices[word] ?? -1;
    if (index < 0 || index >= current.options.length) return false;

    handlePathAnswer(current.options[index], true);
    return true;
  });

  // --- LOGIC PLAYGROUND: MEMORY ---
  const startMemoryGame = () => {
    const shuffled = [...cardsData]
      .sort(() => Math.random() - 0.5)
      .map((card) => ({ ...card, isFlipped: false, isMatched: false }));
    setCards(shuffled);
    setMemIsPlaying(true);
    setMemGameOver(false);
    setMemScore(0);
    setMatchedCount(0);
    setMemTimeLeft(60);
    setFlippedCards([]);
  };

  const handleCardClick = (clickedCard: any) => {
    if (
      memGameOver ||
      clickedCard.isFlipped ||
      clickedCard.isMatched ||
      flippedCards.length >= 2
    )
      return;
    const newCards = cards.map((c) =>
      c.id === clickedCard.id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);
    playTone(400, 0.1);
    const newFlipped = [...flippedCards, clickedCard];
    setFlippedCards(newFlipped);
    if (newFlipped.length === 2) {
      const [card1, card2] = newFlipped;
      if (card1.matchId === card2.matchId) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === card1.id || c.id === card2.id
                ? { ...c, isMatched: true }
                : c
            )
          );
          setFlippedCards([]);
          setMemScore((prev) => prev + 20);
          setMatchedCount((prev) => {
            const newCount = prev + 1;
            if (newCount === cardsData.length / 2) {
              setMemGameOver(true);
              setMemIsPlaying(false);
              confetti();
              playTone(600, 0.2);
              visualCue("Semua pasangan ditemukan!", "success");
            }
            return newCount;
          });
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === card1.id || c.id === card2.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (memIsPlaying && memTimeLeft > 0 && !memGameOver) {
      timer = setInterval(() => setMemTimeLeft((prev) => prev - 1), 1000);
    } else if (memTimeLeft === 0 && memIsPlaying) {
      setMemGameOver(true);
      setMemIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [memIsPlaying, memTimeLeft, memGameOver]);

  // --- LOGIC PLAYGROUND: MATH ---
  const generateMathQuestion = () => {
    const fruitIdx = Math.floor(Math.random() * fruitIcons.length);
    const operators = ["+", "-"];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1 = Math.floor(Math.random() * 9) + 1;
    let num2 = Math.floor(Math.random() * 9) + 1;
    if (operator === "-" && num1 < num2) [num1, num2] = [num2, num1];
    const answer = operator === "+" ? num1 + num2 : num1 - num2;

    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const wrong = answer + Math.floor(Math.random() * 8) - 4;
      if (wrong >= 0 && wrong !== answer && wrong <= 20) options.add(wrong);
    }
    setMathQuestion({ num1, num2, operator, answer, fruitIndex: fruitIdx });
    setMathOptions(Array.from(options).sort(() => Math.random() - 0.5));
    const fruitName = fruitIcons[fruitIdx].name;
    const opText = operator === "+" ? "ditambah" : "dikurang";
    speak(
      `${num1} ${fruitName} ${opText} ${num2} ${fruitName}, sama dengan berapa?`
    );
  };

  const startMathGame = () => {
    setMathIsPlaying(true);
    setMathGameOver(false);
    setMathScore(0);
    setMathTimeLeft(45);
    generateMathQuestion();
  };

  const handleMathAnswer = (selected: number) => {
    if (selected === mathQuestion.answer) {
      setMathScore((prev) => prev + 10);
      playTone(800, 0.1);
      visualCue("Benar!", "success");
      toast({
        title: "Benar! 👍",
        duration: 500,
        className: "bg-green-500 text-white border-none",
      });
      generateMathQuestion();
    } else {
      playTone(200, 0.3);
      visualCue("Salah", "error");
      toast({ title: "Salah! 😅", duration: 500, variant: "destructive" });
      setMathTimeLeft((prev) => Math.max(0, prev - 3));
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mathIsPlaying && mathTimeLeft > 0 && !mathGameOver) {
      timer = setInterval(() => setMathTimeLeft((prev) => prev - 1), 1000);
    } else if (mathTimeLeft === 0 && mathIsPlaying) {
      setMathGameOver(true);
      setMathIsPlaying(false);
      if (mathScore > 50) confetti();
    }
    return () => clearInterval(timer);
  }, [mathIsPlaying, mathTimeLeft, mathGameOver]);

  // Simpan skor ke akun begitu permainan berakhir
  useEffect(() => {
    if (!memGameOver) return;
    const allMatched = matchedCount === cardsData.length / 2;
    saveGameScore("memory", memScore, memScore + (allMatched ? 50 : 0));
  }, [memGameOver]);

  useEffect(() => {
    if (!mathGameOver) return;
    saveGameScore("math", mathScore, mathScore);
  }, [mathGameOver]);

  return (
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* --- MAIN MENU (SELECTION) --- */}
        {mainMode === "menu" && (
          <div>
            <PageHeader
              title="Pathly"
              description="Mau belajar bertahap atau bermain sambil mengasah otak? Kamu yang menentukan."
              art="pathly"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl">
              {/* CARD: AYO BELAJAR */}
              <Card
                {...clickable(() => setMainMode("path"))}
                className="px-card cursor-pointer p-6 min-h-56 flex flex-col items-center justify-center text-center"
              >
                <div className="px-tile p-4 mb-5" aria-hidden="true">
                  <MapPin className="w-10 h-10" />
                </div>
                <h2 className="px-title text-base mb-2">Ayo Belajar</h2>
                <p className="text-muted-foreground text-lg">Ikuti peta materi dan kuis terstruktur.</p>
              </Card>

              {/* CARD: AYO BERMAIN */}
              <Card
                {...clickable(() => setMainMode("arena"))}
                className="px-card cursor-pointer p-6 min-h-56 flex flex-col items-center justify-center text-center"
              >
                <div className="px-tile p-4 mb-5" aria-hidden="true">
                  <Gamepad2 className="w-10 h-10" />
                </div>
                <h2 className="px-title text-base mb-2">Ayo Bermain</h2>
                <p className="text-muted-foreground text-lg">Asah otak dengan mini-games seru.</p>
              </Card>
            </div>
          </div>
        )}

        {/* --- MAIN MODE: PATHLY (JALUR BELAJAR) --- */}
        {mainMode === "path" && (
          <AnimatePresence mode="wait">
            {/* Back Button */}
            <div className="mb-6">
              <Button className="px-btn"
                variant="outline"
                onClick={() => {
                  setMainMode("menu");
                  resetPath();
                }}
              >
                <ArrowRight className="rotate-180 mr-2" aria-hidden="true" /> Kembali ke Menu
              </Button>
            </div>

            {/* VIEW 1: MAP */}
            {pathView === "map" &&
              (() => {
                const generatePathData = (mods: any[]) => {
                  if (mods.length < 2) return "";
                  const getX = (pos: string) =>
                    pos === "left" ? 20 : pos === "right" ? 80 : 50;
                  const Y_UNIT = 100;
                  let d = `M ${getX(mods[0].position)} ${Y_UNIT / 2}`;

                  for (let i = 0; i < mods.length - 1; i++) {
                    const currentX = getX(mods[i].position);
                    const nextX = getX(mods[i + 1].position);
                    const nextY = (i + 1) * Y_UNIT + Y_UNIT / 2;
                    const cpY = i * Y_UNIT + Y_UNIT;
                    d += ` C ${currentX} ${cpY}, ${nextX} ${cpY}, ${nextX} ${nextY}`;
                  }
                  return d;
                };

                return (
                  <motion.div
                    key="map"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-xl mx-auto relative z-10 text-center"
                  >
                    <h1 className="px-title text-lg md:text-2xl mb-2">Peta Belajar</h1>
                    <p className="text-muted-foreground mb-12">
                      Selesaikan setiap level untuk membuka materi baru.
                    </p>

                    {/* Container Peta */}
                    <div className="relative flex flex-col gap-16 pb-20 mt-10 w-full">
                      {/* --- SVG JALUR DINAMIS --- */}
                      <svg
                        className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none"
                        viewBox={`0 0 100 ${modulesState.length * 100}`}
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d={generatePathData(modulesState)}
                          stroke="currentColor"
                          strokeWidth="5"
                          fill="none"
                          strokeDasharray="10, 12"
                          strokeLinecap="butt"
                          className="text-foreground/35"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {isLoadingModules && (
                        <p className="text-center text-muted-foreground" role="status">
                          Memuat peta belajar…
                        </p>
                      )}

                      {/* --- RENDER TITIK LEVEL (NODES) --- */}
                      {modulesState.map((mod) => (
                        <div
                          key={mod.id}
                          className={`flex w-full relative z-10 ${
                            mod.position === "left"
                              ? "justify-start md:pl-[10%]"
                              : mod.position === "right"
                              ? "justify-end md:pr-[10%]"
                              : "justify-center"
                          }`}
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleNodeClick(mod)}
                            className={`
                              w-24 h-24 md:w-28 md:h-28 flex flex-col items-center justify-center border-4 border-foreground shadow-[5px_5px_0_hsl(var(--foreground)/0.3)] relative focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-500
                              ${
                                mod.status === "locked"
                                  ? "bg-slate-200 text-slate-500"
                                  : mod.status === "completed"
                                  ? "bg-amber-300 text-[#0a1a4f]"
                                  : `${moduleColor(mod.color)} text-white`
                              }
                            `}
                          >
                            {mod.status === "locked" ? (
                              <Lock className="w-8 h-8" />
                            ) : mod.status === "completed" ? (
                              <CheckCircle2 className="w-10 h-10" />
                            ) : (
                              <Star className="w-10 h-10 fill-current animate-pulse" />
                            )}
                            <div className="absolute -bottom-11 bg-card text-foreground px-3 py-1.5 text-sm font-bold whitespace-nowrap border-[3px] border-foreground z-20">
                              {mod.title}
                            </div>
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

            {/* VIEW 2: MATERIAL */}
            {pathView === "material" && activeModule && (
              <motion.div
                key="material"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="max-w-2xl mx-auto pt-4"
              >
                <Card className="px-card p-5 md:p-8 relative">
                  <Button
                    variant="ghost"
                    className="px-btn absolute top-3 left-3 h-11 w-11 p-0"
                    aria-label="Tutup materi, kembali ke peta"
                    onClick={() => setPathView("map")}
                  >
                    <X aria-hidden="true" />
                  </Button>
                  <div className="text-center space-y-6 mt-4">
                    <div
                      className={`w-20 h-20 mx-auto border-[3px] border-foreground flex items-center justify-center text-white ${moduleColor(activeModule.color)}`}
                    >
                      <BookOpen className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold">
                      {activeModule.material.title}
                    </h2>
                    <p className="text-lg text-foreground/85 leading-relaxed">
                      {activeModule.material.content}
                    </p>
                    <div className="bg-amber-100 text-[#0a1a4f] p-4 font-bold border-[3px] border-foreground/40">
                      Tips: {activeModule.material.summary}
                    </div>
                    <Button
                      size="lg"
                      className="px-btn w-full h-14 text-lg mt-4 bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                      onClick={() => startQuiz(autoPlayAudio)}
                    >
                      Mulai Kuis <ChevronRight className="ml-2" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      className="px-btn w-full"
                      onClick={() => readMaterial(activeModule)}
                    >
                      <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Bacakan Materi
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* VIEW 3: QUIZ */}
            {pathView === "quiz" && activeModule && !isPathCompleted && (
              <motion.div
                key="quiz"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-xl mx-auto pt-4"
              >
                <Card className="px-card p-5 md:p-8">
                  <div className="flex justify-between items-center mb-8">
                    <span className="px-title text-xs text-muted-foreground">
                      Soal {qIndex + 1} / {activeModule.quiz.length}
                    </span>
                    <Button className="px-btn" variant="ghost" size="sm" onClick={resetPath}>
                      Keluar
                    </Button>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-center mb-4 leading-snug" aria-live="polite">
                    {activeModule.quiz[qIndex].q}
                  </h2>
                  <div className="flex justify-center gap-2 mb-8">
                    <Button className="px-btn" variant="outline" size="sm" onClick={readQuestion}>
                      <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Bacakan Soal
                    </Button>
                    {!needs.includes("wicara") && (
                      <Button className="px-btn"
                        variant="outline"
                        size="sm"
                        onClick={requestVoiceInput}
                        aria-label="Jawab dengan suara. Katakan A, B, C, atau D."
                      >
                        <Mic className="w-4 h-4 mr-2" aria-hidden="true" /> Jawab dengan Suara
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4" role="group" aria-label="Pilihan jawaban">
                    {activeModule.quiz[qIndex].options.map(
                      (opt: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => handlePathAnswer(opt)}
                          className="px-card p-4 text-lg font-bold text-left flex items-center gap-3"
                        >
                          <span
                            className="px-tile px-title w-9 h-9 flex-shrink-0 text-xs flex items-center justify-center"
                            aria-hidden="true"
                          >
                            {optionLetters[i]}
                          </span>
                          <span>
                            <span className="sr-only">Pilihan {optionLetters[i]}: </span>
                            {opt}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* VIEW 4: COMPLETED (LEVEL / ALL LEVELS) */}
            {isPathCompleted && (
              <motion.div
                key="completed"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="max-w-md mx-auto pt-20 text-center"
              >
                {/* Logika Pengecekan Tamat */}
                {modulesState.every((m) => m.status === "completed") ? (
                  <>
                    <div className="px-tile w-32 h-32 flex items-center justify-center mx-auto mb-6">
                      <Crown className="w-16 h-16 animate-bounce" aria-hidden="true" />
                    </div>
                    <h1 className="px-title text-lg md:text-xl mb-3">Selamat! Kamu Tamat!</h1>
                    <p className="text-muted-foreground mb-8 text-lg">
                      Luar biasa! Kamu telah menyelesaikan semua tantangan.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button
                        size="lg"
                        className="px-btn w-full h-14 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                        onClick={handleDownloadCertificate}
                      >
                        Unduh Sertifikat
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="px-btn w-full h-14 text-lg"
                        onClick={() => {
                          resetPath();
                          toast({
                            title: "Main Lagi",
                            description: "Semua level terbuka. Pilih level mana pun untuk diulang!",
                          });
                        }}
                      >
                        <RefreshCcw className="w-5 h-5 mr-2" /> Main Ulang
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-tile w-32 h-32 flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-16 h-16 animate-bounce" aria-hidden="true" />
                    </div>
                    <h1 className="px-title text-lg md:text-xl mb-3">Level Selesai!</h1>
                    <p className="text-muted-foreground mb-8 text-lg">
                      Kamu mendapatkan +100 XP
                    </p>
                    <Button
                      size="lg"
                      className="px-btn w-full h-14 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                      onClick={resetPath}
                    >
                      Kembali ke Peta
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* --- MAIN MODE: ARENA (GAME PLAYGROUND) --- */}
        {mainMode === "arena" && (
          <div>
            {/* Back Button */}
            <div className="mb-6 flex justify-between items-center">
              <Button className="px-btn" variant="outline" onClick={() => setMainMode("menu")}>
                <ArrowRight className="rotate-180 mr-2" aria-hidden="true" /> Kembali ke Menu
              </Button>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="px-card p-4 flex items-center gap-3">
                <Flame className="w-8 h-8 text-orange-500 fill-orange-500 animate-pulse" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">
                    Streak
                  </p>
                  <p className="text-xl font-bold text-orange-600">
                    {streak} Hari
                  </p>
                </div>
              </Card>
              <Card className="px-card p-4 flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">
                    Total XP
                  </p>
                  <p className="text-xl font-bold text-blue-600">{xp}</p>
                </div>
              </Card>
              <Card className="px-card p-4 flex items-center gap-3 md:col-span-2">
                <Trophy className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">
                    Liga Saat Ini
                  </p>
                  <p className="text-xl font-bold text-purple-600">Berlian</p>
                </div>
              </Card>
            </div>

            {/* Game Tabs */}
            <Tabs
              value={activeGameTab}
              onValueChange={setActiveGameTab}
              className="w-full"
            >
              <TabsList className="px-tabs grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="memory"
                  className="px-tab text-base md:text-lg"
                >
                  <Brain className="w-5 h-5 mr-2" /> Memory Match
                </TabsTrigger>
                <TabsTrigger
                  value="math"
                  className="px-tab text-base md:text-lg"
                >
                  <Calculator className="w-5 h-5 mr-2" /> Math Whiz
                </TabsTrigger>
              </TabsList>

              {/* GAME: MEMORY MATCH */}
              <TabsContent value="memory">
                <Card className="px-card p-4 md:p-6 min-h-[550px] relative overflow-hidden">
                  {!memIsPlaying && !memGameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 p-8 text-center">
                      <div className="px-tile w-20 h-20 flex items-center justify-center mb-6">
                        <Brain className="w-10 h-10" aria-hidden="true" />
                      </div>
                      <h1 className="px-title text-lg md:text-xl mb-3">Memory Match</h1>
                      <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-md leading-relaxed">
                        Latih ingatanmu dengan mencocokkan pasangan kartu dengan
                        simbol dan teks yang sama sebelum waktu habis!
                      </p>
                      <Button
                        size="lg"
                        onClick={startMemoryGame}
                        className="px-btn px-10 h-14 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                      >
                        Mulai Main
                      </Button>
                    </div>
                  )}

                  <div className="px-well flex justify-between items-center mb-6 p-3">
                    <div className="flex items-center gap-3">
                      <Timer className="w-6 h-6 text-slate-500" />
                      <span
                        className={`text-2xl font-mono font-bold ${
                          memTimeLeft < 10 ? "text-red-500 animate-pulse" : ""
                        }`}
                      >
                        {memTimeLeft}s
                      </span>
                    </div>
                    <div className="px-tile px-title px-3 py-2 text-xs md:text-sm">
                      Score: {memScore}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    {cards.map((card) => (
                      <motion.div
                        key={card.id}
                        layout
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        {...clickable(
                          () => handleCardClick(card),
                          card.isFlipped || card.isMatched ? `Kartu ${card.content}` : "Kartu tertutup"
                        )}
                        className={`aspect-square cursor-pointer flex items-center justify-center text-center p-2 text-sm md:text-xl font-bold border-[3px] border-foreground select-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                          card.isMatched
                            ? "bg-green-100 text-green-700 opacity-60"
                            : card.isFlipped
                            ? "bg-white text-slate-800"
                            : "bg-[#2f6fe4] text-white shadow-[3px_3px_0_hsl(var(--foreground)/0.3)]"
                        }`}
                      >
                        {card.isFlipped || card.isMatched ? (
                          <div className="flex flex-col items-center">
                            <span className="text-3xl mb-1">
                              {card.type === "icon" ? card.content : ""}
                            </span>
                            <span className="text-sm">
                              {card.type === "text" ? card.content : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="px-title text-xl opacity-60">?</span>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {memGameOver && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 p-8 text-center"
                      >
                        <h2 className="px-title text-lg md:text-xl mb-5">
                          {matchedCount === cardsData.length / 2
                            ? "Luar Biasa!"
                            : "Waktu Habis!"}
                        </h2>
                        <Button
                          size="lg"
                          onClick={startMemoryGame}
                          className="px-btn gap-2 px-8 h-12 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                        >
                          <RefreshCcw className="w-5 h-5" /> Main Lagi
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </TabsContent>

              {/* GAME: MATH WHIZ */}
              <TabsContent value="math">
                <Card className="px-card p-4 md:p-6 min-h-[550px] relative overflow-hidden">
                  {!mathIsPlaying && !mathGameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 p-8 text-center">
                      <div className="px-tile w-20 h-20 flex items-center justify-center mb-6">
                        <Calculator className="w-10 h-10" aria-hidden="true" />
                      </div>
                      <h1 className="px-title text-lg md:text-xl mb-3">Math Whiz</h1>
                      <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-md leading-relaxed">
                        Asah kemampuan berhitungmu! Jumlahkan atau kurangkan
                        buah-buahan tersebut dan pilih jawaban yang benar.
                      </p>
                      <Button
                        size="lg"
                        onClick={startMathGame}
                        className="px-btn px-10 h-14 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                      >
                        Mulai Berhitung
                      </Button>
                    </div>
                  )}

                  <div className="px-well flex justify-between items-center mb-8 p-3">
                    <div className="flex items-center gap-2 text-red-600 px-2 py-1">
                      <Timer className="w-6 h-6" />
                      <span className="text-2xl font-mono font-bold">
                        {mathTimeLeft}s
                      </span>
                    </div>
                    <div className="px-tile px-title px-3 py-2 text-xs md:text-sm">
                      {mathScore} Pts
                    </div>
                  </div>

                  <div className="max-w-2xl mx-auto mb-12">
                    <motion.div
                      key={mathQuestion.num1 + mathQuestion.operator}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 p-5 bg-muted/40 border-[3px] border-dashed border-foreground/40"
                    >
                      <FruitDisplay
                        count={mathQuestion.num1}
                        fruitIndex={mathQuestion.fruitIndex}
                      />
                      <div className="text-4xl font-black text-foreground bg-card w-14 h-14 flex items-center justify-center border-[3px] border-foreground">
                        {mathQuestion.operator}
                      </div>
                      <FruitDisplay
                        count={mathQuestion.num2}
                        fruitIndex={mathQuestion.fruitIndex}
                      />
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-5xl font-black">=</div>
                        <div className="px-tile w-20 h-20 flex items-center justify-center text-5xl font-bold animate-pulse">
                          ?
                        </div>
                      </div>
                    </motion.div>
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          speak(
                            `${mathQuestion.num1} ${
                              fruitIcons[mathQuestion.fruitIndex].name
                            } ${
                              mathQuestion.operator === "+"
                                ? "ditambah"
                                : "dikurang"
                            } ${mathQuestion.num2} ${
                              fruitIcons[mathQuestion.fruitIndex].name
                            }, sama dengan berapa?`
                          )
                        }
                        className="px-btn gap-2"
                      >
                        <Volume2 className="w-5 h-5" aria-hidden="true" /> Dengarkan Soal
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    {mathOptions.map((opt, idx) => (
                      <motion.button
                        key={`${mathQuestion.num1}-${idx}`}
                        onClick={() => handleMathAnswer(opt)}
                        className="px-card h-24 text-4xl font-black flex items-center justify-center"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {mathGameOver && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 p-8 text-center"
                      >
                        <h2 className="px-title text-lg md:text-xl mb-3">Selesai!</h2>
                        <p className="text-muted-foreground mb-4 text-lg">
                          Skor Akhir Kamu:
                        </p>
                        <div className="px-title text-4xl text-[#1a8f43] mb-10">
                          {mathScore}
                        </div>
                        <Button
                          size="lg"
                          onClick={startMathGame}
                          className="px-btn gap-2 px-10 h-14 text-lg bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90"
                        >
                          <RefreshCcw className="w-6 h-6" /> Coba Lagi
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
