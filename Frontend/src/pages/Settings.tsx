import { useEffect, useState } from "react";
import { Ear, Eye, Volume2, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { needOptions, useSettings, type Theme } from "@/context/SettingsContext";
import { indonesianVoice } from "@/lib/voice";
import { speak } from "@/lib/speech";
import { visualCue } from "@/lib/cues";

// Satu baris pengaturan berupa sakelar, dengan label dan penjelasan yang terhubung
function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  );
}

// Pilihan beberapa opsi sebagai deretan tombol (lebih mudah dijangkau daripada menu turun)
function ChoiceRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "default" : "outline"}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const settings = useSettings();
  const {
    textSize, highContrast, dyslexiaFont, theme, reduceMotion, screenReaderMode, captions,
    visualNotifications, autoPlayAudio, speakingRate, volume, aiVoice, needs, needsConsent,
    updateSetting, saveSettings, restartOnboarding,
  } = settings;

  // Suara perangkat bergantung pada browser; tampilkan agar pengguna tahu
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

  const testVoice = () =>
    speak("Halo, ini contoh suara Hope.Ai. Selamat belajar!", { volume, rate: speakingRate, aiVoice: false });

  const toggleNeed = (id: string, checked: boolean) =>
    updateSetting("needs", checked ? [...needs, id] : needs.filter((need) => need !== id));

  return (
    <div className="min-h-screen p-2 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Pengaturan</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Sesuaikan tampilan dan suara dengan caramu belajar. Sebagian pengaturan juga bisa diubah
            cepat dari Beranda.
          </p>
        </div>

        <div className="space-y-6">
          {/* Tampilan */}
          <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
              <Eye className="w-6 h-6 text-primary" aria-hidden="true" /> Tampilan
            </h2>
            <div className="space-y-7">
              <div className="space-y-3">
                <Label htmlFor="text-size">Ukuran teks: {100 + textSize}%</Label>
                <Slider
                  id="text-size"
                  value={[100 + textSize]}
                  onValueChange={(value) => updateSetting("textSize", value[0] - 100)}
                  min={100}
                  max={200}
                  step={10}
                  aria-label="Ukuran teks"
                  aria-valuetext={`${100 + textSize} persen`}
                />
                <div className="rounded-lg border p-4 bg-muted/40" aria-label="Pratinjau ukuran teks">
                  <p className="text-xs text-muted-foreground mb-1">Pratinjau</p>
                  <p className="leading-relaxed">
                    Fotosintesis adalah cara tumbuhan membuat makanannya sendiri dengan bantuan sinar
                    matahari.
                  </p>
                </div>
              </div>

              <ToggleRow
                id="high-contrast"
                label="Kontras tinggi"
                hint="Warna hitam dan kuning yang tegas agar tulisan lebih mudah dilihat"
                checked={highContrast}
                onChange={(value) => updateSetting("highContrast", value)}
              />
              <ToggleRow
                id="dyslexia-font"
                label="Huruf ramah disleksia"
                hint="Huruf sederhana dengan jarak antarhuruf dan antarkata yang lebih renggang"
                checked={dyslexiaFont}
                onChange={(value) => updateSetting("dyslexiaFont", value)}
              />
              <ChoiceRow<Theme>
                label="Tema warna"
                value={theme}
                options={[
                  { value: "light", label: "Terang" },
                  { value: "dark", label: "Gelap" },
                  { value: "system", label: "Ikuti perangkat" },
                ]}
                onChange={(value) => updateSetting("theme", value)}
              />
              <ChoiceRow<"system" | "on" | "off">
                label="Kurangi gerakan"
                hint="Mematikan animasi dan efek bergerak yang bisa membuat pusing atau mengganggu fokus"
                value={reduceMotion === null ? "system" : reduceMotion ? "on" : "off"}
                options={[
                  { value: "system", label: "Ikuti perangkat" },
                  { value: "on", label: "Nyala" },
                  { value: "off", label: "Mati" },
                ]}
                onChange={(value) => updateSetting("reduceMotion", value === "system" ? null : value === "on")}
              />
            </div>
          </Card>

          {/* Pembaca layar dan suara */}
          <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-primary" aria-hidden="true" /> Pembaca Layar dan Suara
            </h2>
            <div className="space-y-7">
              <ToggleRow
                id="screen-reader-mode"
                label="Saya memakai pembaca layar"
                hint="Untuk pengguna VoiceOver, TalkBack, atau NVDA. Tanggapan asisten suara dibacakan oleh pembaca layarmu, bukan oleh Hope.Ai, agar suaranya tidak bertumpuk. Dekorasi dan animasi juga dikurangi."
                checked={screenReaderMode}
                onChange={(value) => updateSetting("screenReaderMode", value)}
              />
              <ToggleRow
                id="auto-play"
                label="Bacakan otomatis"
                hint="Materi dan soal langsung dibacakan saat dibuka, dan setiap pindah halaman diumumkan"
                checked={autoPlayAudio}
                onChange={(value) => updateSetting("autoPlayAudio", value)}
              />
              <ChoiceRow
                label="Kecepatan suara"
                value={speakingRate}
                options={[
                  { value: "slow", label: "Pelan" },
                  { value: "normal", label: "Normal" },
                  { value: "fast", label: "Cepat" },
                ]}
                onChange={(value) => updateSetting("speakingRate", value)}
              />
              <ToggleRow
                id="ai-voice"
                label="Suara AI"
                hint="Suara yang lebih natural untuk membacakan materi, hasil pindai, dan jawaban NeoTutor. Perlu beberapa detik untuk disiapkan; bila tidak tersedia, suara perangkat dipakai otomatis."
                checked={aiVoice}
                onChange={(value) => updateSetting("aiVoice", value)}
              />
              <div className="space-y-3">
                <Label htmlFor="volume">Volume: {volume}%</Label>
                <Slider
                  id="volume"
                  value={[volume]}
                  onValueChange={(value) => updateSetting("volume", value[0])}
                  max={100}
                  step={5}
                  aria-label="Volume"
                />
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-muted" role="status">
                <p className="text-sm font-medium">
                  Suara perangkat: {!voicesReady ? "memeriksa..." : voiceName ?? "tidak ada suara Bahasa Indonesia"}
                </p>
                {voicesReady && !voiceName && (
                  <p className="text-sm text-muted-foreground">
                    Perangkat atau browser ini belum punya suara Bahasa Indonesia, jadi pengucapannya bisa
                    terdengar aneh. Coba Google Chrome atau Microsoft Edge, atau pasang suara Bahasa
                    Indonesia di pengaturan sistem.
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={testVoice}>
                  Tes Suara
                </Button>
              </div>
            </div>
          </Card>

          {/* Pendengaran */}
          <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
              <Ear className="w-6 h-6 text-primary" aria-hidden="true" /> Pendengaran
            </h2>
            <div className="space-y-7">
              <ToggleRow
                id="captions"
                label="Caption"
                hint="Setiap suara yang diucapkan Hope.Ai juga muncul sebagai teks di bagian bawah layar"
                checked={captions}
                onChange={(value) => updateSetting("captions", value)}
              />
              <ToggleRow
                id="visual-notifications"
                label="Notifikasi visual"
                hint="Bunyi tanda benar, salah, atau selesai diganti kedipan bingkai layar dan pesan singkat"
                checked={visualNotifications}
                onChange={(value) => updateSetting("visualNotifications", value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => visualCue("Contoh notifikasi visual", "success")}
                disabled={!visualNotifications}
              >
                Coba Notifikasi Visual
              </Button>
            </div>
          </Card>

          {/* Profil kebutuhan */}
          <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-primary" aria-hidden="true" /> Kebutuhan Belajar
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Dipakai untuk menyusun Beranda sesuai caramu belajar. Boleh pilih lebih dari satu.
            </p>
            <fieldset className="space-y-3">
              <legend className="sr-only">Kebutuhan belajar</legend>
              {needOptions.map((option) => (
                <div key={option.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`need-${option.id}`}
                    checked={needs.includes(option.id)}
                    onCheckedChange={(checked) => toggleNeed(option.id, checked === true)}
                    className="mt-1"
                  />
                  <Label htmlFor={`need-${option.id}`} className="font-normal leading-snug">
                    {option.label}
                    <span className="block text-sm text-muted-foreground">{option.hint}</span>
                  </Label>
                </div>
              ))}
            </fieldset>
            <Button variant="outline" size="sm" className="mt-4" onClick={restartOnboarding}>
              Ulangi pertanyaan awal
            </Button>
            <div className="mt-6 pt-5 border-t">
              <ToggleRow
                id="needs-consent"
                label="Simpan kebutuhan di akun saya"
                hint="Bila aktif, kebutuhanmu ikut terbawa saat masuk dari perangkat lain. Data ini hanya bisa dilihat olehmu dan tidak ditampilkan ke guru maupun siswa lain. Bila mati, kebutuhan hanya disimpan di perangkat ini."
                checked={needsConsent}
                onChange={(value) => updateSetting("needsConsent", value)}
              />
            </div>
          </Card>

          <Button className="w-full bg-primary h-12 text-lg" size="lg" onClick={saveSettings}>
            Simpan Pengaturan
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
