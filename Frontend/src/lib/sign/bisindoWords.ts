// Kamus kata dasar BISINDO. label harus sama dengan label model
// (models/bisindo-kata.json, nama folder di dataset). Video contoh disalin dari
// dataset "BISINDO 40 Kata mp4" (Anggi Yohanes Pardede, Kaggle, lisensi MIT)
// ke public/sign/bisindo/. Deskripsi gerakan diringkas dari video itu.

export type BisindoWord = {
  label: string;
  slug: string;
  meaning: string;
  movement: string;
};

export const BISINDO_VIDEO_DIR = "/sign/bisindo";

export const BISINDO_WORDS: BisindoWord[] = [
  {
    label: "Halo",
    slug: "halo",
    meaning: "Sapaan saat bertemu seseorang.",
    movement: "Tangan kanan menyentuh dahi, lalu diangkat ke samping kepala dengan telapak terbuka menghadap depan.",
  },
  {
    label: "Selamat Pagi",
    slug: "selamat-pagi",
    meaning: "Sapaan di pagi hari.",
    movement: "Tangan kanan bergerak dari dekat dagu ke depan, lalu diangkat di depan bahu.",
  },
  {
    label: "Saya",
    slug: "saya",
    meaning: "Menyebut diri sendiri, misalnya saat memperkenalkan diri.",
    movement: "Telapak tangan kanan diletakkan di dada.",
  },
  {
    label: "Kamu",
    slug: "kamu",
    meaning: "Menyebut lawan bicara.",
    movement: "Jari telunjuk kanan menunjuk ke depan, ke arah lawan bicara.",
  },
  {
    label: "Siapa",
    slug: "siapa",
    meaning: "Menanyakan orang, misalnya menanyakan nama.",
    movement: "Tangan kanan menyentuh dagu, lalu turun ke depan dada.",
  },
  {
    label: "Apa Kabar",
    slug: "apa-kabar",
    meaning: "Menanyakan keadaan seseorang.",
    movement: "Kedua telapak tangan terbuka menghadap atas di depan perut, lalu tangan kanan diangkat ke samping kepala.",
  },
  {
    label: "Baik",
    slug: "baik",
    meaning: "Menjawab bahwa keadaan baik, misalnya untuk menjawab \"apa kabar\".",
    movement: "Kedua tangan menyentuh dada, lalu kedua jempol diacungkan di depan bahu.",
  },
  {
    label: "Senang",
    slug: "senang",
    meaning: "Perasaan gembira; juga dipakai untuk menyebut kegemaran (\"saya senang membaca\").",
    movement: "Kedua telapak tangan terbuka bergerak naik di depan dada.",
  },
  {
    label: "Terima Kasih",
    slug: "terima-kasih",
    meaning: "Ungkapan terima kasih.",
    movement: "Kedua tangan mendatar di depan perut dengan telapak menghadap bawah, lalu bergerak ke depan.",
  },
  {
    label: "Dimana",
    slug: "dimana",
    meaning: "Menanyakan tempat, misalnya tempat tinggal atau asal.",
    movement: "Jari telunjuk kanan teracung di depan bahu dan digerakkan ke kiri dan kanan.",
  },
  {
    label: "Berapa",
    slug: "berapa",
    meaning: "Menanyakan jumlah, misalnya umur.",
    movement: "Tangan kanan terbuka di dekat dagu, lalu bergerak maju dengan telapak menghadap atas.",
  },
  {
    label: "Membaca",
    slug: "membaca",
    meaning: "Kegiatan membaca; bisa dipakai untuk menyebut hobi.",
    movement: "Kedua telapak tangan dibuka di depan dada seperti memegang buku.",
  },
  {
    label: "Menulis",
    slug: "menulis",
    meaning: "Kegiatan menulis; bisa dipakai untuk menyebut hobi.",
    movement: "Telapak tangan kiri terbuka menghadap atas, tangan kanan seperti memegang pena dan menulis di atasnya.",
  },
  {
    label: "Makan",
    slug: "makan",
    meaning: "Kegiatan makan.",
    movement: "Ujung jari tangan kanan dikuncupkan dan didekatkan ke mulut.",
  },
  {
    label: "Minum",
    slug: "minum",
    meaning: "Kegiatan minum.",
    movement: "Tangan kanan seperti memegang gelas di dekat mulut, lalu dimiringkan.",
  },
  {
    label: "Tidur",
    slug: "tidur",
    meaning: "Kegiatan tidur.",
    movement: "Kedua telapak tangan dirapatkan di samping pipi dan kepala dimiringkan, seperti bersandar ke bantal.",
  },
];

