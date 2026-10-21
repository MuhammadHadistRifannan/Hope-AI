// "Jelaskan dengan suaramu": menghubungkan butir umpan balik AI ("Digit dasar adalah
// angka 0 hingga 9") ke paragraf materi yang membahasnya, supaya siswa bisa langsung
// membaca ulang bagian itu.

// Kata yang terlalu umum untuk menunjukkan paragraf tertentu
const STOPWORDS = new Set(
  (
    "yang dan di ke dari untuk dengan adalah ini itu atau pada dalam akan juga tidak " +
    "bisa dapat oleh karena sebagai seperti ada lebih kamu kita kami mereka saya aku " +
    "nya bahwa jadi agar supaya saat ketika tentang bagian hal cara sudah belum"
  ).split(" ")
);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));

// Materi dipecah per paragraf (baris kosong). Materi tanpa baris kosong dipecah per baris.
export const splitParagraphs = (material: string) => {
  const byBlank = material.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return material.split(/\n/).map((part) => part.trim()).filter(Boolean);
};

// Materi dipecah per paragraf, lalu per kalimat. Penanda butir umpan balik menunjuk
// satu kalimat, supaya materi yang hanya satu paragraf panjang tetap tersorot tepat.
export type Sentence = { paragraph: number; text: string };

export const splitSentences = (material: string): Sentence[] =>
  splitParagraphs(material).flatMap((paragraph, index) =>
    (paragraph.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [paragraph])
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ paragraph: index, text }))
  );

// Kata dianggap sama bila salah satunya awalan yang lain ("bilangan" ~ "bilangannya")
const sameWord = (a: string, b: string) =>
  a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

// Indeks paragraf yang paling banyak memuat kata dari butir, atau -1 bila tidak ada
// yang cukup mirip (kurang dari sepertiga kata butir ditemukan)
export const findParagraph = (paragraphs: string[], item: string) => {
  const wanted = [...new Set(words(item))];
  if (wanted.length === 0) return -1;

  let best = -1;
  let bestScore = 0;
  paragraphs.forEach((paragraph, index) => {
    const present = words(paragraph);
    const hits = wanted.filter((word) => present.some((other) => sameWord(word, other))).length;
    const score = hits / wanted.length;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return bestScore >= 1 / 3 ? best : -1;
};

// XP untuk penjelasan yang dinilai baik, diberikan sekali per materi
export const EXPLAIN_PASS_SCORE = 75;
export const EXPLAIN_XP = 20;
