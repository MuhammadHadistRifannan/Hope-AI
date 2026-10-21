import { useEffect, useState, type ComponentType } from "react";
import {
  Accessibility,
  ALargeSmall,
  AlignLeft,
  BookOpenText,
  Contrast,
  Droplet,
  Focus,
  ImageOff,
  Link,
  ListTree,
  PauseCircle,
  Rows3,
  RotateCcw,
  ScanLine,
  X,
} from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/context/SettingsContext";
import {
  A11Y_STORAGE_KEY,
  applyA11yTools,
  defaultA11yTools,
  parseA11yTools,
  type A11yTools,
} from "@/lib/a11yTools";

// Panel aksesibilitas melayang di semua halaman: satu tombol membuka 12 alat dalam tiga
// kelompok. Ukuran teks, font, kontras, dan gerak memakai pengaturan akun yang sudah ada;
// alat lainnya disimpan di perangkat (lib/a11yTools.ts).

const TEXT_STEPS = [0, 30, 60]; // tambahan ukuran teks: 100%, 130%, 160%

const readTools = () => {
  try {
    return parseA11yTools(localStorage.getItem(A11Y_STORAGE_KEY));
  } catch {
    return { ...defaultA11yTools };
  }
};

type Tile = {
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  on: boolean;
  onClick: () => void;
};

export default function AccessibilityPanel() {
  const { textSize, highContrast, dyslexiaFont, reduceMotion, setAndSave } = useSettings();
  const [open, setOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [tools, setTools] = useState<A11yTools>(readTools);

  useEffect(() => {
    applyA11yTools(document.documentElement.classList, tools);
    try {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(tools));
    } catch {
      // Penyimpanan perangkat tidak tersedia: alat tetap berlaku sampai halaman ditutup
    }
  }, [tools]);

  const flip = (key: keyof A11yTools) => setTools((current) => ({ ...current, [key]: !current[key] }));

  const nextTextSize = TEXT_STEPS[(TEXT_STEPS.findIndex((step) => step >= textSize) + 1) % TEXT_STEPS.length] ?? 0;

  const groups: { title: string; tiles: Tile[] }[] = [
    {
      title: "Teks",
      tiles: [
        {
          label: "Perbesar teks",
          hint: `${100 + textSize}%`,
          icon: ALargeSmall,
          on: textSize > 0,
          onClick: () => setAndSave("textSize", textSize >= 60 ? 0 : nextTextSize),
        },
        { label: "Jarak baris", icon: Rows3, on: tools.lineHeight, onClick: () => flip("lineHeight") },
        { label: "Rata kiri", icon: AlignLeft, on: tools.alignLeft, onClick: () => flip("alignLeft") },
        {
          label: "Huruf mudah dibaca",
          icon: BookOpenText,
          on: dyslexiaFont,
          onClick: () => setAndSave("dyslexiaFont", !dyslexiaFont),
        },
      ],
    },
    {
      title: "Visual",
      tiles: [
        { label: "Kontras tinggi", icon: Contrast, on: highContrast, onClick: () => setAndSave("highContrast", !highContrast) },
        { label: "Hitam putih", icon: Droplet, on: tools.grayscale, onClick: () => flip("grayscale") },
        { label: "Sembunyikan gambar", icon: ImageOff, on: tools.hideImages, onClick: () => flip("hideImages") },
        {
          label: "Hentikan animasi",
          icon: PauseCircle,
          on: reduceMotion === true,
          onClick: () => setAndSave("reduceMotion", reduceMotion === true ? null : true),
        },
      ],
    },
    {
      title: "Navigasi",
      tiles: [
        { label: "Sorot tautan", icon: Link, on: tools.highlightLinks, onClick: () => flip("highlightLinks") },
        { label: "Masker baca", icon: ScanLine, on: tools.readingMask, onClick: () => flip("readingMask") },
        { label: "Fokus jelas", icon: Focus, on: tools.strongFocus, onClick: () => flip("strongFocus") },
        {
          label: "Struktur halaman",
          icon: ListTree,
          on: false,
          onClick: () => {
            setOpen(false);
            setStructureOpen(true);
          },
        },
      ],
    },
  ];

  // Hanya alat perangkat yang diatur ulang. Ukuran teks, huruf, kontras, dan animasi adalah
  // setelan akun (sering dari onboarding, misalnya font disleksia), jadi tidak ikut dimatikan
  // diam-diam; ubahnya satu per satu lewat ubin masing-masing.
  const resetAll = () => setTools({ ...defaultA11yTools });

  return (
    <>
      <button
        type="button"
        data-a11y-panel
        onClick={() => setOpen(true)}
        aria-label="Buka panel aksesibilitas"
        aria-expanded={open}
        className={`${open ? "hidden" : "inline-flex"} fixed bottom-[10.5rem] right-4 z-[60] h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 md:bottom-24 md:right-6 md:h-14 md:w-14`}
      >
        <Accessibility className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          data-a11y-panel
          className="z-[70] w-[min(100vw,23rem)] overflow-y-auto bg-muted p-0 sm:max-w-sm [&>button.absolute]:hidden"
        >
          <SheetHeader className="sticky top-0 z-10 flex-row items-center gap-3 space-y-0 bg-primary px-5 py-4 text-left text-primary-foreground">
            <Accessibility className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg text-primary-foreground">Aksesibilitas</SheetTitle>
              <SheetDescription className="text-xs text-primary-foreground/80">
                Sesuaikan tampilan halaman dengan kebutuhanmu.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Matikan semua alat aksesibilitas di perangkat ini"
              title="Matikan alat di perangkat ini"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </button>
            <SheetClose
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Tutup panel aksesibilitas"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </SheetClose>
          </SheetHeader>

          <div className="space-y-4 p-4">
            {groups.map((group) => (
              <section key={group.title} aria-labelledby={`a11y-${group.title}`} className="rounded-2xl bg-card p-3 shadow-sm">
                <h2 id={`a11y-${group.title}`} className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
                  {group.title}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {group.tiles.map((tile) => (
                    <button
                      key={tile.label}
                      type="button"
                      aria-pressed={tile.label === "Struktur halaman" ? undefined : tile.on}
                      onClick={tile.onClick}
                      className={`flex min-h-16 items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        tile.on ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-muted/70 text-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          tile.on ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                        }`}
                      >
                        <tile.icon className="h-4 w-4" />
                      </span>
                      <span className="leading-tight">
                        {tile.label}
                        {tile.hint && <span className="block text-xs text-muted-foreground">{tile.hint}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Ukuran teks, huruf, kontras, dan animasi tersimpan di akunmu. Alat lainnya hanya berlaku di perangkat ini, dan
              tombol putar di atas mematikan semuanya sekaligus.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {tools.readingMask && <ReadingMask />}
      <PageStructure open={structureOpen} onOpenChange={setStructureOpen} />
    </>
  );
}

// Masker baca: meredupkan layar kecuali satu pita di sekitar penunjuk atau elemen yang
// sedang difokus keyboard, untuk membantu membaca baris demi baris
function ReadingMask() {
  const [y, setY] = useState(() => window.innerHeight / 2);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => setY(event.clientY);
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.getBoundingClientRect) {
        const rect = target.getBoundingClientRect();
        setY(rect.top + rect.height / 2);
      }
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("focusin", onFocus);
    };
  }, []);

  const band = 70; // setengah tinggi pita terang, dalam piksel
  return (
    <div aria-hidden="true" data-a11y-panel className="pointer-events-none fixed inset-0 z-[55]">
      <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: Math.max(0, y - band) }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ top: y + band }} />
      <div className="absolute inset-x-0 border-y-2 border-amber-300" style={{ top: y - band, height: band * 2 }} />
    </div>
  );
}