// Frasa perkenalan yang bisa disusun dari kata di atas. Kata yang belum ada
// di model (nama, umur, hobi, berasal) diganti dengan padanan terdekat.
export const BISINDO_PHRASES: { text: string; words: string[]; note?: string }[] = [
  { text: "Halo, saya …", words: ["Halo", "Saya"], note: "Lanjutkan dengan mengeja namamu." },
  { text: "Selamat pagi", words: ["Selamat Pagi"] },
  { text: "Apa kabar?", words: ["Apa Kabar"] },
  { text: "Kabar baik, terima kasih", words: ["Baik", "Terima Kasih"] },
  { text: "Kamu siapa?", words: ["Kamu", "Siapa"], note: "Untuk menanyakan nama." },
  { text: "Kamu di mana?", words: ["Kamu", "Dimana"], note: "Untuk menanyakan tempat tinggal atau asal." },
  { text: "Kamu berapa?", words: ["Kamu", "Berapa"], note: "Untuk menanyakan umur; isyarat \"umur\" belum tersedia." },
  { text: "Saya senang membaca", words: ["Saya", "Senang", "Membaca"], note: "Untuk menyebut hobi." },
];

// Pasangan isyarat yang paling mirip menurut audit (ml/bisindo/audit.py,
// hasilnya di models/bisindo-audit.json): kata kedua terkuat menurut model
// dan jarak gerakan tanpa model. Penjelasan bedanya diambil dari gerakan di atas.
export const BISINDO_SIMILAR: { words: [string, string]; difference: string }[] = [
  {
    words: ["Dimana", "Kamu"],
    difference: "Kamu: telunjuk menunjuk ke depan, ke lawan bicara. Dimana: telunjuk teracung dan digerakkan ke kiri dan kanan.",
  },
  {
    words: ["Dimana", "Siapa"],
    difference: "Siapa: tangan menyentuh dagu lalu turun. Dimana: telunjuk teracung di depan bahu tanpa menyentuh dagu.",
  },
  {
    words: ["Baik", "Senang"],
    difference: "Baik: kedua tangan menyentuh dada lalu jempol diacungkan. Senang: kedua telapak tetap terbuka dan bergerak naik di depan dada.",
  },
  {
    words: ["Apa Kabar", "Senang"],
    difference: "Apa Kabar: telapak menghadap atas di depan perut, lalu tangan kanan diangkat ke samping kepala. Senang: kedua telapak bergerak naik di depan dada.",
  },
  {
    words: ["Berapa", "Selamat Pagi"],
    difference: "Berapa: tangan terbuka maju dari dagu dengan telapak menghadap atas. Selamat Pagi: setelah maju dari dagu, tangan diangkat di depan bahu.",
  },
  {
    words: ["Berapa", "Makan"],
    difference: "Makan: ujung jari dikuncupkan dan didekatkan ke mulut. Berapa: jari-jari terbuka dan tangan maju menjauhi dagu.",
  },
  {
    words: ["Halo", "Minum"],
    difference: "Halo: tangan menyentuh dahi lalu telapak terbuka di samping kepala. Minum: tangan seperti memegang gelas di depan mulut lalu dimiringkan.",
  },
  {
    words: ["Saya", "Tidur"],
    difference: "Saya: satu telapak diletakkan di dada. Tidur: kedua telapak dirapatkan di samping pipi dan kepala dimiringkan.",
  },
];

export const bisindoWord = (label: string) => BISINDO_WORDS.find((word) => word.label === label);

export const similarTo = (label: string) =>
  BISINDO_SIMILAR.filter((pair) => pair.words.includes(label)).map((pair) => ({
    label: pair.words[0] === label ? pair.words[1] : pair.words[0],
    difference: pair.difference,
  }));

export const differenceBetween = (a: string, b: string) =>
  BISINDO_SIMILAR.find((pair) => pair.words.includes(a) && pair.words.includes(b))?.difference;
export const bisindoVideo = (word: BisindoWord) => `${BISINDO_VIDEO_DIR}/${word.slug}.mp4`;
