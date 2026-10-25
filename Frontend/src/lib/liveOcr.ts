// Perhitungan untuk Mode Langsung EyeRead: apakah kamera sedang diam, apakah gambar
// cukup tajam, dan apakah teks yang terlihat berbeda dari yang terakhir dibacakan.
// Semuanya bekerja pada gambar abu-abu kecil (lebar ±160 px), jadi murah dihitung
// beberapa kali per detik di browser.

// Gambar abu-abu dari data RGBA kanvas: 0..255 per piksel
export const toGray = (rgba: ArrayLike<number>, width: number, height: number): Float32Array => {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  return gray;
};

// Ketajaman: variasi hasil filter Laplacian. Tulisan yang tajam punya banyak tepi
// tegas sehingga nilainya tinggi; gambar buram atau kosong nilainya rendah.
export const sharpness = (gray: Float32Array, width: number, height: number) => {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
};

// Gerakan: rata-rata selisih piksel dengan gambar sebelumnya (0..255)
export const motion = (gray: Float32Array, previous: Float32Array | null) => {
  if (!previous || previous.length !== gray.length) return Infinity;
  let total = 0;
  for (let i = 0; i < gray.length; i++) total += Math.abs(gray[i] - previous[i]);
  return total / gray.length;
};

// Kata-kata bermakna dari teks (huruf kecil, tanpa tanda baca, minimal 3 huruf)
const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3)
  );

// Kemiripan dua teks (Jaccard kata): 1 = sama, 0 = tidak ada kata yang sama.
// Dipakai supaya halaman yang sama tidak dibacakan dua kali walaupun hasil OCR
// pratinjaunya sedikit berbeda dari frame ke frame.
export const textSimilarity = (a: string, b: string) => {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 && wb.size === 0) return 1;
  let shared = 0;
  wa.forEach((word) => wb.has(word) && shared++);
  return shared / (wa.size + wb.size - shared);
};

// Ambang yang dipakai Mode Langsung
export const LIVE_OCR = {
  // Lebar gambar kecil untuk mengukur gerakan dan ketajaman
  sampleWidth: 160,
  // Selisih rata-rata di bawah ini berarti kamera dianggap diam. Cukup longgar supaya
  // getaran tangan dan fokus otomatis kamera ponsel tidak dihitung sebagai gerakan.
  stillBelow: 12,
  // Berapa pemeriksaan berturut-turut harus diam sebelum foto dikirim (x jeda pemeriksaan)
  stillTicks: 2,
  // Ketajaman minimal supaya tulisan layak dibaca
  sharpAbove: 80,
  // Gambar dianggap pemandangan baru bila selisihnya dengan foto terakhir yang dikirim di atas ini
  changedAbove: 14,
  // Gerakan sebesar ini (membalik halaman, menggeser kamera) menyiapkan pembacaan berikutnya,
  // karena dua halaman buku sering tampak mirip pada gambar kecil
  rearmAbove: 20,
  // Teks dianggap halaman baru bila kemiripannya dengan bacaan terakhir di bawah ini
  newBelow: 0.5,
} as const;

export type LiveState = "mencari" | "kosong" | "bergerak" | "buram" | "membaca" | "terdeteksi" | "mengirim" | "dibacakan";

export const LIVE_STATE_TEXT: Record<LiveState, string> = {
  mencari: "Arahkan kamera ke tulisan",
  kosong: "Belum ada tulisan terbaca. Dekatkan atau arahkan ke halaman lain",
  bergerak: "Tahan kamera diam sebentar",
  buram: "Gambar buram, jauhkan sedikit atau tambah cahaya",
  membaca: "Mencari tulisan…",
  terdeteksi: "Tulisan terdeteksi",
  mengirim: "Membaca dengan AI…",
  dibacakan: "Selesai dibaca. Arahkan ke halaman berikutnya",
};