// Struktur halaman: daftar judul di halaman ini, untuk melompat langsung ke bagian tertentu
function PageStructure({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [headings, setHeadings] = useState<{ level: number; text: string; element: HTMLElement }[]>([]);

  useEffect(() => {
    if (!open) return;
    const found = [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, h1, h2, h3")]
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter((element) => !element.closest("[data-a11y-panel], [role=dialog]") && element.innerText.trim())
      .map((element) => ({ level: Number(element.tagName[1]), text: element.innerText.trim().replace(/\s+/g, " "), element }));
    setHeadings(found);
  }, [open]);

  const jump = (element: HTMLElement) => {
    onOpenChange(false);
    // Tunggu dialog tertutup supaya fokus tidak dikembalikan ke tombol pembuka
    setTimeout(() => {
      if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus({ preventScroll: true });
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-a11y-panel className="z-[70] max-h-[80vh] max-w-md overflow-y-auto">
        <DialogTitle>Struktur halaman</DialogTitle>
        <DialogDescription>Pilih judul untuk langsung menuju bagian itu.</DialogDescription>
        {headings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Halaman ini belum punya judul bagian.</p>
        ) : (
          <ul className="space-y-1">
            {headings.map((heading, index) => (
              <li key={index} style={{ paddingLeft: (heading.level - 1) * 16 }}>
                <button
                  type="button"
                  onClick={() => jump(heading.element)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    H{heading.level}
                  </span>
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
