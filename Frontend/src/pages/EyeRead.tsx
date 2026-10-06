import { API_URL, authHeaders } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { Camera, Volume2, Type, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/context/SettingsContext"; // Import Settings Context

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isTesseractLoaded, setIsTesseractLoaded] = useState(false);

  const [summaryText, setSummaryText] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // --- STATE TAMBAHAN (GUIDANCE) ---
  const [guidanceMessage, setGuidanceMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ref untuk mengontrol frekuensi suara
  const guidanceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);

  const { toast } = useToast();

  // --- SETTINGS INTEGRATION ---
  const { volume, speakingRate } = useSettings(); // Ambil settingan global

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

      // MULAI PANDUAN
      startVoiceGuidance();
    } else {
      stopVoiceGuidance();
    }
  }, [isScanning]);

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
    const { error } = await supabase.from("user_documents").insert({
      user_id: user.id,
      source: "scan",
      title: `Pindaian ${waktu}`,
      content: text,
    });
    if (error) console.error("Gagal menyimpan hasil pindai:", error);
  };

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
        utterance.lang = "id-ID";

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

  const retakePhoto = () => {
    setCapturedImage(null);
    setScannedText("");
    startCamera();
  };

  // --- UPDATE: FUNGSI SPEAK TEXT TERINTEGRASI SETTINGS ---
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";

      // Terapkan Setting dari Context
      utterance.volume = volume / 100;

      if (speakingRate === "slow") utterance.rate = 0.7;
      else if (speakingRate === "fast") utterance.rate = 1.2;
      else utterance.rate = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Logic Summary Sederhana Asli
  const generateSummary = (text: string) => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const summary =
      sentences.slice(0, Math.min(3, sentences.length)).join(". ") + ".";
    return summary;
  };

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            EyeRead
          </h1>
          <p className="text-muted-foreground text-lg">
            Pindai buku, papan tulis, dan dokumen dengan teknologi OCR berbasis
            AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAMERA CARD */}
          <Card className="p-6 shadow-lg">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 relative flex items-center justify-center ring-1 ring-border">
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

                  {/* Frame Guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[85%] h-[85%] border-2 border-primary/50 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    </div>
                  </div>

                  {/* VISUAL & AUDIO GUIDANCE INDICATOR */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full flex justify-center">
                    {guidanceMessage && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`px-6 py-2 rounded-full font-bold text-white shadow-lg backdrop-blur-md flex items-center gap-2 border border-white/20 ${
                          guidanceMessage.includes("Pas")
                            ? "bg-green-500/90"
                            : "bg-black/60"
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${
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
                  <div className="p-6 rounded-full bg-muted-foreground/10">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Kamera belum aktif
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm font-medium animate-pulse">
                      Memproses teks...
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
                    className="flex-1"
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
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                  </div>
                </div>
              ) : !isScanning ? (
                <>
                  <Button
                    onClick={startCamera}
                    className="w-full bg-primary hover:bg-primary/90 transition-all"
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
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Unggah Gambar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={captureAndScan}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={isProcessing}
                    size="lg"
                  >
                    Tangkap & Pindai
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="destructive"
                    disabled={isProcessing}
                  >
                    Hentikan
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* OUTPUT CARD */}
          <Card className="p-6 shadow-lg flex flex-col h-full">
            <Tabs
              value={activeOutput}
              onValueChange={(v) => setActiveOutput(v as any)}
              className="h-full flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-3 mb-2">
                <TabsTrigger value="text">
                  <Type className="w-4 h-4 mr-2" /> Teks
                </TabsTrigger>
                <TabsTrigger value="audio">
                  <Volume2 className="w-4 h-4 mr-2" /> Audio
                </TabsTrigger>
                <TabsTrigger value="summary">
                  <FileText className="w-4 h-4 mr-2" /> Ringkasan
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 bg-muted/50 rounded-lg p-4 overflow-y-auto border border-border">
                {/* 1. KONTEN TEKS */}
                <TabsContent
                  value="text"
                  className="mt-0 h-full overflow-y-auto"
                >
                  {scannedText ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-lg leading-relaxed whitespace-pre-wrap">
                        {scannedText}
                      </p>
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
                          className={`w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 ${
                            isSpeaking
                              ? "animate-pulse ring-4 ring-primary/20"
                              : ""
                          }`}
                        >
                          <Volume2
                            className={`w-12 h-12 ${
                              isSpeaking
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="space-y-4">
                          <Button
                            onClick={() => speakText(scannedText)}
                            className="w-full min-w-[200px]"
                            size="lg"
                            disabled={isSpeaking}
                          >
                            Putar Audio
                          </Button>
                          <Button
                            onClick={stopSpeaking}
                            variant="secondary"
                            className="w-full min-w-[200px]"
                            size="lg"
                            disabled={!isSpeaking}
                          >
                            Hentikan Audio
                          </Button>
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
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
