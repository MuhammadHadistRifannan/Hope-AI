import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import RunnerStage, { type RunnerScene } from "@/components/ParallaxScene";
import { FeatureIcon, HopeMascot, landingArt } from "@/components/LandingArt";
import { useSettings } from "@/context/SettingsContext";

// Tiap fitur adalah satu menu dalam perjalanan. Latar di belakangnya bergeser ke
// samping seperti game endless runner, dan adegannya berganti di tiap menu.
type Chapter = {
  id: string;
  // Halaman fitur yang dibuka tombol "Coba"
  path: string;
  numeral: string;
  name: string;
  // Kalimat pemikat, lalu satu kalimat tentang apa yang dilakukan fiturnya
  heading: string;
  description: string;
  scene: string;
  layers: number;
};

const chapters: Chapter[] = [
  { id: "eyeread", path: "/eyeread", numeral: "I", name: "EyeRead", heading: "Biarkan tulisan bersuara.", description: "Pindai buku atau unggah dokumen, lalu dengarkan.", scene: "s5", layers: 4 },
  { id: "neotutor", path: "/neotutor", numeral: "II", name: "NeoTutor", heading: "Belum paham? Tanyakan lagi.", description: "Tutor AI yang bisa ditanya lewat ketikan atau suara.", scene: "s6", layers: 5 },
  { id: "flexa", path: "/flexa", numeral: "III", name: "Flexa", heading: "Satu materi, caramu sendiri.", description: "Baca, dengarkan, ringkas, atau ubah ke bahasa sederhana.", scene: "s7", layers: 4 },
  { id: "pathly", path: "/pathly", numeral: "IV", name: "Pathly", heading: "Satu langkah kecil, satu kemajuan.", description: "Peta belajar bertingkat dengan kuis di tiap level.", scene: "s4", layers: 3 },
  { id: "isyarat", path: "/isyarat", numeral: "V", name: "Isyarat", heading: "Setiap isyarat punya arti.", description: "Latihan abjad jari SIBI dengan kamera.", scene: "s8", layers: 4 },
  { id: "echoforum", path: "/forum", numeral: "VI", name: "EchoForum", heading: "Punya pertanyaan? Kamu tidak sendirian.", description: "Forum diskusi yang bisa dibacakan dengan suara.", scene: "s1", layers: 4 },
];

// Urutan adegan sepanjang perjalanan: pembuka, enam menu, penutup
const scenes: RunnerScene[] = [
  { folder: "s2", layers: 4 },
  ...chapters.map((chapter) => ({ folder: chapter.scene, layers: chapter.layers })),
  { folder: "s3", layers: 4 },
];

// Gulir beranimasi ke satu bagian, supaya latar parallax terlihat bergeser dan
// tidak langsung meloncat. Berhenti begitu pengguna menggulir sendiri.
function glideTo(id: string, animated: boolean) {
  const section = document.getElementById(id);
  if (!section) return;
  const start = window.scrollY;
  const end = section.getBoundingClientRect().top + start;
  const finish = () => {
    history.replaceState(null, "", `#${id}`);
    // Pembaca layar dan keyboard ikut berpindah ke bagian yang dituju
    const heading = section.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };
  if (!animated) {
    window.scrollTo(0, end);
    finish();
    return;
  }

  const duration = Math.min(2600, Math.max(1500, Math.abs(end - start) * 0.9));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let cancelled = false;
  const cancel = () => (cancelled = true);
  const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
  events.forEach((name) => window.addEventListener(name, cancel, { passive: true, once: true }));
  const began = performance.now();
  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - began) / duration);
    window.scrollTo(0, start + (end - start) * ease(t));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      events.forEach((name) => window.removeEventListener(name, cancel));
      finish();
    }
  };
  requestAnimationFrame(step);
}

