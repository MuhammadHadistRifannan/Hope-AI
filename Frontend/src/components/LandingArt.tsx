import { useEffect, useState } from "react";

// Ilustrasi pixel art untuk tiap menu di landing page, digambar dengan kode
// (persegi-persegi SVG) dan dianimasikan dengan pergantian bingkai sederhana.

const NAVY = "#0a1a4f";
const WHITE = "#ffffff";
const AMBER = "#fcd34d";
const BLUE = "#3c5b87";
const SKY = "#8fd3f4";
const GREEN = "#4ade80";
const PINK = "#f9a8d4";
const CREAM = "#f1efe3";

type Box = [x: number, y: number, w: number, h: number, fill: string];

function useFrame(animated: boolean, count: number, ms: number) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const step = setInterval(() => setFrame((current) => (current + 1) % count), ms);
    return () => clearInterval(step);
  }, [animated, count, ms]);
  return frame;
}

function Canvas({ boxes, label, className }: { boxes: Box[]; label: string; className?: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 32 24" shapeRendering="crispEdges" className={className}>
      {boxes.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w + 0.02} height={h + 0.02} fill={fill} />
      ))}
    </svg>
  );
}

// Kotak dengan garis tepi gelap
const framed = (x: number, y: number, w: number, h: number, fill: string): Box[] => [
  [x - 1, y - 1, w + 2, h + 2, NAVY],
  [x, y, w, h, fill],
];

// EyeRead: buku dipindai, lalu gelombang suara muncul
function EyeReadArt({ animated, className }: Props) {
  const frame = useFrame(animated, 8, 260);
  const scanY = 6 + Math.min(frame, 5) * 2;
  const waves = Math.max(0, frame - 3);
  const lines: Box[] = [];
  for (let y = 7; y <= 15; y += 2) {
    const read = y < scanY;
    lines.push([4, y, 6, 1, read ? AMBER : BLUE], [13, y, 6, 1, read ? AMBER : BLUE]);
  }
  const boxes: Box[] = [
    ...framed(3, 5, 8, 13, CREAM),
    ...framed(12, 5, 8, 13, CREAM),
    [11, 5, 1, 13, NAVY],
    ...lines,
    [2, scanY, 19, 1, GREEN],
    // pengeras suara
    ...framed(23, 10, 2, 4, WHITE),
    ...(waves >= 1 ? ([[26, 10, 1, 4, WHITE]] as Box[]) : []),
    ...(waves >= 2 ? ([[28, 8, 1, 8, WHITE]] as Box[]) : []),
    ...(waves >= 3 ? ([[30, 6, 1, 12, WHITE]] as Box[]) : []),
  ];
  return <Canvas boxes={boxes} label="Buku yang dipindai lalu dibacakan dengan suara" className={className} />;
}

// NeoTutor: robot berkedip dengan balon percakapan yang sedang mengetik
function NeoTutorArt({ animated, className }: Props) {
  const frame = useFrame(animated, 6, 320);
  const blink = frame === 4;
  const dots = Math.min(3, frame);
  const boxes: Box[] = [
    [8, 3, 1, 3, NAVY],
    [7, 2, 3, 1, AMBER],
    ...framed(3, 7, 12, 10, SKY),
    [5, 10, 2, blink ? 1 : 3, NAVY],
    [11, 10, 2, blink ? 1 : 3, NAVY],
    [6, 14, 6, 1, NAVY],
    [1, 10, 1, 4, NAVY],
    [16, 10, 1, 4, NAVY],
    ...framed(5, 19, 8, 3, BLUE),
    // balon percakapan
    ...framed(19, 5, 11, 7, WHITE),
    [20, 13, 2, 1, NAVY],
    [20, 12, 2, 1, WHITE],
    ...(dots >= 1 ? ([[21, 8, 2, 2, NAVY]] as Box[]) : []),
    ...(dots >= 2 ? ([[24, 8, 2, 2, NAVY]] as Box[]) : []),
    ...(dots >= 3 ? ([[27, 8, 2, 2, NAVY]] as Box[]) : []),
  ];
  return <Canvas boxes={boxes} label="Robot tutor sedang menjawab lewat balon percakapan" className={className} />;
}

