# Rencana HopeAI menuju UINIC 8.0

| Tanggal | Batas |
|---|---|
| **21 Oktober 2026** | Batas penambahan fitur. Setelahnya hanya perbaikan bug, pengujian, dan dokumentasi |
| **30 Oktober 2026, 23.59 WIB** | Pengumpulan proposal PDF, tautan repo, dan tautan demo |

Bobot penyisihan: Inovasi 30, Kebutuhan pengguna 20, Teknis 20, UI/UX 15, Dokumentasi 15. Target: 5 besar.

Prinsip dari sesi review 8 Oktober: **perdalam fitur yang sudah ada sampai matang, selesaikan satu per satu.** Yang tidak sempat dikerjakan masuk bagian roadmap di proposal, bukan dikerjakan setengah jadi.

Sebuah butir baru ditandai selesai setelah lolos pemeriksaan di kolom "Selesai bila".

## Sudah selesai sebelum review

- Situs online (Vercel dan VPS dengan HTTPS), deploy backend otomatis, tes otomatis tiap push, dokumentasi API di `/docs`.
- Akun dan peran (siswa, guru, admin), lupa password, profil kebutuhan saat pertama masuk.
- EyeRead, NeoTutor (ingatan per pengguna, bisa membahas satu dokumen), Flexa (materi, ringkasan, versi bahasa sederhana, kamus isyarat dengan kredit sumber), Pathly (peta belajar, kuis, game), forum, notifikasi.
- Kuis adaptif dari dokumen, suara AI, asisten suara di seluruh aplikasi.
- Ruang Guru dan Dashboard Admin (blokir akun, moderasi, grafik tren).
- Profil dengan statistik dan lencana dari data nyata.
- Halaman Isyarat: pelacakan tangan di browser, mode Latihan, Eja ke Suara, dan Rekam Data.

## Tahap A: bug UI dari review (dikerjakan pertama)

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| A1 | Sidebar berhenti setinggi hero, menyisakan kolom putih sampai footer | Sidebar setinggi layar dan tetap di tempat saat digulir, di semua halaman | Tidak terulang di Chrome 1568 px (sidebar sudah `fixed` setinggi layar); butuh tangkapan layar dan ukuran layar dari peninjau |
| A2 | Judul kartu NeoTutor dan EchoForum tertimpa dekorasi riak | Dekorasi berada di bawah teks dan tidak menutupi judul | **Selesai**, dicek di browser |
| A3 | Tautan "VIEW MORE" dengan panah bawah | Menjadi "Buka [Fitur] →", seluruh kartu bisa diklik, tidak huruf kapital semua | **Selesai**, dicek di browser |
| A4 | Kontras di bawah WCAG AA: teks di bagian bawah sidebar, paragraf hero, teks oranye kartu Pathly, teks pink kartu EchoForum, teks abu-abu footer | Semua pasangan warna teks dan latar mencapai rasio minimal 4,5:1 (3:1 untuk teks besar) | **Selesai** untuk yang disebut review (dihitung: kartu ≥5:1, sidebar ≥7:1, footer ≥6,9:1); audit menyeluruh di pemeriksaan akhir |
| A5 | Tombol mikrofon tanpa label | Semua tombol mikrofon punya `aria-label` dan tooltip | **Selesai**: label sudah ada di keempat tombol, tooltip dilengkapi |
| A6 | Inkonsistensi teks: "Hope.Ai" dan "AI", tagline dobel, campur bahasa Inggris, angka "10,000+" yang belum nyata, "Hope.Ai Inc." dengan email `.edu`, ikon Twitter lama | Nama ditulis seragam "Hope.Ai", semua teks berbahasa Indonesia, tidak ada angka atau badan usaha yang tidak nyata, ikon media sosial terkini | **Selesai**: angka 10.000+, "Inc.", email `.edu`, ikon media sosial tanpa akun, dan tautan kosong dihapus; klaim fitur yang tidak ada di landing page diganti |

## Tahap B: fitur wajib sampai 21 Oktober

