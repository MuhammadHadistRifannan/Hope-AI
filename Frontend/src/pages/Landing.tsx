import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Star, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Footer from "@/components/Footer";

// --- KONFIGURASI DATA FITUR DENGAN GIF ---
const features = [
  {
    name: "EyeRead",
    tagline: "Ubah Teks Fisik Jadi Digital",
    description:
      "Teknologi OCR canggih yang membaca buku, dokumen, dan papan tulis secara instan. Membantu teman netra 'melihat' dunia melalui suara.",
    href: "/eyeread",
    gif: "/gif/animasi-landing1.gif",
    // Analisis: Teal/Emerald theme (based on Home.tsx config for EyeRead)
    color: "green",
    gradient: "from-emerald-500/20 to-teal-500/20",
    checkpoints: [
      "Scan instan presisi tinggi",
      "Output suara natural",
      "Mode kontras tinggi",
    ],
  },
  {
    name: "NeoTutor",
    tagline: "Mentor AI Pribadi 24/7",
    description:
      "Belajar tidak pernah sendirian. NeoTutor siap menjawab pertanyaan sulit, menjelaskan konsep rumit, dan menemani proses belajarmu kapan saja.",
    href: "/neotutor",
    gif: "/gif/animasi-landing2.gif",
    // Analisis: Purple/Indigo theme
    color: "blue",
    gradient: "from-sky-400/40 to-cyan-400/40",
    checkpoints: [
      "Penjelasan adaptif",
      "Dukungan bahasa isyarat",
      "Ramah & sabar",
    ],
  },
  {
    name: "Flexa",
    tagline: "Materi Belajar Adaptif",
    description:
      "Satu materi, berbagai format. Flexa mengubah teks pelajaran menjadi ringkasan, audio, atau visual yang ramah disleksia sesuai kebutuhanmu.",
    href: "/flexa",
    gif: "/gif/animasi-landing3.gif",
    // Analisis: Green theme
    color: "yellow",
    gradient: "from-green-500/20 to-emerald-500/20",
    checkpoints: [
      "Simplifikasi teks otomatis",
      "Konversi Text-to-Speech",
      "Font ramah disleksia",
    ],
  },
  {
    name: "Pathly",
    tagline: "Peta Belajar Terarah",
    description:
      "Bingung mulai dari mana? Pathly membuatkan kurikulum khusus berdasarkan minat dan bakatmu. Langkah demi langkah menuju kesuksesan.",
    href: "/pathly",
    gif: "/gif/animasi-landing4.gif",
    // Analisis: Orange/Amber theme
    color: "red",
    gradient: "from-orange-500/20 to-amber-500/20",
    checkpoints: ["Roadmap personal", "Tracking progress", "Rekomendasi karir"],
  },
  {
    name: "EchoForum",
    tagline: "Komunitas Tanpa Sekat",
    description:
      "Ruang aman untuk berdiskusi, berbagi cerita, dan saling menguatkan. Temukan teman seperjuangan dalam lingkungan yang inklusif.",
    href: "/forum",
    gif: "/gif/animasi-landing5.gif",
    // Analisis: Indigo/Fuchsia theme
    color: "blue",
    gradient: "from-sky-400/40 to-cyan-400/40",
    checkpoints: [
      "Diskusi moderasi AI",
      "Grup minat khusus",
      "Event komunitas",
    ],
  },
];

// --- KOMPONEN BACKGROUND ---
const BackgroundGradient = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px] animate-pulse delay-1000" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
  </div>
);