// Flexa: satu materi berganti bentuk: bacaan, suara, lalu ringkasan
function FlexaArt({ animated, className }: Props) {
  const frame = useFrame(animated, 3, 900);
  const page: Box[] = [...framed(10, 3, 12, 16, CREAM)];
  if (frame === 0) {
    for (let y = 5; y <= 16; y += 2) page.push([12, y, y % 4 === 1 ? 8 : 6, 1, BLUE]);
  } else if (frame === 1) {
    page.push([12, 9, 1, 4, NAVY], [14, 7, 1, 8, NAVY], [16, 5, 1, 12, AMBER], [18, 8, 1, 6, NAVY], [20, 10, 1, 2, NAVY]);
  } else {
    page.push([12, 6, 8, 2, AMBER], [12, 10, 6, 1, BLUE], [12, 12, 7, 1, BLUE], [12, 14, 4, 1, BLUE]);
  }
  // tiga titik penanda bentuk
  const marks: Box[] = [0, 1, 2].flatMap((i) => framed(12 + i * 3, 21, 2, 2, i === frame ? AMBER : WHITE));
  return <Canvas boxes={[...page, ...marks]} label="Satu halaman materi berganti bentuk: bacaan, suara, dan ringkasan" className={className} />;
}

// Pathly: bintang melompat dari satu level ke level berikutnya
function PathlyArt({ animated, className }: Props) {
  const frame = useFrame(animated, 5, 520);
  const nodes = [
    [4, 18],
    [11, 13],
    [18, 16],
    [25, 9],
  ];
  const at = Math.min(frame, nodes.length - 1);
  const boxes: Box[] = [
    // jalur penghubung
    [6, 17, 5, 1, WHITE],
    [10, 15, 1, 3, WHITE],
    [13, 15, 5, 1, WHITE],
    [20, 14, 1, 3, WHITE],
    [20, 11, 5, 1, WHITE],
    [24, 11, 1, 1, WHITE],
    ...nodes.flatMap(([x, y], i) => framed(x, y, 3, 3, i <= at ? AMBER : WHITE)),
    // bendera di ujung
    [28, 2, 1, 7, NAVY],
    [29, 2, 3, 3, GREEN],
    // bintang penanda
    [nodes[at][0] + 1, nodes[at][1] - 5, 1, 3, AMBER],
    [nodes[at][0], nodes[at][1] - 4, 3, 1, AMBER],
  ];
  return <Canvas boxes={boxes} label="Peta belajar dengan bintang yang maju dari level ke level" className={className} />;
}

// Isyarat: tangan di dalam bingkai kamera, huruf yang terbaca muncul di sampingnya
const HANDS: { letter: Box[]; fingers: Box[] }[] = [
  {
    // lima jari terbuka
    fingers: [[7, 5, 1, 6, CREAM], [9, 4, 1, 7, CREAM], [11, 4, 1, 7, CREAM], [13, 5, 1, 6, CREAM], [5, 9, 1, 4, CREAM]],
    letter: [[24, 8, 1, 8, NAVY], [25, 8, 3, 1, NAVY], [25, 11, 3, 1, NAVY], [25, 15, 3, 1, NAVY], [28, 9, 1, 2, NAVY], [28, 12, 1, 3, NAVY]],
  },
  {
    // dua jari
    fingers: [[8, 4, 2, 7, CREAM], [12, 4, 2, 7, CREAM]],
    letter: [[24, 8, 1, 5, NAVY], [28, 8, 1, 5, NAVY], [25, 13, 1, 2, NAVY], [27, 13, 1, 2, NAVY], [26, 15, 1, 1, NAVY]],
  },
  {
    // telunjuk dan ibu jari
    fingers: [[9, 4, 2, 7, CREAM], [4, 10, 2, 2, CREAM]],
    letter: [[24, 8, 1, 8, NAVY], [25, 15, 4, 1, NAVY]],
  },
];

