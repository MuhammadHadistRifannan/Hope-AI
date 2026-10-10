import { useEffect, useRef } from "react";

// Perintah suara disiarkan ke halaman yang sedang terbuka lewat event ini.
// Halaman yang mengenali perintahnya memanggil preventDefault() supaya asisten
// tahu perintah sudah ditangani.
export const VOICE_EVENT = "hopeai:voice";
// Meminta asisten suara mulai mendengarkan, dari tombol mana pun di aplikasi
export const VOICE_TOGGLE_EVENT = "hopeai:voice-toggle";
export const requestVoiceInput = () => window.dispatchEvent(new Event(VOICE_TOGGLE_EVENT));

// Kata basa-basi di awal dan akhir kalimat dibuang, supaya "tolong buka flexa dong"
// diperlakukan sama dengan "buka flexa".
const LEADING_FILLER =
  /^(hai|halo|hei|oke|ok|baik|tolong|coba|ayo|mohon|silakan|bisa tolong|saya mau|aku mau|saya ingin|aku ingin|saya pengen|aku pengen|mau|ingin|hope ai|hope) /;
const TRAILING_FILLER = / (dong|ya|deh|yuk|sekarang|tolong|please)$/;

export const normalizeCommand = (transcript: string) => {
  let command = transcript
    .toLowerCase()
    .replace(/[.,!?;:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (;;) {
    const shorter = command.replace(LEADING_FILLER, "").replace(TRAILING_FILLER, "");
    if (shorter === command || !shorter) return command;
    command = shorter;
  }
};

// Mengembalikan true bila ada halaman yang menangani perintah
export const dispatchVoiceCommand = (transcript: string) => {
  const event = new CustomEvent<string>(VOICE_EVENT, {
    detail: normalizeCommand(transcript),
    cancelable: true,
  });
  return !window.dispatchEvent(event);
};

// Dipakai halaman untuk menerima perintah suara. Handler mengembalikan true
// bila perintah dikenali.
export const useVoiceCommands = (handler: (command: string) => boolean) => {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const listener = (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      if (latest.current(command)) event.preventDefault();
    };
    window.addEventListener(VOICE_EVENT, listener);
    return () => window.removeEventListener(VOICE_EVENT, listener);
  }, []);
};

type Destination = { path: string; name: string; keywords: string[] };

export const destinations: Destination[] = [
  { path: "/", name: "Beranda", keywords: ["beranda", "halaman utama", "home"] },
  { path: "/eyeread", name: "EyeRead", keywords: ["eyeread", "eye read", "airit", "pindai buku", "baca buku", "kamera"] },
  { path: "/neotutor", name: "NeoTutor", keywords: ["neotutor", "neo tutor", "tutor"] },
  { path: "/isyarat?tab=kamus", name: "Kamus Isyarat", keywords: ["kamus isyarat", "kamus"] },
  { path: "/flexa", name: "Flexa", keywords: ["flexa", "fleksa", "materi"] },
  { path: "/isyarat", name: "Isyarat", keywords: ["isyarat", "latihan isyarat"] },
  { path: "/pathly", name: "Pathly", keywords: ["pathly", "patli", "jalur belajar", "latihan", "permainan"] },
  { path: "/forum", name: "Forum", keywords: ["forum", "diskusi"] },
  { path: "/profile", name: "Profil", keywords: ["profil"] },
  { path: "/notifications", name: "Notifikasi", keywords: ["notifikasi", "pemberitahuan"] },
  { path: "/settings", name: "Pengaturan", keywords: ["pengaturan", "setelan", "setting"] },
  { path: "/guru", name: "Ruang Guru", keywords: ["ruang guru"] },
  { path: "/admin", name: "Admin", keywords: ["admin", "dasbor admin"] },
];

// Jarak sunting antara dua kata, untuk memaklumi salah dengar ("pleksa" → "fleksa")
export const editDistance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
};

const soundsLike = (heard: string, expected: string) =>
  expected.length >= 5 && editDistance(heard, expected) <= (expected.length >= 8 ? 2 : 1);

// "buka flexa", "ke forum", "pergi ke pengaturan", atau cukup "beranda"
export const findDestination = (command: string) => {
  const asksToGo =
    /^(buka|bukakan|ke|pergi ke|pindah ke|masuk ke|antar ke|antarkan ke|menuju|tampilkan|lihat|halaman|menu)\b/.test(command);
  const isShort = command.split(" ").length <= 2;
  if (!asksToGo && !isShort) return null;

  const exact = destinations.find((destination) =>
    destination.keywords.some((keyword) => command.includes(keyword))
  );
  if (exact) return exact;

  // Tidak ada yang persis: cari nama halaman yang bunyinya mirip
  const words = command.split(" ");
  return (
    destinations.find((destination) =>
      destination.keywords.some(
        (keyword) => !keyword.includes(" ") && words.some((word) => soundsLike(word, keyword))
      )
    ) ?? null
  );
};

export const destinationForPath = (path: string) =>
  destinations.find((destination) => destination.path === path) ?? null;

