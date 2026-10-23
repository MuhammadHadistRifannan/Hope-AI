import { useReducedMotion } from "framer-motion";
import { Flame, Gamepad2, Zap } from "lucide-react";

// Halaman depan Pathly bergaya Duolingo: statistik streak dan XP, lalu dua kartu tebal yang
// bisa ditekan. Kartu belajar menunjukkan level berikutnya, kemajuan, dan maskot penguin.

type Props = {
  xp: number;
  streak: number;
  completed: number;
  total: number;
  // Judul level yang sedang terbuka; kosong bila semua selesai atau data belum dimuat
  nextTitle?: string;
  onSelect: (mode: "path" | "arena") => void;
};

// Bibir bawah gelap yang membuat kartu tampak timbul, dan efek tekan
const PRESSABLE =
  "shadow-[inset_0_-8px_0_0_rgba(0,0,0,0.2)] transition-[transform,box-shadow] duration-100 active:translate-y-1 active:shadow-[inset_0_-3px_0_0_rgba(0,0,0,0.2)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-500";

export default function PathlyHome({ xp, streak, completed, total, nextTitle, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  return (
    <div className="max-w-4xl">
      <ul className="mb-6 flex flex-wrap gap-3" aria-label="Pencapaianmu">
        <li className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 py-2 font-extrabold">
          <Flame className="h-6 w-6 text-orange-500" aria-hidden="true" />
          {streak} hari streak
        </li>
        <li className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 py-2 font-extrabold">
          <Zap className="h-6 w-6 fill-amber-400 text-amber-500" aria-hidden="true" />
          {xp} XP
        </li>
      </ul>

      <div className="grid gap-6 md:grid-cols-5">
        <button
          type="button"
          onClick={() => onSelect("path")}
          className={`relative flex flex-col overflow-hidden rounded-3xl bg-primary p-6 pb-8 text-left text-primary-foreground md:col-span-3 ${PRESSABLE}`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">Ayo Belajar · Peta Belajar</span>
          <span className="px-title mt-1 max-w-[16rem] text-2xl md:text-3xl">
            {allDone ? "Semua level selesai!" : nextTitle ? `Lanjutkan: ${nextTitle}` : "Ikuti peta materi dan kuis"}
          </span>
          <span className="mt-4 block h-4 w-full max-w-[16rem] overflow-hidden rounded-full bg-black/20" aria-hidden="true">
            <span className="block h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
          </span>
          <span className="mt-2 text-sm text-primary-foreground/90">
            {completed} dari {total} level selesai
          </span>
          <span className="mt-6 inline-flex w-fit rounded-2xl bg-white px-6 py-3 font-extrabold uppercase tracking-wide text-primary shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.15)]">
            {completed > 0 && !allDone ? "Lanjutkan" : allDone ? "Ulangi" : "Mulai"}
          </span>
          <img
            src={reduceMotion ? "/anim/penguin-still.webp" : "/anim/penguin.webp"}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 -right-4 h-44 w-44 max-w-none object-contain sm:h-52 sm:w-52"
          />
        </button>

        <button
          type="button"
          onClick={() => onSelect("arena")}
          className={`flex flex-col rounded-3xl bg-amber-400 p-6 pb-8 text-left text-amber-950 md:col-span-2 ${PRESSABLE}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50" aria-hidden="true">
            <Gamepad2 className="h-8 w-8" />
          </span>
          <span className="px-title mt-4 text-2xl md:text-3xl">Ayo Bermain</span>
          <span className="mt-1 text-amber-950/80">Asah otak dengan permainan Memori dan Hitung Buah.</span>
          <span className="mt-auto inline-flex w-fit rounded-2xl bg-white px-6 py-3 pt-3 font-extrabold uppercase tracking-wide text-amber-700 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.15)] md:mt-6">
            Main
          </span>
        </button>
      </div>
    </div>
  );
}
