import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { features } from "@/components/FeatureCards";
import { quoteOfDay } from "@/lib/quotes";

// "Jendela Dunia" (scroll-craft, lihat scrollcraft/builds/hopeai-jendela/BRIEF.md).
// Scroll adalah garis waktu: pengunjung mulai di dalam kamar belajar, tirai terbuka,
// kamera berjalan menembus jendela, dan dunia di luar (langit, kota, bukit) mendekat
// dengan kecepatan berbeda-beda. Penguin Hope.Ai terbang dengan balon melewati
// pengunjung, lalu pulau-pulau fitur melayang mendekat dan bisa disentuh.
//
// Semua lapisan hanya digerakkan dengan transform dan opacity dari satu nilai scroll.
// Mode gerak dikurangi dan mode pembaca layar mendapat komposisi diam yang utuh,
// tanpa scroll yang ditahan.

// Warna adegan sengaja tetap (tidak ikut tema gelap): ini ilustrasi, bukan antarmuka.
// Semuanya diturunkan dari palet Hope.Ai di index.css: primary hsl(220 90% 40%),
// secondary hsl(195 100% 50%), accent hsl(260 80% 65%), foreground hsl(220 90% 15%).
const INK = "#041a49"; // foreground
const INK_SOFT = "#284a85";
const PRIMARY = "#0a47c2";
const SECONDARY = "#00bfff";
const WALL = "#cfe3fb"; // biru muda, satu keluarga dengan primary
const FRAME = "#ffffff"; // kusen putih memisahkan jendela dari dinding biru
const SILL = "#e7f1fd";

// Posisi dan ukuran jendela, serta titik asal zoom (pusat jendela), per ukuran layar.
// Ponsel: jendela di atas, teks di bawah. Layar lebar: teks di kiri, jendela di kanan.
// --mx/--my: posisi lubang jendela pada mask grid dinding. Persentase mask-position dihitung
// dari sisa ruang (wadah dikurangi lubang), jadi nilainya wl / (100% - ww) dan wt / (100% - wh).
const STAGE_VARS =
  "[--wl:16%] [--wt:12%] [--ww:68%] [--wh:28%] [--wo:50%_26%] [--mx:50%] [--my:16.67%] " +
  "md:[--wl:50%] md:[--wt:17%] md:[--ww:40%] md:[--wh:54%] md:[--wo:70%_44%] md:[--mx:83.33%] md:[--my:36.96%] " +
  // Laptop yang pendek: jendela lebih rendah supaya kartu kutipan di bawahnya muat
  "lg:[@media(max-height:820px)]:[--wt:15%] lg:[@media(max-height:820px)]:[--wh:46%] lg:[@media(max-height:820px)]:[--wo:70%_38%] lg:[@media(max-height:820px)]:[--my:27.78%]";

const windowBox = { left: "var(--wl)", top: "var(--wt)", width: "var(--ww)", height: "var(--wh)" };

// Tahapan garis waktu (0..1 sepanjang lintasan scroll hero)
const T = {
  curtainsOpen: [0.02, 0.16],
  copyOut: [0.17, 0.27],
  throughWindow: [0.16, 0.42],
  roomGone: [0.36, 0.43],
  penguinFlight: [0.12, 0.86],
  balloonsRise: [0.5, 1],
  closingCopy: [0.66, 0.76],
  handover: [0.9, 1],
} as const;

type Props = {
  reduced: boolean;
  isLoggedIn: boolean;
  startHref: string;
  onLearnMore: () => void;
  featureHref: (path: string) => string;
};

