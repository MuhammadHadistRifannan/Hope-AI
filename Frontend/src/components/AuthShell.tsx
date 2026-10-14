import { forwardRef, useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { HopeMascot } from "@/components/LandingArt";
import { TransitionLink } from "@/components/PixelTransition";
import WaveText from "@/components/WaveText";
import { useSettings } from "@/context/SettingsContext";

// Kerangka halaman sebelum masuk (Masuk, Daftar, Lupa dan Atur Ulang Password),
// bergaya sama dengan landing page: pemandangan pixel di belakang, maskot dan
// slogan di kiri, dan lembar navy berisi formulir di kanan.

type Props = {
  // Adegan dari landing page yang dipakai sebagai latar
  scene?: { folder: string; layers: number };
  title: string;
  description: string;
  // Kalimat ajakan di balon kata maskot; berganti tiap beberapa detik
  greetings: string[];
  children: ReactNode;
};

// Latar bawaan: senja kecokelatan dari bagian penutup landing page
export default function AuthShell({ scene = { folder: "s3", layers: 4 }, title, description, greetings, children }: Props) {
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  const animated = !effectiveReduceMotion && !screenReaderMode;
  const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300";

  // Balon kata maskot: kalimatnya berganti bergiliran. Saat daftar kalimat berubah
  // (pindah dari Masuk ke Daftar), mulai lagi dari kalimat pertama.
  const [turn, setTurn] = useState(0);
  const list = greetings.join("|");
  useEffect(() => {
    setTurn(0);
    if (!animated || greetings.length < 2) return;
    const next = setInterval(() => setTurn((current) => current + 1), 4800);
    return () => clearInterval(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, animated]);
  const greeting = greetings[turn % greetings.length];

  return (
    <div data-landing className="relative min-h-screen bg-[#b98a63] font-pixel">
      {/* Pemandangan pixel yang sama dengan landing page, diam di belakang isi */}
      <div aria-hidden="true" className="scene-stage fixed inset-x-0 top-0 overflow-hidden">
        {Array.from({ length: scene.layers }, (_, i) => (
          <img
            key={i}
            src={`/parallax/${scene.folder}/${i + 1}.png`}
            alt=""
            width={576}
            height={324}
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ))}
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-2 p-3 md:p-5">
          <Link to="/landing" className={`flex shrink-0 items-center gap-2 md:gap-3 rounded-2xl ${focusRing}`}>
            <img src="/images/logo.png" alt="" width={72} height={72} className="w-11 h-11 md:w-[72px] md:h-[72px] object-contain drop-shadow-[3px_4px_0_rgba(10,26,79,0.6)]" />
            <span className="pixel-text-lg hidden min-[440px]:inline text-xs sm:text-lg md:text-2xl" translate="no">
              Hope.Ai
            </span>
          </Link>
          <TransitionLink to="/landing" className="pixel-button pixel-button-blue pixel-text gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
          </TransitionLink>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-3 px-3 pb-8 pt-0 md:px-6 lg:grid-cols-2 lg:gap-12">
          {/* Kiri: maskot dan slogan. Di ponsel hanya maskot kecil di atas formulir. */}
          <div className="flex flex-col items-center text-center">
            {/* Maskot menyapa lewat balon kata di sampingnya */}
            <div className="flex items-end justify-center gap-3 lg:gap-4">
              <HopeMascot animated={animated} className="h-auto w-14 shrink-0 drop-shadow-[4px_5px_0_rgba(10,26,79,0.45)] lg:w-40" />
              <p key={greeting} aria-hidden="true" className={`pixel-bubble pixel-body-plain mb-3 lg:mb-16 ${animated ? "pixel-bubble-pop" : ""}`}>
                {greeting}
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="pixel-text mt-6 text-xs !text-amber-300">AI untuk Pendidikan Inklusif</p>
              {/* Huruf membesar bergiliran, sama seperti judul di landing page */}
              <p className="pixel-text-lg mt-4 text-[clamp(1.5rem,2.9vw,2.4rem)] leading-[1.45] text-balance">
                <WaveText text="Belajar Tanpa Batasan." animated={animated} />
              </p>
              <p className="pixel-body mx-auto mt-5 max-w-md text-xl leading-[1.45] text-balance">
                Belajar dengan cara yang paling cocok untukmu: suara, teks, bahasa sederhana, atau isyarat.
              </p>
            </div>
          </div>

          {/* Kanan: lembar formulir */}
          <main className="pixel-sheet pixel-reading mx-auto w-full max-w-md px-5 py-6 text-white md:px-9 md:py-8">
            <h1 className="font-pixel text-[clamp(1rem,4.4vw,1.4rem)] leading-[1.45] text-balance">{title}</h1>
            <p className="mt-2.5 text-base leading-snug text-white/85 md:text-lg">{description}</p>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// Kotak isian bergaya pixel, dengan ikon di kiri dan tempat untuk tombol kecil di kanan
type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
};

export const PixelField = forwardRef<HTMLInputElement, FieldProps>(function PixelField({ id, label, icon: Icon, trailing, ...input }, ref) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-amber-200 md:text-base">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0a1a4f]/55" aria-hidden="true" />
        <input
          ref={ref}
          id={id}
          {...input}
          // 16px supaya Safari di ponsel tidak memperbesar halaman saat kotak disentuh
          className={`h-12 w-full border-[3px] border-[#0a1a4f] bg-white pl-11 text-base text-[#0a1a4f] placeholder:text-[#0a1a4f]/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
            trailing ? "pr-12" : "pr-3"
          }`}
        />
        {trailing && <div className="absolute right-0.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
});

// Tautan dan tombol teks di dalam lembar formulir
export const authLink =
  "inline-flex min-h-11 items-center rounded font-semibold text-amber-300 underline underline-offset-4 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300";
