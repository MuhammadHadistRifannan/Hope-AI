import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Star, Zap, CheckCircle2, Gamepad2, Hand, Mic, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import Footer from "@/components/Footer";
import HelpChat from "@/components/HelpChat";
import HopeRun from "@/components/HopeRun";
import { useSettings } from "@/context/SettingsContext";

// --- KONFIGURASI DATA FITUR DENGAN GIF ---
const features = [
  {
    name: "EyeRead",
    tagline: "Ubah Teks Fisik Jadi Digital",
    description:
      "Arahkan kamera ke buku, dokumen, atau papan tulis. EyeRead membaca tulisannya dan membacakannya dengan suara, lalu bisa diringkas atau dijadikan kuis.",
    href: "/eyeread",
    gif: "/gif/animasi-landing1.gif",
    // Analisis: Teal/Emerald theme (based on Home.tsx config for EyeRead)
    color: "green",
    gradient: "from-emerald-500/20 to-teal-500/20",
    checkpoints: [
      "Pindai dengan kamera atau unggah berkas",
      "Dibacakan dengan suara",
      "Bisa dikendalikan dengan perintah suara",
    ],
  },
  {
    name: "NeoTutor",
    tagline: "Tutor AI yang Siap Kapan Saja",
    description:
      "Tanyakan apa saja dengan mengetik atau berbicara. NeoTutor mengingat percakapanmu dan bisa membahas materi atau dokumen yang sedang kamu pelajari.",
    href: "/neotutor",
    gif: "/gif/animasi-landing2.gif",
    // Analisis: Purple/Indigo theme
    color: "blue",
    gradient: "from-sky-400/40 to-cyan-400/40",
    checkpoints: [
      "Bertanya dengan suara atau teks",
      "Mengingat percakapan sebelumnya",
      "Membahas dokumen milikmu",
    ],
  },
  {
    name: "Flexa",
    tagline: "Materi Belajar Adaptif",
    description:
      "Satu materi, berbagai cara belajar. Flexa menyajikan materi sebagai bacaan, audio, ringkasan, atau versi bahasa sederhana, dilengkapi kamus isyarat SIBI.",
    href: "/flexa",
    gif: "/gif/animasi-landing3.gif",
    // Analisis: Green theme
    color: "yellow",
    gradient: "from-green-500/20 to-emerald-500/20",
    checkpoints: [
      "Versi bahasa sederhana",
      "Materi dibacakan dengan suara",
      "Huruf ramah disleksia",
    ],
  },
  {
    name: "Pathly",
    tagline: "Peta Belajar Terarah",
    description:
      "Bingung mulai dari mana? Pathly menyusun materi menjadi peta belajar. Selesaikan kuis di tiap level untuk membuka level berikutnya, sambil mengumpulkan XP.",
    href: "/pathly",
    gif: "/gif/animasi-landing4.gif",
    // Analisis: Orange/Amber theme
    color: "red",
    gradient: "from-orange-500/20 to-amber-500/20",
    checkpoints: ["Peta belajar bertahap", "Kemajuan tercatat di profil", "Kuis bisa dijawab dengan suara"],
  },
  {
    name: "Isyarat",
    tagline: "Setiap Isyarat Punya Arti",
    description:
      "Pelajari abjad jari SIBI dari kamus bergambar dan video, lalu latih langsung di depan kamera. Kamera mengenali huruf yang kamu peragakan dan membacakannya.",
    href: "/isyarat",
    // Belum ada animasi GIF; memakai ilustrasi kartu huruf
    gif: "",
    // Kelas warna yang dibentuk dari "purple" (ditulis lengkap supaya Tailwind membuatnya):
    // bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-purple-500
    color: "purple",
    gradient: "from-purple-500/20 to-fuchsia-500/20",
    checkpoints: [
      "Kamus abjad dan angka SIBI",
      "Latihan mengeja dengan kamera",
      "Isyarat dikenali di perangkatmu",
    ],
  },
  {
    name: "EchoForum",
    tagline: "Komunitas Tanpa Sekat",
    description:
      "Ruang untuk bertanya dan berdiskusi dengan teman belajar. Setiap postingan dan komentar bisa dibacakan dengan suara.",
    href: "/forum",
    gif: "/gif/animasi-landing5.gif",
    // Analisis: Indigo/Fuchsia theme
    color: "blue",
    gradient: "from-sky-400/40 to-cyan-400/40",
    checkpoints: [
      "Postingan bisa dibacakan",
      "Notifikasi saat ada balasan",
      "Dimoderasi admin",
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

// Ilustrasi Isyarat: tiga kartu huruf abjad jari
const SignArt = () => (
  <div aria-hidden="true" className="relative mx-auto aspect-[4/3] w-full max-w-lg">
    <div className="absolute inset-[8%] rounded-full bg-gradient-to-tr from-purple-500/20 to-fuchsia-400/20 blur-3xl" />
    <div className="relative grid h-full grid-cols-3 items-center gap-4 p-6 md:gap-6">
      {["A", "B", "C"].map((letter, i) => (
        <motion.div
          key={letter}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-3xl border border-white/60 bg-white shadow-2xl shadow-purple-500/10 dark:border-white/10 dark:bg-slate-900"
        >
          <Hand className="h-10 w-10 text-purple-500 md:h-14 md:w-14" />
          <span className="text-3xl font-bold text-slate-900 dark:text-white md:text-5xl">{letter}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function Landing({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const penguinGif = "/gif/animasi-home.gif";

  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  // Hope Run dibuka di atas halaman; setelah ditutup fokus kembali ke tombol pembukanya
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const arcadeButton = useRef<HTMLButtonElement>(null);
  const closeArcade = useCallback(() => {
    setArcadeOpen(false);
    requestAnimationFrame(() => arcadeButton.current?.focus());
  }, []);

  const startHref = isLoggedIn ? "/" : "/auth?mode=signup";
  // Tombol "Coba" membuka fiturnya langsung; yang belum punya akun mendaftar dulu lalu diteruskan ke sana
  const featureHref = (path: string) => (isLoggedIn ? path : `/auth?mode=signup&next=${path}`);

  // Fungsi untuk scroll ke fitur
  const scrollToFeatures = () => {
    const element = document.getElementById("fitur-unggulan");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div data-landing className="min-h-screen relative font-sans selection:bg-primary/20 overflow-x-hidden flex flex-col">
      <a
        href="#fitur-unggulan"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:shadow-lg"
      >
        Lompat ke isi halaman
      </a>
      <BackgroundGradient />

      {/* --- HEADER / NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/60 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-background/60">
        <Link to="/landing" className="flex items-center gap-3 group">
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
          {!isLoggedIn && (
            <Button
              variant="ghost"
              className="hidden md:flex text-foreground/80 hover:text-primary"
              asChild
            >
              <Link to="/auth">Masuk</Link>
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-md"
            asChild
          >
            {/* Tambahkan query param ?mode=signup agar halaman Auth tahu harus membuka form Daftar */}
            <Link to={startHref}>{isLoggedIn ? "Beranda" : "Daftar"}</Link>
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
                <Link to={startHref}>
                  {isLoggedIn ? "Buka Beranda" : "Mulai Sekarang"}
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
                  alt=""
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
                  <Link to={featureHref(feature.href)}>
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
                {feature.gif ? (
                <img
                  src={feature.gif}
                  alt=""
                  loading="lazy"
                  className="w-full h-auto object-contain drop-shadow-2xl rounded-3xl"
                  onError={(e) => {
                    console.error(`Gagal memuat GIF: ${feature.gif}`);
                    e.currentTarget.style.display = "none";
                  }}
                />
                ) : (
                  <SignArt />
                )}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* --- BISA DIPAKAI DENGAN SUARA --- */}
      <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto w-full" aria-labelledby="judul-suara">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row items-center gap-12 lg:gap-20"
        >
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold tracking-wide uppercase">
              Aksesibilitas
            </div>
            <h2 id="judul-suara" className="text-3xl md:text-4xl font-bold leading-tight">
              Bisa dipakai hanya dengan suara
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tekan tombol mikrofon atau <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-base font-semibold">Alt+M</kbd>, lalu
              ucapkan perintah. Siswa tunanetra atau yang sulit memakai tangan bisa pindah halaman, menekan tombol, dan
              mendengar isi halaman tanpa menyentuh layar.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                "Pindah halaman: \"buka EyeRead\", \"buka NeoTutor\"",
                "Mendengar isi halaman: \"bacakan halaman ini\"",
                "Menjawab kuis Pathly dengan suara: \"A\", \"B\", atau isi jawabannya",
              ].map((point) => (
                <li key={point} className="flex items-center gap-3 justify-center md:justify-start">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />
                  <span className="text-foreground/80 font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ilustrasi: tombol mikrofon dan contoh perintah yang diucapkan */}
          <div className="flex-1 relative w-full flex justify-center" aria-hidden="true">
            <div className="absolute inset-[10%] rounded-full bg-gradient-to-tr from-blue-500/20 to-sky-400/20 blur-3xl" />
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                >
                  <Mic className="h-8 w-8" />
                </motion.div>
                <div>
                  <p className="font-bold text-lg">Mendengarkan…</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Keyboard className="h-4 w-4" /> atau tekan Alt+M
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {["\"buka EyeRead\"", "\"bacakan halaman ini\"", "\"bantuan\""].map((said, i) => (
                  <motion.p
                    key={said}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.25 }}
                    className="ml-auto w-fit rounded-2xl rounded-br-md bg-blue-50 dark:bg-blue-900/30 px-4 py-2.5 font-medium text-blue-700 dark:text-blue-300"
                  >
                    {said}
                  </motion.p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- CARA PANDANG --- */}
      <section className="py-20 px-4" aria-labelledby="judul-cara-pandang">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white p-10 md:p-16"
        >
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium mb-6">
            <Star className="w-4 h-4 text-yellow-300" aria-hidden="true" /> Cara kami memandang
          </p>
          <h2 id="judul-cara-pandang" className="text-3xl md:text-5xl font-bold leading-tight mb-6">
            Hambatan ada di sistem, bukan di dirimu.
          </h2>
          <p className="text-lg md:text-xl text-blue-50 leading-relaxed max-w-3xl">
            Materi yang hanya bisa dilihat, didengar, atau dibaca dengan satu cara membuat sebagian
            siswa tertinggal. Hope.Ai menyesuaikan diri dengan caramu belajar: lewat suara, teks,
            bahasa sederhana, atau isyarat.
          </p>
        </motion.div>
      </section>

      {/* --- HOPE RUN: permainan kecil, baru berjalan setelah tombolnya ditekan --- */}
      <section className="px-4 pb-4" aria-labelledby="judul-hope-run">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl p-8 md:p-10 text-center sm:text-left"
        >
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30" aria-hidden="true">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Hope Arcade</p>
            <h2 id="judul-hope-run" className="text-2xl md:text-3xl font-bold mt-1">Ready, Set, Hope Run!</h2>
            <p className="text-muted-foreground mt-2">Lari sejauh mungkin, hindari rintangan, dan kumpulkan bintang pengetahuan. Ada mode bantuan, pilihan tombol, dan suara yang bisa diatur.</p>
          </div>
          <Button
            ref={arcadeButton}
            type="button"
            size="lg"
            onClick={() => setArcadeOpen(true)}
            className="rounded-full bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
          >
            Mainkan <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
          </Button>
        </motion.div>
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
              Gratis, tanpa iklan, dan bisa dipakai dengan suara, keyboard, atau layar
              sentuh.
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
                <Link to={startHref}>{isLoggedIn ? "Buka Beranda" : "Buat Akun Gratis"}</Link>
              </Button>
            </motion.div>

            <Star className="absolute top-10 left-10 text-yellow-300 w-8 h-8 animate-pulse" />
            <Zap className="absolute bottom-10 right-10 text-yellow-300 w-12 h-12 animate-bounce duration-[2000ms]" />
          </div>
        </motion.div>
      </section>

      {/* --- FOOTER --- */}
      <Footer />

      {/* Tanya-jawab singkat tentang Hope.Ai; disembunyikan selama permainan terbuka */}
      {!arcadeOpen && <HelpChat />}
      {arcadeOpen && <HopeRun onClose={closeArcade} calm={effectiveReduceMotion || screenReaderMode} />}
    </div>
  );
}
