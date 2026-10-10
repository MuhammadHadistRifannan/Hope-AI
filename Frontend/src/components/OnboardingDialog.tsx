import { useCallback, useEffect, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { needOptions, useSettings } from "@/context/SettingsContext";
import { speak, stopSpeech } from "@/lib/speech";
import { requestVoiceInput, useVoiceCommands } from "@/lib/voiceCommands";

// Langkah: "intro" → satu pertanyaan per kebutuhan → "consent" (persetujuan data)
type Step = "intro" | number | "consent";

const YES = /^(ya|iya|betul|benar|setuju|mau|boleh|ok|oke|y)$/;
const NO = /^(tidak|nggak|enggak|ga|gak|bukan|tidak mau|jangan|n|t)$/;

// Ditampilkan sekali saat akun pertama kali masuk. Bisa diselesaikan tanpa melihat
// layar: setiap langkah dibacakan, dan dijawab dengan tombol, tombol keyboard
// Y dan T, atau suara ("ya" dan "tidak").
export default function OnboardingDialog() {
  const { needsOnboarding, completeOnboarding, volume } = useSettings();
  const [step, setStep] = useState<Step>("intro");
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const total = needOptions.length;
  const say = useCallback((text: string) => speak(text, { volume, rate: "normal", aiVoice: false }), [volume]);

  const introText =
    "Selamat datang di Hope.Ai. Agar tampilan dan suara cocok untukmu, ada " +
    total +
    " pertanyaan singkat. Jawab ya atau tidak. Tekan Y untuk ya dan T untuk tidak, atau tekan Alt M lalu ucapkan jawabanmu. Tekan Y untuk mulai, atau T untuk melewati.";

  const questionText = (index: number) =>
    `Pertanyaan ${index + 1} dari ${total}. ${needOptions[index].label}. Jawab ya atau tidak.`;

  const consentText = (needs: string[]) =>
    needs.length === 0
      ? "Kamu tidak memilih kebutuhan apa pun. Tekan Y untuk selesai."
      : "Bolehkah Hope.Ai menyimpan jawabanmu di akun, agar ikut terbawa saat masuk dari perangkat lain? Data ini hanya bisa dilihat olehmu. Tekan Y untuk menyimpan di akun, atau T untuk menyimpan di perangkat ini saja.";

  // Bacakan setiap langkah begitu tampil
  useEffect(() => {
    if (!needsOnboarding) return;
    if (step === "intro") say(introText);
    else if (step === "consent") say(consentText(selected));
    else say(questionText(step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, needsOnboarding]);

  const finish = async (needs: string[], consent: boolean) => {
    setIsSaving(true);
    stopSpeech();
    await completeOnboarding(needs, consent);
    setIsSaving(false);
  };

  const answer = (yes: boolean) => {
    if (isSaving) return;
    if (step === "intro") {
      if (yes) setStep(0);
      else finish([], false);
      return;
    }
    if (step === "consent") {
      finish(selected, yes);
      return;
    }
    const next = yes ? [...selected, needOptions[step].id] : selected;
    setSelected(next);
    setStep(step + 1 < total ? step + 1 : "consent");
  };

  const repeat = () => {
    if (step === "intro") say(introText);
    else if (step === "consent") say(consentText(selected));
    else say(questionText(step));
  };

  const back = () => {
    if (typeof step !== "number") return;
    const previous = step - 1;
    if (previous < 0) {
      setStep("intro");
      return;
    }
    setSelected((list) => list.filter((id) => id !== needOptions[previous].id));
    setStep(previous);
  };

  // Keyboard: Y = ya, T atau N = tidak, R = ulangi
  useEffect(() => {
    if (!needsOnboarding) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "y") answer(true);
      else if (key === "t" || key === "n") answer(false);
      else if (key === "r") repeat();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Suara: "ya", "tidak", "ulangi", "kembali", "lewati"
  useVoiceCommands((command) => {
    if (!needsOnboarding) return false;
    if (YES.test(command)) answer(true);
    else if (NO.test(command)) answer(false);
    else if (/^(ulangi|ulang)/.test(command)) repeat();
    else if (/^(kembali|sebelumnya)/.test(command)) back();
    else if (/^(lewati|lewati semua)$/.test(command)) finish([], false);
    else return false;
    return true;
  });

  const yesLabel = step === "intro" ? "Mulai (Y)" : step === "consent" ? (selected.length ? "Simpan di akun (Y)" : "Selesai (Y)") : "Ya (Y)";
  const noLabel = step === "intro" ? "Lewati (T)" : step === "consent" ? "Simpan di perangkat ini saja (T)" : "Tidak (T)";

  return (
    <Dialog open={needsOnboarding} onOpenChange={(open) => !open && finish([], false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sesuaikan Hope.Ai untukmu</DialogTitle>
          <DialogDescription>
            {step === "intro" &&
              `Ada ${total} pertanyaan singkat tentang caramu belajar. Jawab ya atau tidak. Semua bisa diubah lagi di Pengaturan.`}
            {typeof step === "number" && `Pertanyaan ${step + 1} dari ${total}`}
            {step === "consent" && "Satu langkah lagi"}
          </DialogDescription>
        </DialogHeader>

        {typeof step === "number" && (
          <>
            <Progress value={(step / total) * 100} aria-hidden="true" />
            <div className="py-4" aria-live="polite">
              <p className="text-xl font-semibold leading-snug">{needOptions[step].label}</p>
              <p className="text-muted-foreground mt-2">Bila ya: {needOptions[step].hint.toLowerCase()}.</p>
            </div>
          </>
        )}

        {step === "consent" && (
          <div className="space-y-3 py-2" aria-live="polite">
            {selected.length === 0 ? (
              <p>Kamu tidak memilih kebutuhan apa pun. Tampilan standar dipakai, dan bisa diubah kapan saja di Pengaturan.</p>
            ) : (
              <>
                <p className="font-medium">Yang kamu pilih:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {needOptions
                    .filter((option) => selected.includes(option.id))
                    .map((option) => (
                      <li key={option.id}>{option.label}</li>
                    ))}
                </ul>
                <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
                  <p>
                    <strong>Bolehkah jawaban ini disimpan di akunmu?</strong> Dengan begitu pengaturanmu
                    ikut terbawa saat masuk dari perangkat lain.
                  </p>
                  <p>
                    Data ini hanya bisa dilihat olehmu, tidak ditampilkan ke guru maupun siswa lain, dan
                    bisa dihapus kapan saja dengan mematikan "Simpan kebutuhan di akun saya" di Pengaturan.
                    Bila tidak disetujui, jawaban hanya disimpan di perangkat ini.
                  </p>
                  <p>
                    Catatan: perintah suara memakai layanan pengenal suara bawaan browser. Di Chrome dan
                    Edge, rekaman suaramu diproses oleh Google; di Safari oleh Apple.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button className="flex-1 h-12 text-base" onClick={() => answer(true)} disabled={isSaving} autoFocus>
            {isSaving ? "Menyimpan..." : yesLabel}
          </Button>
          {!(step === "consent" && selected.length === 0) && (
            <Button variant="outline" className="flex-1 h-12 text-base" onClick={() => answer(false)} disabled={isSaving}>
              {noLabel}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={repeat}>
              <Volume2 className="w-4 h-4 mr-1" aria-hidden="true" /> Ulangi (R)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={requestVoiceInput}
              aria-label="Jawab dengan suara. Ucapkan ya atau tidak."
              title="Jawab dengan suara"
            >
              <Mic className="w-4 h-4 mr-1" aria-hidden="true" /> Jawab dengan suara
            </Button>
          </div>
          {typeof step === "number" && (
            <Button variant="ghost" size="sm" onClick={back}>
              Kembali
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
