// Kamus kata dasar BISINDO. label harus sama dengan label model
// (models/bisindo-kata.json). Video contoh ada di public/sign/bisindo/ dan berasal
// dari dua dataset (lihat LICENSE.txt di folder itu):
//   - "BISINDO 40 Kata mp4" (Anggi Yohanes Pardede, Kaggle, lisensi MIT): 16 kata
//     pertama. Deskripsi gerakannya diringkas dari video itu.
//   - WL-BISINDO (Kaggle glennleonali/wl-bisindo, CC BY-NC 4.0, varian Banten): kata
//     lainnya. Gerakannya belum diringkas; kamus mengarahkan ke video contoh.
// Model dilatih ulang dengan ml/bisindo/bisindo_wl_training.ipynb.

export type BisindoSource = "40kata" | "wl";

export type BisindoGroup = "Sapaan" | "Orang" | "Kata tanya" | "Kegiatan" | "Waktu" | "Warna" | "Benda dan tempat";

export type BisindoWord = {
  label: string;
  slug: string;
  meaning: string;
  // Kosong bila gerakannya belum diringkas; lihat video contoh
  movement: string;
  group: BisindoGroup;
  source: BisindoSource;
};

// Urutan kelompok di kamus
export const BISINDO_GROUPS: BisindoGroup[] = ["Sapaan", "Orang", "Kata tanya", "Kegiatan", "Waktu", "Warna", "Benda dan tempat"];

export const BISINDO_VIDEO_DIR = "/sign/bisindo";

