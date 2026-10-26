# Memasang Kuesioner UEQ ke Google Sheet

Formulir `index.html` mengirim jawaban langsung ke Google Sheet milik tim. Pemasangannya sekali saja, sekitar 10 menit, cukup dengan akun Google biasa.

Isi folder ini:

| Berkas | Gunanya |
|---|---|
| `index.html` | Formulir untuk penguji. Dibuka di Chrome atau Edge, tidak perlu server. |
| `Code.gs` | Penerima jawaban di Google Apps Script. Menulis tiap jawaban sebagai satu baris. |
| `SETUP.md` | Petunjuk ini. |

## 1. Buat Google Sheet

1. Buka [sheets.new](https://sheets.new) dan beri nama, misalnya **UEQ Hope.Ai**.
2. Biarkan kosong. Baris judul kolom dibuat otomatis saat jawaban pertama masuk.

Lembar ini berisi nama penguji, jadi jangan dibagikan untuk umum. Bagikan hanya ke anggota tim.

## 2. Tempel kode penerima

1. Di Sheet tadi, buka menu **Ekstensi → Apps Script**.
2. Hapus isi berkas `Code.gs` yang muncul, lalu tempel seluruh isi `Code.gs` dari folder ini.
3. Tekan ikon simpan (atau Ctrl+S).

## 3. Deploy sebagai Web App

1. Klik **Deploy → New deployment** (Terapkan → Deployment baru).
2. Klik ikon roda gigi di samping "Select type", pilih **Web app**.
3. Isi:
   - **Execute as:** Me (akun Anda)
   - **Who has access:** **Anyone**. Pilihan lain membuat penguji diminta login dan pengiriman gagal.
4. Klik **Deploy**, lalu **Authorize access** dan pilih akun Anda.
5. Bila muncul "Google hasn't verified this app", klik **Advanced → Go to … (unsafe)**. Ini wajar untuk skrip buatan sendiri; skrip hanya bisa menulis ke Sheet ini.
6. Salin **Web app URL**. Bentuknya `https://script.google.com/macros/s/…/exec`.
7. Cek: buka URL itu di tab baru. Bila muncul tulisan "Penerima kuesioner UEQ Hope.Ai aktif", pemasangan berhasil.

## 4. Hubungkan formulir

1. Buka `index.html` dengan Notepad (klik kanan → Open with → Notepad) atau VS Code.
2. Cari baris ini (sekitar baris 488):
   ```js
   var WEB_APP_URL = "PASTE_WEB_APP_URL_HERE";
   ```
3. Ganti `PASTE_WEB_APP_URL_HERE` dengan URL dari langkah 3. Tanda kutip tetap ada.
4. Simpan.

## 5. Uji sekali

1. Buka `index.html` di Chrome atau Edge (klik dua kali berkasnya).
2. Isi semua bagian, lalu tekan **Kirimkan Jawaban**.
3. Harus muncul kotak hijau "Terima kasih! Jawaban Anda telah tersimpan." dan formulir kosong kembali.
4. Di Sheet, baris judul dan satu baris jawaban muncul. Hapus baris jawaban uji ini sebelum uji sungguhan (baris judul jangan dihapus).

Bila muncul kotak merah:

| Pesan | Penyebab |
|---|---|
| "Formulir belum terhubung ke Google Sheet" | URL belum ditempel di langkah 4, atau salah salin. |
| "Alamat penyimpanan tidak menjawab dengan benar" | Who has access bukan **Anyone**, atau URL bukan yang berakhiran `/exec`. |
| "Tidak bisa terhubung ke Google" | Tidak ada internet, atau URL salah ketik. |

## Sudah terpasang

- Web App: `https://script.google.com/macros/s/AKfycbzdMG47ZYTNSB4NsE21YwTWdsXH9TmvCpwvvUTx0uRugANns5bxnZS41w4szodRoKVp/exec`
- Formulir online: <https://hope-ai-nu.vercel.app/ueq.html> (salinan `index.html` di `Frontend/public/ueq.html`; bila `index.html` diubah, salin ulang ke sana)
- Kiriman pertama setelah lama tidak dipakai bisa makan ±10 detik karena Apps Script baru dinyalakan; berikutnya lebih cepat.

## 6. Membagikan ke penguji

- **Di laptop tim (paling mudah):** buka `index.html` di laptop yang dipakai untuk sesi uji. Setelah satu orang mengirim, formulir kosong lagi untuk orang berikutnya.
- **Di HP penguji:** berkas HTML lokal sulit dibuka di HP. Unggah `index.html` ke tempat yang bisa dibuka lewat tautan, misalnya salin ke `Frontend/public/ueq.html` supaya ikut ter-deploy di Vercel (alamatnya menjadi `…/ueq.html`).

Formulir bisa dipakai dengan pembaca layar dan keyboard: tiap pasang kata dibacakan sebagai "3 dari 26: kreatif atau monoton", tiap lingkaran sebagai "sangat kreatif", "kreatif", "agak kreatif", "netral", dan seterusnya; panah kiri-kanan memindah pilihan.

## 7. Bila mengubah Code.gs

Apps Script tidak otomatis memakai kode yang baru disimpan. Setelah mengubah `Code.gs`: **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. URL tetap sama, jadi `index.html` tidak perlu diubah.

## 8. Mengolah hasil

Kuesioner ini adalah **UEQ standar versi Indonesia: 26 pasang kata, 6 skala**. Hasilnya bisa diolah dengan alat resmi dan dibandingkan dengan benchmark UEQ.

1. Unduh **UEQ Data Analysis Tool** (berkas Excel) dari [ueq-online.org](https://www.ueq-online.org/).
2. Salin kolom **UEQ1 sampai UEQ26** dari Sheet (tanpa baris judul) ke lembar **Data** di alat itu.
3. Alat itu menghitung nilai tiap skala (-3 sampai +3), konsistensi jawaban, dan perbandingan dengan benchmark. Jangan membalik nilai sendiri; pasangan kata yang posisinya terbalik sudah diperhitungkan alat itu.

| Skala | Nomor pasangan kata |
|---|---|
| Daya tarik (Attractiveness) | 1, 12, 14, 16, 24, 25 |
| Kejelasan (Perspicuity) | 2, 4, 13, 21 |
| Efisiensi (Efficiency) | 9, 20, 22, 23 |
| Ketepatan (Dependability) | 8, 11, 17, 19 |
| Stimulasi (Stimulation) | 5, 6, 7, 18 |
| Kebaruan (Novelty) | 3, 10, 15, 26 |

**Cek sebelum dipakai:** di situs yang sama tersedia berkas kuesioner versi Indonesia (Indonesian). Cocokkan 26 pasangan kata di `index.html` (daftar `ITEMS`) dengan berkas itu, supaya kata-katanya persis sama dengan versi yang sudah divalidasi.

### Mengapa 26, bukan 36 pertanyaan

PRD awal menyebut 36 pertanyaan dengan skala "Value". UEQ yang baku tidak punya skala Value dan berisi 26 pasang kata, termasuk skala Efisiensi. Versi baku dipakai supaya hasilnya bisa diolah dengan alat resmi, dibandingkan dengan benchmark, dan dikutip di proposal sebagai UEQ.
