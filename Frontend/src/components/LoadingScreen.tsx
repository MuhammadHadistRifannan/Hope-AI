import { useEffect } from "react";
import { motion } from "framer-motion";

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  // Pastikan file GIF sudah ada di folder public
  const logoImageSrc = "/gif/loading-hero.gif"; 

  // Pakai timer biasa, bukan akhir animasi: animasi tidak berjalan saat tab
  // tidak terlihat, sehingga layar pembuka bisa macet selamanya.
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      // UBAH DISINI: Ganti gradient biru menjadi bg-white (putih polos)
      className="fixed inset-0 bg-white flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <div className="text-center">
        
        {/* Container Gambar */}
        <motion.div
          animate={{
            y: [-10, 10, -10], // Tetap melayang halus
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-block relative z-10"
        >
          <img 
            src={logoImageSrc} 
            alt="Loading Animation" 
            className="w-56 h-auto mx-auto drop-shadow-xl" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              console.error("Gagal memuat GIF.");
            }}
          />
        </motion.div>
        
        {/* Teks Judul */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 relative z-20"
        >
          {/* UBAH DISINI: Warna teks jadi gelap (text-primary) agar terbaca di background putih */}
          <h1 className="text-5xl font-cherry text-primary mb-2 tracking-tight">
            Hope.Ai
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            AI untuk Pendidikan Inklusif
          </p>
        </motion.div>

        {/* Indikator Loading */}
        <motion.div
          className="mt-10 flex justify-center gap-3 relative z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              // UBAH DISINI: Warna titik jadi gelap (bg-primary)
              className="w-4 h-4 bg-primary rounded-full shadow-sm"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3], // Opacity disesuaikan agar kedipannya enak dilihat
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}