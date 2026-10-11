import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import RunnerStage, { type RunnerScene } from "@/components/ParallaxScene";
import { FeatureIcon, HopeMascot, SkyPlane, landingArt } from "@/components/LandingArt";
import HopeRun from "@/components/HopeRun";
import { useSettings } from "@/context/SettingsContext";

// Tiap fitur adalah satu menu dalam perjalanan. Latar di belakangnya bergeser ke
// samping seperti game endless runner, dan adegannya berganti di tiap menu.
type Chapter = {
  id: string;
  // Halaman fitur yang dibuka tombol "Coba"
  path: string;
  // Jenis fitur dalam bahasa sehari-hari, tampil di atas nama fiturnya
  label: string;
  name: string;
  // Kalimat pemikat, lalu satu kalimat tentang apa yang dilakukan fiturnya
  heading: string;
  description: string;
  scene: string;
  layers: number;
};

const chapters: Chapter[] = [
  { id: "eyeread", path: "/eyeread", label: "Baca dengan suara", name: "EyeRead", heading: "Biarkan tulisan bersuara.", description: "Pindai buku atau unggah dokumen, lalu dengarkan.", scene: "s5", layers: 4 },
  { id: "neotutor", path: "/neotutor", label: "Tanya tutor", name: "NeoTutor", heading: "Belum paham? Tanyakan lagi.", description: "Tutor AI yang bisa ditanya lewat ketikan atau suara.", scene: "s6", layers: 5 },
  { id: "flexa", path: "/flexa", label: "Materi belajar", name: "Flexa", heading: "Satu materi, caramu sendiri.", description: "Baca, dengarkan, ringkas, atau ubah ke bahasa sederhana.", scene: "s7", layers: 4 },
  { id: "pathly", path: "/pathly", label: "Peta belajar", name: "Pathly", heading: "Satu langkah kecil, satu kemajuan.", description: "Peta belajar bertingkat dengan kuis di tiap level.", scene: "s4", layers: 3 },
  { id: "isyarat", path: "/isyarat", label: "Bahasa isyarat", name: "Isyarat", heading: "Setiap isyarat punya arti.", description: "Latihan abjad jari SIBI dengan kamera.", scene: "s8", layers: 4 },
  { id: "echoforum", path: "/forum", label: "Forum diskusi", name: "EchoForum", heading: "Punya pertanyaan? Kamu tidak sendirian.", description: "Forum diskusi yang bisa dibacakan dengan suara.", scene: "s1", layers: 4 },
];

// Urutan adegan sepanjang perjalanan: pembuka, enam menu, penutup
const scenes: RunnerScene[] = [
  { folder: "s2", layers: 4 },
  ...chapters.map((chapter) => ({ folder: chapter.scene, layers: chapter.layers })),
  // Hope Arcade memakai lagi padang rumput pembuka, sama dengan arena permainannya
  { folder: "s2", layers: 4 },
  { folder: "s3", layers: 4 },
];

// Gulir beranimasi ke satu posisi, supaya latar parallax terlihat bergeser dan
// tidak langsung meloncat. Berhenti begitu pengguna menggulir sendiri.
let gliding = false;

function glideToY(end: number, duration: number, done?: () => void) {
  const start = window.scrollY;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
  let cancelled = false;
  const stop = () => {
    events.forEach((name) => window.removeEventListener(name, cancel));
    gliding = false;
  };
  const cancel = () => {
    cancelled = true;
    stop();
  };
  events.forEach((name) => window.addEventListener(name, cancel, { passive: true }));
  gliding = true;
  const began = performance.now();
  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - began) / duration);
    window.scrollTo(0, start + (end - start) * ease(t));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      stop();
      done?.();
    }
  };
  requestAnimationFrame(step);
}

function glideTo(id: string, animated: boolean) {
  const section = document.getElementById(id);
  if (!section) return;
  const end = section.getBoundingClientRect().top + window.scrollY;
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
  glideToY(end, Math.min(2600, Math.max(1500, Math.abs(end - window.scrollY) * 0.9)), finish);
}