### B1. Onboarding dan dashboard per profil

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| B1.1 | Pertanyaan onboarding berbasis kebutuhan, bukan label disabilitas | Pilihan berbunyi seperti "lebih mudah mendengar daripada melihat layar", "berkomunikasi dengan bahasa isyarat", "kesulitan membaca teks padat", "lebih nyaman mengetik daripada berbicara"; boleh memilih lebih dari satu; bisa diubah di Pengaturan | **Selesai**: 7 pertanyaan kebutuhan, termasuk "lebih nyaman mengetik"; bisa diubah dan diulang dari Pengaturan |
| B1.2 | Onboarding bisa diselesaikan tanpa melihat layar | Layar pertama langsung berbicara; bisa dilanjutkan dengan Spasi atau suara | **Selesai**: tiap langkah dibacakan; dijawab dengan Y/T, tombol, atau suara ("ya", "tidak", "ulangi"). Dicek di Chrome hanya dengan keyboard |
| B1.3 | Persetujuan penyimpanan data kebutuhan (UU PDP 27/2022) | Ada persetujuan eksplisit sebelum data kebutuhan disimpan; tertulis siapa yang bisa melihatnya | **Selesai**: tanpa persetujuan, kebutuhan hanya di perangkat; teks menyebut siapa yang bisa melihat dan bahwa suara diproses Google atau Apple |
| B1.4 | Beranda setelah login menjadi dashboard | Urutan: sapaan "Halo, [Nama]" dan bar aksesibilitas cepat → "Lanjutkan Belajar" → kartu fitur (termasuk Isyarat) → ringkasan mingguan Pathly → aktivitas EchoForum | **Selesai**, dicek di browser dengan data nyata |
| B1.5 | Varian dashboard per kebutuhan | Tunanetra: linier, heading semantik, mikrofon paling menonjol. Tunarungu: Isyarat di atas, notifikasi visual. Disleksia: font disleksia, baris 60–70 karakter, tanpa kapital semua atau miring. Tunawicara: mikrofon disembunyikan, input teks dan pilihan cepat | **Selesai**: tata letak satu kolom dan tombol perintah suara besar (fokus pertama) untuk tunanetra dan Mode Pembaca Layar; Isyarat di urutan pertama untuk tunarungu; teks dibatasi `max-w-prose` untuk disleksia; semua tombol mikrofon disembunyikan untuk "lebih nyaman mengetik" |
| B1.6 | Landing page publik memuat hero, kutipan, dan footer lengkap | Kutipan "Setiap Keterbatasan Adalah Peluang Baru" diganti dengan pesan bahwa hambatan ada di sistem dan aplikasilah yang menyesuaikan diri | **Selesai**: hero, kutipan baru, dan footer ada di landing page; Beranda lama dihapus |
| B1.7 | Sidebar dan dashboard berbeda per peran | Siswa tidak melihat menu guru atau admin; guru melihat "Siswa yang perlu perhatian" paling atas di Ruang Guru | **Selesai**: menu guru dan admin sudah hanya tampil sesuai peran; Ruang Guru menampilkan siswa dengan nilai di bawah 60%, belum pernah kuis, atau tidak aktif 7 hari |
| B1.8 | Isyarat dan Kamus Isyarat dibedakan dengan jelas | Nama dan deskripsi menjelaskan bahwa Isyarat untuk berlatih dengan kamera, Kamus untuk melihat contoh | **Selesai**: kamus pindah menjadi tab di Isyarat, dengan tombol "Latih Huruf Ini"; kartu di Flexa menjadi pintasan |

### B2. Navigasi suara versi matang

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| B2.1 | Pilihan "Saya sudah memakai pembaca layar" | Saat aktif, suara internal mati dan umpan balik hanya lewat `aria-live`, sehingga tidak bertumpuk dengan VoiceOver, TalkBack, atau NVDA | **Selesai**: tanggapan asisten suara tidak disuarakan dan dikirim lewat `aria-live` |
| B2.2 | Pintasan keyboard mikrofon | Ctrl+M (selain Alt+M) memulai perintah suara; untuk profil tunanetra, mikrofon menjadi elemen fokus pertama | **Selesai** di kode: Ctrl+M dan Alt+M; tombol perintah suara besar mendapat fokus pertama di Beranda untuk profil tunanetra. Perlu dicoba dengan mikrofon sungguhan |
| B2.3 | Mode dengar terus | Setelah diaktifkan, perintah berikutnya bisa diucapkan tanpa menekan tombol, dan suara asisten sendiri tidak ikut tertangkap | **Terpasang**: ucapkan "dengar terus" untuk menyalakan dan "berhenti mendengar" untuk mematikan; mikrofon baru menyala lagi setelah asisten selesai bicara, dan ucapan yang sama dengan kalimat asisten diabaikan. Perlu diuji di perangkat nyata |
| B2.4 | Cadangan bila browser tidak mendukung pengenalan suara | Tombol mikrofon menjelaskan alasannya dan menawarkan kotak perintah ketik | **Selesai**; pengguna "lebih nyaman mengetik" mendapat tombol perintah ketik sebagai ganti mikrofon |
| B2.5 | Diuji di Safari iPhone dan iPad | Perintah utama berjalan di kedua perangkat | Dikerjakan tim (butuh perangkat) |

