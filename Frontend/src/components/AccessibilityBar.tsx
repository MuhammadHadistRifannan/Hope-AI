import { Link } from "react-router-dom";
import { Contrast, Settings, Type, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";

// Pengaturan yang paling sering diubah, bisa diatur langsung dari Beranda.
// Setiap perubahan langsung tersimpan ke perangkat dan akun.
export default function AccessibilityBar() {
  const { textSize, highContrast, dyslexiaFont, autoPlayAudio, setAndSave } = useSettings();
  const percent = 100 + textSize;

  return (
    <div
      role="toolbar"
      aria-label="Pengaturan tampilan cepat"
      className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2"
    >
      <div className="flex items-center gap-1" role="group" aria-label={`Ukuran teks ${percent} persen`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAndSave("textSize", Math.max(0, textSize - 10))}
          disabled={textSize <= 0}
          aria-label="Perkecil teks"
        >
          A−
        </Button>
        <span className="min-w-[3.5rem] text-center text-sm font-medium" aria-live="polite">
          {percent}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAndSave("textSize", Math.min(100, textSize + 10))}
          disabled={textSize >= 100}
          aria-label="Perbesar teks"
        >
          A+
        </Button>
      </div>

      <Button
        variant={highContrast ? "default" : "outline"}
        size="sm"
        aria-pressed={highContrast}
        onClick={() => setAndSave("highContrast", !highContrast)}
      >
        <Contrast className="w-4 h-4 mr-1" aria-hidden="true" /> Kontras
      </Button>
      <Button
        variant={dyslexiaFont ? "default" : "outline"}
        size="sm"
        aria-pressed={dyslexiaFont}
        onClick={() => setAndSave("dyslexiaFont", !dyslexiaFont)}
      >
        <Type className="w-4 h-4 mr-1" aria-hidden="true" /> Font Disleksia
      </Button>
      <Button
        variant={autoPlayAudio ? "default" : "outline"}
        size="sm"
        aria-pressed={autoPlayAudio}
        onClick={() => setAndSave("autoPlayAudio", !autoPlayAudio)}
        title="Bacakan materi dan soal secara otomatis"
      >
        {autoPlayAudio ? (
          <Volume2 className="w-4 h-4 mr-1" aria-hidden="true" />
        ) : (
          <VolumeX className="w-4 h-4 mr-1" aria-hidden="true" />
        )}
        Suara
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/settings">
          <Settings className="w-4 h-4 mr-1" aria-hidden="true" /> Lainnya
        </Link>
      </Button>
    </div>
  );
}