function IsyaratArt({ animated, className }: Props) {
  const frame = useFrame(animated, HANDS.length, 1000);
  const hand = HANDS[frame];
  const boxes: Box[] = [
    // sudut bingkai kamera
    [2, 2, 4, 1, WHITE], [2, 2, 1, 4, WHITE], [15, 2, 4, 1, WHITE], [18, 2, 1, 4, WHITE],
    [2, 20, 4, 1, WHITE], [2, 17, 1, 4, WHITE], [15, 20, 4, 1, WHITE], [18, 17, 1, 4, WHITE],
    // telapak
    ...framed(6, 11, 9, 7, CREAM),
    ...hand.fingers.flatMap(([x, y, w, h, fill]) => framed(x, y, w, h, fill)),
    [6, 11, 9, 7, CREAM],
    // huruf yang dikenali
    ...framed(22, 6, 9, 12, AMBER),
    ...hand.letter,
  ];
  return <Canvas boxes={boxes} label="Tangan memperagakan isyarat di depan kamera, hurufnya muncul di samping" className={className} />;
}

// EchoForum: dua balon percakapan muncul bergantian, lalu tanda suka
function EchoForumArt({ animated, className }: Props) {
  const frame = useFrame(animated, 4, 650);
  const boxes: Box[] = [
    ...framed(2, 3, 16, 7, WHITE),
    [4, 11, 2, 1, NAVY],
    [4, 10, 2, 1, WHITE],
    [4, 5, 10, 1, BLUE],
    [4, 7, 7, 1, BLUE],
    ...(frame >= 1
      ? ([...framed(14, 13, 16, 7, SKY), [26, 21, 2, 1, NAVY], [26, 20, 2, 1, SKY], [16, 15, 11, 1, NAVY], [16, 17, 8, 1, NAVY]] as Box[])
      : []),
    ...(frame >= 2
      ? ([[22, 4, 2, 1, PINK], [25, 4, 2, 1, PINK], [21, 5, 7, 2, PINK], [22, 7, 5, 1, PINK], [23, 8, 3, 1, PINK], [24, 9, 1, 1, PINK]] as Box[])
      : []),
  ];
  return <Canvas boxes={boxes} label="Dua balon percakapan dan tanda suka" className={className} />;
}

// Maskot Hope.Ai: penguin biru-putih, digambar per piksel. Tiap huruf satu warna.
const MASCOT_COLORS: Record<string, string> = {
  K: "#16203f",
  B: "#3f66ad",
  L: "#cfdcf2",
  W: "#ffffff",
  E: "#16203f",
  H: "#ffffff",
  P: "#f6a6a6",
  O: "#f7b731",
  Y: "#e08a1e",
};
const MASCOT = [
  "........KKKKKK........",
  "......KKBBBBBBKK......",
  "....KKBBBBBBBBBBKK....",
  "...KBBBBBBBBBBBBBBK...",
  "..KBBBBBBBBBBBBBBBBK..",
  "..KBBBWWWBBBBWWWBBBK..",
  ".KBBWWWWWWBBWWWWWWBBK.",
  ".KBWWWWWWWWWWWWWWWWBK.",
  ".KBWHEEWWWWWWWWHEEWBK.",
  ".KBWEEEWWWWWWWWEEEWBK.",
  ".KBWEEEWWWOOWWWEEEWBK.",
  ".KBWPPWWWOOOOWWWPPWBK.",
  ".KBWPPWWWWYYWWWWPPWBK.",
  "..KBWWWWWWWWWWWWWWBK..",
  "..KBBWWWWWWWWWWWWBBK..",
  ".KBBBLWWWWWWWWWWLBBBK.",
  "KBBKBLWWWWWWWWWWLBKBBK",
  "KBKKBWWWWWWWWWWWWBKKBK",
  "KK.KBWWWWWWWWWWWWBK.KK",
  "...KBWWWWWWWWWWWWBK...",
  "...KBLWWWWWWWWWWLBK...",
  "..KOOKLWWWWWWWWLKOOK..",
  ".KOOOOKKLLLLLLKKOOOOK.",
  ".KOOOOOKKKKKKKKOOOOOK.",
  "..KKKKK........KKKKK..",
];
// Sirip terangkat sedikit, untuk gerakan mengepak
const MASCOT_FLAP: Record<number, string> = {
  15: "KBBBBLWWWWWWWWWWLBBBBK",
  16: "KBKKBLWWWWWWWWWWLBKKBK",
  17: "KK.KBWWWWWWWWWWWWBK.KK",
  18: "...KBWWWWWWWWWWWWBK...",
};