Sudah ada dan tetap dipertahankan: perintah "bantuan" sesuai halaman, saran saat perintah tidak dikenali, menekan tombol dengan menyebut namanya.

### B3. Bar aksesibilitas cepat dan pengaturan

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| B3.1 | Bar aksesibilitas cepat di dashboard | A−/A+, Kontras, Font Disleksia, dan Suara bisa diubah tanpa membuka Pengaturan, dan tersimpan ke akun | **Selesai** |
| B3.2 | Mengikuti pengaturan sistem operasi | `prefers-reduced-motion`, `prefers-contrast`, dan `prefers-color-scheme` dipakai sebagai nilai awal | **Selesai**: Kurangi Gerakan dan Tema punya pilihan "Ikuti perangkat"; kontras tinggi menyala otomatis bila sistem memintanya. Tema bawaan tetap Terang sampai tampilan gelap diperiksa |
| B3.3 | Ukuran teks satu slider | "Mode Teks Besar" dan slider lama digabung menjadi satu slider 100–200% dengan pratinjau | **Selesai** |
| B3.4 | "Dukungan Pembaca Layar" diganti "Mode Pembaca Layar" | Label ARIA selalu aktif; mode ini mengurangi dekorasi dan animasi serta menyederhanakan tata letak | **Selesai**, digabung dengan B2.1 menjadi satu sakelar "Saya memakai pembaca layar" |
| B3.5 | Pengaturan baru | Kurangi Gerakan, Caption, Notifikasi Visual, Kecepatan Suara | **Selesai**: caption menampilkan semua ucapan aplikasi; notifikasi visual mengganti bunyi benar/salah dengan kedipan layar |

## Tahap C: fitur tambahan bila waktu cukup (sebelum 21 Oktober)

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| C1 | Checklist aksesibilitas saat guru mengunggah materi | Materi tidak bisa diterbitkan sebelum gambar punya teks alternatif dan video punya caption | **Selesai**, disesuaikan: materi guru berupa teks, jadi checklist memeriksa judul, panjang paragraf dan kalimat, huruf kapital semua, dan rujukan ke gambar/tabel/video. Terbit hanya setelah guru mengonfirmasi rujukan visual sudah dijelaskan dengan kata-kata dan informasi tidak hanya lewat warna |
| C2 | Isyarat: model SIBI terpasang, mode eja kata, tampilan keyakinan | Lihat bagian Isyarat di bawah | **Terpasang**, menunggu uji dengan tangan sungguhan |
| C3 | EyeRead: sorot kata saat dibacakan | Kata yang sedang diucapkan tersorot dan ikut bergulir | **Terpasang** di tab Teks dan Audio EyeRead. Dengan suara AI posisinya diperkirakan dari waktu audio; dengan suara perangkat dipakai posisi kata asli bila browser mengirimnya. Perlu dicoba dengan hasil pindai sungguhan |
| C4 | Audit log admin | Setiap blokir, buka blokir, angkat atau cabut guru, dan hapus konten tercatat dengan pelaku dan waktunya; aksi ini selalu meminta konfirmasi | **Selesai**: dicatat oleh trigger database (tidak bisa diubah dari aplikasi), tab Log Aktivitas di Dashboard Admin, dan dialog konfirmasi untuk angkat/cabut guru, blokir/buka blokir, dan hapus konten |

## Landing page parallax (tambahan 10 Oktober)

