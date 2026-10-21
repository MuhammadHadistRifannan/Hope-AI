// "Tanya Hope": tanya-jawab singkat di landing page. Bukan AI: jawabannya sudah
// ditulis di sini, dan pertanyaan pengunjung dicocokkan lewat kata kunci. Yang
// tidak cocok dijawab jujur bahwa itu di luar kemampuannya.

export type HelpLink = { label: string; to: string };
export type HelpEntry = {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  link?: HelpLink;
};

export const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "apa",
    question: "Hope.Ai itu apa?",
    // Nama "Hope.Ai" sendiri bukan kata kunci: hampir semua pertanyaan menyebutnya
    keywords: ["hope ai itu apa", "apa itu hope ai", "apa itu hope", "hopeai itu apa", "ini apa", "apa ini", "tentang hope", "platform", "aplikasi apa", "website apa"],
    answer:
      "Hope.Ai adalah platform belajar berbasis AI untuk siswa dengan cara belajar yang berbeda, termasuk penyandang disabilitas. Materi bisa dibaca, didengarkan, diringkas, atau dipelajari lewat isyarat.",
  },
  {
    id: "gratis",
    question: "Apakah gratis?",
    keywords: ["gratis", "bayar", "biaya", "harga", "berbayar", "langganan", "iklan", "free"],
    answer: "Ya, Hope.Ai gratis dan tanpa iklan. Kamu cukup membuat akun.",
    link: { label: "Daftar gratis", to: "/auth?mode=signup" },
  },
  {
    id: "fitur",
    question: "Ada fitur apa saja?",
    keywords: ["fitur", "menu", "bisa apa", "apa saja", "eyeread", "neotutor", "flexa", "pathly", "echoforum", "forum", "kuis", "tutor"],
    answer:
      "Ada enam fitur: EyeRead (tulisan dibacakan), NeoTutor (tutor AI), Flexa (satu materi dalam banyak bentuk), Pathly (peta belajar dengan kuis), Isyarat (latihan abjad jari SIBI), dan EchoForum (forum diskusi).",
  },
  {
    id: "netra",
    question: "Apa yang membantu tunanetra?",
    keywords: ["tunanetra", "tuna netra", "buta", "low vision", "penglihatan", "tidak bisa melihat", "pembaca layar", "screen reader", "suara", "dibacakan", "perintah suara"],
    answer:
      "EyeRead membacakan tulisan dari kamera atau dokumen, dan hampir semua teks bisa didengarkan. Ada perintah suara (Ctrl+M), semua halaman bisa dijalankan dengan keyboard, teks bisa diperbesar sampai 200%, dan ada mode kontras tinggi.",
    link: { label: "Pernyataan aksesibilitas", to: "/aksesibilitas" },
  },
  {
    id: "tuli",
    question: "Apa yang membantu teman Tuli?",
    keywords: ["tuli", "tunarungu", "tuna rungu", "pendengaran", "tidak bisa mendengar", "isyarat", "sibi", "bisindo", "bahasa isyarat"],
    answer:
      "Di menu Isyarat ada kamus dan latihan abjad jari SIBI dengan kamera; saat ini 24 huruf yang dikenali, belum kata atau kalimat. Suara di aplikasi juga punya teks pendamping dan penanda visual.",
  },
  {
    id: "disleksia",
    question: "Apa yang membantu disleksia?",
    keywords: ["disleksia", "sulit membaca", "susah membaca", "susah baca", "bahasa sederhana", "ringkas", "ringkasan", "huruf"],
    answer:
      "Ada huruf ramah disleksia, versi bahasa sederhana untuk materi, ringkasan otomatis, dan pembacaan dengan kata yang tersorot. Ukuran teks dan jarak baris juga bisa diatur.",
  },
  {
    id: "daftar",
    question: "Bagaimana cara daftar?",
    keywords: ["daftar", "mendaftar", "buat akun", "bikin akun", "registrasi", "mulai", "cara pakai", "cara mulai", "masuk", "login"],
    answer:
      'Tekan "Daftar", lalu isi nama, email, dan kata sandi. Setelah masuk, Hope.Ai menanyakan kebutuhan belajarmu supaya tampilannya bisa disesuaikan.',
    link: { label: "Buka halaman daftar", to: "/auth?mode=signup" },
  },
  {
    id: "sandi",
    question: "Saya lupa kata sandi",
    keywords: ["lupa password", "lupa kata sandi", "lupa sandi", "reset password", "ganti password", "tidak bisa masuk", "gak bisa login", "tidak bisa login"],
    answer: 'Aku tidak bisa mengurus akunmu dari sini. Buka halaman Masuk, lalu pilih "Lupa password" untuk menerima tautan atur ulang lewat email.',
    link: { label: "Buka halaman masuk", to: "/auth" },
  },
  {
    id: "privasi",
    question: "Apakah data saya aman?",
    keywords: ["data", "privasi", "aman", "keamanan", "kamera", "disimpan", "rekam", "direkam", "mikrofon"],
    answer:
      "Hope.Ai menyimpan akun, pengaturan, dan kegiatan belajarmu, tanpa iklan dan tanpa pelacak. Gambar kamera di menu Isyarat diproses di perangkatmu dan tidak dikirim ke server. Rinciannya ada di Kebijakan Privasi.",
    link: { label: "Baca Kebijakan Privasi", to: "/privasi" },
  },
  {
    id: "perangkat",
    question: "Bisa dipakai di HP?",
    keywords: ["hp", "handphone", "ponsel", "android", "iphone", "laptop", "komputer", "perangkat", "browser", "chrome", "safari", "install", "unduh", "download", "aplikasi"],
    answer:
      "Bisa. Hope.Ai dibuka lewat browser di HP maupun laptop, tanpa perlu memasang aplikasi. Perintah suara berjalan di Chrome dan Safari, dan EyeRead serta Isyarat membutuhkan kamera.",
  },
  {
    id: "pembuat",
    question: "Siapa yang membuat Hope.Ai?",
    keywords: ["siapa", "siapa yang membuat", "siapa pembuat", "membuat", "pembuat", "dibuat", "tim", "developer", "pengembang", "uinic", "lomba", "kode sumber", "github", "kontak", "hubungi"],
    answer: "Hope.Ai dibuat oleh tim mahasiswa katanyainivibecodersemua untuk UINIC 8.0. Kode sumbernya terbuka; sumber dan kredit yang dipakai ada di halaman Kredit.",
    link: { label: "Lihat Kredit dan Sumber", to: "/kredit" },
  },
];