export default function WindowFlight({ reduced, isLoggedIn, startHref, onLearnMore, featureHref }: Props) {
  const trackRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  // Peredam supaya roda tetikus yang patah-patah tidak terasa tersendat
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.35 });
  // Komposisi diam: tirai sudah terbuka, kamera masih di dalam kamar
  const still = useMotionValue<number>(T.curtainsOpen[1]);
  const p = reduced ? still : smooth;
  const handover = useTransform(p, [...T.handover], [0, 1]);

  return (
    <section
      ref={trackRef}
      aria-labelledby="judul-hero"
      className={reduced ? "relative" : "relative h-[300svh] md:h-[380svh]"}
    >
      <div
        className={`${STAGE_VARS} ${
          reduced ? "relative min-h-[100svh]" : "sticky top-0 h-[100svh]"
        } overflow-hidden`}
        style={{ backgroundColor: "#33b8ff" }}
      >
        <Outside p={p} reduced={reduced} featureHref={featureHref} />
        <Room p={p} />
        <OpeningCopy
          p={p}
          isLoggedIn={isLoggedIn}
          startHref={startHref}
          onLearnMore={onLearnMore}
          // Fokus keyboard pada tombol yang sudah memudar: kembali ke awal adegan supaya tombolnya terlihat
          onFocusHidden={() => {
            const top = trackRef.current?.getBoundingClientRect().top;
            if (top !== undefined && top < -10) window.scrollBy({ top, behavior: "auto" });
          }}
        />
        {!reduced && <ClosingCopy p={p} />}
        {/* Serah terima ke bagian fitur: langit memudar ke warna halaman */}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-background"
            style={{ opacity: handover }}
          />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- kamar ----

function Room({ p }: { p: MotionValue<number> }) {
  // Kamera maju menembus jendela: makin dekat, makin cepat
  const scale = useTransform(p, [T.throughWindow[0], 0.28, T.throughWindow[1]], [1, 2.4, 11]);
  const opacity = useTransform(p, [...T.roomGone], [1, 0]);
  // Tirai sedikit tersingkap sejak awal: dunia luar mengintip dan mengundang untuk turun
  const curtainLeft = useTransform(p, [...T.curtainsOpen], ["-22%", "-92%"]);
  const curtainRight = useTransform(p, [...T.curtainsOpen], ["22%", "92%"]);
  // Kutipan tokoh dunia, berganti setiap hari (dipilih sekali saat halaman dibuka)
  const [quote] = useState(() => quoteOfDay());

  // Kamar sengaja hampir kosong: satu-satunya tugasnya membuat jendela menjadi pusat
  // perhatian. Kedalaman datang dari cahaya dan bayangan, bukan dari benda-benda hiasan.
  return (
    <motion.div aria-hidden="true" className="absolute inset-0" style={{ scale, opacity, transformOrigin: "var(--wo)" }}>
      {/* Dinding: empat persegi panjang di sekeliling lubang jendela (atas, bawah, kiri, kanan).
          Sengaja bukan satu bayangan raksasa: lapisan sebesar itu melampaui batas tekstur GPU
          di layar besar beresolusi tinggi dan dindingnya tergambar bolong. Tumpang 1px menutup celah. */}
      <div className="absolute inset-x-0 top-0" style={{ height: "calc(var(--wt) + 1px)", backgroundColor: WALL }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: "calc(var(--wt) + var(--wh) - 1px)", backgroundColor: WALL }} />
      <div className="absolute left-0" style={{ top: "var(--wt)", height: "var(--wh)", width: "calc(var(--wl) + 1px)", backgroundColor: WALL }} />
      <div className="absolute right-0" style={{ top: "var(--wt)", height: "var(--wh)", left: "calc(var(--wl) + var(--ww) - 1px)", backgroundColor: WALL }} />

      {/* Grid kotak-kotak seperti latar section di bawahnya. Lubang seukuran jendela
          dibuang lewat mask supaya pemandangan di balik kaca tetap bersih. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(10,71,194,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,71,194,0.07)_1px,transparent_1px)] bg-[size:24px_24px]"
        style={{
          maskImage: "linear-gradient(#000,#000), linear-gradient(#000,#000)",
          maskSize: "100% 100%, var(--ww) var(--wh)",
          maskPosition: "0 0, var(--mx) var(--my)",
          maskRepeat: "no-repeat",
          maskComposite: "exclude",
          WebkitMaskImage: "linear-gradient(#000,#000), linear-gradient(#000,#000)",
          WebkitMaskSize: "100% 100%, var(--ww) var(--wh)",
          WebkitMaskPosition: "0 0, var(--mx) var(--my)",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskComposite: "xor",
        }}
      />

      {/* Cahaya ruangan: terang dari atas, sedikit lebih gelap ke lantai */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_45%,rgba(10,71,194,0)_70%,rgba(10,71,194,0.08)_100%)]" />

      {/* Jendela: kusen putih bersudut tegas, kaca empat panel */}
      <div
        className="absolute border-[10px] shadow-[0_18px_40px_-12px_rgba(10,40,110,0.35)] md:border-[14px]"
        style={{ ...windowBox, borderColor: FRAME }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_34%,rgba(255,255,255,0.16)_38%,transparent_42%)]" />
        <div className="absolute inset-y-0 left-1/2 w-[6px] -translate-x-1/2 md:w-[10px]" style={{ backgroundColor: FRAME }} />
        <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 md:h-[10px]" style={{ backgroundColor: FRAME }} />
        {/* Tirai tipis: kain putih keunguan dengan lipatan lembut, bukan garis-garis */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(245,241,255,0.97)_0px,rgba(226,216,252,0.97)_28px,rgba(245,241,255,0.97)_56px)] shadow-[10px_0_24px_-8px_rgba(60,40,140,0.25)]"
            style={{ x: curtainLeft }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(90deg,rgba(245,241,255,0.97)_0px,rgba(226,216,252,0.97)_28px,rgba(245,241,255,0.97)_56px)] shadow-[-10px_0_24px_-8px_rgba(60,40,140,0.25)]"
            style={{ x: curtainRight }}
          />
        </div>
      </div>

      {/* Ambang jendela */}
      <div
        className="absolute h-[2.4%] rounded-[3px] shadow-[0_10px_20px_-8px_rgba(10,40,110,0.3)]"
        style={{
          left: "calc(var(--wl) - 2%)",
          width: "calc(var(--ww) + 4%)",
          top: "calc(var(--wt) + var(--wh))",
          backgroundColor: SILL,
        }}
      />

      {/* Kutipan hari ini di dinding, di bawah jendela. Hanya di layar yang cukup lebar dan tinggi:
          di ponsel tempat ini dipakai judul dan tombol, dan di laptop pendek kutipan panjang meluber. */}
      <figure
        className="absolute hidden lg:[@media(min-height:720px)]:block"
        style={{ left: "calc(var(--wl) + 2%)", width: "calc(var(--ww) - 4%)", top: "calc(var(--wt) + var(--wh) + 3.5%)" }}
      >
        {/* Kartu kaca: putih tembus pandang dengan blur, tepi atas tertangkap cahaya */}
        <div className="relative rounded-2xl border border-white/70 bg-white/75 py-3.5 pl-14 pr-6 shadow-[0_14px_32px_-14px_rgba(10,40,110,0.35)] backdrop-blur-md xl:py-4 xl:pl-16">
          <span
            aria-hidden="true"
            className="absolute left-4 top-1 font-serif text-6xl leading-none xl:left-5 xl:text-7xl"
            style={{ color: PRIMARY }}
          >
            &ldquo;
          </span>
          <blockquote className="text-[15px] font-semibold leading-snug tracking-tight xl:text-lg" style={{ color: INK }}>
            {quote.text}
          </blockquote>
          <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm" style={{ color: INK_SOFT }}>
            <span aria-hidden="true" className="h-px w-6" style={{ backgroundColor: PRIMARY }} />
            <span className="whitespace-nowrap font-semibold" style={{ color: PRIMARY }}>
              {quote.author}
            </span>
            <span className="whitespace-nowrap">{quote.source}</span>
          </figcaption>
        </div>
      </figure>

    </motion.div>
  );
}

