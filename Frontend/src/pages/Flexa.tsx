import { API_URL, authHeaders } from "@/lib/api";
import { speak, stopSpeech } from "@/lib/speech";
import { clickable } from "@/lib/a11y";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import DocumentQuiz from "@/components/DocumentQuiz";
import {
  BookOpen,
  Volume2,
  Type,
  FileText,
  ChevronRight,
  ArrowLeft,
  BrainCircuit,
  GraduationCap,
  Trophy,
  PlayCircle,
  PauseCircle,
  Upload,
  Loader2,
  Sparkles,
  HandMetal,
  Image as ImageIcon,
  Video,
  Languages,
  Share2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext"; // Import Settings Context

// Info tampilan tiap tingkat. Isi materi (tabel materials) dan kamus isyarat
// (tabel sign_items) dibaca dari database.
const learningPath = {
  mudah: {
    title: "Tingkat Dasar",
    description: "Fondasi awal untuk pemula. Pelajari konsep-konsep sederhana.",
    icon: <BookOpen className="w-12 h-12 text-green-500" />,
    color: "bg-green-100 text-green-700",
  },
  menengah: {
    title: "Tingkat Menengah",
    description:
      "Tantangan lebih lanjut. Mulai memahami hubungan antar konsep.",
    icon: <GraduationCap className="w-12 h-12 text-yellow-500" />,
    color: "bg-yellow-100 text-yellow-700",
  },
  sulit: {
    title: "Tingkat Lanjut",
    description: "Analisis mendalam dan konsep kompleks untuk ahli.",
    icon: <Trophy className="w-12 h-12 text-red-500" />,
    color: "bg-red-100 text-red-700",
  },
};

type LevelKey = keyof typeof learningPath;
type SignCategory = "abjad" | "angka";
// documentId terisi bila bab ini adalah dokumen milik pengguna (unggahan atau hasil pindai)
type Chapter = { id: string; title: string; content: string; documentId?: string };
type SignItem = {
  id: string;
  title: string;
  desc: string;
  img: string;
  video: string;
};
type SavedDocument = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
};