// Samarkan teks yang sedang lewat di bawah logo dan navigasi, agar tidak bertumpuk
function useFadeUnderHeader() {
  useEffect(() => {
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const nav = document.querySelector<HTMLElement>("[data-landing-nav]");
      // Teks mulai memudar sedikit di bawah navigasi dan hilang sebelum menyentuhnya
      const limit = (nav?.getBoundingClientRect().bottom ?? 150) + 70;
      // Fokus keyboard berhenti di bawah navigasi, bukan di belakangnya
      document.documentElement.style.scrollPaddingTop = `${limit + 16}px`;

      // Isi menu yang menempel di layar tidak lewat di bawah navigasi, jadi tidak ikut dipudarkan
      const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-fade]")).filter(
        (element) => !element.closest("[data-pinned]")
      );
      // Baca semua posisi dulu, baru tulis gayanya, supaya tata letak dihitung sekali saja
      const opacities = elements.map((element) => {
        const rect = element.getBoundingClientRect();
        // Blok besar (animasi) dinilai dari tengahnya, teks dari tepi atasnya
        const top = element.dataset.fade === "tengah" ? rect.top + rect.height / 2 : rect.top;
        return Math.min(1, Math.max(0, (top - (limit - 70)) / 70));
      });
      const focused = document.activeElement;
      elements.forEach((element, i) => {
        // Yang sedang difokus tetap terlihat walaupun berada di bawah navigasi
        const opacity = focused && element.contains(focused) ? 1 : opacities[i];
        element.style.opacity = String(opacity);
        element.style.pointerEvents = opacity < 0.3 ? "none" : "";
      });
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("focusin", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("focusin", onScroll);
      document.documentElement.style.scrollPaddingTop = "";
    };
  }, []);
}

