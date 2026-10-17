import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Layar pembuka: penguin melayang, nama Hope.Ai, dan tiga titik berkedip. Setelah
// selesai layar ini memudar, dan halaman di belakangnya muncul.

const DURATION = 3000;
const FADE = 800;

type Props = {
  // Dipanggil saat layar mulai memudar: halaman di belakangnya sudah boleh ditampilkan
  onReveal: () => void;
  // Dipanggil setelah layar hilang sepenuhnya
  onComplete: () => void;
};

export default function LoadingScreen({ onReveal, onComplete }: Props) {
  const [leaving, setLeaving] = useState(false);
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pakai timer biasa, bukan akhir animasi: animasi tidak berjalan saat tab
  // tidak terlihat, sehingga layar pembuka bisa macet selamanya.
  useEffect(() => {
    const fade = calm ? 0 : FADE;
    const reveal = setTimeout(() => {
      onReveal();
      setLeaving(true);
    }, DURATION);
    const done = setTimeout(onComplete, DURATION + fade);
    return () => {
      clearTimeout(reveal);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-landing
      className={`font-sans fixed inset-0 bg-white flex items-center justify-center z-[100] ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ transition: calm ? undefined : `opacity ${FADE}ms ease-in-out` }}
    >
      <div className="text-center">
        <motion.div
          animate={calm ? undefined : { y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block relative z-10"
        >
          <img src="/gif/loading-hero.gif" alt="" className="w-56 h-auto mx-auto drop-shadow-xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 relative z-20"
        >
          <h1 className="text-5xl font-cherry text-primary mb-2 tracking-tight" translate="no">
            Hope.Ai
          </h1>
          <p className="text-xl text-muted-foreground font-medium">AI untuk Pendidikan Inklusif</p>
        </motion.div>

        <motion.div
          role="progressbar"
          aria-label="Memuat Hope.Ai"
          className="mt-10 flex justify-center gap-3 relative z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-primary rounded-full shadow-sm"
              animate={calm ? undefined : { scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
