import { API_URL, authHeaders } from "@/lib/api";
import { speak, stopSpeech } from "@/lib/speech";
import { applyIndonesianVoice } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import DocumentQuiz from "@/components/DocumentQuiz";
import { Camera, Volume2, Type, FileText, Upload, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/context/SettingsContext"; // Import Settings Context
import { useVoiceCommands } from "@/lib/voiceCommands";
import HighlightedText from "@/components/HighlightedText";
import { useLiveOcr } from "@/hooks/use-live-ocr";
import { LIVE_STATE_TEXT } from "@/lib/liveOcr";

declare global {
  interface Window {
    Tesseract: any;
  }
}

export default function EyeRead() {
  // --- STATE ASLI ---
  const [isScanning, setIsScanning] = useState(false);
  const [scannedText, setScannedText] = useState("");
  const [activeOutput, setActiveOutput] = useState<
    "audio" | "text" | "summary"
  >("text");
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Posisi baca untuk menyorot kata yang sedang diucapkan
  const [readProgress, setReadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isTesseractLoaded, setIsTesseractLoaded] = useState(false);

  const [summaryText, setSummaryText] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // --- STATE TAMBAHAN (GUIDANCE) ---
  const [guidanceMessage, setGuidanceMessage] = useState("");
  // Mode Langsung: kamera terus membaca tanpa perlu menekan tombol foto
  const [liveMode, setLiveMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ref untuk mengontrol frekuensi suara
  const guidanceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);

  const { toast } = useToast();

  // --- SETTINGS INTEGRATION ---
  const { volume, speakingRate, aiVoice } = useSettings(); // Ambil settingan global

  // 1. Load Tesseract
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => setIsTesseractLoaded(true);
    script.onerror = () => {
      console.warn("Gagal memuat Tesseract lokal.");
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 2. Setup Kamera & Guidance
  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current
        .play()
        .catch((err) => console.error("Error playing video:", err));

      // MULAI PANDUAN (Mode Langsung punya panduannya sendiri)
      if (!liveMode) startVoiceGuidance();
    } else {
      stopVoiceGuidance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  // Panduan posisi lama dimatikan selama Mode Langsung, supaya suaranya tidak memotong bacaan
  useEffect(() => {
    if (!isScanning) return;
    if (liveMode) stopVoiceGuidance();
    else startVoiceGuidance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode]);

  useEffect(() => {
    if (
      activeOutput === "summary" &&
      scannedText &&
      !isSummaryLoading &&
      !summaryText
    ) {
      fetchSummary();
    }
  }, [activeOutput, scannedText]);

  // Simpan hasil pindai ke akun; muncul di "Dokumen Saya" pada Flexa
  const saveScan = async (text: string) => {
    if (!text.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const waktu = new Date().toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const { data, error } = await supabase
      .from("user_documents")
      .insert({
        user_id: user.id,
        source: "scan",
        title: `Pindaian ${waktu}`,
        content: text,
      })
      .select("id, title")
      .single();
    if (error) {
      console.error("Gagal menyimpan hasil pindai:", error);
      return;
    }
    // Dengan id ini hasil pindai bisa ditanyakan ke NeoTutor
    setSavedScan(data);
  };

  // Hasil pindai terakhir yang sudah tersimpan, kuis, dan navigasi ke NeoTutor
  const navigate = useNavigate();
  const [savedScan, setSavedScan] = useState<{ id: string; title: string } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const fetchSummary = async () => {
    setIsSummaryLoading(true);

    try {
      const response = await fetch(`${API_URL}/gemini/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ text: scannedText }),
      });

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(raw || "Gagal summary");
      }

      // --- FIX UTAMA: extract message dari JSON ---
      let parsed: any = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Kalau bukan JSON valid → tampilkan apa adanya
        setSummaryText(raw);
        setIsSummaryLoading(false);
        return;
      }

      if (parsed?.message) {
        setSummaryText(parsed.message);
      } else {
        setSummaryText(JSON.stringify(parsed));
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Server gagal membuat ringkasan.",
        variant: "destructive",
      });
      setSummaryText("Ringkasan gagal dibuat.");
    }

    setIsSummaryLoading(false);
  };

  // --- FUNGSI PANDUAN CERDAS ---
  const startVoiceGuidance = () => {
    if (guidanceIntervalRef.current) clearInterval(guidanceIntervalRef.current);
    guidanceIntervalRef.current = setInterval(() => {
      if (videoRef.current) analyzeFrameAndGuide(videoRef.current);
    }, 1000);
  };

  const stopVoiceGuidance = () => {
    if (guidanceIntervalRef.current) {
      clearInterval(guidanceIntervalRef.current);
      guidanceIntervalRef.current = null;
    }
    setGuidanceMessage("");
  };

  const speakGuidance = (text: string) => {
    const now = Date.now();
    if (now - lastSpokenTimeRef.current > 3000) {
      setGuidanceMessage(text);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        applyIndonesianVoice(utterance);

        // Terapkan Setting untuk Guidance juga (Opsional, tapi konsisten)
        utterance.volume = volume / 100;
        utterance.rate =
          speakingRate === "slow" ? 0.8 : speakingRate === "fast" ? 1.2 : 1.1;

        window.speechSynthesis.speak(utterance);
      }
      lastSpokenTimeRef.current = now;
    }
  };

  const analyzeFrameAndGuide = (video: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 150;
    const h = 50;
    canvas.width = w;
    canvas.height = h;

    const startY = video.videoHeight / 2 - h / 2;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, w, h);

    const frame = ctx.getImageData(0, 0, w, h);
    const data = frame.data;

    let leftScore = 0;
    let centerScore = 0;
    let rightScore = 0;

    const leftBoundary = w * 0.3;
    const rightBoundary = w * 0.7;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w - 1; x += 2) {
        const i = (y * w + x) * 4;
        const iNext = (y * w + (x + 1)) * 4;

        const l1 = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const l2 = (data[iNext] + data[iNext + 1] + data[iNext + 2]) / 3;

        const diff = Math.abs(l1 - l2);

        if (diff > 20) {
          if (x < leftBoundary) leftScore++;
          else if (x > rightBoundary) rightScore++;
          else centerScore++;
        }
      }
    }

    centerScore = centerScore * 0.8;

    if (leftScore < 50 && centerScore < 50 && rightScore < 50) {
      speakGuidance("Tidak ada teks. Dekatkan kamera.");
      return;
    }

    if (centerScore > leftScore && centerScore > rightScore) {
      if (guidanceMessage !== "Posisi Pas. Tahan.") {
        setGuidanceMessage("Posisi Pas. Tahan.");
      }
    } else if (leftScore > centerScore * 1.2) {
      speakGuidance("Geser kamera ke Kiri.");
    } else if (rightScore > centerScore * 1.2) {
      speakGuidance("Geser kamera ke Kanan.");
    } else {
      setGuidanceMessage("Sedikit lagi...");
    }
  };

  // --- KAMERA & OCR (LOGIKA ASLI) ---
  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setIsScanning(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Kesalahan Kamera",
        description: "Tidak dapat mengakses kamera.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    stopVoiceGuidance();
  };

  // Logika asli upload (Port 5194)
  const processImage = async (imageSource: string) => {
    setIsProcessing(true);
    setCapturedImage(imageSource);
    stopCamera();

    toast({
      title: "Memindai...",
      description: "Mengirim gambar ke server untuk OCR",
    });

    try {
      const res = await fetch(imageSource);
      const blob = await res.blob();
      const form = new FormData();
      form.append("image", blob, "capture.png");

      const response = await fetch(`${API_URL}/scan/ocr`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });

      if (!response.ok) throw new Error("OCR gagal: " + response.statusText);

      const ocrText = await response.text();
      setScannedText(ocrText);
      saveScan(ocrText);
      setIsProcessing(false);
      setActiveOutput("text");
      toast({ title: "Berhasil!", description: "Teks berhasil diekstrak" });
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      toast({
        title: "Gagal",
        description: "Server OCR tidak merespon.",
        variant: "destructive",
      });
    }
  };

  // Logika asli capture (Port 5071)
  const captureAndScan = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    setCapturedImage(dataUrl);
    stopCamera();
    setIsProcessing(true);
    toast({ title: "Memindai...", description: "Mengirim foto ke server..." });

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const form = new FormData();
      form.append("image", blob, "capture.png");

      const response = await fetch(`${API_URL}/scan/ocr`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });

      if (!response.ok) throw new Error("OCR gagal");

      const text = await response.text();
      setScannedText(text);
      saveScan(text);
      toast({ title: "Berhasil!", description: "Teks berhasil diekstrak." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Gagal",
        description: "Tidak dapat memproses foto ke server.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
    setActiveOutput("text");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "File Salah",
        description: "Pilih file gambar.",
        variant: "destructive",
      });
      return;
    }

    setCapturedImage(URL.createObjectURL(file));
    stopCamera();
    setIsProcessing(true);
    toast({ title: "Memindai...", description: "Mengirim gambar..." });

    try {
      const form = new FormData();
      form.append("image", file, "capture.png");

      const response = await fetch(`${API_URL}/scan/ocr`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });

      if (!response.ok) throw new Error("OCR gagal");

      const ocrText = await response.text();
      setScannedText(ocrText);
      saveScan(ocrText);
      toast({ title: "Berhasil!", description: "Teks berhasil diekstrak" });
    } catch {
      toast({
        title: "Gagal",
        description: "Server OCR error.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  // Mode Langsung: foto dari kamera dikirim ke OCR Gemini tanpa mematikan kamera,
  // lalu hasilnya ditampilkan, disimpan, dan langsung dibacakan.
  const readLive = async (image: Blob) => {
    try {
      const form = new FormData();
      form.append("image", image, "langsung.jpg");
      const response = await fetch(`${API_URL}/scan/ocr`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });
      if (!response.ok) throw new Error(response.statusText);
      const text = (await response.text()).trim();
      if (!text) return null;
      setScannedText(text);
      setSummaryText("");
      setActiveOutput("text");
      saveScan(text);
      speakText(text);
      return text;
    } catch (error) {
      console.error("OCR Mode Langsung gagal:", error);
      toast({ title: "Belum bisa membaca", description: "Server OCR tidak merespons. Mode Langsung akan mencoba lagi.", variant: "destructive" });
      return null;
    }
  };

  const live = useLiveOcr({ videoRef, enabled: isScanning && liveMode, paused: isSpeaking || isProcessing, onRead: readLive });
  const liveStatus = live.state === "menyiapkan" ? "Menyiapkan pengenal teks…" : LIVE_STATE_TEXT[live.state];

  const retakePhoto = () => {
    setCapturedImage(null);
    setScannedText("");
    startCamera();
  };

  // --- UPDATE: FUNGSI SPEAK TEXT TERINTEGRASI SETTINGS ---
  const speakText = (text: string) => {
    speak(text, {
      volume,
      rate: speakingRate,
      aiVoice,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setReadProgress(null);
      },
      onProgress: text === scannedText ? setReadProgress : undefined,
    });
  };

  const stopSpeaking = () => {
    stopSpeech();
    setIsSpeaking(false);
    setReadProgress(null);
  };

  // Logic Summary Sederhana Asli
  // Perintah suara di halaman pindai
  useVoiceCommands((command) => {
    // "mode langsung" menyalakan kamera sekaligus pembacaan otomatis
    if (/^(mode langsung|baca otomatis|baca langsung)$/.test(command)) {
      setLiveMode(true);
      if (!isScanning) startCamera();
      return true;
    }
    if (/^(matikan mode langsung|berhenti baca otomatis|hentikan mode langsung)$/.test(command)) {
      setLiveMode(false);
      return true;
    }
    if (/^(mulai kamera|buka kamera|nyalakan kamera|mulai pindai|pindai)$/.test(command)) {
      startCamera();
      return true;
    }
    if (/^(ambil gambar|ambil foto|foto|potret|tangkap|jepret)$/.test(command)) {
      captureAndScan();
      return true;
    }
    if (/^(tutup kamera|matikan kamera)$/.test(command)) {
      stopCamera();
      return true;
    }
    if (/^(baca hasil|bacakan hasil|baca teks|bacakan teks|baca|bacakan)$/.test(command) && scannedText) {
      speakText(scannedText);
      return true;
    }
    if (/^(buat kuis|kuis)$/.test(command) && scannedText) {
      stopSpeech();
      setShowQuiz(true);
      return true;
    }
    return false;
  });

  const generateSummary = (text: string) => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const summary =
      sentences.slice(0, Math.min(3, sentences.length)).join(". ") + ".";
    return summary;
  };

  return (
    <div className="min-h-screen p-2 md:p-8 bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <PageHeader
          title="EyeRead"
          description="Pindai buku, papan tulis, atau dokumen, lalu baca, dengarkan, atau ringkas isinya."
          art="eyeread"
          lively={isScanning || isSpeaking || isProcessing}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAMERA CARD */}
          <div className="px-card p-3 md:p-5">
            <div className="aspect-[3/4] sm:aspect-video bg-muted overflow-hidden mb-4 relative flex items-center justify-center rounded-xl border border-border">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              ) : isScanning ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* Mode Langsung: kotak di setiap kata yang terbaca di perangkat. viewBox memakai
                      ukuran asli video dan "slice" meniru object-cover, jadi kotaknya pas di kata. */}
                  {liveMode && live.boxes.length > 0 && (
                    <svg
                      aria-hidden="true"
                      viewBox={`0 0 ${live.frame.width} ${live.frame.height}`}
                      preserveAspectRatio="xMidYMid slice"
                      className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
                    >
                      {live.boxes.map((box, i) => (
                        <rect
                          key={i}
                          x={box.x}
                          y={box.y}
                          width={box.w}
                          height={box.h}
                          rx={4}
                          fill="rgba(250, 204, 21, 0.18)"
                          stroke="rgb(250, 204, 21)"
                          strokeWidth={Math.max(2, live.frame.width / 400)}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Frame Guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Sudut bingkai bergaya pixel, seperti di ilustrasi */}
                    <div className="relative w-[85%] h-[85%]">
                      <div className="absolute top-0 left-0 w-9 h-9 border-t-[5px] border-l-[5px] border-white" />
                      <div className="absolute top-0 right-0 w-9 h-9 border-t-[5px] border-r-[5px] border-white" />
                      <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[5px] border-l-[5px] border-white" />
                      <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[5px] border-r-[5px] border-white" />
                    </div>
                  </div>

                  {/* VISUAL & AUDIO GUIDANCE INDICATOR */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full flex justify-center">
                    {liveMode && (
                      <div
                        role="status"
                        aria-live="polite"
                        className={`px-4 py-2 font-bold text-white flex items-center gap-2 rounded-xl ${
                          live.state === "dibacakan" || live.state === "terdeteksi"
                            ? "bg-green-600"
                            : live.state === "mengirim"
                            ? "bg-primary"
                            : "bg-black/60"
                        }`}
                      >
                        <Radar className={`w-4 h-4 ${live.state === "mengirim" || live.state === "membaca" ? "animate-spin" : ""}`} aria-hidden="true" />
                        {liveStatus}
                      </div>
                    )}
                    {!liveMode && guidanceMessage && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`px-4 py-2 font-bold text-white flex items-center gap-2 rounded-xl border-0 ${
                          guidanceMessage.includes("Pas")
                            ? "bg-green-600"
                            : "bg-black/60"
                        }`}
                      >
                        <span
                          className={`w-3 h-3 ${
                            guidanceMessage.includes("Pas")
                              ? "bg-white"
                              : "bg-yellow-400 animate-ping"
                          }`}
                        />
                        {guidanceMessage}
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="px-tile p-5">
                    <Camera className="w-10 h-10" aria-hidden="true" />
                  </div>
                  <p className="text-muted-foreground">Kamera belum aktif</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center">
                    <div className="animate-spin h-10 w-10 rounded-2xl border-2 border-border border-t-amber-400 mx-auto mb-4" aria-hidden="true"></div>
                    <p className="px-title text-base" role="status">
                      Memproses teks…
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {capturedImage ? (
                <div className="flex gap-3">
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    className="px-btn flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Ambil Ulang
                  </Button>
                  <div className="relative flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="px-btn w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                  </div>
                </div>
              ) : !isScanning ? (
                <>
                  <Button
                    onClick={startCamera}
                    className="px-btn w-full"
                    size="lg"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Buka Kamera
                  </Button>
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="px-btn w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Unggah Gambar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setLiveMode((on) => !on)}
                  variant={liveMode ? "default" : "outline"}
                  aria-pressed={liveMode}
                  className={`px-btn w-full ${liveMode ? "bg-green-600 hover:bg-green-600/90 text-white" : ""}`}
                  size="lg"
                >
                  <Radar className="w-4 h-4 mr-2" aria-hidden="true" />
                  {liveMode ? "Mode Langsung aktif — ketuk untuk berhenti" : "Mode Langsung: baca otomatis"}
                </Button>
                {liveMode && live.preview && (
                  <p className="text-sm text-muted-foreground line-clamp-2" aria-hidden="true">
                    <span className="font-semibold">Pratinjau:</span> {live.preview}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={captureAndScan}
                    className="px-btn flex-1"
                    disabled={isProcessing}
                    size="lg"
                  >
                    Tangkap & Pindai
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="destructive"
                    disabled={isProcessing}
                    size="lg"
                    className="px-btn"
                  >
                    Hentikan
                  </Button>
                </div>
                </div>
              )}
            </div>
          </div>

          {/* OUTPUT CARD */}
          <div className="px-card p-3 md:p-5 flex flex-col h-full">
            <Tabs
              value={activeOutput}
              onValueChange={(v) => setActiveOutput(v as any)}
              className="h-full flex flex-col"
            >
              <TabsList className="px-tabs grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="text" className="px-tab">
                  <Type className="w-4 h-4 mr-2" /> Teks
                </TabsTrigger>
                <TabsTrigger value="audio" className="px-tab">
                  <Volume2 className="w-4 h-4 mr-2" /> Audio
                </TabsTrigger>
                <TabsTrigger value="summary" className="px-tab">
                  <FileText className="w-4 h-4 mr-2" /> Ringkasan
                </TabsTrigger>
              </TabsList>

              <div className="px-well flex-1 min-h-[16rem] p-4 overflow-hidden">
                {/* 1. KONTEN TEKS */}
                <TabsContent
                  value="text"
                  className="mt-0 h-full overflow-y-auto"
                >
                  {scannedText ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <HighlightedText text={scannedText} progress={readProgress} className="text-lg leading-relaxed" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-center p-8">
                      <p>Belum ada teks dipindai.</p>
                    </div>
                  )}
                </TabsContent>

                {/* 2. KONTEN AUDIO */}
                <TabsContent
                  value="audio"
                  className="mt-0 h-full flex items-center justify-center"
                >
                  <div className="text-center">
                    {scannedText ? (
                      <>
                        <div
                          className={`px-tile w-20 h-20 flex items-center justify-center mx-auto mb-6 ${
                            isSpeaking ? "animate-pulse" : ""
                          }`}
                        >
                          <Volume2 className="w-10 h-10" aria-hidden="true" />
                        </div>
                        <div className="space-y-4">
                          <Button
                            onClick={() => speakText(scannedText)}
                            className="px-btn w-full min-w-[200px]"
                            size="lg"
                            disabled={isSpeaking}
                          >
                            Putar Audio
                          </Button>
                          <Button
                            onClick={stopSpeaking}
                            variant="outline"
                            className="px-btn w-full min-w-[200px]"
                            size="lg"
                            disabled={!isSpeaking}
                          >
                            Hentikan Audio
                          </Button>
                        </div>
                        {/* Teks ikut tampil dengan kata yang sedang dibacakan tersorot */}
                        <div className="mt-6 max-h-56 overflow-y-auto bg-background p-3 text-left rounded-xl border border-border">
                          <HighlightedText text={scannedText} progress={readProgress} className="leading-relaxed" />
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Pindai teks dulu.</p>
                    )}
                  </div>
                </TabsContent>

                {/* 3. KONTEN RINGKASAN */}
                <TabsContent
                  value="summary"
                  className="mt-0 h-full overflow-y-auto"
                >
                  {scannedText ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-lg leading-relaxed whitespace-pre-wrap">
                        {summaryText}
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-center p-8">
                      <p>Belum ada teks dipindai.</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Lanjutkan dari hasil pindai: tanya tutor atau latihan soal */}
            {scannedText && (
              <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="px-btn"
                  disabled={!savedScan}
                  onClick={() => {
                    stopSpeech();
                    navigate("/neotutor", {
                      state: { context: { type: "document", id: savedScan?.id, title: savedScan?.title } },
                    });
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" /> Tanya NeoTutor
                </Button>
                <Button
                  variant="outline"
                  className="px-btn"
                  onClick={() => {
                    stopSpeech();
                    setShowQuiz(true);
                  }}
                >
                  <ListChecks className="mr-2 h-4 w-4" aria-hidden="true" /> Buat Kuis dari Teks Ini
                </Button>
              </div>
            )}
            <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border">
                <DialogTitle>Kuis dari hasil pindai</DialogTitle>
                <DialogDescription>
                  Soal dibuat AI dari teks yang dipindai dan menyesuaikan dengan jawabanmu.
                </DialogDescription>
                {showQuiz && (
                  <DocumentQuiz
                    title={savedScan?.title ?? "Hasil pindai"}
                    text={scannedText}
                    onClose={() => setShowQuiz(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