// Halaman tidak berhenti di antara dua bagian. Begitu pengguna selesai menggulir,
// halaman meluncur sendiri ke bagian terdekat: lewat dari setengah jalan berarti
// lanjut ke bagian berikutnya, kurang dari itu kembali ke bagian semula. Tombol
// panah, Page Up/Down, dan spasi berpindah satu bagian penuh.
function useSectionSnap(enabled: boolean, ids: string[]) {
  useEffect(() => {
    if (!enabled) return;
    const stops = () => [0, ...ids.map((id) => {
      const section = document.getElementById(id);
      return section ? section.getBoundingClientRect().top + window.scrollY : 0;
    })];
    const settle = (to: number) => glideToY(to, Math.min(1100, Math.max(450, Math.abs(to - window.scrollY) * 1.1)));

    let timer: ReturnType<typeof setTimeout>;
    let holding = false; // jari atau tombol mouse masih menahan halaman
    const check = () => {
      if (gliding || holding || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const points = stops();
      const y = window.scrollY;
      // Setelah bagian terakhir (penutup dan kaki halaman) gulir bebas seperti biasa
      if (y >= points[points.length - 1] - 2) return;
      const nearest = points.reduce((best, point) => (Math.abs(point - y) < Math.abs(best - y) ? point : best));
      if (Math.abs(nearest - y) > 2) settle(nearest);
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 160);
    };
    const hold = () => (holding = true);
    const release = () => {
      holding = false;
      onScroll();
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey || target?.closest("input, textarea, select, [contenteditable]")) return;
      // Selama ada jendela di atas halaman (permainan), tombol menjadi miliknya
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const forward = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey);
      const backward = event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey);
      if (!forward && !backward) return;
      // Spasi pada tombol atau tautan tetap berarti "tekan", bukan gulir
      if (event.key === " " && target?.closest("a, button")) return;
      const points = stops();
      const y = window.scrollY;
      if (y >= points[points.length - 1] - 2 && !(backward && y <= points[points.length - 1] + 2)) return;
      const next = forward ? points.find((point) => point > y + 2) : [...points].reverse().find((point) => point < y - 2);
      if (next === undefined) return;
      event.preventDefault();
      settle(next);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", hold, { passive: true });
    window.addEventListener("touchend", release, { passive: true });
    window.addEventListener("touchcancel", release, { passive: true });
    window.addEventListener("mousedown", hold);
    window.addEventListener("mouseup", release);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", hold);
      window.removeEventListener("touchend", release);
      window.removeEventListener("touchcancel", release);
      window.removeEventListener("mousedown", hold);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
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

// Judul pembuka. Huruf naik dan membesar satu per satu dari kiri ke kanan, dan
// maskot melompat dari huruf ke huruf mengikuti ombak itu, hinggap di atas huruf
// yang sedang membesar. Setelah huruf terakhir ia melompat pulang ke huruf pertama,
// beristirahat dan menoleh, lalu mulai lagi.
const HOP_MS = 340; // jeda antarhuruf
const REST_STEPS = 8; // ketukan untuk pulang dan beristirahat setelah huruf terakhir
// Huruf yang sedang naik: sama dengan .wave-letter-up di index.css
const RISE = { scale: 1.38, lift: 0.24, originY: 0.85 };

type Spot = { x: number; top: number; raisedTop: number };

function HeroTitle({ text, animated, className }: { text: string; animated: boolean; className: string }) {
  const count = Array.from(text.replace(/ /g, "")).length;
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mascotRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const spots = useRef<Spot[]>([]);
  const at = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const step = setInterval(() => setActive((current) => (current + 1) % (count + REST_STEPS)), HOP_MS);
    return () => clearInterval(step);
  }, [animated, count]);

  // Ukur tempat hinggap di atas tiap huruf: titik tengahnya, dan tinggi tinta hurufnya
  // (huruf kecil dan titik lebih rendah daripada huruf besar).
  useEffect(() => {
    if (!animated) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const first = letterRefs.current[0];
      if (!first) return;
      const style = getComputedStyle(first);
      const size = parseFloat(style.fontSize);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
      const font = context.measureText("Hg");
      spots.current = letterRefs.current.map((letter) => {
        if (!letter) return { x: 0, top: 0, raisedTop: 0 };
        const height = letter.offsetHeight;
        // Jarak dari tepi atas kotak huruf ke bagian teratas tintanya
        const halfLeading = (height - (font.fontBoundingBoxAscent + font.fontBoundingBoxDescent)) / 2;
        const ink = halfLeading + font.fontBoundingBoxAscent - context.measureText(letter.textContent ?? "").actualBoundingBoxAscent;
        const origin = height * RISE.originY;
        return {
          x: letter.offsetLeft + letter.offsetWidth / 2,
          top: letter.offsetTop + ink,
          raisedTop: letter.offsetTop + origin + (ink - origin) * RISE.scale - RISE.lift * size,
        };
      });
      // Tanda baca terlalu rendah untuk dihinggapi: maskot melompat di tempat di atas huruf sebelumnya
      letterRefs.current.forEach((letter, i) => {
        if (i > 0 && letter && /[.,!?]/.test(letter.textContent ?? "")) {
          spots.current[i] = { ...spots.current[i - 1], raisedTop: spots.current[i - 1].top };
        }
      });
      at.current = null;
      setReady(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [animated, text]);

  // Lompatan: busur dari tempat sekarang ke huruf berikutnya, memanjang di udara dan
  // memipih sebentar saat mendarat.
  useEffect(() => {
    const mascot = mascotRef.current;
    const body = bodyRef.current;
    if (!animated || !ready || !mascot || !body || spots.current.length === 0) return;
    const size = parseFloat(getComputedStyle(mascot).fontSize);
    // Kaki sedikit masuk ke huruf supaya terlihat berpijak, bukan melayang
    const standOn = (spot: Spot, raised: boolean) => ({
      x: spot.x - mascot.offsetWidth / 2,
      y: (raised ? spot.raisedTop : spot.top) - mascot.offsetHeight + size * 0.06,
    });
    const place = (point: { x: number; y: number }) => `translate(${point.x}px, ${point.y}px)`;
    // Posisi akhir disimpan di gaya elemen; animasi hanya mengantar ke sana
    const move = (frames: Keyframe[], duration: number, to: { x: number; y: number }) => {
      mascot.getAnimations().forEach((animation) => animation.cancel());
      mascot.style.transform = place(to);
      mascot.animate(frames, { duration });
      at.current = to;
    };
    const hop = (to: { x: number; y: number }, height: number, duration: number, facing: number, after: number) => {
      const from = at.current!;
      const peak = Math.min(from.y, to.y) - height;
      move(
        [
          { transform: place(from), easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
          { transform: place({ x: (from.x + to.x) / 2, y: peak }), easing: "cubic-bezier(0.6, 0, 0.8, 0.3)" },
          { transform: place(to) },
        ],
        duration,
        to
      );
      body.getAnimations().forEach((animation) => animation.cancel());
      body.style.transform = `scaleX(${after})`;
      body.animate(
        [
          { transform: `scale(${facing * 1.08}, 0.9)`, offset: 0 },
          { transform: `scale(${facing * 0.94}, 1.1)`, offset: 0.35 },
          { transform: `scale(${facing * 0.94}, 1.08)`, offset: 0.78 },
          { transform: `scale(${facing * 1.14}, 0.84)`, offset: 0.9 },
          { transform: `scale(${after}, 1)`, offset: 1 },
        ],
        { duration: duration + 90 }
      );
    };

    const first = spots.current[0];

    if (!at.current) {
      const start = active >= count ? standOn(first, false) : standOn(spots.current[active], true);
      mascot.getAnimations().forEach((animation) => animation.cancel());
      mascot.style.transform = place(start);
      at.current = start;
      return;
    }

    if (active >= count) {
      const beat = active - count;
      // Selesai satu putaran: melompat pulang ke atas huruf pertama, lalu menoleh kiri dan kanan
      if (beat === 0) hop(standOn(first, false), size * 2.2, HOP_MS * 2.6, -1, 1);
      if (beat === 4) body.style.transform = "scaleX(-1)";
      if (beat === 6) body.style.transform = "scaleX(1)";
      return;
    }

    const to = standOn(spots.current[active], true);
    hop(to, size * 0.75, HOP_MS * 0.88, to.x < at.current.x ? -1 : 1, to.x < at.current.x ? -1 : 1);
  }, [active, animated, count, ready]);

  if (!animated) {
    return (
      <div data-fade className="flex flex-col items-center">
        <HopeMascot animated={false} className="w-[5.75rem] md:w-32 [@media(max-height:700px)]:md:w-24 h-auto drop-shadow-[4px_5px_0_rgba(10,26,79,0.45)]" />
        <h1 className={`${className} mt-3`}>{text}</h1>
      </div>
    );
  }

  let index = 0;
  return (
    // Ruang di atas judul adalah tempat maskot melompat
    <div
      ref={wrapRef}
      data-fade
      className={`relative ${className} !leading-[1.45]`}
      style={{ "--mascot": "max(1.5em, 2.1rem)", paddingTop: "calc(var(--mascot) * 1.19 + 0.85em)" } as React.CSSProperties}
    >
      <div
        ref={mascotRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
        style={{ width: "var(--mascot)", visibility: ready ? "visible" : "hidden" }}
      >
        {/* Lapisan dalam untuk menoleh dan memipih, berporos di kaki */}
        <div ref={bodyRef} style={{ transformOrigin: "50% 100%" }}>
          <HopeMascot animated standalone={false} className="block w-full h-auto drop-shadow-[3px_4px_0_rgba(10,26,79,0.45)]" />
        </div>
      </div>
      <h1 className="text-[1em] leading-[inherit]">
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
                    <span
                      key={position}
                      ref={(element) => (letterRefs.current[position] = element)}
                      className={`wave-letter ${position === active ? "wave-letter-up" : ""}`}
                    >
                      {letter}
                    </span>
                  );
                })}
              </span>
            </span>
          ))}
        </span>
      </h1>
    </div>
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