// Awal kalimat yang menandakan perintah untuk aplikasi, bukan isi percakapan.
// Halaman yang menerima ucapan bebas (NeoTutor) memakainya agar perintah tidak
// ikut terkirim sebagai pertanyaan.
export const isAppCommand = (command: string) =>
  /^(buka|bukakan|ke|pergi ke|pindah ke|masuk ke|antar ke|antarkan ke|menuju|tampilkan|lihat|halaman|menu|baca|bacakan|pilih|tekan|klik|pencet|aktifkan|nyalakan|matikan|kembali|balik|mundur|gulir|geser|scroll|di ?mana|ini halaman|tombol apa|ada tombol|apa saja (tombol|pilihan)|pilihan apa|menu apa|apa yang bisa|ulangi|apa tadi|katakan lagi|lebih pelan|lebih cepat|pelankan|percepat|perlambat|terlalu (cepat|pelan|lambat)|perbesar|perkecil|besarkan|kecilkan)\b/.test(
    command
  );

// --- Menekan tombol apa pun di layar dengan menyebut namanya ---

const plainLabel = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Seberapa cocok ucapan dengan nama sebuah tombol; 0 berarti tidak cocok
export const labelScore = (label: string, spoken: string) => {
  const name = plainLabel(label);
  const query = plainLabel(spoken);
  if (!name || !query) return 0;
  if (name === query) return 100;
  if (name.startsWith(query + " ")) return 80;
  if (` ${name} `.includes(` ${query} `)) return 60;

  const nameWords = name.split(" ");
  const queryWords = query.split(" ");
  if (queryWords.every((word) => nameWords.includes(word))) return 50;
  if (queryWords.every((word) => nameWords.some((other) => other === word || soundsLike(word, other)))) return 40;
  return 0;
};

const CONTROL_SELECTOR =
  'button, a[href], [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="switch"], [role="checkbox"], summary';

type Control = { element: HTMLElement; name: string };

// Tombol, tautan, dan tab yang sedang terlihat. Isi halaman didahulukan dari menu.
export const visibleControls = (): Control[] => {
  const seen = new Set<string>();
  const controls: Control[] = [];
  const roots = [document.getElementById("konten-utama"), document.body];

  for (const root of roots) {
    for (const element of Array.from(root?.querySelectorAll<HTMLElement>(CONTROL_SELECTOR) ?? [])) {
      if (element.closest("[data-voice-ignore], [aria-hidden='true']")) continue;
      if ((element as HTMLButtonElement).disabled || element.getAttribute("aria-disabled") === "true") continue;
      if (element.getClientRects().length === 0) continue;

      const name = (element.getAttribute("aria-label") || element.innerText || element.title || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!name || name.length > 80 || seen.has(name)) continue;
      seen.add(name);
      controls.push({ element, name });
    }
  }
  return controls;
};

export const findControl = (spoken: string, minimumScore: number): Control | null => {
  let best: Control | null = null;
  let bestScore = 0;
  for (const control of visibleControls()) {
    const score = labelScore(control.name, spoken);
    if (score > bestScore) {
      best = control;
      bestScore = score;
    }
  }
  return bestScore >= minimumScore ? best : null;
};

// Petunjuk singkat sesuai halaman yang sedang terbuka
export const pageHelp: Record<string, string> = {
  "/": "Ini Beranda. Katakan buka, lalu nama fitur: EyeRead, NeoTutor, Flexa, Pathly, Isyarat, atau Forum.",
  "/eyeread": "Di EyeRead, katakan mulai kamera, ambil gambar, baca hasil, atau buat kuis.",
  "/neotutor": "Di NeoTutor, langsung ucapkan pertanyaanmu. Katakan percakapan baru untuk memulai dari awal.",
  "/flexa": "Di Flexa, katakan pilih lalu nama materi atau tombol. Di dalam materi, katakan pilih sederhana, pilih ringkasan, atau baca halaman.",
  "/pathly": "Di Pathly, katakan pilih lalu nama level. Di materi, katakan mulai kuis. Saat kuis, katakan A, B, C, atau D.",
  "/forum": "Di Forum, katakan baca halaman untuk mendengar postingan, atau pilih lalu nama tombol.",
  "/isyarat": "Di halaman Isyarat, katakan nyalakan kamera, lalu pilih latihan, pilih eja ke suara, atau pilih kamus untuk melihat contoh isyarat.",
  "/settings": "Di Pengaturan, katakan pilih lalu nama pengaturan untuk mengubahnya.",
};

export const helpText =
  "Kamu bisa bilang: buka EyeRead, buka NeoTutor, buka Flexa, buka Pathly, buka Forum, atau buka Pengaturan. " +
  "Katakan baca halaman untuk mendengar isi halaman, dan berhenti untuk menghentikan suara. " +
  "Katakan di mana saya untuk tahu halaman yang terbuka, tombol apa saja untuk mendengar pilihan di layar, " +
  "lalu pilih dan nama tombolnya untuk menekannya. Katakan kembali untuk mundur. " +
  "Katakan dengar terus agar tidak perlu menekan tombol mikrofon setiap kali, dan berhenti mendengar untuk mematikannya. " +
  "Untuk bertanya ke tutor, katakan tanya, lalu pertanyaanmu. " +
  "Di EyeRead, katakan mulai kamera, lalu ambil gambar. " +
  "Saat kuis, katakan A, B, C, atau D untuk menjawab, lalu lanjut.";
