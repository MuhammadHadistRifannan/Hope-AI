// Kutipan tokoh dunia untuk dinding di bawah jendela landing, berganti setiap hari.
// Hanya kutipan yang sumbernya bisa ditelusuri (pidato, esai, wawancara). Kutipan
// populer yang atribusinya tidak jelas sengaja tidak dipakai. Kutipan berbahasa asing
// ditampilkan dalam terjemahan bebas bahasa Indonesia.

export type Quote = { text: string; author: string; source: string };

export const QUOTES: Quote[] = [
  {
    text: "Tidak ada yang bisa dicapai tanpa harapan dan rasa percaya diri.",
    author: "Helen Keller",
    source: "esai Optimism, 1903",
  },
  {
    text: "Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia.",
    author: "Nelson Mandela",
    source: "pidato di Johannesburg, 2003",
  },
  {
    text: "Satu anak, satu guru, satu buku, dan satu pena bisa mengubah dunia.",
    author: "Malala Yousafzai",
    source: "pidato di PBB, 2013",
  },
  {
    text: "Pusatkan perhatian pada hal-hal yang bisa kamu lakukan dengan baik, yang tidak dihalangi oleh disabilitasmu.",
    author: "Stephen Hawking",
    source: "wawancara The New York Times, 2011",
  },
  {
    text: "Dunia membutuhkan semua jenis pikiran.",
    author: "Temple Grandin",
    source: "TED Talk, 2010",
  },
  {
    text: "Ing ngarsa sung tuladha, ing madya mangun karsa, tut wuri handayani.",
    author: "Ki Hajar Dewantara",
    source: "semboyan Taman Siswa",
  },
  {
    text: "Meski dunia penuh dengan penderitaan, dunia juga penuh dengan cara untuk mengatasinya.",
    author: "Helen Keller",
    source: "esai Optimism, 1903",
  },
  {
    text: "Kita baru menyadari pentingnya suara kita ketika kita dibungkam.",
    author: "Malala Yousafzai",
    source: "pidato di PBB, 2013",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// Nomor hari menurut kalender lokal (bukan UTC), supaya kutipan berganti tepat tengah malam
const localDayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

export const quoteOfDay = (date: Date = new Date()) => QUOTES[localDayNumber(date) % QUOTES.length];