const ArcadeArt = landingArt.arcade;

// Tempat halaman berhenti: tiap menu, Hope Arcade, lalu bagian penutup
const snapIds = [...chapters.map((chapter) => chapter.id), "arcade", "mulai"];

export default function Landing({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  const animated = !effectiveReduceMotion && !screenReaderMode;

  // Kemajuan gulir sepanjang perjalanan menggerakkan latar ke samping
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start start", "end end"] });

  useFadeUnderHeader();
  useSectionSnap(animated, snapIds);

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
  const glide = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    glideTo(id, animated);
  };
  const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300";

  return (
    <div data-landing className="relative min-h-screen font-pixel bg-[#7cc4e8]">
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
          <header className="relative min-h-[110svh] flex flex-col items-center px-5 pt-36 md:pt-48 text-center">
            {/* Pesawat terbang mendekat dari kejauhan lalu lewat di atas penonton, meninggalkan jejak asap */}
            {animated && <SkyPlane className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] w-full" />}
            <HeroTitle
              text="Belajar Tanpa Batasan."
              animated={animated}
              className="pixel-text-lg max-w-5xl lg:max-w-none text-[clamp(1.5rem,5vw,4rem)] lg:text-[clamp(1.5rem,3.9vw,3.5rem)] [@media(max-height:700px)]:lg:text-[clamp(1.5rem,3.6vw,3rem)] leading-[1.25] text-balance lg:whitespace-nowrap"
            />
            <p data-fade className="pixel-body relative mt-4 md:mt-5 max-w-4xl text-base md:text-xl leading-[1.45] text-balance">
              Platform belajar berbasis AI untuk siswa dengan cara belajar yang berbeda.
            </p>
            {/* Satu ajakan utama (hijau, lebih besar) dan satu pilihan kedua yang lebih tenang */}
            <div data-fade className="relative mt-6 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
              <Link to={startHref} className="pixel-button pixel-button-green pixel-button-hero pixel-text gap-3 whitespace-nowrap">
                {isLoggedIn ? "Buka Beranda" : "Mulai Belajar Gratis"} <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
              </Link>
              <a href="#eyeread" onClick={glide("eyeread")} className="pixel-button pixel-button-blue pixel-button-md pixel-text gap-3 whitespace-nowrap">
                Jelajahi fitur <ArrowDown className="w-5 h-5 shrink-0" aria-hidden="true" />
              </a>
            </div>
            <p data-fade className="pixel-body relative mt-4 text-sm md:text-base text-balance">Gratis · Tanpa iklan · Suara, teks, dan isyarat</p>
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
                    <p data-fade className="pixel-text text-[11px] md:text-base !text-amber-300">
                      <span aria-hidden="true">
                        {i + 1}/{chapters.length} ·{" "}
                      </span>
                      <span className="sr-only">
                        Fitur {i + 1} dari {chapters.length}:{" "}
                      </span>
                      {chapter.label}
                    </p>
                    <h2
                      id={`judul-${chapter.id}`}
                      translate="no"
                      data-fade
                      className="pixel-text-lg mt-2 md:mt-3 text-[clamp(1.25rem,6.4vw,1.75rem)] md:text-[clamp(1.5rem,4.6vw,3.6rem)] lg:text-[clamp(1.5rem,3.9vw,3.6rem)] leading-[1.2] break-words"
                    >
                      {chapter.name}
                    </h2>
                    <p data-fade className="pixel-text mt-3 md:mt-5 text-xs md:text-lg leading-[1.8] md:leading-[1.9] text-balance">{chapter.heading}</p>
                    <p data-fade className="pixel-body mt-2 md:mt-3 text-base md:text-xl lg:text-2xl leading-[1.45] text-balance">{chapter.description}</p>
                    <Link to={featureHref(chapter.path)} data-fade className="pixel-button pixel-button-blue pixel-button-md pixel-text mt-5 md:mt-8 gap-3">
                      Coba {chapter.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </>
                }
                art={<Art animated={animated} className="w-[90%] lg:w-full max-w-[380px] lg:max-w-[420px] max-h-full lg:max-h-[34svh] h-auto drop-shadow-[6px_8px_0_rgba(10,26,79,0.45)]" />}
              />
            );
          })}

          {/* Hope Arcade: permainan kecil; baru berjalan setelah tombolnya ditekan */}
          <MenuSection
            id="arcade"
            flipped={chapters.length % 2 === 1}
            animated={animated}
            text={
              <>
                <p data-fade className="pixel-text text-[11px] md:text-base !text-amber-300">Hope Arcade</p>
                <h2
                  id="judul-arcade"
                  data-fade
                  className="pixel-text-lg mt-2 md:mt-3 text-[clamp(1.1rem,5.4vw,1.6rem)] md:text-[clamp(1.4rem,3.6vw,2.6rem)] lg:text-[clamp(1.3rem,2.9vw,2.4rem)] leading-[1.3] text-balance"
                >
                  Ready, Set, Hope Run!
                </h2>
                <p data-fade className="pixel-body mt-3 md:mt-5 text-base md:text-xl lg:text-2xl leading-[1.45] text-balance">
                  Lari sejauh mungkin, hindari rintangan, dan kumpulkan bintang pengetahuan.
                </p>
                <button
                  ref={arcadeButton}
                  type="button"
                  data-fade
                  onClick={() => setArcadeOpen(true)}
                  className="pixel-button pixel-button-green pixel-button-md pixel-text mt-5 md:mt-8 gap-3"
                >
                  Mainkan Hope Run <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            }
            art={<ArcadeArt animated={animated} className="w-[90%] lg:w-full max-w-[380px] lg:max-w-[420px] max-h-full lg:max-h-[34svh] h-auto drop-shadow-[6px_8px_0_rgba(10,26,79,0.45)]" />}
          />

          {/* Penutup: satu ajakan besar, lalu kaki halaman di atas latar yang sama */}
          <section id="mulai" aria-labelledby="judul-penutup" className="min-h-[100svh] flex flex-col items-center px-5 pt-44 lg:pt-48 text-center">
            <h2 id="judul-penutup" data-fade className="pixel-text-lg max-w-4xl text-[clamp(1.2rem,3.6vw,2.6rem)] leading-[1.45] text-balance">
              Perjalanan belajarmu dimulai dari sini.
            </h2>

            <Link
              to={startHref}
              data-fade="tengah"
              className={`pixel-button pixel-button-green pixel-button-lg pixel-text-lg mt-10 mb-16 w-full max-w-2xl gap-4 ${animated ? "cta-bounce" : ""}`}
            >
              <span className="text-[clamp(0.8rem,2.4vw,1.6rem)] leading-[1.3] whitespace-nowrap">{isLoggedIn ? "Buka Beranda" : "Mulai Belajar Gratis"}</span>
              <ArrowRight className="hidden sm:block w-[clamp(1.25rem,3.4vw,2.2rem)] h-[clamp(1.25rem,3.4vw,2.2rem)] shrink-0" aria-hidden="true" />
            </Link>

            {/* Kaki halaman: pita gelap bergaya pixel, supaya tautan terbaca di atas pemandangan */}
            <footer className="pixel-footer mt-auto -mx-5 self-stretch text-left">
              <div className="mx-auto max-w-5xl px-5 md:px-8 pt-8 pb-8">
                <div className="grid gap-8 lg:grid-cols-4 lg:gap-x-6">
                  <nav aria-labelledby="kaki-fitur" className="lg:col-span-2">
                    <p id="kaki-fitur" data-fade className="text-[11px] md:text-xs text-amber-300">Fitur</p>
                    <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-2 sm:gap-x-4">
                      {chapters.map((chapter) => (
                        <li key={chapter.id} data-fade>
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
                  <nav aria-labelledby="kaki-tentang">
                    <p id="kaki-tentang" data-fade className="text-[11px] md:text-xs text-amber-300">Tentang</p>
                    <ul className="mt-2 flex flex-wrap gap-x-8 lg:block">
                      <li data-fade>
                        <Link to="/aksesibilitas" className={`inline-flex items-center min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}>
                          Aksesibilitas
                        </Link>
                      </li>
                      <li data-fade>
                        <Link to="/kredit" className={`inline-flex items-center min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}>
                          Kredit
                        </Link>
                      </li>
                      <li data-fade>
                        <a href="https://github.com/MuhammadHadistRifannan/Hope-AI" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}>
                          Kode sumber<span className="sr-only"> di GitHub (membuka tab baru)</span>
                        </a>
                      </li>
                    </ul>
                  </nav>
                  <nav aria-labelledby="kaki-legal">
                    <p id="kaki-legal" data-fade className="text-[11px] md:text-xs text-amber-300">Legal</p>
                    <ul className="mt-2 flex flex-wrap gap-x-8 lg:block">
                      <li data-fade>
                        <Link to="/privasi" className={`inline-flex items-center min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}>
                          Privasi
                        </Link>
                      </li>
                      <li data-fade>
                        <Link to="/ketentuan" className={`inline-flex items-center min-h-11 text-[11px] min-[360px]:text-xs md:text-sm text-white rounded underline-offset-8 origin-left transition-transform duration-150 ease-out [@media(hover:hover)]:hover:scale-110 focus-visible:scale-110 active:scale-100 motion-reduce:transform-none hover:text-amber-200 hover:underline ${focusRing}`}>
                          Ketentuan
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
                <div className="mt-8 border-t-4 border-dotted border-white/25 pt-6 flex flex-col gap-2 text-sm md:text-base leading-[1.6] text-white">
                  <p data-fade className="pixel-body-plain">Setiap cara belajar layak mendapat ruang.</p>
                  <p data-fade className="text-[11px] md:text-xs leading-[2]">© {new Date().getFullYear()} Tim Hope.Ai. Dibuat untuk UINIC 8.0.</p>
                </div>
              </div>
            </footer>
          </section>
        </main>
      </div>
      {arcadeOpen && <HopeRun onClose={closeArcade} calm={!animated} />}
    </div>
  );
}