| Butir | Selesai bila | Status |
|---|---|---|
| Landing page parallax bergaya endless runner | Latar dari delapan adegan summer menempel di layar dan bergeser ke samping saat digulir; logo dan tombol Masuk (biru) dan Daftar (hijau) bergaya pixel art menempel di atas; tiap menu hanya berisi nama, satu kalimat, dan tombol coba; ilustrasi tiap menu digambar dengan kode (`LandingArt.tsx`), bukan GIF; penutup berupa satu ajakan besar "Daftar Gratis"; teks tanpa kotak dengan huruf Press Start 2P. Bilah kemajuan, tombol ganti huruf, dan tombol hentikan animasi dihapus; animasi tetap berhenti otomatis bila Kurangi Gerakan aktif. Revisi dari review desain: semua tombol memakai satu komponen pixel (hijau = tindakan utama, biru = sekunder), tombol "Coba" membuka fiturnya langsung (yang belum masuk mendaftar dulu lalu diteruskan lewat `?next=`), ilustrasi punya teks alternatif, link kaki halaman diperbesar. Isi tiap menu ditahan di layar dan meluncur masuk/keluar dari samping (bukan naik dari bawah); tombol "Jelajahi fitur" dan link kaki halaman menggulir beranimasi. Revisi 11 Okt: maskot penguin buatan kode dan judul beranimasi ombak per huruf di pembuka; tiap menu berisi kalimat pemikat + satu kalimat deskripsi sesuai fitur nyata; tata letak menu khusus ponsel (isi muat satu layar); kaki halaman berupa pita gelap dengan kelompok Fitur/Proyek dan ikon pixel. Halaman informasi publik `/privasi`, `/ketentuan`, `/aksesibilitas`, `/kredit` (`Info.tsx`) ditautkan dari kaki halaman dan formulir daftar; isinya perlu dibaca tim/dosen sebelum dikumpulkan, dan alamat kontak tim belum ada. Revisi 12 Okt: maskot melompat dari huruf ke huruf di judul, pesawat pixel melintas mendekat di langit pembuka, halaman berhenti otomatis di bagian terdekat, dan bagian Hope Arcade dengan permainan Hope Run (`HopeRun.tsx`, aturan di `lib/hopeRun.ts` dengan 8 tes). Tambahan 12 Okt: layar pembuka pixel (penguin detektif, teks diketik, memudar ke halaman), balon kata maskot, dua pesawat, pengaturan aksesibilitas Hope Run (Mode Bantuan, pilihan tombol, ukuran tombol, suara), dan "Tanya Hope" (tanya-jawab siap pakai, bukan AI; `HelpChat.tsx`, `lib/helpChat.ts`). Halaman Masuk, Daftar, Lupa dan Atur Ulang Password memakai gaya landing (`AuthShell.tsx`: latar pixel, maskot pixel, lembar navy, tombol pixel). Kerangka aplikasi (sidebar, navigasi bawah, tombol suara, kaki halaman) dan Beranda memakai gaya pixel berbasis warna tema (`px-card`, `px-title`, `px-nav-item`); menu lain menyusul satu per satu | **Selesai**, dicek lewat tangkapan layar otomatis di ukuran desktop dan ponsel; kehalusan gerakan perlu dicek langsung. Aset latar di `Frontend/public/parallax`; hanya landing page yang berubah |

## Isyarat (SIBI untuk abjad, BISINDO untuk kata)

Cakupan: dua fitur dengan model terpisah.
- **SIBI, abjad jari dan angka, satu tangan.** Sudah terpasang. J dan Z (isyarat bergerak) dikecualikan dulu.
- **BISINDO, 16 kata dasar, dua tangan.** Terpasang (C2.4 sampai C2.8).

Di aplikasi, SIBI dan BISINDO selalu diberi label masing-masing supaya pengguna tidak mengira keduanya satu sistem. Video kamera tidak pernah keluar dari perangkat.

Kondisi sekarang:
- Model sudah dilatih di Colab (`models/sibi-abjad.json`, salinannya di `Frontend/public/models/`): 24 huruf tanpa J dan Z, belum termasuk angka.
- Halaman Isyarat memakai normalisasi yang identik dengan notebook (`src/lib/sign/landmarks.ts`), dan tes otomatis menjalankan model pada landmark data latih untuk memastikannya.
- Akurasi yang dihasilkan notebook memakai pembagian acak, jadi terlalu optimistis. Angka untuk proposal harus dari pengujian pada orang yang tidak ikut dilatih.

