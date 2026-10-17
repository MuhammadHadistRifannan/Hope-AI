import { Delete, Eraser, Space, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SYSTEM_NAME, type SignSystem, type TranscriptPart } from "@/lib/sign/router";

type Props = {
  parts: TranscriptPart[];
  preferred: SignSystem;
  onPreferredChange: (system: SignSystem) => void;
  modelsMissing: boolean;
  cameraOn: boolean;
  onSpace: () => void;
  onDeleteLast: () => void;
  onClear: () => void;
  onSpeak: () => void;
};

// Mode Otomatis: kata BISINDO dan ejaan huruf SIBI dalam satu kalimat.
// Setiap bagian kalimat diberi label sistemnya.
export default function OtomatisPanel({
  parts, preferred, onPreferredChange, modelsMissing, cameraOn, onSpace, onDeleteLast, onClear, onSpeak,
}: Props) {
  return (
    <div>
      <div className="px-well p-3 mb-4 text-sm">
        <p className="font-bold mb-1">Eksperimen</p>
        <p className="text-muted-foreground">
          Kamera membaca kata BISINDO dan huruf SIBI sekaligus. Kedua model tetap terpisah; tiap hasil diberi label
          sistemnya. Mode ini belum diuji dengan peraga sungguhan, jadi gunakan tombol SIBI atau BISINDO bila hasilnya
          sering keliru.
        </p>
      </div>

      {modelsMissing ? (
        <div className="px-well p-4" role="status">
          <p className="font-medium mb-1">Mode Otomatis belum tersedia</p>
          <p className="text-sm text-muted-foreground">Mode ini butuh model SIBI dan model BISINDO yang terpasang.</p>
        </div>
      ) : (
        <>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Huruf SIBI:</strong> tahan satu tangan diam sampai terbaca. Untuk
              mengeja nama, ganti huruf tanpa menurunkan tangan.
            </li>
            <li>
              <strong className="text-foreground">Kata BISINDO:</strong> peragakan gerakannya dengan bahu terlihat, lalu
              turunkan tangan.
            </li>
            <li>Turunkan tangan setelah selesai mengeja sebelum memperagakan kata.</li>
          </ul>

          <div className="mb-4">
            <p className="text-sm font-medium mb-2" id="preferred-label">Saat ragu, utamakan</p>
            <div className="flex gap-1.5" role="group" aria-labelledby="preferred-label">
              {(["sibi", "bisindo"] as const).map((system) => (
                <Button
                  key={system}
                  size="sm"
                  variant={preferred === system ? "default" : "outline"}
                  aria-pressed={preferred === system}
                  onClick={() => onPreferredChange(system)}
                  className="px-btn flex-1"
                >
                  {system === "sibi" ? "Huruf SIBI" : "Kata BISINDO"}
                </Button>
              ))}
            </div>
          </div>

          <div className="px-well min-h-[6rem] p-4 mb-4 flex flex-wrap gap-2 items-start" aria-live="polite" aria-label="Kalimat">
            {parts.length === 0 ? (
              <span className="text-muted-foreground text-lg">
                {cameraOn ? "Belum ada isyarat" : "Nyalakan kamera untuk mulai"}
              </span>
            ) : (
              parts.map((part, i) => (
                <span key={i} className="inline-flex items-baseline gap-1 border-2 border-foreground bg-card px-2 py-1">
                  <span className="text-2xl font-bold">{part.text}</span>
                  <span className="text-xs font-bold text-muted-foreground">({SYSTEM_NAME[part.system]})</span>
                </span>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="px-btn" onClick={onSpeak} disabled={!parts.length}>
              <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Ucapkan
            </Button>
            <Button className="px-btn" variant="outline" onClick={onSpace} disabled={!parts.some((p) => p.open)}>
              <Space className="w-4 h-4 mr-2" aria-hidden="true" /> Akhiri Ejaan
            </Button>
            <Button className="px-btn" variant="outline" onClick={onDeleteLast} disabled={!parts.length}>
              <Delete className="w-4 h-4 mr-2" aria-hidden="true" /> Hapus Terakhir
            </Button>
            <Button className="px-btn" variant="outline" onClick={onClear} disabled={!parts.length}>
              <Eraser className="w-4 h-4 mr-2" aria-hidden="true" /> Bersihkan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