export const BISINDO_WORDS: BisindoWord[] = [
  {
    label: "Halo",
    slug: "halo",
    meaning: "Sapaan saat bertemu seseorang.",
    movement: "Tangan kanan menyentuh dahi, lalu diangkat ke samping kepala dengan telapak terbuka menghadap depan.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Selamat Pagi",
    slug: "selamat-pagi",
    meaning: "Sapaan di pagi hari.",
    movement: "Tangan kanan bergerak dari dekat dagu ke depan, lalu diangkat di depan bahu.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Saya",
    slug: "saya",
    meaning: "Menyebut diri sendiri, misalnya saat memperkenalkan diri.",
    movement: "Telapak tangan kanan diletakkan di dada.",
    group: "Orang",
    source: "40kata",
  },
  {
    label: "Kamu",
    slug: "kamu",
    meaning: "Menyebut lawan bicara.",
    movement: "Jari telunjuk kanan menunjuk ke depan, ke arah lawan bicara.",
    group: "Orang",
    source: "40kata",
  },
  {
    label: "Siapa",
    slug: "siapa",
    meaning: "Menanyakan orang, misalnya menanyakan nama.",
    movement: "Tangan kanan menyentuh dagu, lalu turun ke depan dada.",
    group: "Kata tanya",
    source: "40kata",
  },
  {
    label: "Apa Kabar",
    slug: "apa-kabar",
    meaning: "Menanyakan keadaan seseorang.",
    movement: "Kedua telapak tangan terbuka menghadap atas di depan perut, lalu tangan kanan diangkat ke samping kepala.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Baik",
    slug: "baik",
    meaning: "Menjawab bahwa keadaan baik, misalnya untuk menjawab \"apa kabar\".",
    movement: "Kedua tangan menyentuh dada, lalu kedua jempol diacungkan di depan bahu.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Senang",
    slug: "senang",
    meaning: "Perasaan gembira; juga dipakai untuk menyebut kegemaran (\"saya senang membaca\").",
    movement: "Kedua telapak tangan terbuka bergerak naik di depan dada.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Terima Kasih",
    slug: "terima-kasih",
    meaning: "Ungkapan terima kasih.",
    movement: "Kedua tangan mendatar di depan perut dengan telapak menghadap bawah, lalu bergerak ke depan.",
    group: "Sapaan",
    source: "40kata",
  },
  {
    label: "Dimana",
    slug: "dimana",
    meaning: "Menanyakan tempat, misalnya tempat tinggal atau asal.",
    movement: "Jari telunjuk kanan teracung di depan bahu dan digerakkan ke kiri dan kanan.",
    group: "Kata tanya",
    source: "40kata",
  },
  {
    label: "Berapa",
    slug: "berapa",
    meaning: "Menanyakan jumlah, misalnya umur.",
    movement: "Tangan kanan terbuka di dekat dagu, lalu bergerak maju dengan telapak menghadap atas.",
    group: "Kata tanya",
    source: "40kata",
  },
  {
    label: "Membaca",
    slug: "membaca",
    meaning: "Kegiatan membaca; bisa dipakai untuk menyebut hobi.",
    movement: "Kedua telapak tangan dibuka di depan dada seperti memegang buku.",
    group: "Kegiatan",
    source: "40kata",
  },
  {
    label: "Menulis",
    slug: "menulis",
    meaning: "Kegiatan menulis; bisa dipakai untuk menyebut hobi.",
    movement: "Telapak tangan kiri terbuka menghadap atas, tangan kanan seperti memegang pena dan menulis di atasnya.",
    group: "Kegiatan",
    source: "40kata",
  },
  {
    label: "Makan",
    slug: "makan",
    meaning: "Kegiatan makan.",
    movement: "Ujung jari tangan kanan dikuncupkan dan didekatkan ke mulut.",
    group: "Kegiatan",
    source: "40kata",
  },
  {
    label: "Minum",
    slug: "minum",
    meaning: "Kegiatan minum.",
    movement: "Tangan kanan seperti memegang gelas di dekat mulut, lalu dimiringkan.",
    group: "Kegiatan",
    source: "40kata",
  },
  {
    label: "Tidur",
    slug: "tidur",
    meaning: "Kegiatan tidur.",
    movement: "Kedua telapak tangan dirapatkan di samping pipi dan kepala dimiringkan, seperti bersandar ke bantal.",
    group: "Kegiatan",
    source: "40kata",
  },
  // --- Kata dari WL-BISINDO (varian Banten) ---
  {
    label: "Maaf",
    slug: "maaf",
    meaning: "Meminta maaf.",
    movement: "",
    group: "Sapaan",
    source: "wl",
  },
  {
    label: "Tuli",
    slug: "tuli",
    meaning: "Menyebut orang Tuli; banyak teman Tuli memakai BISINDO sehari-hari.",
    movement: "",
    group: "Orang",
    source: "wl",
  },
  {
    label: "Teman",
    slug: "teman",
    meaning: "Menyebut teman atau sahabat.",
    movement: "",
    group: "Orang",
    source: "wl",
  },
  {
    label: "Keluarga",
    slug: "keluarga",
    meaning: "Menyebut keluarga.",
    movement: "",
    group: "Orang",
    source: "wl",
  },
  {
    label: "Apa",
    slug: "apa",
    meaning: "Menanyakan sesuatu atau benda.",
    movement: "",
    group: "Kata tanya",
    source: "wl",
  },
  {
    label: "Kapan",
    slug: "kapan",
    meaning: "Menanyakan waktu.",
    movement: "",
    group: "Kata tanya",
    source: "wl",
  },
  {
    label: "Mengapa",
    slug: "mengapa",
    meaning: "Menanyakan alasan.",
    movement: "",
    group: "Kata tanya",
    source: "wl",
  },
  {
    label: "Bagaimana",
    slug: "bagaimana",
    meaning: "Menanyakan cara atau keadaan.",
    movement: "",
    group: "Kata tanya",
    source: "wl",
  },
  {
    label: "Belajar",
    slug: "belajar",
    meaning: "Kegiatan belajar.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Cari",
    slug: "cari",
    meaning: "Mencari sesuatu.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Ingat",
    slug: "ingat",
    meaning: "Mengingat sesuatu.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Dengar",
    slug: "dengar",
    meaning: "Mendengar.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Lagi",
    slug: "lagi",
    meaning: "Sekali lagi atau mengulang.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Berangkat",
    slug: "berangkat",
    meaning: "Pergi meninggalkan suatu tempat.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Datang",
    slug: "datang",
    meaning: "Tiba di suatu tempat.",
    movement: "",
    group: "Kegiatan",
    source: "wl",
  },
  {
    label: "Hari",
    slug: "hari",
    meaning: "Menyebut hari.",
    movement: "",
    group: "Waktu",
    source: "wl",
  },
  {
    label: "Pagi",
    slug: "pagi",
    meaning: "Waktu pagi.",
    movement: "",
    group: "Waktu",
    source: "wl",
  },
  {
    label: "Siang",
    slug: "siang",
    meaning: "Waktu siang.",
    movement: "",
    group: "Waktu",
    source: "wl",
  },
  {
    label: "Sore",
    slug: "sore",
    meaning: "Waktu sore.",
    movement: "",
    group: "Waktu",
    source: "wl",
  },
  {
    label: "Malam",
    slug: "malam",
    meaning: "Waktu malam.",
    movement: "",
    group: "Waktu",
    source: "wl",
  },
  {
    label: "Merah",
    slug: "merah",
    meaning: "Warna merah.",
    movement: "",
    group: "Warna",
    source: "wl",
  },
  {
    label: "Kuning",
    slug: "kuning",
    meaning: "Warna kuning.",
    movement: "",
    group: "Warna",
    source: "wl",
  },
  {
    label: "Hijau",
    slug: "hijau",
    meaning: "Warna hijau.",
    movement: "",
    group: "Warna",
    source: "wl",
  },
  {
    label: "Hitam",
    slug: "hitam",
    meaning: "Warna hitam.",
    movement: "",
    group: "Warna",
    source: "wl",
  },
  {
    label: "Air",
    slug: "air",
    meaning: "Menyebut air.",
    movement: "",
    group: "Benda dan tempat",
    source: "wl",
  },
  {
    label: "Rumah",
    slug: "rumah",
    meaning: "Menyebut rumah.",
    movement: "",
    group: "Benda dan tempat",
    source: "wl",
  },
  {
    label: "Motor",
    slug: "motor",
    meaning: "Menyebut sepeda motor.",
    movement: "",
    group: "Benda dan tempat",
    source: "wl",
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
  { text: "Maaf, saya Tuli", words: ["Maaf", "Saya", "Tuli"] },
  { text: "Kamu datang kapan?", words: ["Kamu", "Datang", "Kapan"] },
  { text: "Saya belajar bersama teman", words: ["Saya", "Belajar", "Teman"], note: "Isyarat \"bersama\" belum tersedia." },
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