export function HopeMascot({ animated, className }: Props) {
  const frame = useFrame(animated, 12, 220);
  const blink = frame === 7;
  const flap = frame === 2 || frame === 4;
  // Naik satu piksel tiap beberapa bingkai, seperti bernapas
  const lift = animated && frame % 6 < 3 ? 1 : 0;

  const boxes: Box[] = [];
  MASCOT.forEach((line, y) => {
    let row = flap ? (MASCOT_FLAP[y] ?? line) : line;
    // Berkedip: mata menjadi satu garis
    if (blink && (y === 8 || y === 9)) row = row.replace(/[EH]/g, "W");
    // Gabungkan piksel sewarna yang bersebelahan menjadi satu persegi
    for (let x = 0; x < row.length; ) {
      const cell = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === cell) end++;
      if (cell !== ".") boxes.push([x, y + 1 - lift, end - x, 1, MASCOT_COLORS[cell]]);
      x = end;
    }
  });

  return (
    <svg role="img" aria-label="Maskot Hope.Ai, penguin biru dan putih" viewBox="0 0 22 26" shapeRendering="crispEdges" className={className}>
      {boxes.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w + 0.02} height={h + 0.02} fill={fill} />
      ))}
    </svg>
  );
}

// Ikon kecil 8x8 untuk tiap fitur, dipakai di kaki halaman. W = putih, A = amber.
const FEATURE_ICONS: Record<string, string[]> = {
  eyeread: ["WWW..WWW", "WAAWWAAW", "WAAWWAAW", "WAAWWAAW", "WAAWWAAW", "WWWWWWWW", "...WW...", "........"],
  neotutor: ["...AA...", "...WW...", "WWWWWWWW", "W.WWWW.W", "WWWWWWWW", "WW....WW", "WWWWWWWW", "........"],
  flexa: [".WWWWWW.", ".W....W.", ".W.AA.W.", ".W....W.", ".W.AA.W.", ".W....W.", ".WWWWWW.", "........"],
  pathly: [".W......", ".WAAAA..", ".WAAAAA.", ".WAAAA..", ".W......", ".W......", ".W......", "WWW....."],
  isyarat: ["..W.W.W.", "..W.W.W.", "W.W.W.W.", "W.WWWWW.", "WWWWWWW.", ".WWWWWW.", "..WWWW..", "..WWWW.."],
  echoforum: ["WWWWWWWW", "W......W", "W.AAAA.W", "W......W", "WWWWWWWW", "..WW....", "..W.....", "........"],
};

export function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const rows = FEATURE_ICONS[name] ?? [];
  return (
    <svg aria-hidden="true" viewBox="0 0 8 8" shapeRendering="crispEdges" className={className}>
      {rows.flatMap((row, y) =>
        Array.from(row).map((cell, x) =>
          cell === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={cell === "A" ? AMBER : WHITE} />
        )
      )}
    </svg>
  );
}

type Props = { animated: boolean; className?: string };

export const landingArt: Record<string, (props: Props) => JSX.Element> = {
  eyeread: EyeReadArt,
  neotutor: NeoTutorArt,
  flexa: FlexaArt,
  pathly: PathlyArt,
  isyarat: IsyaratArt,
  echoforum: EchoForumArt,
};
