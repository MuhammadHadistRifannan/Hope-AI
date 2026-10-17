import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

// Kerangka halaman sebelum masuk (Masuk, Daftar, Lupa dan Atur Ulang Password):
// maskot dan sambutan di kiri, kartu formulir di kanan.

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthShell({ title, description, children }: Props) {
  return (
    <div data-landing className="font-sans min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Hiasan latar */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600 via-blue-500 to-transparent -z-10 opacity-10" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Kiri: maskot dan sambutan */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col items-center justify-center text-center space-y-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1, y: [0, -10, 0] }}
              transition={{
                scale: { duration: 0.5 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
              className="relative z-10"
            >
              <img src="/gif/animasi-login.gif" alt="" className="w-80 h-80 object-contain drop-shadow-2xl" />
            </motion.div>
          </div>

          <div className="space-y-4 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-200 dark:border-white/10"
            >
              <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI untuk Pendidikan Inklusif</span>
            </motion.div>

            <p className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              Belajar Jadi Lebih <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Menyenangkan</span>
            </p>

            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Rasakan pengalaman belajar yang adaptif dan inklusif bersama Hope AI: lewat suara, teks, bahasa sederhana, atau isyarat.
            </p>
          </div>
        </motion.div>

        {/* Kanan: kartu formulir */}
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <main className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-[2.5rem]" />
            <div className="relative z-10">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h1>
                <p className="text-slate-500 dark:text-slate-400">{description}</p>
              </div>
              {children}
            </div>
          </main>
        </motion.div>
      </div>
    </div>
  );
}

// Kotak isian dengan ikon di kiri dan tempat untuk tombol kecil di kanan
type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
};

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField({ id, label, icon: Icon, trailing, ...input }, ref) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium leading-none text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
        <input
          ref={ref}
          id={id}
          {...input}
          // 16px supaya Safari di ponsel tidak memperbesar halaman saat kotak disentuh
          className={`flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 md:text-sm ${
            trailing ? "pr-12" : "pr-3"
          }`}
        />
        {trailing && <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
});

// Tautan dan tombol teks di dalam kartu formulir
export const authLink =
  "inline-flex min-h-11 items-center rounded font-bold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

// Tombol utama formulir
export const authSubmit =
  "inline-flex w-full h-12 items-center justify-center gap-2 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:opacity-60 disabled:hover:scale-100";

// Tombol kecil di dalam kotak isian (tampilkan password)
export const authFieldButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
