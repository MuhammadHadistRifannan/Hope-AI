import { motion, useReducedMotion } from "framer-motion";
import { Check, Lock, Star } from "lucide-react";

// Peta Belajar Pathly bergaya Duolingo: tombol timbul yang meliuk seperti ular, gelembung
// "Mulai" di level yang sedang dikerjakan, dan maskot penguin di sisi jalur yang kosong.

export type PathNode = {
  id: number;
  title: string;
  status: "locked" | "unlocked" | "completed";
};

// Geser horizontal tiap level (px) supaya jalur meliuk
const PATH_OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

type Props<T extends PathNode> = {
  modules: T[];
  loading: boolean;
  onSelect: (mod: T) => void;
};

export default function PathMap<T extends PathNode>({ modules, loading, onSelect }: Props<T>) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="rounded-2xl bg-primary text-primary-foreground px-5 py-4 shadow-[inset_0_-6px_0_0_rgba(0,0,0,0.2)]">
        <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
          Pathly · Peta Belajar
        </p>
        <h1 className="px-title text-xl md:text-2xl">Selesaikan setiap level untuk membuka materi baru</h1>
        <p className="mt-1 text-sm text-primary-foreground/90">
          {modules.filter((m) => m.status === "completed").length} dari {modules.length} level selesai
        </p>
      </div>

      {loading && (
        <p className="mt-10 text-center text-muted-foreground" role="status">
          Memuat peta belajar…
        </p>
      )}

      <ol className="relative mt-12 flex flex-col items-center gap-10 overflow-x-clip pb-16" aria-label="Level Peta Belajar">
        {modules.map((mod, i) => {
          const offset = PATH_OFFSETS[i % PATH_OFFSETS.length];
          const isCurrent = mod.status === "unlocked";
          const stateLabel = mod.status === "completed" ? "selesai" : mod.status === "locked" ? "terkunci" : "terbuka";
          return (
            <li key={mod.id} className={`relative flex w-full justify-center ${isCurrent ? "pt-12" : ""}`}>
              <div className="relative flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                <span className="relative">
                  {isCurrent && (
                    <>
                      <motion.span
                        aria-hidden="true"
                        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-full left-1/2 z-20 mb-4 -ml-[2.1rem] w-[4.2rem] rounded-xl border-2 border-border bg-card py-1 text-center text-sm font-extrabold uppercase text-primary shadow-sm after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-card"
                      >
                        Mulai
                      </motion.span>
                      <span aria-hidden="true" className="absolute -inset-2 rounded-[50%] border-4 border-primary/25" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(mod)}
                    aria-label={`Level ${i + 1}: ${mod.title}, ${stateLabel}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`relative flex h-[68px] w-[76px] items-center justify-center rounded-[50%] shadow-[inset_0_-6px_0_0_rgba(0,0,0,0.22)] transition-[transform,box-shadow] duration-100 active:translate-y-1 active:shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.22)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-amber-500 ${
                      mod.status === "locked"
                        ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                        : mod.status === "completed"
                        ? "bg-amber-400 text-amber-950"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {mod.status === "locked" ? (
                      <Lock className="h-7 w-7" aria-hidden="true" />
                    ) : mod.status === "completed" ? (
                      <Check className="h-9 w-9" strokeWidth={4} aria-hidden="true" />
                    ) : (
                      <Star className="h-9 w-9 fill-current" aria-hidden="true" />
                    )}
                  </button>
                </span>
                <span
                  className={`mt-3 max-w-[11rem] text-center text-sm font-bold leading-tight ${
                    mod.status === "locked" ? "text-muted-foreground" : "text-foreground"
                  }`}
                  aria-hidden="true"
                >
                  {mod.title}
                </span>

                {/* Maskot menemani level yang sedang dikerjakan, di sisi jalur yang kosong */}
                {isCurrent && (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1/2 flex w-28 -translate-y-1/2 flex-col items-center sm:w-36 md:w-44 ${
                      offset > 0 ? "right-full mr-2 md:mr-8" : "left-full ml-2 md:ml-8"
                    }`}
                  >
                    <img
                      src={reduceMotion ? "/anim/penguin-still.webp" : "/anim/penguin.webp"}
                      alt=""
                      className="h-28 w-28 max-w-none scale-125 object-contain sm:h-36 sm:w-36 md:h-44 md:w-44"
                    />
                    <span className="-mt-1 h-3 w-16 rounded-[50%] bg-foreground/10 md:w-24" />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