| # | Butir | Selesai bila | Status |
|---|---|---|---|
| C2.1 | Halaman Isyarat memakai model dan normalisasi dari notebook | Huruf dikenali dari kamera; di bawah ambang 0,7 tampil "Belum yakin"; persentase keyakinan selalu tampil | **Terpasang**: hasil di browser sama dengan notebook (tes otomatis pada data latih); uji dengan tangan sungguhan oleh tim |
| C2.2 | Mode eja kata | Mode Latihan: kata acak, tiap huruf benar diucapkan, kata lengkap diucapkan dengan pujian lalu lanjut ke kata berikutnya. Mode Eja ke Suara tetap ada | **Terpasang**, sama seperti di atas |
| C2.3 | Rekaman sendiri 3–5 orang | Dilatih ulang dengan data gabungan; akurasi pada orang yang tidak ikut dilatih dicatat | Dikerjakan tim |
| C2.4 | Pelacakan dua tangan untuk BISINDO | Mode BISINDO melacak kedua tangan dan titik tubuh (bahu sebagai acuan posisi); mode SIBI tetap satu tangan dan hasilnya tidak berubah | **Selesai**: tombol SIBI/BISINDO di halaman Isyarat (`?bahasa=bisindo`), titik tubuh dari `pose_landmarker_lite`; tes SIBI tetap lulus dan mode SIBI dicek di browser |
| C2.5 | Model kata BISINDO | Kata ditebak dari satu isyarat utuh (tangan terlihat sampai diturunkan), di browser; di bawah ambang 0,6 tampil "Belum yakin"; tes otomatis memastikan hasil browser sama dengan Python | **Terpasang**: `models/bisindo-kata.json`, Conv1D di atas 30 frame. Tes membandingkan pemotongan, fitur, dan peluang dengan Python. Dicek di Chrome dengan kamera palsu berisi video uji: 18 dari 18 isyarat benar (keyakinan 73–94%). Belum diuji dengan orang sungguhan |
| C2.6 | Latihan dan Isyarat ke Suara BISINDO | Latihan: kata acak dengan video contoh, kata benar diucapkan dengan pujian lalu lanjut, kata salah diberi petunjuk. Isyarat ke Suara: kata yang terbaca menyusun kalimat yang bisa diucapkan | **Selesai**, dicek di browser |
| C2.7 | Kamus BISINDO | Tiap kata punya video contoh, arti, ringkasan gerakan, tombol "Latih Kata Ini", dan kredit sumber; ada frasa perkenalan yang disusun dari kata-kata itu | **Selesai**: 16 video di `Frontend/public/sign/bisindo/` (dengan `LICENSE.txt`), kredit juga di `/kredit`. Ringkasan gerakan ditulis dari video; sebaiknya dicek penutur BISINDO |
| C2.8 | Rekam Data BISINDO | Guru/admin bisa merekam contoh kata (termasuk kata baru seperti Nama, Umur, Hobi) dan mengunduh JSON yang langsung dibaca `train.py` | **Terpasang**; alur unduh → latih ulang belum dicoba dengan rekaman sungguhan |

### Data kata BISINDO

Dataset gambar BISINDO yang terbuka umumnya hanya alfabet. Untuk kata sehari-hari datanya berupa video, dan tidak cukup diekstrak jadi gambar: hampir semua isyarat kata berupa gerakan dan banyak yang memakai dua tangan, jadi model membaca urutan frame.

**Dipakai: BISINDO 40 Kata** (Kaggle `anggiyohanespardede/bisindo-40-kata-mp4`, lisensi MIT; 40 kata × 50 video, 400×300, ±30 fps). Dari daftar perkenalan yang diminta (halo, nama saya, apa kabar, kabar baik, saya berasal dari, umur saya, hobi saya), 16 kata yang dipakai: Halo, Selamat Pagi, Saya, Kamu, Siapa, Apa Kabar, Baik, Senang, Terima Kasih, Dimana, Berapa, Membaca, Menulis, Makan, Minum, Tidur. Kata **Nama, Umur, Hobi, dan Berasal tidak ada di dataset terbuka mana pun yang kami temukan**; di Kamus diganti padanan terdekat ("Kamu siapa?", "Kamu di mana?", "Kamu berapa?", "Saya senang membaca") dan bisa direkam sendiri lewat Rekam Data (C2.8).

