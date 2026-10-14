import { useEffect, useState } from "react";

// Layar pembuka: latar putih, penguin detektif berjalan ke kanan di atas bilah
// kemajuan sambil menunduk memeriksa dengan kaca pembesar. Setelah selesai layar
// ini memudar, dan halaman di belakangnya muncul.

const DURATION = 3000;
const FADE = 500;
const BLOCKS = 10;

// Penguin dilihat dari samping, menghadap kanan. Tiap huruf satu warna:
// K garis tepi, B biru, L bayangan perut, W putih, E mata, P pipi, O/Y paruh dan kaki,
// G kaca, S kilau kaca, H gagang kaca pembesar.
const COLORS: Record<string, string> = {
  K: "#16203f",
  B: "#3f66ad",
  L: "#cfdcf2",
  W: "#ffffff",
  E: "#16203f",
  P: "#f6a6a6",
  O: "#f7b731",
  Y: "#e08a1e",
  G: "#bfe3f7",
  S: "#ffffff",
  H: "#9a5b2c",
};
const BODY = [
  "..........KKKKKK..............",
  "........KKBBBBBBKK............",
  "......KKBBBBBBBBBBKK..........",
  ".....KBBBBBBBBBBBBBBK.........",
  "....KBBBBBBBBBBBBBBBBK........",
  "...KBBBBBBBBBBBBWWWBBBK.......",
  "...KBBBBBBBBBBBWWWWWWBK.......",
  "..KBBBBBBBBBBBWWWEEWWWK.......",
  "..KBBBBBBBBBBWWWWEEWWWK.......",
  "..KBBBBBBBBBWWWWPPWWWKOO......",
  "..KBBBBBBBBWWWWWPPWWWKOOOOK...",
  "..KBBBBBBBLWWWWWWWWWKKYYYK....",
  "..KBBBBBBBLWWWWWWWKKBK........",
  "...KBBBBBBLWWWWWWKBBBBK.......",
  "...KBBBBBBLWWWWWWKKBBBBK.KKKK.",
  "....KBBBBBLWWWWWWWKKBBBKKGGGGK",
  ".....KBBBBLWWWWWWWKKKHHKGSGGGK",
  "......KKBBLWWWWWKK....KKGGGGGK",
  "........KKKKKKKKK.......KGGGGK",
];
// Dua bingkai langkah: kaki rapat dan kaki melebar
const FEET = [
  [".......KOOOK.KOOOK.......KKKK.", "......KOOOOOKOOOOOK...........", "......KKKKKKKKKKKKK..........."],
  ["......KOOOK...KOOOK......KKKK.", ".....KOOOOOK.KOOOOOK..........", ".....KKKKKKK.KKKKKKK.........."],
];
const WIDTH = 30;
const HEIGHT = BODY.length + 3;

function Detective({ step, className }: { step: number; className?: string }) {
  const rows = [...BODY, ...FEET[step % 2]];
  // Badan naik satu piksel di tiap langkah kedua, seperti orang berjalan
  const bob = step % 2;
  const boxes: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const cell = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === cell) end++;
      if (cell !== ".") boxes.push({ x, y: y < BODY.length ? y + 1 - bob : y + 1, w: end - x, fill: COLORS[cell] });
      x = end;
    }
  });
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${WIDTH} ${HEIGHT + 1}`} shapeRendering="crispEdges" className={className}>
      {boxes.map((box, i) => (
        <rect key={i} x={box.x} y={box.y} width={box.w + 0.02} height={1.02} fill={box.fill} />
      ))}
    </svg>
  );
}

// Teks yang muncul huruf demi huruf, seperti sedang diketik. Bagian yang belum
// diketik tetap memakan tempat (tidak terlihat), supaya teks tidak bergeser.
function Typed({ text, shown, cursor }: { text: string; shown: number; cursor: boolean }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        <span className="relative inline-block w-0 align-baseline">
          {cursor && <span className="loading-cursor absolute bottom-0 left-[0.08em] h-[0.9em] w-[0.5em] bg-amber-400" />}
        </span>
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </>
  );
}

const TITLE = "Hope.Ai";
const TAGLINE = "AI untuk Pendidikan Inklusif";
// Irama mengetik, dalam ketukan 40 ms: judul pelan, kalimat di bawahnya lebih cepat
const TICK = 40;
const TITLE_PACE = 3;
const TITLE_START = 4;
const TAGLINE_START = TITLE_START + TITLE.length * TITLE_PACE + 5;

type Props = {
  // Dipanggil saat layar mulai memudar: halaman di belakangnya sudah boleh ditampilkan
  onReveal: () => void;
  // Dipanggil setelah layar hilang sepenuhnya
  onComplete: () => void;
};

export default function LoadingScreen({ onReveal, onComplete }: Props) {
  const [filled, setFilled] = useState(0);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [tick, setTick] = useState(0);
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
    // Bilah kemajuan terisi satu kotak demi satu kotak, dan penuh sesaat sebelum selesai
    const fill = setInterval(() => setFilled((current) => Math.min(BLOCKS, current + 1)), (DURATION - 400) / BLOCKS);
    const walk = calm ? undefined : setInterval(() => setStep((current) => current + 1), 170);
    const type = calm ? undefined : setInterval(() => setTick((current) => current + 1), TICK);
    return () => {
      clearTimeout(reveal);
      clearTimeout(done);
      clearInterval(fill);
      clearInterval(walk);
      clearInterval(type);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Berapa huruf yang sudah diketik; tanpa animasi, semuanya langsung tampil
  const titleShown = calm ? TITLE.length : Math.max(0, Math.min(TITLE.length, Math.floor((tick - TITLE_START) / TITLE_PACE)));
  const taglineShown = calm ? TAGLINE.length : Math.max(0, Math.min(TAGLINE.length, tick - TAGLINE_START));
  const typingTitle = !calm && tick < TAGLINE_START;

  return (
    <div
      data-landing
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 text-center font-pixel text-[#0a1a4f] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transition: calm ? undefined : `opacity ${FADE}ms ease-in-out` }}
    >
      <h1 className="font-pixel text-[clamp(2.6rem,10vw,4.6rem)] leading-[1.15]" translate="no">
        <Typed text={TITLE} shown={titleShown} cursor={typingTitle} />
      </h1>
      <p className="pixel-body-plain mt-3 text-base text-[#3c5b87] md:text-xl">
        <Typed text={TAGLINE} shown={taglineShown} cursor={!calm && !typingTitle} />
      </p>

      <div className="mt-10 w-full max-w-[26rem]">
        {/* Lintasan: penguin berjalan dari ujung kiri ke ujung kanan selama bilah terisi */}
        <div className="relative h-[4.6rem] md:h-24">
          <div className={`absolute bottom-0 ${calm ? "left-1/2 -translate-x-1/2" : "loading-walk"}`} style={{ animationDuration: `${DURATION - 400}ms` }}>
            <Detective step={step} className="block h-[4.6rem] w-auto md:h-24" />
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Memuat Hope.Ai"
          aria-valuemin={0}
          aria-valuemax={BLOCKS}
          aria-valuenow={filled}
          className="flex gap-1 border-4 border-[#0a1a4f] bg-[#0a1a4f] p-1"
        >
          {Array.from({ length: BLOCKS }, (_, i) => (
            <span key={i} className={`block h-4 flex-1 md:h-5 ${i < filled ? "bg-amber-300" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-[11px] md:text-xs" aria-hidden="true">
        Memuat…
      </p>
    </div>
  );
}