export default function Flexa() {
  const { toast } = useToast();

  // State Navigasi
  const [currentView, setCurrentView] = useState<
    "levels" | "chapters" | "detail" | "sign-menu" | "sign-detail"
  >("levels");

  // State Data
  const [selectedLevel, setSelectedLevel] = useState<LevelKey | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedSignCategory, setSelectedSignCategory] =
    useState<SignCategory>("abjad");
  const [selectedSignItem, setSelectedSignItem] = useState<SignItem | null>(
    null
  );

  // Data dari database
  const [chaptersByLevel, setChaptersByLevel] = useState<Record<LevelKey, Chapter[]>>({
    mudah: [],
    menengah: [],
    sulit: [],
  });
  const [signLanguageData, setSignLanguageData] = useState<Record<SignCategory, SignItem[]>>({
    abjad: [],
    angka: [],
  });
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Ringkasan AI per materi, kuis, dan navigasi ke NeoTutor
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // State Fitur Lain
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textSize, setTextSize] = useState<"normal" | "large" | "extra">(
    "normal"
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [signMediaTab, setSignMediaTab] = useState("image");

  // Settings
  const { volume, speakingRate, autoPlayAudio, aiVoice } = useSettings();

  // --- MUAT MATERI, KAMUS ISYARAT, DAN DOKUMEN PENGGUNA ---
  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("user_documents")
      .select("id, title, content, source, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Gagal memuat dokumen:", error);
      return;
    }
    setDocuments(
      data.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        source: row.source,
        createdAt: row.created_at,
      }))
    );
  };

  useEffect(() => {
    const loadContent = async () => {
      const [materialsRes, signsRes] = await Promise.all([
        supabase
          .from("materials")
          .select("slug, level, title, content")
          .order("sort_order"),
        supabase
          .from("sign_items")
          .select("slug, category, title, description, image_url, video_url")
          .order("sort_order"),
      ]);

      if (materialsRes.error || signsRes.error) {
        console.error("Gagal memuat materi:", materialsRes.error || signsRes.error);
        toast({
          variant: "destructive",
          title: "Gagal memuat materi",
          description: "Periksa koneksi lalu muat ulang halaman.",
        });
        return;
      }

      const chapters: Record<LevelKey, Chapter[]> = { mudah: [], menengah: [], sulit: [] };
      for (const row of materialsRes.data) {
        chapters[row.level as LevelKey]?.push({
          id: row.slug,
          title: row.title,
          content: row.content,
        });
      }
      setChaptersByLevel(chapters);

      const signs: Record<SignCategory, SignItem[]> = { abjad: [], angka: [] };
      for (const row of signsRes.data) {
        signs[row.category as SignCategory]?.push({
          id: row.slug,
          title: row.title,
          desc: row.description,
          img: row.image_url ?? "",
          video: row.video_url ?? "",
        });
      }
      setSignLanguageData(signs);
    };

    loadContent();
    loadDocuments();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  // --- FUNGSI HELPER ---
  const speakText = (text: string) => {
    speak(text, {
      volume,
      rate: speakingRate,
      aiVoice,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const cleanMarkdown = (text) => {
    if (!text) return "";
    return (
      text
        // Hapus header markdown (###) dan bold/italic (* atau _)
        .replace(/[#*`_~]/g, "")
        // Hapus garis horizontal (---)
        .replace(/---/g, "")
        // Ganti/Hapus HTML entities (&lt; menjadi kosong agar tidak dibaca "less than")
        .replace(/&lt;/g, "")
        .replace(/&gt;/g, "")
        // Hapus tag HTML jika ada (<br>, <div>, dll)
        .replace(/<\/?[^>]+(>|$)/g, "")
        // Hapus spasi berlebih menjadi satu spasi saja
        .replace(/\s+/g, " ")
        .trim()
    );
  };
  const stopSpeaking = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  const generateSummary = (text: string) => {
    const sentences = text.split(". ");
    return (
      sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "..." : ".")
    );
  };

  // --- NAVIGASI ---
  const handleLevelSelect = (level: LevelKey) => {
    setSelectedLevel(level);
    setCurrentView("chapters");
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setCurrentView("detail");
    stopSpeaking();
    setActiveTab("text");
  };

  const handleSignItemSelect = (item: SignItem) => {
    setSelectedSignItem(item);
    setCurrentView("sign-detail");
    setSignMediaTab("image");
  };

  const handleNextSignItem = () => {
    if (!selectedSignItem) return;
    const currentIndex = signLanguageData[selectedSignCategory].findIndex(
      (item) => item.id === selectedSignItem.id
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex < signLanguageData[selectedSignCategory].length) {
      setSelectedSignItem(signLanguageData[selectedSignCategory][nextIndex]);
    } else {
      toast({
        title: "Selesai!",
        description: "Anda telah mencapai akhir kategori ini.",
      });
    }
  };

  const goBack = () => {
    stopSpeaking();
    if (currentView === "detail") {
      if (selectedChapter?.id === "custom-upload") setCurrentView("levels");
      else setCurrentView("chapters");
    } else if (currentView === "chapters") setCurrentView("levels");
    else if (currentView === "sign-menu") setCurrentView("levels");
    else if (currentView === "sign-detail") setCurrentView("sign-menu");
  };

  const sanitizeText = (raw: string) => {
    // Teks ditampilkan React sebagai teks biasa (bukan HTML), jadi tanda < dan >
    // aman dan tidak perlu di-escape. Yang dirapikan hanya penanda Markdown.
    return raw
      .replace(/\*/g, "•")
      .replace(/#/g, " ");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    toast({
      title: "Mengunggah Dokumen...",
      description: "Sedang mengirim ke server untuk ekstraksi teks.",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/scan/extract`, {
        method: "POST",
        headers: await authHeaders(),
        body: formData,
      });

      // Cek apakah JSON atau bukan
      const contentType = response.headers.get("content-type") || "";

      let data: any;

      if (contentType.includes("application/json")) {
        // Backend ngembaliin JSON → aman di-parse
        data = await response.json();
      } else {
        // Backend ngembaliin plain text → jangan parse JSON
        const textResult = await response.text();

        // Bungkus supaya tetap konsisten
        data = { text: textResult };
      }

      if (!response.ok) {
        throw new Error(data.text || "Gagal mengekstrak dokumen.");
      }

      // Ambil teks hasil ekstraksi
      const extractedText =
        data.text ||
        data.content ||
        data.result ||
        "Tidak ada teks yang berhasil diekstrak.";

      const cleanedText = sanitizeText(extractedText);

      const customChapter: Chapter = {
        id: "custom-upload",
        title: file.name,
        content: cleanedText,
      };

      setSelectedChapter(customChapter);
      setCurrentView("detail");

      // Simpan ke akun supaya bisa dibuka lagi tanpa mengunggah ulang
      if (userId) {
        const { data: saved, error: saveError } = await supabase
          .from("user_documents")
          .insert({
            user_id: userId,
            source: "upload",
            title: file.name,
            content: cleanedText,
          })
          .select("id")
          .single();
        if (saveError) {
          console.error("Gagal menyimpan dokumen:", saveError);
        } else {
          // Dengan id ini dokumen bisa ditanyakan ke NeoTutor
          setSelectedChapter({ ...customChapter, documentId: saved.id });
          loadDocuments();
        }
      }

      toast({
        title: "Selesai!",
        description: "Materi siap dipelajari.",
      });
    } catch (error: any) {
      console.error("Upload Error:", error);

      toast({
        variant: "destructive",
        title: "Gagal Mengunggah",
        description: error?.message ?? "Terjadi kesalahan.",
      });
    } finally {
      setIsProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (
      currentView === "detail" &&
      selectedChapter &&
      autoPlayAudio &&
      !isSpeaking
    ) {
      speakText(selectedChapter.content);
    }
  }, [currentView, selectedChapter, autoPlayAudio]);

  // Ringkasan dibuat AI saat tab Ringkasan pertama kali dibuka, lalu disimpan sementara
  const summaryKey = selectedChapter
    ? selectedChapter.documentId ?? `${selectedChapter.id}:${selectedChapter.title}`
    : "";

  useEffect(() => {
    if (activeTab !== "summary" || !selectedChapter || summaries[summaryKey]) return;
    let cancelled = false;

    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      try {
        const response = await fetch(`${API_URL}/gemini/summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ text: selectedChapter.content }),
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        if (!cancelled && data.message) {
          setSummaries((prev) => ({ ...prev, [summaryKey]: data.message }));
        }
      } catch (error) {
        console.error("Gagal membuat ringkasan:", error);
        // Cadangan bila AI gagal: tampilkan kalimat pembuka materi
        if (!cancelled) {
          setSummaries((prev) => ({
            ...prev,
            [summaryKey]: generateSummary(selectedChapter.content),
          }));
        }
      } finally {
        if (!cancelled) setIsSummaryLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [activeTab, summaryKey]);

  // Membuka NeoTutor dengan materi ini sebagai dasar jawabannya
  const askTutor = () => {
    if (!selectedChapter) return;
    stopSpeaking();
    const isDocument = selectedChapter.id === "custom-upload";
    navigate("/neotutor", {
      state: {
        context: {
          type: isDocument ? "document" : "material",
          id: isDocument ? selectedChapter.documentId : selectedChapter.id,
          title: selectedChapter.title,
        },
      },
    });
  };

  // ==================================================================================
  // RENDER: DASHBOARD
  // ==================================================================================
  if (currentView === "levels") {
    return (
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Pusat Belajar Flexa
          </h1>
          <p className="text-muted-foreground text-lg">
            Akses materi inklusif, kamus isyarat, atau unggah dokumenmu sendiri.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(Object.keys(learningPath) as LevelKey[]).map((key) => (
            <motion.div
              key={key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`p-6 cursor-pointer h-full flex flex-col items-center text-center hover:shadow-xl transition-all border-2 border-transparent hover:border-primary/20 ${
                  learningPath[key].color.replace("text-", "bg-").split(" ")[0]
                }/10`}
                {...clickable(() => handleLevelSelect(key))}
              >
                <div
                  className={`p-4 rounded-full mb-4 ${learningPath[key].color} bg-white shadow-sm`}
                >
                  {learningPath[key].icon}
                </div>
                <h2 className="text-xl font-bold mb-2 capitalize">
                  {learningPath[key].title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {learningPath[key].description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div whileHover={{ scale: 1.02 }} className="group">
            <Card
              className="relative p-8 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background cursor-pointer h-full overflow-hidden hover:border-primary transition-all shadow-sm hover:shadow-md"
              {...clickable(() => setCurrentView("sign-menu"))}
            >
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Languages className="w-40 h-40 text-primary" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <HandMetal className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      Kamus Digital Isyarat
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Pelajari SIBI & BISINDO dengan panduan visual modern.
                    Tingkatkan komunikasi inklusifmu.
                  </p>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-primary/20 shadow-lg">
                  Buka Kamus
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="group">
            <Card className="relative p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 dark:bg-slate-900/10 h-full flex flex-col justify-center items-center text-center cursor-pointer hover:border-primary transition-all">
              <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-full text-primary shadow-sm">
                {isProcessingUpload ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                Upload Materi Sendiri
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Konversi PDF/Foto bukumu menjadi Audio & Ringkasan.
              </p>

              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.png,.txt"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingUpload}
              >
                {isProcessingUpload ? "Memproses..." : "Pilih File"}
              </Button>
            </Card>
          </motion.div>
        </div>

        {documents.length > 0 && (
          <section aria-labelledby="dokumen-saya" className="mt-4">
            <h2 id="dokumen-saya" className="text-2xl font-bold mb-4">
              Dokumen Saya
            </h2>
            <div className="grid gap-3">
              {documents.map((doc) => {
                const open = () =>
                  handleChapterSelect({
                    id: "custom-upload",
                    title: doc.title,
                    content: doc.content,
                    documentId: doc.id,
                  });
                return (
                  <Card
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center gap-4"
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {doc.source === "scan" ? "Hasil pindai EyeRead" : "Unggahan"}
                        {" · "}
                        {new Date(doc.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ==================================================================================
  // RENDER: MENU BAHASA ISYARAT
  // ==================================================================================
  if (currentView === "sign-menu") {
    return (
      <div className="min-h-screen p-8 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={goBack} className="mb-6 ">
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Dashboard
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 text-blue-950 dark:text-blue-50">
            Kamus Isyarat Digital
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Eksplorasi gerakan isyarat berdasarkan kategori.
          </p>
        </div>

        <Tabs
          value={selectedSignCategory}
          onValueChange={(v) => setSelectedSignCategory(v as SignCategory)}
          className="w-full mb-8"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 bg-blue-50 dark:bg-blue-950/50 p-1 rounded-full">
            <TabsTrigger
              value="abjad"
              className="rounded-full text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Abjad (A-Z)
            </TabsTrigger>
            <TabsTrigger
              value="angka"
              className="rounded-full text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Angka (0-9)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedSignCategory} className="mt-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {signLanguageData[selectedSignCategory].map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer hover:shadow-xl transition-all border border-slate-200 hover:border-primary overflow-hidden bg-white dark:bg-slate-900 rounded-xl"
                    {...clickable(() => handleSignItemSelect(item), `Isyarat ${item.title}`)}
                  >
                    <div className="aspect-square bg-slate-100 relative overflow-hidden p-4">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-sm"
                      />
                      <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white text-primary px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                          Lihat <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                    <div className="p-4 text-center relative">
                      <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">
                        {item.title.replace("Huruf ", "").replace("Angka ", "")}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.title}
                      </p>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ==================================================================================
  // RENDER: DETAIL BAHASA ISYARAT
  // ==================================================================================
  if (currentView === "sign-detail" && selectedSignItem) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600 via-blue-500 to-transparent -z-10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -z-10" />
        <div className="absolute top-40 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto p-6 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" onClick={goBack} className="mb-6 ">
              <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Kamus
            </Button>
            <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
              Mode Belajar
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden relative group">
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/50 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`rounded-full px-6 transition-all duration-300 ${
                        signMediaTab === "image"
                          ? "bg-white dark:bg-slate-700 shadow-sm text-primary font-bold"
                          : "text-slate-500 hover:text-primary"
                      }`}
                      onClick={() => setSignMediaTab("image")}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" /> Ilustrasi
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`rounded-full px-6 transition-all duration-300 ${
                        signMediaTab === "video"
                          ? "bg-white dark:bg-slate-700 shadow-sm text-primary font-bold"
                          : "text-slate-500 hover:text-primary"
                      }`}
                      onClick={() => setSignMediaTab("video")}
                    >
                      <Video className="w-4 h-4 mr-2" /> Video
                    </Button>
                  </div>

                  <div className="aspect-[4/3] md:aspect-video bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-8 md:p-12 relative">
                    <AnimatePresence mode="wait">
                      {signMediaTab === "image" ? (
                        <motion.img
                          key="img"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 25,
                          }}
                          src={selectedSignItem.img}
                          alt={selectedSignItem.title}
                          className="h-full w-full object-contain drop-shadow-2xl filter hover:brightness-105 transition-all duration-500"
                        />
                      ) : (
                        <motion.div
                          key="vid"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-full h-full bg-black rounded-2xl overflow-hidden shadow-inner ring-4 ring-slate-100 dark:ring-slate-800"
                        >
                          <video
                            controls
                            autoPlay
                            loop
                            className="w-full h-full object-cover"
                          >
                            <source
                              src={selectedSignItem.video}
                              type="video/mp4"
                            />
                          </video>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-0 shadow-xl rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
                  <div className="relative z-10 text-center lg:text-left">
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-blue-300 leading-none mb-2">
                      {selectedSignItem.title.split(" ")[1]}
                    </h1>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {selectedSignItem.title}
                    </h2>
                    <p className="text-primary font-medium flex items-center justify-center lg:justify-start gap-2 mt-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Bahasa Isyarat Indonesia
                    </p>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-6 border-l-8 border-primary bg-white dark:bg-slate-900 shadow-lg rounded-2xl">
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-2xl text-primary">
                        <HandMetal className="w-6 h-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-lg">
                        Instruksi Gerakan
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {selectedSignItem.desc}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-2 hover:border-primary hover:text-primary transition-all"
                  onClick={() => speakText(selectedSignItem.desc)}
                >
                  <PlayCircle className="w-5 h-5 mr-2" /> Ulangi
                </Button>
                <Button
                  className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
                  onClick={handleNextSignItem}
                >
                  Lanjut <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================================
  // RENDER: LIST MATERI (UMUM)
  // ==================================================================================
  if (currentView === "chapters" && selectedLevel) {
    const levelData = learningPath[selectedLevel];
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={goBack} className="mb-6 pl-0">
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali
        </Button>
        <div className="mb-8">
          <div
            className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 capitalize ${levelData.color}`}
          >
            {levelData.title}
          </div>
          <h1 className="text-3xl font-bold">Daftar Materi</h1>
        </div>
        <div className="grid gap-4">
          {chaptersByLevel[selectedLevel].length === 0 && (
            <p className="text-muted-foreground" role="status">Memuat materi...</p>
          )}
          {chaptersByLevel[selectedLevel].map((chapter, index) => (
            <Card
              key={chapter.id}
              className="p-6 cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center group"
              {...clickable(() => handleChapterSelect(chapter))}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-primary">
                    {chapter.title}
                  </h3>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ==================================================================================
  // RENDER: DETAIL MATERI (UMUM)
  // ==================================================================================
  if (currentView === "detail" && selectedChapter) {
    const fontSizeClass = {
      normal: "text-lg",
      large: "text-2xl",
      extra: "text-4xl leading-tight font-bold",
    };
    return (
      <div className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto">
        <Button variant="outline" onClick={goBack} className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 bg-slate-50 dark:bg-slate-900 border-primary/20 sticky top-8">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" /> Mode Belajar
              </h3>
              <div className="space-y-2 mb-8">
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Ukuran Teks
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={textSize === "normal" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTextSize("normal")}
                  >
                    A
                  </Button>
                  <Button
                    variant={textSize === "large" ? "default" : "outline"}
                    className="flex-1 text-lg"
                    onClick={() => setTextSize("large")}
                  >
                    A+
                  </Button>
                  <Button
                    variant={textSize === "extra" ? "default" : "outline"}
                    className="flex-1 text-xl font-bold"
                    onClick={() => setTextSize("extra")}
                  >
                    A++
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Kontrol Audio
                </label>
                {!isSpeaking ? (
                  <Button
                    className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                    onClick={() => {
                      // 1. Ambil teks asli (gunakan default string kosong jika null)
                      const rawContent = selectedChapter?.content || "";

                      // 2. Bersihkan teks menggunakan fungsi cleanMarkdown
                      const textToRead = cleanMarkdown(rawContent);

                      // --- AREA DEBUG ---
                      console.log("1. Raw Content:", rawContent);
                      console.log(
                        "2. Cleaned Content (To Speech):",
                        textToRead
                      );
                      // ------------------

                      // 3. Masukkan teks yang SUDAH BERSIH ke fungsi speakText
                      speakText(textToRead);
                    }}
                  >
                    <PlayCircle className="mr-2 h-6 w-6" /> Baca Materi
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full h-12 text-lg"
                    onClick={stopSpeaking}
                  >
                    <PauseCircle className="mr-2 h-6 w-6 animate-pulse" />{" "}
                    Hentikan
                  </Button>
                )}
              </div>
              <div className="space-y-2 mt-8">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Pahami Lebih Dalam
                </p>
                {/* Dokumen yang belum tersimpan belum punya id untuk ditanyakan */}
                {(selectedChapter.id !== "custom-upload" || selectedChapter.documentId) && (
                  <Button variant="outline" className="w-full h-12 justify-start" onClick={askTutor}>
                    <MessageSquare className="mr-2 h-5 w-5" aria-hidden="true" /> Tanya NeoTutor
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start"
                  onClick={() => {
                    stopSpeaking();
                    setShowQuiz(true);
                  }}
                >
                  <ListChecks className="mr-2 h-5 w-5" aria-hidden="true" /> Buat Kuis dari Materi Ini
                </Button>
              </div>
            </Card>
            <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Kuis: {selectedChapter.title}</DialogTitle>
                <DialogDescription>
                  Soal dibuat AI dari materi ini dan menyesuaikan dengan jawabanmu.
                </DialogDescription>
                {showQuiz && (
                  <DocumentQuiz
                    title={selectedChapter.title}
                    text={selectedChapter.content}
                    onClose={() => setShowQuiz(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="lg:col-span-8">
            <Card className="min-h-[60vh] flex flex-col shadow-lg border-t-4 border-t-primary">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex flex-col flex-1"
              >
                <div className="px-6 pt-6 border-b">
                  <h1 className="text-3xl font-bold mb-2">
                    {selectedChapter.title}
                  </h1>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="text">
                      <Type className="w-4 h-4 mr-2" /> Bacaan
                    </TabsTrigger>
                    <TabsTrigger value="audio">
                      <Volume2 className="w-4 h-4 mr-2" /> Audio Fokus
                    </TabsTrigger>
                    <TabsTrigger value="summary">
                      <FileText className="w-4 h-4 mr-2" /> Ringkasan
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-6 flex-1 bg-white dark:bg-black/20">
                  <AnimatePresence mode="wait">
                    {activeTab === "text" && (
                      <motion.div
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <ScrollArea className="h-[500px] pr-4">
                          <p
                            className={`${fontSizeClass[textSize]} leading-loose text-slate-700 dark:text-slate-200 transition-all duration-300`}
                          >
                            {selectedChapter.content}
                          </p>
                        </ScrollArea>
                      </motion.div>
                    )}
                    {activeTab === "audio" && (
                      <motion.div
                        key="audio"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center"
                      >
                        <div
                          className={`w-40 h-40 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${
                            isSpeaking
                              ? "bg-primary text-white shadow-2xl scale-110"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Volume2 className="w-20 h-20" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">
                          {isSpeaking ? "Sedang Membaca..." : "Siap Membaca"}
                        </h3>
                      </motion.div>
                    )}
                    {activeTab === "summary" && (
                      <motion.div
                        key="summary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 p-6 rounded-xl">
                          <h3 className="font-bold text-xl mb-4 text-yellow-800">
                            Intisari Materi
                          </h3>
                          <p className="text-xl leading-relaxed whitespace-pre-line" aria-live="polite">
                            {isSummaryLoading && !summaries[summaryKey]
                              ? "NeoTutor sedang meringkas materi ini..."
                              : summaries[summaryKey]}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