// ----------------------------------------------------------- dunia luar ----

function Outside({
  p,
  reduced,
  featureHref,
}: {
  p: MotionValue<number>;
  reduced: boolean;
  featureHref: (path: string) => string;
}) {
  // Makin dekat sebuah lapisan, makin cepat ia membesar: itulah yang memberi kedalaman
  const sky = useTransform(p, [0, 1], [1, 1.12]);
  const sun = useTransform(p, [0, 1], [1, 1.35]);
  const farClouds = useTransform(p, [0, 1], [1, 1.7]);
  // Setelah keluar jendela kamera ikut naik: tanah turun menjauh dan langit makin luas
  const city = useTransform(p, [0.1, 1], [1, 1.8]);
  const cityY = useTransform(p, [0.1, 0.45, 1], ["0%", "8%", "45%"]);
  const hills = useTransform(p, [0.1, 1], [1, 2.3]);
  const hillsY = useTransform(p, [0.1, 0.45, 1], ["0%", "12%", "60%"]);
  const grass = useTransform(p, [0.1, 0.7], [1, 3.4]);
  const grassY = useTransform(p, [0.1, 0.7], ["0%", "45%"]);
  const nearClouds = useTransform(p, [0.42, 0.95], [0.9, 2.6]);
  const nearCloudsOpacity = useTransform(p, [0.42, 0.52, 0.82, 0.95], [0, 0.85, 0.85, 0]);

  return (
    <div className="absolute inset-0">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,#0095ff_0%,#33b8ff_40%,#9fe2ff_72%,#fff2c4_100%)]"
        style={{ scale: sky, transformOrigin: "var(--wo)" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-[62%] top-[12%] h-24 w-24 rounded-full bg-[#ffd23f] shadow-[0_0_0_18px_rgba(255,210,63,0.35),0_0_0_40px_rgba(255,210,63,0.15)] md:left-[78%] md:h-32 md:w-32"
        style={{ scale: sun, transformOrigin: "var(--wo)" }}
      />
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ scale: farClouds, transformOrigin: "var(--wo)" }}>
        <Cloud className="absolute left-[8%] top-[16%] w-40 opacity-90 md:left-[52%] md:w-56" drift={!reduced} />
        <Cloud className="absolute left-[60%] top-[8%] w-28 opacity-80 md:left-[66%] md:w-40" drift={!reduced} />
        <Cloud className="absolute left-[30%] top-[30%] w-24 opacity-70 md:left-[82%] md:top-[28%] md:w-36" drift={!reduced} />
      </motion.div>
      {/* Setiap lapisan dibungkus kotak selayar penuh, supaya titik asal zoom (--wo) benar-benar
          pusat jendela di layar, bukan pusat kotak lapisan itu sendiri */}
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ scale: city, y: cityY, transformOrigin: "var(--wo)" }}>
        <div className="absolute inset-x-0 bottom-[22%] h-[34%] md:bottom-[18%]">
          <City />
        </div>
      </motion.div>
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ scale: hills, y: hillsY, transformOrigin: "var(--wo)" }}>
        <div className="absolute inset-x-0 bottom-0 h-[34%]">
          <Hills />
        </div>
      </motion.div>
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ scale: grass, y: grassY, transformOrigin: "var(--wo)" }}>
        <div className="absolute inset-x-0 bottom-0 h-[20%]">
          <Meadow />
        </div>
      </motion.div>

      <Penguin p={p} reduced={reduced} />
      {!reduced && <FeatureIslands p={p} featureHref={featureHref} />}

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ scale: nearClouds, opacity: reduced ? 0 : nearCloudsOpacity, transformOrigin: "var(--wo)" }}
      >
        <Cloud className="absolute left-[-14%] top-[58%] w-56 md:w-80" />
        <Cloud className="absolute right-[-14%] top-[12%] w-48 md:w-72" />
      </motion.div>
    </div>
  );
}

