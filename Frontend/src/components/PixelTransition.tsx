import { forwardRef, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate, type LinkProps } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";

// Peralihan halaman bergaya pixel: layar ditutup kotak-kotak navy yang muncul
// menyapu dari pojok kiri atas, halaman berganti di baliknya, lalu kotak-kotak
// itu menghilang lagi dengan arah yang sama.

const COVER_MS = 420; // lama menutup; sama untuk membuka
const STAGGER_MS = 20; // selisih antarkotak di sepanjang diagonal
const CELL_MS = 160;

type Phase = "menutup" | "membuka";
let begin: ((to: string) => void) | null = null;

// Dipanggil tautan untuk berpindah halaman dengan peralihan
export function goWithTransition(to: string) {
  if (begin) begin(to);
  else window.location.assign(to);
}

// Dipasang satu kali di dalam router
export default function PixelTransition() {
  const navigate = useNavigate();
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  const calm = effectiveReduceMotion || screenReaderMode;
  const [phase, setPhase] = useState<Phase | null>(null);
  const [grid, setGrid] = useState({ columns: 1, rows: 1 });
  const busy = useRef(false);

  useEffect(() => {
    begin = (to) => {
      // Kurangi Gerakan: langsung pindah tanpa peralihan
      if (calm) return navigate(to);
      if (busy.current) return;
      busy.current = true;
      const size = window.innerWidth < 640 ? 64 : 104;
      const columns = Math.ceil(window.innerWidth / size);
      const rows = Math.ceil(window.innerHeight / size);
      setGrid({ columns, rows });
      setPhase("menutup");
      const sweep = (columns + rows) * STAGGER_MS + CELL_MS;
      const total = Math.max(COVER_MS, sweep);
      window.setTimeout(() => {
        navigate(to);
        window.scrollTo(0, 0);
        // Beri waktu halaman baru tergambar sebelum penutupnya dibuka
        window.setTimeout(() => {
          setPhase("membuka");
          window.setTimeout(() => {
            setPhase(null);
            busy.current = false;
          }, total);
        }, 120);
      }, total);
    };
    return () => {
      begin = null;
    };
  }, [calm, navigate]);

  if (!phase) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[200] grid"
      style={{ gridTemplateColumns: `repeat(${grid.columns}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)` }}
    >
      {Array.from({ length: grid.columns * grid.rows }, (_, i) => {
        const delay = ((i % grid.columns) + Math.floor(i / grid.columns)) * STAGGER_MS;
        return (
          <span
            key={i}
            className={phase === "menutup" ? "pixel-wipe-in" : "pixel-wipe-out"}
            style={{ animationDelay: `${delay}ms`, animationDuration: `${CELL_MS}ms` }}
          />
        );
      })}
    </div>
  );
}

// Tautan biasa yang berpindah halaman lewat peralihan pixel. Klik dengan Ctrl/Cmd,
// klik tengah, dan "buka di tab baru" tetap bekerja seperti tautan pada umumnya.
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps & { to: string }>(function TransitionLink({ to, onClick, ...rest }, ref) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goWithTransition(to);
  };
  return <Link ref={ref} to={to} onClick={handle} {...rest} />;
});
