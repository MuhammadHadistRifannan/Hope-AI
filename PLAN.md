# Rencana HopeAI menuju UINIC 8.0

Batas pengumpulan: **30 Oktober 2026, 23.59 WIB** (proposal PDF, tautan repo, tautan demo).
Bobot penyisihan: Inovasi 30, Kebutuhan pengguna 20, Teknis 20, UI/UX 15, Dokumentasi 15.

Dokumen ini mencatat apa yang masih harus dikerjakan, urutannya, dan kapan sebuah butir dianggap selesai. Status diperbarui setiap kali satu butir rampung.

## Yang sudah jalan

- Situs online: frontend di Vercel, backend di VPS dengan HTTPS, deploy backend otomatis lewat GitHub Actions.
- Akun dan peran (siswa, guru, admin), profil kebutuhan saat pertama masuk, lupa password.
- EyeRead (pindai ke teks dan suara), NeoTutor (ingat percakapan per pengguna, bisa membahas satu dokumen), Flexa (materi, ringkasan, versi bahasa sederhana, kamus isyarat), Pathly (peta belajar, kuis, game), forum, notifikasi.
- Kuis adaptif dari dokumen, suara AI, asisten suara di seluruh aplikasi.
- Ruang Guru dan Dashboard Admin dengan data nyata.
- Halaman Isyarat: pelacakan tangan di browser, mode Latihan, Eja ke Suara, dan Rekam Data. **Modelnya belum dilatih.**

## Yang masih harus dikerjakan

Dikerjakan satu per satu sesuai urutan. Sebuah butir baru ditandai selesai setelah lolos pemeriksaan di kolom "Selesai bila".

| # | Butir | Kriteria yang terbantu | Selesai bila | Status |
|---|---|---|---|---|
| 1 | Profil dengan pencapaian nyata | Teknis, Kebutuhan pengguna | Angka dan lencana di Profil berasal dari database dan berubah setelah mengerjakan kuis | **Selesai**, dicek di browser |
| 2 | Tes otomatis di GitHub Actions | Teknis, Dokumentasi | Tiap push menjalankan tes frontend dan build backend; lencana status tampil di README | Dibuat; terbukti setelah push berikutnya |
| 3 | Dokumentasi API (Swagger) | Dokumentasi | Halaman dokumentasi API bisa dibuka dan memuat semua endpoint beserta syarat login | **Selesai** di lokal (`/docs`); produksi setelah push |
| 4 | Media kamus isyarat di penyimpanan sendiri | Teknis | Gambar dan video kamus dimuat dari Supabase Storage, bukan dari situs lain | Ditahan: perlu keputusan hak cipta (lihat bawah) |
| 5 | Model pengenal abjad SIBI | Inovasi | Mode Latihan mengenali huruf dari kamera; akurasi pada peraga yang tidak ikut dilatih dicatat di proposal | Menunggu data |
| 6 | Mode dengar terus untuk tunanetra | Kebutuhan pengguna, Inovasi | Setelah diaktifkan, perintah berikutnya bisa diucapkan tanpa menekan tombol, dan suara asisten sendiri tidak ikut tertangkap | Belum |
| 7 | Aksesibilitas forum dan halaman tersisa | UI/UX, Kebutuhan pengguna | Forum, Profil, Notifikasi, dan Playground bisa dipakai penuh dengan keyboard dan pembaca layar | Belum |
| 8 | Audit Lighthouse dan perbaikannya | UI/UX, Dokumentasi | Skor aksesibilitas tiap halaman utama dicatat; temuan yang bisa diperbaiki sudah diperbaiki | Belum |
| 9 | Skor game Playground tersimpan | Teknis | Skor game di halaman Playground masuk ke database dan terlihat di Profil | **Selesai**: `/playground` diarahkan ke Pathly, yang sudah menyimpan skor |
| 10 | Proposal dan bahan uji pengguna | Dokumentasi | Semua bagian bertanda `[ISI: …]` di draf proposal terisi, termasuk hasil uji pengguna | Dikerjakan tim |

## Yang bergantung pada tim, bukan pada kode

- **Data latih SIBI (butir 5).** Rekam abjad A–Z lewat tab Rekam Data di halaman Isyarat, minimal dari 3 orang, 3–5 rekaman per huruf. Berkas hasil unduhan dipakai untuk melatih model dengan `ml/sibi/train.py`. Dataset SIBI Udayana tidak dipakai karena perjanjian penggunaannya membatasi pemakaian di luar riset.
- **Hak cipta media kamus isyarat (butir 4).** Gambar dan video kamus berasal dari situs SIBI Kemendikdasmen yang berstatus "All rights reserved". Menyalinnya ke penyimpanan sendiri berarti menyebarkan ulang, jadi perlu izin atau keputusan tim. Pilihan lain: tetap menautkan ke sumber resmi dengan mencantumkan kredit, atau memakai foto buatan sendiri.
- **Uji pengguna (butir 10).** Dua anggota tim menguji aplikasi dengan penyandang disabilitas dan mengisi kuesioner SUS; hasilnya masuk proposal.
- **Pengaturan Supabase untuk lupa password.** Di Authentication → URL Configuration, Site URL diisi alamat Vercel, dan alamat Vercel serta `http://localhost:5173` didaftarkan di Redirect URLs.
- **Kuota suara AI.** Paket gratis Gemini TTS hanya 10 permintaan per hari per model. Pilihannya mengaktifkan penagihan atau merekam materi sedikit demi sedikit dengan `deploy/warm_tts.py`.

## Pemeriksaan sebelum mengumpulkan

- Alur lengkap dicoba di situs online dengan akun baru: daftar, isi profil kebutuhan, pindai, tanya materi, kuis, forum.
- Alur yang sama dicoba hanya dengan keyboard, dan hanya dengan suara.
- Dicoba di Chrome (laptop dan Android) dan Safari (iPhone).
- README, proposal, dan tautan demo menunjuk ke versi yang sama.