function Cloud({ className, drift = false }: { className: string; drift?: boolean }) {
  return (
    <svg
      className={`${className} ${drift ? "animate-[hope-drift_18s_ease-in-out_infinite_alternate]" : ""}`}
      viewBox="0 0 200 90"
    >
      <g fill="#ffffff">
        <ellipse cx="60" cy="58" rx="48" ry="28" />
        <ellipse cx="105" cy="42" rx="44" ry="36" />
        <ellipse cx="148" cy="60" rx="40" ry="26" />
        <rect x="30" y="58" width="150" height="28" rx="14" />
      </g>
      <ellipse cx="110" cy="84" rx="80" ry="6" fill="#b9dcf2" opacity="0.6" />
    </svg>
  );
}

// Kota bergaya kartun: menara beratap pagoda, gedung berjendela kuning, jembatan merah
function City() {
  const buildings = [
    { x: 20, w: 70, h: 150, c: "#2f7cf6", roof: true },
    { x: 100, w: 54, h: 210, c: "#0a47c2", roof: false },
    { x: 160, w: 80, h: 120, c: "#7fdcff", roof: true },
    { x: 250, w: 60, h: 250, c: "#8352e0", roof: true },
    { x: 1060, w: 70, h: 190, c: "#0a47c2", roof: true },
    { x: 1140, w: 60, h: 140, c: "#00bfff", roof: false },
    { x: 1210, w: 90, h: 240, c: "#2f7cf6", roof: true },
    { x: 1310, w: 56, h: 170, c: "#9b6cf0", roof: false },
    { x: 1380, w: 80, h: 220, c: "#0a47c2", roof: true },
    { x: 1470, w: 70, h: 130, c: "#7fdcff", roof: false },
  ];
  return (
    <svg className="h-full w-full" viewBox="0 0 1600 320" preserveAspectRatio="xMidYMax slice">
      {buildings.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={320 - b.h} width={b.w} height={b.h} fill={b.c} rx="4" />
          {Array.from({ length: Math.floor(b.h / 34) }, (_, row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={b.x + 12 + col * (b.w / 2 - 6)}
                y={320 - b.h + 16 + row * 34}
                width={b.w / 2 - 22}
                height="14"
                rx="2"
                fill={(row + col) % 4 === 0 ? "#ffd23f" : "#e6f4ff"}
                opacity={(row + col) % 3 === 0 ? 0.5 : 0.95}
              />
            ))
          )}
          {b.roof && (
            <path
              d={`M${b.x - 10} ${320 - b.h + 4} Q ${b.x + b.w / 2} ${320 - b.h - 34} ${b.x + b.w + 10} ${320 - b.h + 4} Z`}
              fill={INK}
            />
          )}
        </g>
      ))}
      {/* Jembatan gantung merah */}
      <g stroke={PRIMARY} fill="none" strokeWidth="10">
        <path d="M360 300 L360 140 M760 300 L760 140" />
        <path d="M330 300 Q 560 330 790 300" strokeWidth="14" />
        <path d="M360 150 Q 560 280 760 150" strokeWidth="5" />
        <path d="M760 150 Q 900 250 1040 230" strokeWidth="5" />
      </g>
      <g fill={PRIMARY}>
        <rect x="346" y="130" width="28" height="14" rx="3" />
        <rect x="746" y="130" width="28" height="14" rx="3" />
      </g>
    </svg>
  );
}

