import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { CAPTION_EVENT, CUE_EVENT, type CueTone } from "@/lib/cues";

const toneColor: Record<CueTone, string> = { info: "#2563eb", success: "#16a34a", error: "#dc2626" };

// Menampilkan teks dari suara aplikasi (Caption) dan kedipan pengganti bunyi
// (Notifikasi Visual). Keduanya juga dikirim ke pembaca layar lewat aria-live.
export default function AccessibilityAnnouncer() {
  const { captions, visualNotifications, screenReaderMode } = useSettings();
  const [caption, setCaption] = useState("");
  const [cue, setCue] = useState<{ message: string; tone: CueTone } | null>(null);
  const captionTimer = useRef<ReturnType<typeof setTimeout>>();
  const cueTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onCaption = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      setCaption(text);
      clearTimeout(captionTimer.current);
      // Tampil cukup lama untuk dibaca: sekitar 15 karakter per detik, minimal 4 detik
      captionTimer.current = setTimeout(() => setCaption(""), Math.max(4000, text.length * 65));
    };
    const onCue = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: CueTone }>).detail;
      setCue(detail);
      const root = document.documentElement;
      if (visualNotifications) {
        root.style.setProperty("--cue-color", toneColor[detail.tone]);
        root.classList.remove("visual-cue");
        void root.offsetWidth; // mulai ulang animasi
        root.classList.add("visual-cue");
      }
      clearTimeout(cueTimer.current);
      cueTimer.current = setTimeout(() => {
        setCue(null);
        root.classList.remove("visual-cue");
      }, 2500);
    };
    window.addEventListener(CAPTION_EVENT, onCaption);
    window.addEventListener(CUE_EVENT, onCue);
    return () => {
      window.removeEventListener(CAPTION_EVENT, onCaption);
      window.removeEventListener(CUE_EVENT, onCue);
    };
  }, [visualNotifications]);

  const showCaption = (captions || screenReaderMode) && caption;

  return (
    <>
      {/* Pembaca layar selalu menerima teksnya, walaupun caption tidak ditampilkan */}
      <div className="sr-only" role="status" aria-live="polite">
        {screenReaderMode ? caption : ""}
      </div>

      {showCaption && captions && (
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)] rounded-xl bg-black/85 text-white px-4 py-3 text-base md:text-lg leading-snug shadow-xl"
          aria-hidden="true"
        >
          {caption}
        </div>
      )}

      {visualNotifications && cue && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2 text-white font-semibold shadow-lg"
          style={{ background: toneColor[cue.tone] }}
          role="status"
        >
          {cue.message}
        </div>
      )}
    </>
  );
}
