import type { ReactNode } from "react";
import { featureStyle } from "@/components/FeatureCards";

// Kepala halaman untuk menu di dalam aplikasi: ikon fitur, judul, dan satu kalimat penjelas.
type Props = {
  title: string;
  description: ReactNode;
  // Kunci ikon di featureStyle (eyeread, neotutor, flexa, pathly, isyarat, echoforum)
  art?: string;
  // Tidak dipakai lagi; dibiarkan supaya pemanggil lama tetap jalan
  lively?: boolean;
  // true: di ponsel hanya judul yang tampil, untuk halaman yang butuh ruang (obrolan)
  compact?: boolean;
  children?: ReactNode;
};

export default function PageHeader({ title, description, art, compact = false, children }: Props) {
  const style = art ? featureStyle[art] : null;
  const Icon = style?.icon;

  return (
    <header className={`flex items-center gap-4 md:mb-8 ${compact ? "mb-3" : "mb-6"}`}>
      {Icon && (
        <span aria-hidden="true" className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${style.tile}`}>
          <Icon className="h-7 w-7" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="px-title text-2xl text-foreground md:text-3xl" translate="no">
          {title}
        </h1>
        <p className={`mt-1.5 max-w-prose text-base text-muted-foreground md:text-lg ${compact ? "hidden md:block" : ""}`}>{description}</p>
      </div>
      {children}
    </header>
  );
}
