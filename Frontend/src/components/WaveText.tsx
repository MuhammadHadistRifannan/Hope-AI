import { useEffect, useState } from "react";

// Teks bergelombang seperti judul di landing page: huruf naik dan membesar satu per
// satu dari kiri ke kanan, lalu mengulang. Gilirannya diatur satu penghitung, jadi
// urutannya sama di semua perangkat. Pembaca layar membaca kalimatnya utuh.
export default function WaveText({ text, animated, stepMs = 170 }: { text: string; animated: boolean; stepMs?: number }) {
  const letters = Array.from(text.replace(/ /g, "")).length;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!animated) return;
    // Setelah huruf terakhir ada jeda beberapa ketukan sebelum mulai lagi
    const step = setInterval(() => setActive((current) => (current + 1) % (letters + 6)), stepMs);
    return () => clearInterval(step);
  }, [animated, letters, stepMs]);

  if (!animated) return <>{text}</>;
  let index = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <span key={w}>
            {w > 0 && " "}
            {/* Satu kata tidak boleh terpotong di tengah baris */}
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((letter) => {
                const position = index++;
                return (
                  <span key={position} className={`wave-letter ${position === active ? "wave-letter-up" : ""}`}>
                    {letter}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}
