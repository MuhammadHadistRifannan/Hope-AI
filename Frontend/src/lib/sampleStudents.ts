// Siswa contoh untuk mode "Data contoh" di Ruang Guru. Hanya tampil di layar guru yang
// menyalakannya, tidak pernah disimpan ke database, dan selalu diberi label jelas.

export type SampleStudent = {
  id: string;
  name: string;
  xp: number;
  streak: number;
  lastActive: string | null;
  modulesCompleted: number;
  quizCount: number;
  averageScore: number | null;
  explainAverage: number | null;
  explainCount: number;
  explainMissing: string[];
  lastSeen: string | null;
};

// [nama, level selesai, kuis, rata-rata nilai, skor lisan, berapa kali, hari sejak aktif, streak]
const rows: [string, number, number, number | null, number | null, number, number | null, number][] = [
  ["Aditya Pratama", 10, 14, 92, 88, 4, 0, 12],
  ["Bunga Lestari", 8, 11, 85, 79, 3, 1, 6],
  ["Citra Maharani", 6, 9, 78, 72, 2, 2, 4],
  ["Dimas Saputra", 0, 0, null, null, 0, null, 0],
  ["Eka Wulandari", 2, 4, 55, 46, 2, 12, 0],
  ["Fajar Nugroho", 4, 6, 64, 61, 1, 3, 2],
  ["Gita Permata", 5, 7, 71, 68, 2, 5, 3],
  ["Hendra Wijaya", 9, 12, 88, 84, 3, 1, 9],
  ["Indah Puspita", 1, 3, 35, 38, 1, 20, 0],
  ["Joko Santoso", 3, 5, 60, 57, 1, 6, 1],
  ["Kirana Ayu", 2, 4, 47, null, 0, 15, 0],
  ["Lukman Hakim", 10, 15, 95, 91, 5, 0, 15],
  ["Maya Anggraini", 7, 9, 82, 76, 2, 2, 5],
  ["Nanda Firmansyah", 0, 0, null, null, 0, 60, 0],
  ["Oktaviani Putri", 5, 8, 69, 64, 2, 4, 2],
  ["Putra Ramadhan", 6, 8, 73, 70, 1, 3, 3],
  ["Qori Hidayati", 2, 3, 58, 52, 1, 9, 0],
  ["Rizky Kurniawan", 9, 13, 90, 86, 4, 1, 8],
  ["Salsabila Nur", 4, 6, 66, 63, 1, 7, 1],
  ["Taufik Hidayat", 7, 10, 81, 74, 3, 2, 4],
  ["Umi Kalsum", 0, 1, 40, null, 0, 45, 0],
  ["Vino Prasetyo", 5, 7, 77, 69, 2, 3, 2],
  ["Wulan Sari", 1, 2, 44, 41, 1, 25, 0],
  ["Yoga Pratama", 8, 11, 86, 80, 3, 1, 7],
  ["Zahra Aulia", 6, 8, 70, 66, 2, 5, 3],
];

const missing = [
  "Peran klorofil dalam fotosintesis",
  "Urutan peristiwa Sumpah Pemuda",
  "Contoh benda padat dan cair",
  "Arti kata 'ekosistem'",
];

export const sampleStudents = (): SampleStudent[] => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  return rows.map(([name, done, quizzes, score, explain, explainCount, days, streak], i) => ({
    id: `contoh-${i}`,
    name,
    xp: done * 40 + quizzes * 15,
    streak,
    lastActive: days === null ? null : daysAgo(days),
    modulesCompleted: done,
    quizCount: quizzes,
    averageScore: score,
    explainAverage: explain,
    explainCount,
    explainMissing: explain !== null && explain < 75 ? [missing[i % missing.length]] : [],
    lastSeen: days === null ? null : daysAgo(days),
  }));
};
