import type { ReactNode } from "react";
import { landingArt } from "@/components/LandingArt";
import { useSettings } from "@/context/SettingsContext";

// Kepala halaman bergaya pixel untuk menu di dalam aplikasi: judul berhuruf pixel,
// satu kalimat penjelas berhuruf biasa, dan ilustrasi fitur yang sama dengan landing page.
type Props = {
  title: string;
  description: ReactNode;
  // Kunci ilustrasi di landingArt (eyeread, neotutor, flexa, pathly, isyarat, echoforum)
  art?: string;
  // true: ilustrasinya bergerak, misalnya selagi kamera atau suara sedang aktif
  lively?: boolean;
  // true: di ponsel hanya judul yang tampil, untuk halaman yang butuh ruang (obrolan)
  compact?: boolean;
  children?: ReactNode;
};

export default function PageHeader({ title, description, art, lively = false, compact = false, children }: Props) {
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  const Art = art ? landingArt[art] : null;

  return (
    <header className={`flex items-center gap-4 md:mb-8 ${compact ? "mb-3" : "mb-6"}`}>
      {Art && !screenReaderMode && (
        <span aria-hidden="true" className="hidden h-20 w-28 shrink-0 items-center justify-center border-[3px] border-foreground bg-[#7cc4e8] p-2 sm:flex">
          <Art animated={lively && !effectiveReduceMotion} className="h-full w-auto" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="px-title text-lg text-foreground md:text-2xl" translate="no">
          {title}
        </h1>
        <p className={`mt-2 max-w-prose text-base text-muted-foreground md:text-lg ${compact ? "hidden md:block" : ""}`}>{description}</p>
      </div>
      {children}
    </header>
  );
}