**Hasil pelatihan:** akurasi 100% (128/128 video uji), juga 100% saat kamera disimulasikan 15 fps dan saat gerakan dicerminkan (peraga kidal). **Angka ini terlalu optimistis untuk proposal:** hampir semua video diperagakan satu orang, jadi peraga di data uji juga ada di data latih. Angka yang layak dikutip harus dari orang lain, dan dicoba oleh pengguna Tuli sebelum diklaim.

**Alur latih ulang** (`ml/bisindo/`, Python 3 dengan `mediapipe`, `torch`, `opencv-python`; berjalan di CPU sekitar 2 menit):
1. Video per kata di satu folder per kata → `extract.py` mengambil titik tangan dan tubuh (model `.task` sama dengan browser) ke `.pkl`.
2. `train.py <.pkl ...> [rekaman .json ...] --out <folder>` menghasilkan `bisindo-kata.json` dan `bisindo-kata.samples.json`.
3. Salin `bisindo-kata.json` ke `models/` dan `Frontend/public/models/`, `bisindo-kata.samples.json` ke `models/`, lalu jalankan `npm test`. Kata baru juga perlu ditambahkan ke `src/lib/sign/bisindoWords.ts` beserta videonya.

**Alternatif lain yang dicek:** WL-BISINDO (32 kata, 5 orang, varian Banten, CC BY-NC 4.0) lebih baik untuk uji pada orang yang tidak ikut dilatih, dan punya Teman, Keluarga, Tuli, Maaf, Pagi/Siang/Sore/Malam. Talkee (CC0) punya Nama, Perkenalkan, dan Bertemu, tapi hanya berupa titik MediaPipe dengan format lain, jadi perlu dicek dulu sebelum dipakai.

## Keamanan dan peran

| Butir | Status |
|---|---|
| Password di-hash | Sudah, ditangani Supabase Auth |
| `.env` tidak masuk repo, ada `.env.example` | Sudah (`Frontend/.env.example`, `deploy/.env.example`, `BE/appsettings.example.json`) |
| Batas percobaan login | Sudah dari Supabase Auth; perlu dicek nilainya di dashboard |
| Batas pemakaian API | Sudah, 30 permintaan per menit per pengguna |
| Guru hanya melihat data siswanya | Belum: saat ini guru melihat semua siswa. Perlu relasi kelas atau guru-siswa |
| Data kebutuhan dienkripsi | Belum diputuskan: Supabase mengenkripsi disk; enkripsi per kolom perlu dibahas |

## Yang bergantung pada tim, bukan pada kode

- **Data latih SIBI.** Pembuat dataset Kaggle `alvinbintang/sibi-dataset` sudah memberi izin pemakaian; simpan bukti izinnya dan sebut sumbernya di proposal. Model dilatih dengan `ml/sibi/sibi_training.ipynb`; rekaman tambahan dibuat lewat tab Rekam Data (berkas CSV langsung dibaca notebook).
- **Rekaman sendiri** abjad SIBI dari 3–5 orang.
- **Uji kata BISINDO dengan orang sungguhan**: minimal 3 orang yang tidak ada di video latih, sebaiknya termasuk pengguna Tuli, memperagakan ke-16 kata; catat berapa yang benar. Bila akurasinya rendah, rekam mereka lewat Rekam Data BISINDO lalu latih ulang. Kata Nama, Umur, Hobi, dan Berasal juga bisa direkam dengan cara ini.
- **Uji pengguna** dengan penyandang disabilitas dan kuesioner SUS; hasilnya masuk proposal.
- **Pengaturan Supabase untuk lupa password**: Site URL diisi alamat Vercel; alamat Vercel dan `http://localhost:5173` didaftarkan di Redirect URLs.
- **Kuota suara AI**: paket gratis Gemini TTS hanya 10 permintaan per hari per model.

## Pemeriksaan sebelum mengumpulkan

- Alur lengkap dicoba di situs online dengan akun baru: daftar, onboarding, pindai, tanya materi, kuis, forum.
- Alur yang sama dicoba hanya dengan keyboard, hanya dengan suara, dan dengan pembaca layar.
- Dicoba di Chrome (laptop dan Android) dan Safari (iPhone dan iPad).
- Audit Lighthouse untuk halaman utama; skornya dicatat di proposal.
- README, proposal, dan tautan demo menunjuk ke versi yang sama.