// --- MAIN PAGE ---
export default function Landing() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const penguinGif = "/gif/animasi-home.gif";

  // Fungsi untuk scroll ke fitur
  const scrollToFeatures = () => {
    const element = document.getElementById("fitur-unggulan");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen relative font-sans selection:bg-primary/20 overflow-x-hidden flex flex-col">
      <BackgroundGradient />

      {/* --- HEADER / NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/60 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-background/60">
        <Link to="/" className="flex items-center gap-3 group">
          {/* BAGIAN INI DIUBAH UNTUK MEMASANG LOGO */}
          <img
            src="/images/logo.png"
            alt="Hope.Ai Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow"
          />
          <span className="text-3xl font-cherry tracking-wide text-foreground group-hover:text-primary transition-colors">
            Hope.Ai
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="hidden md:flex text-foreground/80 hover:text-primary"
            asChild
          >
            <Link to="/auth">Masuk</Link>
          </Button>
          <Button
            size="sm"
            className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-md"
            asChild
          >
            {/* Tambahkan query param ?mode=signup agar halaman Auth tahu harus membuka form Daftar */}
            <Link to="/auth?mode=signup">Daftar</Link>
          </Button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section
        ref={targetRef}
        className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-[90vh] flex items-center"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          {/* Left Column (Teks) */}
          <motion.div
            style={{ opacity, y }}
            className="relative z-10 text-center md:text-left order-2 md:order-1"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-white/20 backdrop-blur-md shadow-sm mb-6 hover:scale-105 transition-transform duration-300 cursor-default"
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI untuk Pendidikan Inklusif
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground"
            >
              Belajar Tanpa <br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-blue-600 to-secondary bg-clip-text text-transparent">
                  Batasan.
                </span>
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="absolute w-full h-3 -bottom-2 left-0 text-secondary"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 50 10 100 5"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed"
            >
              Hope.Ai menghadirkan ekosistem pembelajaran inklusif yang didukung
              AI. Personalisasi, aksesibilitas, dan komunitas dalam satu
              platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center"
            >
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 bg-primary hover:bg-primary/90 group"
                asChild
              >
                <Link to="/auth">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
                onClick={scrollToFeatures}
              >
                Pelajari Lebih Lanjut
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column: GIF Penguin (Hero) */}
          <motion.div
            style={{ opacity, y }}
            className="relative z-10 order-1 md:order-2 flex justify-center items-center"
          >
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-full blur-[60px] -z-10" />
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <img
                  src={penguinGif}
                  alt="Animasi Home Penguin"
                  className="w-96 h-96 md:w-[32rem] md:h-[32rem] object-contain drop-shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURE SECTION (ZIG-ZAG) --- */}
      <section
        id="fitur-unggulan"
        className="px-6 md:px-12 py-20 max-w-7xl mx-auto space-y-24 md:space-y-32"
      >
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-4 tracking-tight"
          >
            Fitur Unggulan
          </motion.h2>
          <p className="text-muted-foreground text-lg">
            Teknologi yang dirancang untuk mendukung setiap langkahmu.
          </p>
        </div>

        {features.map((feature, index) => (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className={`flex flex-col md:flex-row items-center gap-12 lg:gap-20 ${
              index % 2 === 1 ? "md:flex-row-reverse" : ""
            }`}
          >
            {/* Bagian Teks */}
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div
                className={`inline-block px-4 py-1.5 rounded-full bg-${feature.color}-100 dark:bg-${feature.color}-900/30 text-${feature.color}-600 dark:text-${feature.color}-400 text-sm font-semibold tracking-wide uppercase`}
              >
                {feature.name}
              </div>

              <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                {feature.tagline}
              </h3>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              <ul className="space-y-3 pt-2">
                {feature.checkpoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 justify-center md:justify-start"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 text-${feature.color}-500`}
                    />
                    <span className="text-foreground/80 font-medium">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <Button
                  size="lg"
                  className="rounded-full bg-blue-600/90 hover:bg-blue-500 text-white border border-white/20 backdrop-blur-sm shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <Link to={feature.href}>
                    Coba {feature.name} <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bagian Gambar/GIF */}
            <div className="flex-1 relative w-full flex justify-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 w-full max-w-full md:max-w-4xl aspect-square md:aspect-auto scale-100 md:scale-125 origin-center"
              >
                <img
                  src={feature.gif}
                  alt={`Animasi ${feature.name}`}
                  className="w-full h-auto object-contain drop-shadow-2xl rounded-3xl"
                  onError={(e) => {
                    console.error(`Gagal memuat GIF: ${feature.gif}`);
                    e.currentTarget.style.display = "none";
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-primary via-blue-600 to-secondary p-1"
        >
          <div className="rounded-[calc(3rem-4px)] bg-background/10 backdrop-blur-xl h-full p-10 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 relative z-10">
              Mulai Perjalanan Anda.
            </h2>
            <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto relative z-10">
              Bergabunglah dengan ribuan siswa lainnya. Tanpa biaya tersembunyi,
              hanya pendidikan murni yang dapat diakses.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-10"
            >
              <Button
                size="lg"
                className="h-16 px-10 text-xl rounded-full bg-white text-primary hover:bg-gray-100 border-0 shadow-2xl shadow-black/20"
                asChild
              >
                <Link to="/auth?mode=signup">Buat Akun Gratis</Link>
              </Button>
            </motion.div>

            <Star className="absolute top-10 left-10 text-yellow-300 w-8 h-8 animate-pulse" />
            <Zap className="absolute bottom-10 right-10 text-yellow-300 w-12 h-12 animate-bounce duration-[2000ms]" />
          </div>
        </motion.div>
      </section>

      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
}
