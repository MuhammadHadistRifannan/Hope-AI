// Pemeriksaan aksesibilitas otomatis untuk materi teks yang ditulis guru.
// Hasilnya ditampilkan sebagai checklist sebelum materi diterbitkan.

export type MaterialCheck = {
  id: string;
  ok: boolean;
  label: string; // kalimat yang tampil di checklist
  advice?: string; // saran perbaikan bila belum lolos
};

const words = (text: string) => text.split(/\s+/).filter(Boolean);

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);

// Rujukan ke hal yang hanya bisa dilihat: siswa tunanetra perlu penjelasannya dalam kata-kata
const VISUAL_REFERENCE = /\b(gambar|tabel|grafik|diagram|foto|video|ilustrasi|bagan|peta)\b/gi;

export const visualReferences = (text: string) =>
  [...new Set((text.match(VISUAL_REFERENCE) ?? []).map((term) => term.toLowerCase()))];

export const checkMaterial = (title: string, content: string): MaterialCheck[] => {
  const paragraphs = content.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  const longParagraphs = paragraphs.filter((p) => words(p).length > 120).length;

  const all = sentences(content);
  const average = all.length ? Math.round(words(content).length / all.length) : 0;
  const longSentences = all.filter((s) => words(s).length > 30).length;

  // Empat kata atau lebih berturut-turut dalam huruf kapital semua sulit dibaca, terutama bagi disleksia
  const capsRun = /(?:\b[A-Z]{2,}\b[\s,]+){3,}\b[A-Z]{2,}\b/.test(content);

  return [
    {
      id: "title",
      ok: title.trim().length >= 5,
      label: "Judul jelas (minimal 5 karakter)",
      advice: "Tulis judul yang menggambarkan isi materi.",
    },
    {
      id: "paragraphs",
      ok: longParagraphs === 0,
      label: "Paragraf tidak terlalu panjang",
      advice: `${longParagraphs} paragraf lebih dari 120 kata. Pecah menjadi beberapa paragraf pendek.`,
    },
    {
      id: "sentences",
      ok: average <= 20 && longSentences === 0,
      label: `Kalimat cukup pendek (rata-rata ${average} kata per kalimat)`,
      advice:
        longSentences > 0
          ? `${longSentences} kalimat lebih dari 30 kata. Kalimat pendek lebih mudah diikuti, juga saat dibacakan.`
          : "Usahakan rata-rata kalimat di bawah 20 kata.",
    },
    {
      id: "caps",
      ok: !capsRun,
      label: "Tidak ada kalimat dalam huruf kapital semua",
      advice: "Huruf kapital semua sulit dibaca. Pakai huruf biasa; untuk penekanan, tulis dengan kata-kata.",
    },
  ];
};
