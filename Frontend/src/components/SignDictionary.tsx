import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Play, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import SignCredit from "@/components/SignCredit";

export type SignEntry = {
  slug: string;
  category: "abjad" | "angka";
  title: string;
  description: string;
  image: string;
  video: string;
};

type Props = {
  // Huruf atau angka yang bisa dilatih dengan kamera (label model)
  practicable: Set<string>;
  onPractice: (sign: string) => void;
  onSpeak: (text: string) => void;
};

const categories = [
  { id: "abjad", label: "Abjad" },
  { id: "angka", label: "Angka" },
] as const;

// Kamus abjad dan angka SIBI. Gambar dan video dimuat langsung dari Kamus SIBI
// Kemendikdasmen, sesuai kredit di bawahnya.
export default function SignDictionary({ practicable, onPractice, onSpeak }: Props) {
  const [entries, setEntries] = useState<SignEntry[]>([]);
  const [category, setCategory] = useState<"abjad" | "angka">("abjad");
  const [selected, setSelected] = useState<SignEntry | null>(null);
  const [media, setMedia] = useState<"image" | "video">("image");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sign_items")
      .select("slug, category, title, description, image_url, video_url, sort_order")
      .in("category", ["abjad", "angka"])
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) console.error("Gagal memuat kamus isyarat:", error);
        const loaded = (data ?? []).map((row) => ({
          slug: row.slug.toUpperCase(),
          category: row.category as "abjad" | "angka",
          title: row.title,
          description: row.description,
          image: row.image_url ?? "",
          video: row.video_url ?? "",
        }));
        setEntries(loaded);
        setSelected(loaded.find((entry) => entry.category === "abjad") ?? null);
        setLoading(false);
      });
  }, []);

  const shown = entries.filter((entry) => entry.category === category);
  const position = selected ? shown.findIndex((entry) => entry.slug === selected.slug) : -1;

  const choose = (entry: SignEntry | undefined) => {
    if (!entry) return;
    setSelected(entry);
    setMedia("image");
  };

  const switchCategory = (next: "abjad" | "angka") => {
    setCategory(next);
    choose(entries.find((entry) => entry.category === next));
  };

  if (loading) {
    return (
      <p className="text-muted-foreground" role="status">
        Memuat kamus...
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Lihat contoh isyarat tiap huruf dan angka. Kamera tetap menyala, jadi kamu bisa langsung
        menirukannya.
      </p>

      <div className="inline-flex rounded-full bg-muted p-1 mb-4" role="group" aria-label="Kategori kamus">
        {categories.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={category === item.id ? "default" : "ghost"}
            className="rounded-full px-5"
            aria-pressed={category === item.id}
            onClick={() => switchCategory(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1 mb-5" role="group" aria-label={`Daftar ${category}`}>
        {shown.map((entry) => (
          <Button
            key={entry.slug}
            size="sm"
            variant={selected?.slug === entry.slug ? "default" : "outline"}
            aria-pressed={selected?.slug === entry.slug}
            aria-label={entry.title}
            className="px-0 font-bold"
            onClick={() => choose(entry)}
          >
            {entry.slug}
          </Button>
        ))}
      </div>

      {selected && (
        <section aria-labelledby="kamus-judul" className="rounded-xl border p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 id="kamus-judul" className="text-xl font-bold">
              {selected.title}
            </h2>
            <div className="inline-flex rounded-full bg-muted p-1" role="group" aria-label="Jenis contoh">
              <Button
                size="sm"
                variant={media === "image" ? "default" : "ghost"}
                className="rounded-full"
                aria-pressed={media === "image"}
                onClick={() => setMedia("image")}
              >
                <ImageIcon className="w-4 h-4 mr-1" aria-hidden="true" /> Gambar
              </Button>
              <Button
                size="sm"
                variant={media === "video" ? "default" : "ghost"}
                className="rounded-full"
                aria-pressed={media === "video"}
                onClick={() => setMedia("video")}
                disabled={!selected.video}
              >
                <Video className="w-4 h-4 mr-1" aria-hidden="true" /> Video
              </Button>
            </div>
          </div>

          <div className="aspect-video rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
            {media === "video" && selected.video ? (
              <video
                key={selected.video}
                src={selected.video}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain bg-black"
                aria-label={`Video isyarat ${selected.title}`}
              />
            ) : selected.image ? (
              <img
                src={selected.image}
                alt={`Isyarat ${selected.title}: ${selected.description}`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <p className="text-muted-foreground">Gambar belum tersedia</p>
            )}
          </div>

          <p className="mt-3 leading-relaxed">{selected.description}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {practicable.has(selected.slug) && (
              <Button onClick={() => onPractice(selected.slug)}>
                <Play className="w-4 h-4 mr-2" aria-hidden="true" /> Latih {selected.category === "abjad" ? "Huruf" : "Angka"} Ini
              </Button>
            )}
            <Button variant="outline" onClick={() => onSpeak(`${selected.title}. ${selected.description}`)}>
              <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => choose(shown[position - 1])}
              disabled={position <= 0}
              aria-label="Isyarat sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => choose(shown[position + 1])}
              disabled={position < 0 || position >= shown.length - 1}
              aria-label="Isyarat berikutnya"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          {!practicable.has(selected.slug) && (
            <p className="text-sm text-muted-foreground mt-2">
              {selected.slug === "J" || selected.slug === "Z"
                ? "Isyarat ini bergerak, jadi belum bisa dilatih dengan kamera."
                : "Isyarat ini belum bisa dikenali kamera."}
            </p>
          )}
          <SignCredit className="mt-3" />
        </section>
      )}
    </div>
  );
}
