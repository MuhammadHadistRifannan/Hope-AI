import { Eye, Volume2, Globe, Bell, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSettings } from "@/context/SettingsContext"; // Import hook
import { useEffect, useState } from "react";
import { applyIndonesianVoice, indonesianVoice } from "@/lib/voice";

export default function Settings() {
  // Ambil value dan fungsi dari Context Global
  const { 
    largeText, highContrast, screenReader, textSize, dyslexiaFont,
    autoPlayAudio, speakingRate, volume, aiVoice,
    updateSetting, saveSettings 
  } = useSettings();

  // Suara yang dipakai bergantung pada perangkat; tampilkan agar pengguna tahu
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => {
      if (window.speechSynthesis.getVoices().length === 0) return;
      setVoiceName(indonesianVoice()?.name ?? null);
      setVoicesReady(true);
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  const testVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "Halo, ini contoh suara Hope A I. Selamat belajar!"
    );
    applyIndonesianVoice(utterance);
    utterance.volume = volume / 100;
    utterance.rate = speakingRate === "slow" ? 0.8 : speakingRate === "fast" ? 1.2 : 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Pengaturan</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Sesuaikan pengalaman belajar Anda
          </p>
        </div>

        <div className="space-y-6">
          {/* Accessibility Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold">Aksesibilitas</h2>
            </div>
            
            <div className="space-y-6">
              {/* Teks Besar (Otomatis via Slider, tapi bisa toggle instant max) */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mode Teks Besar</Label>
                  <p className="text-sm text-muted-foreground">Otomatis set ukuran teks ke maksimal</p>
                </div>
                <Switch 
                  checked={largeText}
                  onCheckedChange={(checked) => {
                    updateSetting('largeText', checked);
                    if(checked) updateSetting('textSize', 80); // Set ke 80% slider jika aktif
                    else updateSetting('textSize', 50); // Reset ke normal
                  }}
                />
              </div>

              {/* Kontras Tinggi (Berfungsi Global via CSS Class) */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Kontras Tinggi</Label>
                  <p className="text-sm text-muted-foreground">Mode warna hitam-kuning untuk visibilitas maksimal</p>
                </div>
                <Switch 
                  checked={highContrast}
                  onCheckedChange={(val) => updateSetting('highContrast', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="dyslexia-font">Huruf Ramah Disleksia</Label>
                  <p className="text-sm text-muted-foreground">Huruf sederhana dengan jarak antar huruf dan kata lebih renggang</p>
                </div>
                <Switch
                  id="dyslexia-font"
                  checked={dyslexiaFont}
                  onCheckedChange={(val) => updateSetting('dyslexiaFont', val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dukungan Pembaca Layar</Label>
                  <p className="text-sm text-muted-foreground">Optimalkan label ARIA untuk screen reader</p>
                </div>
                <Switch 
                  checked={screenReader}
                  onCheckedChange={(val) => updateSetting('screenReader', val)}
                />
              </div>

              {/* Slider Ukuran Teks (Berfungsi Global via HTML font-size) */}
              <div className="space-y-3">
                <Label>Ukuran Teks: {textSize}% (Zoom)</Label>
                <Slider 
                  value={[textSize]} 
                  onValueChange={(val) => updateSetting('textSize', val[0])}
                  max={100} 
                  min={20}
                  step={1} 
                  className="w-full" 
                />
              </div>
            </div>
          </Card>

          {/* Audio Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-secondary" />
              <h2 className="text-xl md:text-2xl font-bold">Audio</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Putar Audio Otomatis</Label>
                  <p className="text-sm text-muted-foreground">Otomatis membaca teks saat halaman dibuka</p>
                </div>
                <Switch 
                  checked={autoPlayAudio}
                  onCheckedChange={(val) => updateSetting('autoPlayAudio', val)}
                />
              </div>

              <div className="space-y-3">
                <Label>Kecepatan Bicara</Label>
                <Select value={speakingRate} onValueChange={(val) => updateSetting('speakingRate', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Lambat (0.7x)</SelectItem>
                    <SelectItem value="normal">Normal (1.0x)</SelectItem>
                    <SelectItem value="fast">Cepat (1.5x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="ai-voice">Suara AI</Label>
                  <p className="text-sm text-muted-foreground">
                    Suara yang lebih natural untuk membacakan materi, hasil pindai, dan jawaban
                    NeoTutor. Perlu beberapa detik untuk disiapkan; bila tidak tersedia, suara
                    perangkat dipakai otomatis.
                  </p>
                </div>
                <Switch
                  id="ai-voice"
                  checked={aiVoice}
                  onCheckedChange={(val) => updateSetting('aiVoice', val)}
                />
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-muted" role="status">
                <p className="text-sm font-medium">
                  Suara perangkat (cadangan):{" "}
                  {!voicesReady ? "memeriksa..." : voiceName ?? "tidak ada suara Bahasa Indonesia"}
                </p>
                {voicesReady && !voiceName && (
                  <p className="text-sm text-muted-foreground">
                    Perangkat atau browser ini belum punya suara Bahasa Indonesia, jadi
                    pengucapannya bisa terdengar aneh. Coba pakai Google Chrome atau Microsoft
                    Edge, atau pasang suara Bahasa Indonesia di pengaturan sistem.
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={testVoice}>
                  Tes Suara
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Volume: {volume}%</Label>
                <Slider 
                  value={[volume]} 
                  onValueChange={(val) => updateSetting('volume', val[0])}
                  max={100} 
                  step={1} 
                  className="w-full" 
                />
              </div>
            </div>
          </Card>


          {/* Save Button */}
          <Button className="w-full bg-primary h-12 text-lg" size="lg" onClick={saveSettings}>
            Simpan Semua Pengaturan
          </Button>
        </div>
      </motion.div>
    </div>
  );
}