// Semak dan bunga di depan, yang paling cepat lewat saat kamera naik
function Meadow() {
  const flowers = ["#ffffff", "#ffd23f", "#00bfff", "#9b6cf0", "#7fdcff"];
  return (
    <svg className="h-full w-full" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice">
      <path d="M0 80 Q 80 20 170 70 Q 250 10 350 66 Q 440 16 540 70 Q 640 20 740 64 Q 840 14 950 70 Q 1050 22 1150 66 Q 1250 12 1360 70 Q 1460 24 1600 64 L1600 200 L0 200 Z" fill="#2fae9a" />
      <path d="M0 130 Q 120 80 240 126 Q 360 76 480 124 Q 600 80 720 122 Q 840 74 960 126 Q 1080 82 1200 122 Q 1320 76 1440 124 Q 1520 96 1600 118 L1600 200 L0 200 Z" fill="#3cc2a8" />
      {Array.from({ length: 34 }, (_, i) => {
        const x = 20 + i * 47;
        const y = 92 + ((i * 37) % 70);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill={flowers[i % flowers.length]} />
            <circle cx={x} cy={y} r="2.6" fill="#ffd43b" />
          </g>
        );
      })}
    </svg>
  );
}

function Hills() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1600 340" preserveAspectRatio="xMidYMax slice">
      <path d="M0 120 Q 220 30 460 110 T 900 100 T 1300 90 T 1600 110 L1600 340 L0 340 Z" fill="#8fe0c8" />
      <path d="M0 190 Q 300 110 620 190 T 1200 180 T 1600 170 L1600 340 L0 340 Z" fill="#4fc4b0" />
      {/* Rumah-rumah kecil di bukit */}
      {[180, 520, 980, 1340].map((x, i) => (
        <g key={x}>
          <rect x={x} y={150 + (i % 2) * 30} width="46" height="36" fill={["#ffffff", "#e6f4ff", "#ffffff", "#e6f4ff"][i]} />
          <path d={`M${x - 6} ${152 + (i % 2) * 30} L${x + 23} ${126 + (i % 2) * 30} L${x + 52} ${152 + (i % 2) * 30} Z`} fill={i % 2 ? "#8352e0" : PRIMARY} />
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------- penguin dan balonnya ----

// Letak gambar penguin di dalam SVG balon, dan titik tangannya (tempat tali diikat)
const PENGUIN_BOX = { x: 30, y: 140, size: 140 };
const PENGUIN_HAND = { x: PENGUIN_BOX.x + PENGUIN_BOX.size * 0.49, y: PENGUIN_BOX.y + PENGUIN_BOX.size * 0.62 };

const BALLOON_COLORS = [PRIMARY, SECONDARY, "#9b6cf0", "#ffd23f", "#2f7cf6", "#7fdcff", "#8352e0", "#ffffff"];

function Penguin({ p, reduced }: { p: MotionValue<number>; reduced: boolean }) {
  // Mula-mula kecil di balik kaca, lalu naik mendekat dan melewati pengunjung
  const scale = useTransform(p, [0, T.penguinFlight[0], 0.5, T.penguinFlight[1]], [0.5, 0.5, 1.05, 1.5]);
  const y = useTransform(p, [T.penguinFlight[0], 0.5, T.penguinFlight[1]], ["0vh", "-8vh", "-95vh"]);
  const x = useTransform(p, [T.penguinFlight[0], T.penguinFlight[1]], ["0vw", "-14vw"]);

  return (
    <div aria-hidden="true" className="absolute left-[50%] top-[22%] w-40 -translate-x-1/2 md:left-[72%] md:top-[26%] md:w-56 lg:[@media(max-height:820px)]:top-[19%] lg:[@media(max-height:820px)]:w-48">
    <motion.div style={{ scale, y, x, transformOrigin: "50% 100%" }}>
      <div className={reduced ? "" : "animate-[hope-sway_5s_ease-in-out_infinite]"} style={{ transformOrigin: "50% 100%" }}>
        {/* Balon, tali, dan penguin dalam satu SVG dengan koordinat bersama, supaya tali selalu
            berakhir di tangan penguin di ukuran layar mana pun. Gambar penguin 359x359 punya ruang
            kosong di atas: kepala di ~30% tinggi gambar, tangan yang memegang buku di ~62%.
            Tali digambar lebih dulu, jadi terlihat lewat di belakang kepala menuju tangan. */}
        <svg className="mx-auto w-full overflow-visible" viewBox="0 0 200 285">
          {BALLOON_COLORS.map((color, i) => {
            const bx = 30 + (i % 4) * 46 + (i > 3 ? 23 : 0);
            const by = i > 3 ? 70 : 34;
            return <line key={`tali-${color}`} x1={bx} y1={by + 26} x2={PENGUIN_HAND.x} y2={PENGUIN_HAND.y} stroke="#4a5a7a" strokeWidth="1.5" />;
          })}
          {BALLOON_COLORS.map((color, i) => {
            const bx = 30 + (i % 4) * 46 + (i > 3 ? 23 : 0);
            const by = i > 3 ? 70 : 34;
            return (
              <g key={color}>
                <ellipse cx={bx} cy={by} rx="22" ry="27" fill={color} stroke={color === "#ffffff" ? "#cfe3fb" : "none"} />
                <ellipse cx={bx - 7} cy={by - 9} rx="5" ry="8" fill="#fff" opacity="0.45" />
              </g>
            );
          })}
          <image
            href={reduced ? "/anim/penguin-still.webp" : "/anim/penguin.webp"}
            x={PENGUIN_BOX.x}
            y={PENGUIN_BOX.y}
            width={PENGUIN_BOX.size}
            height={PENGUIN_BOX.size}
          />
        </svg>
      </div>
    </motion.div>
    </div>
  );
}

// Interaksi khas: pulau-pulau fitur melayang. Muncul kecil dari dekat cakrawala, lalu
// menyebar dan membesar ke tempatnya seolah kamera terbang mendekat. Diarahkan kursor
// atau disentuh, pulau terangkat dan menunjukkan penjelasannya; diklik, fiturnya terbuka.
// Bagian fitur di bawah tetap menjadi jalan utama untuk keyboard dan pembaca layar,
// jadi pulau ini tidak masuk urutan Tab.
const ISLAND_LAYOUT = [
  // Posisi pusat pulau (ponsel lalu layar lebar), kapan muncul, dan kedalaman (1 = paling dekat)
  { pos: "[--ix:27%] [--iy:53%] md:[--ix:13%] md:[--iy:66%]", start: 0.5, depth: 0.95, sign: PRIMARY, falls: false },
  { pos: "[--ix:73%] [--iy:53%] md:[--ix:29%] md:[--iy:55%]", start: 0.53, depth: 0.8, sign: SECONDARY, falls: true },
  { pos: "[--ix:27%] [--iy:71%] md:[--ix:46%] md:[--iy:71%]", start: 0.56, depth: 1.1, sign: "#8352e0", falls: false },
  { pos: "[--ix:73%] [--iy:71%] md:[--ix:61%] md:[--iy:47%]", start: 0.52, depth: 0.85, sign: PRIMARY, falls: false },
  { pos: "[--ix:27%] [--iy:89%] md:[--ix:76%] md:[--iy:69%]", start: 0.58, depth: 1.05, sign: SECONDARY, falls: true },
  { pos: "[--ix:73%] [--iy:89%] md:[--ix:90%] md:[--iy:46%]", start: 0.55, depth: 0.8, sign: "#8352e0", falls: false },
];

function FeatureIslands({ p, featureHref }: { p: MotionValue<number>; featureHref: (path: string) => string }) {
  return (
    <div className="absolute inset-0">
      {features.map((feature, i) => (
        <FeatureIsland key={feature.key} p={p} index={i} feature={feature} href={featureHref(feature.href)} />
      ))}
    </div>
  );
}

function FeatureIsland({
  p,
  index,
  feature,
  href,
}: {
  p: MotionValue<number>;
  index: number;
  feature: (typeof features)[number];
  href: string;
}) {
  const layout = ISLAND_LAYOUT[index % ISLAND_LAYOUT.length];
  const [open, setOpen] = useState(false);
  const Icon = feature.icon;
  const arrive = layout.start + 0.26;
  // --t berjalan 0 ke 1. Posisi dihitung CSS dari titik hilang di tengah cakrawala
  // (50% lebar, 55% tinggi) menuju posisi pulau, yang berbeda di ponsel dan layar lebar.
  const t = useTransform(p, [layout.start, arrive], [0, 1]);
  const scale = useTransform(p, [layout.start, arrive], [0.2, layout.depth]);
  const opacity = useTransform(p, [layout.start, layout.start + 0.05], [0, 1]);

  return (
    <div className={`absolute ${layout.pos}`} style={{ left: "var(--ix)", top: "var(--iy)" }}>
      <motion.div
        className="[translate:calc((1-var(--t))*(50vw-var(--ix)))_calc((1-var(--t))*(55vh-var(--iy)))]"
        style={{ "--t": t, scale, opacity } as never}
      >
        <Link
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onTouchStart={() => setOpen(true)}
          className="group relative block w-24 -translate-x-1/2 -translate-y-1/2 sm:w-44 md:w-56 xl:w-64"
        >
          {/* Mengambang naik-turun pelan; tiap pulau dengan irama sendiri */}
          <div className="animate-[hope-bob_5s_ease-in-out_infinite]" style={{ animationDelay: `${index * -0.8}s` }}>
          <div className="transition-transform duration-200 group-hover:-translate-y-2">
            {/* Papan bertanda ikon fitur, berdiri di atas rumput */}
            <div className="relative z-10 mx-auto -mb-3 flex w-fit flex-col items-center">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-white sm:h-14 sm:w-14 sm:rounded-2xl sm:border-4 text-white shadow-[0_8px_16px_rgba(4,26,73,0.25)] md:h-16 md:w-16 xl:h-[4.5rem] xl:w-[4.5rem]"
                style={{ backgroundColor: layout.sign }}
              >
                <Icon className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 xl:h-9 xl:w-9" />
              </span>
              <span className="h-3 w-1.5 bg-white" />
            </div>
            <Island falls={layout.falls} />
            <span
              className="absolute left-1/2 top-[56%] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-bold sm:px-4 sm:py-1.5 sm:text-sm shadow-[0_6px_12px_rgba(4,26,73,0.2)] md:text-base xl:text-lg"
              style={{ color: INK }}
            >
              {feature.name}
            </span>
          </div>
          </div>
          {open && (
            <span
              className="absolute bottom-full left-1/2 z-20 mb-1 w-56 -translate-x-1/2 rounded-xl bg-white p-3 text-left text-sm leading-snug shadow-[0_10px_24px_rgba(4,26,73,0.25)]"
              style={{ color: INK }}
            >
              {feature.description}
              <span className="mt-1 block font-semibold" style={{ color: PRIMARY }}>
                Ketuk untuk membuka {feature.name}
              </span>
            </span>
          )}
        </Link>
      </motion.div>
    </div>
  );
}

// Pulau melayang: rumput di atas, tanah berlapis menggantung di bawah, kadang air terjun
function Island({ falls }: { falls: boolean }) {
  return (
    <svg className="w-full" viewBox="0 0 200 150">
      <path d="M14 46 Q 100 28 186 46 L 160 92 Q 132 140 104 146 Q 80 132 58 104 Z" fill="#6e86c4" />
      <path d="M34 70 Q 100 64 166 70 L 150 94 Q 120 104 92 100 Q 64 96 46 88 Z" fill="#4d68ad" opacity="0.6" />
      <path d="M70 108 Q 100 116 128 106 L 112 132 Q 100 140 88 130 Z" fill="#344f94" opacity="0.6" />
      <ellipse cx="100" cy="44" rx="90" ry="20" fill="#3cc2a8" />
      <ellipse cx="100" cy="40" rx="84" ry="15" fill="#8fe0c8" />
      {[30, 62, 140, 170].map((cx) => (
        <circle key={cx} cx={cx} cy={38 + (cx % 7)} r="7" fill="#2fae9a" />
      ))}
      {falls && (
        <g>
          <rect x="150" y="50" width="10" height="70" rx="5" fill="#9fe2ff" opacity="0.9" />
          <ellipse cx="155" cy="122" rx="12" ry="5" fill="#ffffff" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

// ------------------------------------------------------------------ teks ----

function OpeningCopy({
  p,
  isLoggedIn,
  startHref,
  onLearnMore,
  onFocusHidden,
}: {
  p: MotionValue<number>;
  isLoggedIn: boolean;
  startHref: string;
  onLearnMore: () => void;
  onFocusHidden: () => void;
}) {
  const opacity = useTransform(p, [...T.copyOut], [1, 0]);
  const y = useTransform(p, [...T.copyOut], ["0vh", "-3vh"]);
  // Tombol hanya bisa diklik selama teksnya terlihat
  const pointerEvents = useTransform(opacity, (value) => (value > 0.5 ? "auto" : "none"));

  return (
    <motion.div
      className="absolute inset-x-0 top-[calc(var(--wt)+var(--wh)+5%)] px-5 md:inset-y-0 md:left-[5%] md:right-auto md:top-0 md:flex md:w-[42%] md:items-center md:px-0 md:pt-20"
      style={{ opacity, y, pointerEvents }}
      onFocusCapture={() => {
        if (opacity.get() < 0.9) onFocusHidden();
      }}
    >
      <div className="text-center md:text-left">
        {/* Penanda kecil: sekali lihat, pengunjung tahu ini aplikasi untuk siapa */}
        <button
          type="button"
          onClick={onLearnMore}
          className="group mb-3 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#0a47c2]/15 bg-white/70 py-1 pl-1.5 pr-3 text-xs font-medium sm:py-1.5 sm:pl-2 sm:pr-3.5 sm:text-sm shadow-[0_4px_12px_-6px_rgba(10,40,110,0.25)] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a47c2] md:mb-6"
          style={{ color: INK }}
        >
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
            Inklusif
          </span>
          <span>
            <span className="hidden sm:inline">Platform belajar </span>
            <span className="sm:hidden">Belajar </span>
            untuk siswa disabilitas
          </span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        <h1
          id="judul-hero"
          className="mb-3 text-[2.4rem] font-bold leading-[1.06] tracking-tight sm:text-5xl md:mb-6 md:text-5xl lg:text-6xl 2xl:text-7xl"
          style={{ color: INK }}
        >
          Belajar Tanpa <br />
          <span className="relative inline-block" style={{ color: PRIMARY }}>
            Batasan.
            <svg className="absolute -bottom-2 left-0 h-3 w-full text-[#00bfff]" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mb-5 max-w-xl text-base leading-relaxed sm:text-lg md:mx-0 md:mb-8 md:text-xl" style={{ color: INK_SOFT }}>
          Hope.Ai adalah jendelamu ke dunia belajar.{" "}
          <span className="hidden sm:inline">
            Membaca, mendengar, berisyarat, dan bertanya, dengan AI yang menyesuaikan diri denganmu.
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <Button
            size="lg"
            className="h-12 rounded-full px-6 text-base text-white shadow-[0_10px_20px_rgba(10,71,194,0.3)] hover:brightness-110 md:h-14 md:px-8 md:text-lg"
            style={{ backgroundColor: PRIMARY }}
            asChild
          >
            <Link to={startHref}>
              {isLoggedIn ? "Buka Beranda" : "Mulai Sekarang"}
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-2 border-[#0a47c2]/30 bg-white/80 px-6 text-base text-[#041a49] hover:bg-white md:h-14 md:px-8 md:text-lg"
            onClick={onLearnMore}
          >
            Pelajari Lebih Lanjut
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ClosingCopy({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, [...T.closingCopy], [0, 1]);
  const y = useTransform(p, [...T.closingCopy], ["2vh", "0vh"]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-4 top-[11%] flex justify-center md:inset-x-auto md:left-[6%] md:top-[18%] md:justify-start"
      style={{ opacity, y }}
    >
      {/* Alas putih di bawah teks saja, bukan lapisan gelap di seluruh layar */}
      <div className="max-w-md rounded-3xl bg-white/90 p-6 shadow-[0_14px_30px_rgba(30,40,90,0.2)] backdrop-blur-sm">
        <p className="text-2xl font-bold leading-tight md:text-3xl" style={{ color: INK }}>
          Satu jendela, banyak cara belajar.
        </p>
        <p className="mt-2 leading-relaxed" style={{ color: INK_SOFT }}>
          Sentuh sebuah pulau untuk mengintip fiturnya, atau terus turun untuk melihat semuanya.
        </p>
      </div>
    </motion.div>
  );
}