// Judul bergelombang: huruf naik dan membesar satu per satu, dari huruf pertama
// sampai terakhir, seperti ombak yang lewat dari kiri ke kanan, lalu mengulang.
// Gilirannya diatur satu penghitung, jadi urutannya sama di semua perangkat.
function WaveText({ text, animated }: { text: string; animated: boolean }) {
  const letters = Array.from(text.replace(/ /g, "")).length;
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!animated) return;
    // Setelah huruf terakhir ada jeda beberapa ketukan sebelum mulai lagi
    const step = setInterval(() => setActive((current) => (current + 1) % (letters + 5)), 150);
    return () => clearInterval(step);
  }, [animated, letters]);

  if (!animated) return <>{text}</>;
  let index = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <span key={w}>
            {w > 0 && " "}
            {/* Satu kata tidak boleh terpotong di tengah baris */}
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((letter) => {
                const position = index++;
                return (
                  <span key={position} className={`wave-letter ${position === active ? "wave-letter-up" : ""}`}>
                    {letter}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}

// Satu menu. Isinya tidak ikut naik bersama halaman: isinya menempel di layar
// (position: fixed, jadi tidak bergetar saat digulir), lalu teks dan gambarnya
// meluncur masuk dari samping dan keluar lagi ke samping selama bagian ini lewat.
function MenuSection({
  id,
  flipped,
  animated,
  text,
  art,
}: {
  id: string;
  flipped: boolean; // true: teks di kanan, gambar di kiri
  animated: boolean;
  text: ReactNode;
  art: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const metrics = useRef({ top: 0, height: 1 });
  // Jarak gulir dari posisi "bagian ini tepat di atas layar"
  const offset = useMotionValue(-99999);
  const { scrollY } = useScroll();

  useEffect(() => {
    if (!animated) return;
    const measure = () => {
      const section = ref.current;
      if (!section) return;
      metrics.current = { top: section.getBoundingClientRect().top + window.scrollY, height: section.offsetHeight };
      offset.set(window.scrollY - metrics.current.top);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    const unsubscribe = scrollY.on("change", (value) => offset.set(value - metrics.current.top));
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [animated, offset, scrollY]);

  // 0 = di luar layar, 1 = tampil penuh
  const shown = useTransform(offset, (value) => {
    const p = value / metrics.current.height;
    const enter = Math.min(1, Math.max(0, (p + 0.4) / 0.3));
    const exit = Math.min(1, Math.max(0, (p - 0.3) / 0.25));
    return (1 - Math.pow(1 - enter, 3)) * (1 - exit * exit);
  });
  const side = flipped ? 1 : -1;
  const textX = useTransform(shown, (value) => side * (1 - value) * window.innerWidth * 0.75);
  const artX = useTransform(shown, (value) => -side * (1 - value) * window.innerWidth * 0.75);
  const pointerEvents = useTransform(shown, (value) => (value < 0.5 ? "none" : "auto"));

  // Fokus keyboard yang masuk ke menu yang belum tampil membawa halaman ke menu itu
  const reveal = () => {
    if (animated && shown.get() < 0.9) window.scrollTo(0, metrics.current.top);
  };

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`judul-${id}`}
      onFocusCapture={reveal}
      className="min-h-[120svh]"
    >
      <motion.div
        style={animated ? { pointerEvents } : undefined}
        data-pinned={animated ? "" : undefined}
        // Di ponsel isi mengisi tepat satu layar: teks di atas, gambar memakai sisa tinggi yang ada
        className={`flex flex-col px-5 md:px-12 xl:px-28 lg:gap-10 lg:pt-48 lg:pb-10 lg:items-start lg:justify-between ${
          flipped ? "lg:flex-row-reverse" : "lg:flex-row"
        } ${animated ? "fixed inset-x-0 top-0 h-[100svh] lg:h-auto gap-4 pt-24 md:pt-36 pb-6" : "gap-10 pt-44 pb-10"}`}
      >
        <motion.div style={animated ? { x: textX, opacity: shown } : undefined} className={`w-full shrink-0 lg:w-[46%] ${flipped ? "lg:text-right" : ""}`}>
          {text}
        </motion.div>
        <motion.div style={animated ? { x: artX, opacity: shown } : undefined} className="w-full min-h-0 flex-1 lg:flex-none lg:w-[36%] flex items-start lg:items-stretch justify-center">
          {art}
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function Landing({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  const animated = !effectiveReduceMotion && !screenReaderMode;

  // Kemajuan gulir sepanjang perjalanan menggerakkan latar ke samping
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start start", "end end"] });

  useFadeUnderHeader();

  const startHref = isLoggedIn ? "/" : "/auth?mode=signup";
  // Tombol "Coba" membuka fiturnya langsung; yang belum punya akun mendaftar dulu lalu diteruskan ke sana
  const featureHref = (path: string) => (isLoggedIn ? path : `/auth?mode=signup&next=${path}`);
  const glide = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    glideTo(id, animated);
  };
  const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300";

  return (
    <div className="relative min-h-screen font-pixel bg-[#7cc4e8]">
      <a
        href="#eyeread"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:shadow-lg"
      >
        Lompat ke isi halaman
      </a>

      {/* Logo dan tombol masuk menempel di atas, tanpa latar */}
      <nav data-landing-nav aria-label="Navigasi utama" className="fixed top-0 inset-x-0 z-50 pointer-events-none p-3 md:p-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          <Link to="/landing" className={`pointer-events-auto flex shrink-0 items-center gap-2 md:gap-3 rounded-2xl ${focusRing}`}>
            <img src="/images/logo.png" alt="" width={72} height={72} className="w-11 h-11 md:w-[72px] md:h-[72px] object-contain drop-shadow-[3px_4px_0_rgba(10,26,79,0.6)]" />
            <span className="pixel-text-lg hidden min-[440px]:inline text-xs sm:text-lg md:text-2xl" translate="no">
              Hope.Ai
            </span>
          </Link>

          <div className="pointer-events-auto flex shrink-0 items-center gap-2.5 md:gap-4">
            {!isLoggedIn && (
              <Link to="/auth" className="pixel-button pixel-button-blue pixel-text">
                Masuk
              </Link>
            )}
            <Link to={startHref} className="pixel-button pixel-button-green pixel-text">
              {isLoggedIn ? "Beranda" : "Daftar"}
            </Link>
          </div>
        </div>
      </nav>

      {/* --- PERJALANAN --- */}
      <div ref={journeyRef} className="relative">
        {/* Latar menempel di layar dan bergeser ke samping selama halaman digulir */}
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <RunnerStage scenes={scenes} progress={scrollYProgress} animated={animated} />
        </div>

        <main className="relative -mt-[100svh] overflow-x-clip">
          {/* Pembuka */}
          <header className="min-h-[110svh] flex flex-col items-center px-5 pt-36 md:pt-48 text-center">
            <div data-fade>
              <HopeMascot animated={animated} className="w-[5.75rem] md:w-32 [@media(max-height:700px)]:md:w-24 h-auto drop-shadow-[4px_5px_0_rgba(10,26,79,0.45)]" />
            </div>
            <h1 data-fade className="pixel-text-lg mt-3 max-w-5xl text-[clamp(1.5rem,5vw,4rem)] leading-[1.25] text-balance">
              <WaveText text="Belajar Tanpa Batasan." animated={animated} />
            </h1>
            <p data-fade className="pixel-text mt-4 md:mt-5 max-w-4xl text-[13px] md:text-lg leading-[1.9] text-balance">
              Setiap orang punya cara belajar. Hope.Ai menyesuaikan diri.
            </p>
            <a href="#eyeread" onClick={glide("eyeread")} data-fade className="pixel-button pixel-button-blue pixel-button-md pixel-text mt-5 gap-3 whitespace-nowrap">
              Jelajahi fitur <ArrowDown className="w-5 h-5" aria-hidden="true" />
            </a>
          </header>

          {/* Enam menu: teks di satu sisi, gambar pixel di sisi seberangnya, masuk dari samping */}
          {chapters.map((chapter, i) => {
            const Art = landingArt[chapter.id];
            return (
              <MenuSection
                key={chapter.id}
                id={chapter.id}
                flipped={i % 2 === 1}
                animated={animated}
                text={
                  <>
                    <p data-fade className="pixel-text text-[11px] md:text-base !text-amber-300">Menu {chapter.numeral}</p>
                    <h2
                      id={`judul-${chapter.id}`}
                      translate="no"
                      data-fade
                      className="pixel-text-lg mt-2 md:mt-3 text-[clamp(1.25rem,6.4vw,1.75rem)] md:text-[clamp(1.5rem,4.6vw,3.6rem)] lg:text-[clamp(1.5rem,3.9vw,3.6rem)] leading-[1.2] break-words"
                    >
                      {chapter.name}
                    </h2>
                    <p data-fade className="pixel-text mt-3 md:mt-5 text-xs md:text-lg leading-[1.8] md:leading-[1.9] text-balance">{chapter.heading}</p>
                    <p data-fade className="pixel-text mt-2 md:mt-3 text-[11px] md:text-sm leading-[1.9] text-balance">{chapter.description}</p>
                    <Link to={featureHref(chapter.path)} data-fade className="pixel-button pixel-button-blue pixel-button-md pixel-text mt-5 md:mt-8 gap-3">
                      Coba {chapter.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </>
                }
                art={<Art animated={animated} className="w-[90%] lg:w-full max-w-[380px] lg:max-w-[420px] max-h-full lg:max-h-[34svh] h-auto drop-shadow-[6px_8px_0_rgba(10,26,79,0.45)]" />}
              />
            );
          })}

          {/* Penutup: satu ajakan besar, lalu kaki halaman di atas latar yang sama */}
          <section aria-labelledby="judul-penutup" className="min-h-[100svh] flex flex-col items-center px-5 pt-44 lg:pt-48 text-center">
            <h2 id="judul-penutup" data-fade className="pixel-text-lg max-w-4xl text-[clamp(1.2rem,3.6vw,2.6rem)] leading-[1.45] text-balance">
              Perjalanan belajarmu dimulai dari sini.
            </h2>

            <Link
              to={startHref}
              data-fade="tengah"
              className={`pixel-button pixel-button-green pixel-button-lg pixel-text-lg mt-10 mb-16 w-full max-w-2xl gap-4 ${animated ? "cta-bounce" : ""}`}
            >
              <span className="text-[clamp(1rem,3.6vw,2.2rem)] leading-[1.3]">{isLoggedIn ? "Buka Beranda" : "Daftar Gratis"}</span>
              <ArrowRight className="hidden sm:block w-[clamp(1.25rem,3.4vw,2.2rem)] h-[clamp(1.25rem,3.4vw,2.2rem)] shrink-0" aria-hidden="true" />
            </Link>

            {/* Kaki halaman: pita gelap bergaya pixel, supaya tautan terbaca di atas pemandangan */}
            <footer className="pixel-footer mt-auto -mx-5 self-stretch text-left">
              <div className="mx-auto max-w-5xl px-5 md:px-8 pt-8 pb-8">
                <div className="grid gap-8 md:grid-cols-4 md:gap-x-6">
                  <nav aria-labelledby="kaki-fitur" className="md:col-span-3">
                    <p id="kaki-fitur" className="text-[11px] md:text-xs text-amber-300">Fitur</p>
                    <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-2 sm:gap-x-6">
                      {chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <a
                            href={`#${chapter.id}`}
                            onClick={glide(chapter.id)}
                            className={`inline-flex items-center gap-2 sm:gap-3 min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}
                            translate="no"
                          >
                            <FeatureIcon name={chapter.id} className="w-5 h-5 shrink-0" />
                            {chapter.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <nav aria-labelledby="kaki-proyek">
                    <p id="kaki-proyek" className="text-[11px] md:text-xs text-amber-300">Proyek</p>
                    <ul className="mt-2">
                      <li>
                        <a
                          href="https://github.com/MuhammadHadistRifannan/Hope-AI"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center min-h-11 text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}
                        >
                          Kode sumber<span className="sr-only"> di GitHub (membuka tab baru)</span>
                        </a>
                      </li>
                    </ul>
                  </nav>
                </div>
                <div className="mt-8 border-t-4 border-dotted border-white/25 pt-6 flex flex-col gap-2 text-[11px] md:text-xs leading-[2] text-white">
                  <p>Setiap cara belajar layak mendapat ruang.</p>
                  <p>© {new Date().getFullYear()} Tim Hope.Ai. Dibuat untuk UINIC 8.0.</p>
                </div>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
