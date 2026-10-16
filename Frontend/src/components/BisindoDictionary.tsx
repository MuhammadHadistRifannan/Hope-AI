import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BISINDO_PHRASES, BISINDO_WORDS, bisindoVideo, similarTo, type BisindoWord } from "@/lib/sign/bisindoWords";

type Props = {
  // Kata yang bisa dikenali kamera (label model)
  practicable: Set<string>;
  onPractice: (word: string) => void;
  onSpeak: (text: string) => void;
};

export const BISINDO_SOURCE_URL = "https://www.kaggle.com/datasets/anggiyohanespardede/bisindo-40-kata-mp4";

export function BisindoCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Video isyarat BISINDO:{" "}
      <a href={BISINDO_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
        BISINDO 40 Kata, Anggi Yohanes Pardede (Kaggle)
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
      , lisensi MIT. Isyarat BISINDO bisa sedikit berbeda antardaerah.
    </p>
  );
}

// Kamus kata dasar BISINDO: video contoh, arti, ringkasan gerakan, dan
// frasa perkenalan yang bisa disusun dari kata-kata itu.
export default function BisindoDictionary({ practicable, onPractice, onSpeak }: Props) {
  const [selected, setSelected] = useState<BisindoWord>(BISINDO_WORDS[0]);
  const position = BISINDO_WORDS.indexOf(selected);
  const choose = (label: string) => {
    const word = BISINDO_WORDS.find((w) => w.label === label);
    if (word) setSelected(word);
  };

  return (
    <div>
      <section aria-labelledby="kamus-bisindo-judul" className="px-well p-3 md:p-4 mb-5">
        <h2 id="kamus-bisindo-judul" className="px-title text-lg mb-3">
          {selected.label}
        </h2>
        <div className="aspect-[4/3] border-[3px] border-foreground bg-black overflow-hidden">
          <video
            key={selected.slug}
            src={bisindoVideo(selected)}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            aria-label={`Video isyarat BISINDO ${selected.label}`}
          />
        </div>
        <p className="mt-3 leading-relaxed">{selected.meaning}</p>
        <p className="mt-2 text-sm leading-relaxed">
          <span className="font-semibold">Gerakan:</span> {selected.movement}{" "}
          <span className="text-muted-foreground">(ringkasan dari video; ikuti videonya untuk gerakan lengkap)</span>
        </p>
        {similarTo(selected.label).length > 0 && (
          <div className="mt-3 border-2 border-foreground/40 p-3">
            <p className="text-sm font-semibold mb-1">Mirip dengan</p>
            <ul className="space-y-2">
              {similarTo(selected.label).map((similar) => (
                <li key={similar.label} className="text-sm leading-relaxed">
                  <Button size="sm" variant="outline" className="px-btn min-h-9 mr-2" onClick={() => choose(similar.label)}>
                    {similar.label}
                  </Button>
                  {similar.difference}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {practicable.has(selected.label) && (
            <Button onClick={() => onPractice(selected.label)} className="px-btn bg-[#1a8f43] text-white hover:bg-[#1a8f43]/90">
              <Play className="w-4 h-4 mr-2" aria-hidden="true" /> Latih Kata Ini
            </Button>
          )}
          <Button className="px-btn" variant="outline" onClick={() => onSpeak(`${selected.label}. ${selected.meaning} ${selected.movement}`)}>
            <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan
          </Button>
          <Button
            className="px-btn"
            variant="outline"
            size="icon"
            onClick={() => setSelected(BISINDO_WORDS[position - 1])}
            disabled={position <= 0}
            aria-label="Kata sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            className="px-btn"
            variant="outline"
            size="icon"
            onClick={() => setSelected(BISINDO_WORDS[position + 1])}
            disabled={position >= BISINDO_WORDS.length - 1}
            aria-label="Kata berikutnya"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        {!practicable.has(selected.label) && (
          <p className="text-sm text-muted-foreground mt-2">Kata ini belum bisa dikenali kamera.</p>
        )}
        <BisindoCredit className="mt-3" />
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mb-6" role="group" aria-label="Daftar kata BISINDO">
        {BISINDO_WORDS.map((word) => (
          <Button
            key={word.slug}
            size="sm"
            variant={selected.slug === word.slug ? "default" : "outline"}
            aria-pressed={selected.slug === word.slug}
            className={`px-btn rounded-none border-2 border-foreground min-h-10 font-bold ${selected.slug === word.slug ? "!bg-amber-300 !text-[#0a1a4f]" : ""}`}
            onClick={() => setSelected(word)}
          >
            {word.label}
          </Button>
        ))}
      </div>

      <section aria-labelledby="frasa-judul">
        <h3 id="frasa-judul" className="px-title text-base mb-2">
          Frasa perkenalan
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Isyaratkan kata-katanya berurutan. Kata "nama", "umur", "hobi", dan "berasal" belum tersedia, jadi dipakai
          padanan terdekatnya.
        </p>
        <ul className="space-y-2">
          {BISINDO_PHRASES.map((phrase) => (
            <li key={phrase.text} className="border-2 border-foreground/40 p-3">
              <p className="font-semibold">{phrase.text}</p>
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {phrase.words.map((word, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true">+</span>}
                    <Button size="sm" variant="outline" className="px-btn min-h-9" onClick={() => choose(word)}>
                      {word}
                    </Button>
                  </span>
                ))}
              </div>
              {phrase.note && <p className="text-sm text-muted-foreground mt-2">{phrase.note}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