// Pertanyaan yang ditawarkan sebagai tombol
// Hanya empat yang paling sering ditanyakan; sisanya tetap bisa diketik
export const HELP_SUGGESTIONS = ["apa", "gratis", "fitur", "daftar"];

// Batas kemampuan. Versi pendek selalu terlihat di kepala jendela; versi lengkap
// menjadi pesan pertama, dan diulang saat pertanyaan tidak bisa dijawab.
export const HELP_SCOPE_SHORT = "Bukan AI. Hanya menjawab hal umum tentang Hope.Ai.";
export const HELP_SCOPE =
  "Hai! Aku Hope. Aku bukan AI: aku hanya menjawab hal umum tentang Hope.Ai, yaitu fitur, aksesibilitas, cara daftar, biaya, dan privasi. Soal pelajaran, tugas, dan urusan akun tidak bisa kujawab.";
export const HELP_FALLBACK =
  "Maaf, itu di luar yang bisa kujawab. Aku hanya tahu hal umum tentang Hope.Ai. Untuk bertanya soal pelajaran, pakai NeoTutor setelah kamu masuk.";

const normalize = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

// Cari jawaban yang paling cocok. Kata kunci dicocokkan sebagai kata utuh, dan
// kata kunci yang lebih panjang (lebih khusus) bernilai lebih besar.
export function findAnswer(text: string): HelpEntry | null {
  const question = normalize(text);
  if (question.trim().length < 2) return null;
  let best: HelpEntry | null = null;
  let bestScore = 0;
  for (const entry of HELP_ENTRIES) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (question.includes(` ${keyword} `)) score += keyword.split(" ").length;
    }
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}
