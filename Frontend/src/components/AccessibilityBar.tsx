import { Link } from "react-router-dom";
import { Contrast, Settings, Type, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

// Pengaturan yang paling sering diubah, bisa diatur langsung dari Beranda.
// Setiap perubahan langsung tersimpan ke perangkat dan akun.
export default function AccessibilityBar() {
  const { textSize, highContrast, dyslexiaFont, autoPlayAudio, setAndSave } = useSettings();
  const percent = 100 + textSize;

  // Tombol kotak bergaya pixel; yang sedang aktif berwarna amber dan ditandai centang
  const chip = (on = false) =>
    `inline-flex min-h-11 items-center gap-2 border-[3px] border-foreground px-3 text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
      on ? "bg-amber-300 text-[#0a1a4f]" : "bg-card text-foreground hover:bg-muted"
    }`;

  return (
    <div role="toolbar" aria-label="Pengaturan tampilan cepat" className="px-card flex flex-wrap items-center gap-2 p-2.5">
      <div className="flex items-center gap-1.5" role="group" aria-label={`Ukuran teks ${percent} persen`}>
        <button type="button" className={chip()} onClick={() => setAndSave("textSize", Math.max(0, textSize - 10))} disabled={textSize <= 0} aria-label="Perkecil teks">
          A−
        </button>
        <span className="min-w-[3.5rem] text-center text-sm font-semibold" aria-live="polite">
          {percent}%
        </span>
        <button type="button" className={chip()} onClick={() => setAndSave("textSize", Math.min(100, textSize + 10))} disabled={textSize >= 100} aria-label="Perbesar teks">
          A+
        </button>
      </div>

      <button type="button" className={chip(highContrast)} aria-pressed={highContrast} onClick={() => setAndSave("highContrast", !highContrast)}>
        <Contrast className="h-4 w-4" aria-hidden="true" /> Kontras
      </button>
      <button type="button" className={chip(dyslexiaFont)} aria-pressed={dyslexiaFont} onClick={() => setAndSave("dyslexiaFont", !dyslexiaFont)}>
        <Type className="h-4 w-4" aria-hidden="true" /> Font Disleksia
      </button>
      <button
        type="button"
        className={chip(autoPlayAudio)}
        aria-pressed={autoPlayAudio}
        onClick={() => setAndSave("autoPlayAudio", !autoPlayAudio)}
        title="Bacakan materi dan soal secara otomatis"
      >
        {autoPlayAudio ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
        Suara
      </button>
      <Link to="/settings" className={chip()}>
        <Settings className="h-4 w-4" aria-hidden="true" /> Lainnya
      </Link>
    </div>
  );
}
