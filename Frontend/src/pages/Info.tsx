import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Halaman informasi yang bisa dibuka tanpa masuk: privasi, aksesibilitas, kredit,
// dan ketentuan. Isinya ditulis mengikuti apa yang benar-benar dilakukan aplikasi;
// bila perilaku aplikasi berubah, halaman ini ikut diperbarui.

export type InfoSlug = "privasi" | "aksesibilitas" | "kredit" | "ketentuan";

const UPDATED = "14 Oktober 2026";
const REPO_URL = "https://github.com/MuhammadHadistRifannan/Hope-AI";
const SIBI_URL = "https://pkplk.kemendikdasmen.go.id/sibi/";
const DATASET_URL = "https://www.kaggle.com/datasets/alvinbintang/sibi-dataset";
const BISINDO_DATASET_URL = "https://www.kaggle.com/datasets/anggiyohanespardede/bisindo-40-kata-mp4";
const WL_BISINDO_URL = "https://github.com/AceKinnn/WL-BISINDO";

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
      <span className="sr-only"> (membuka tab baru)</span>
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const contactLine = (
  <>
    Hubungi tim lewat halaman <External href={`${REPO_URL}/issues`}>Issues di GitHub Hope.Ai</External>. Jangan menuliskan
    data pribadi di sana; cukup sampaikan permintaanmu, lalu kami lanjutkan lewat jalur yang lebih tertutup.
  </>
);

const pages: Record<InfoSlug, { title: string; intro: string; body: ReactNode }> = {
  privasi: {
    title: "Kebijakan Privasi",
    intro:
      "Halaman ini menjelaskan data apa yang disimpan Hope.Ai, untuk apa, dan siapa yang bisa melihatnya. Kami menulisnya sesederhana mungkin.",
    body: (
      <>
        <Section title="Data yang kami simpan">
          <List
            items={[
              <>
                <strong>Akun:</strong> nama dan alamat email. Kata sandi dikelola layanan autentikasi dan tidak bisa kami baca.
              </>,
              <>
                <strong>Kebutuhan belajar dan pengaturan tampilan:</strong> jawabanmu saat pertama kali masuk (misalnya butuh
                teks dibacakan atau huruf lebih besar) dan pengaturan aksesibilitas. Kebutuhan belajar hanya disimpan ke akun
                bila kamu menyetujuinya; tanpa persetujuan, pengaturan hanya tersimpan di perangkatmu.
              </>,
              <>
                <strong>Kegiatan belajar:</strong> kemajuan level, hasil kuis, XP, dan lencana.
              </>,
              <>
                <strong>Percakapan dengan NeoTutor</strong> dan <strong>teks dokumen</strong> yang kamu pindai atau unggah,
                supaya bisa kamu buka lagi.
              </>,
              <>
                <strong>Forum:</strong> postingan, komentar, dan tanda suka yang kamu buat. Ini terlihat oleh pengguna lain.
              </>,
            ]}
          />
        </Section>

        <Section title="Kamera dan mikrofon">
          <List
            items={[
              <>
                <strong>Isyarat:</strong> gambar kamera diproses di dalam browsermu untuk mengenali bentuk tangan. Gambar itu
                tidak dikirim ke server dan tidak disimpan.
              </>,
              <>
                <strong>EyeRead:</strong> foto yang kamu ambil atau unggah dikirim ke server kami untuk dibaca tulisannya. Yang
                disimpan di akunmu adalah teks hasilnya.
              </>,
              <>
                <strong>Perintah suara:</strong> pengenalan suara dikerjakan oleh browsermu (layanan Google di Chrome, Apple di
                Safari). Hope.Ai hanya menerima teks hasilnya dan tidak menyimpan rekaman suara.
              </>,
            ]}
          />
          <p>Kamera dan mikrofon hanya menyala setelah kamu mengizinkannya, dan bisa dimatikan kapan saja lewat browser.</p>
        </Section>

        <Section title="Pihak lain yang ikut memproses">
          <List
            items={[
              <>
                <strong>Supabase</strong> menyimpan akun dan data belajar.
              </>,
              <>
                <strong>Google, Facebook, atau Apple</strong>, hanya bila kamu memilih masuk dengan akun itu. Hope.Ai menerima
                nama, alamat email, dan foto profil dari akun tersebut, tidak menerima password-nya, dan tidak memposting apa
                pun atas namamu.
              </>,
              <>
                <strong>Google Gemini</strong> menerima pertanyaanmu ke NeoTutor, teks materi yang dibahas, foto untuk dibaca
                EyeRead, dan teks yang diminta dibacakan, untuk menghasilkan jawaban, ringkasan, kuis, dan suara.
              </>,
              <>
                <strong>Kamus SIBI Kemendikdasmen</strong> menyediakan gambar serta video isyarat. Media itu dimuat
                langsung dari server mereka, sehingga mereka menerima alamat IP-mu.
              </>,
              <>
                <strong>Google Fonts</strong> menyediakan huruf logo Hope.Ai, sehingga Google menerima alamat IP-mu saat
                halaman dibuka.
              </>,
            ]}
          />
          <p>Hope.Ai tidak memasang iklan, tidak memakai pelacak, dan tidak menjual data.</p>
        </Section>

        <Section title="Siapa yang bisa melihat datamu">
          <List
            items={[
              "Kamu sendiri, lewat Profil dan Pengaturan.",
              "Guru, untuk melihat kemajuan belajar siswa.",
              "Admin, untuk mengelola akun dan memoderasi forum. Tindakan admin tercatat.",
              "Pengguna lain hanya melihat nama dan apa yang kamu tulis di forum.",
            ]}
          />
        </Section>

        <Section title="Hakmu">
          <p>
            Kamu bisa mengubah nama, pengaturan, dan kebutuhan belajar kapan saja. Untuk meminta salinan data atau menghapus
            akun beserta datanya, hubungi kami. {contactLine}
          </p>
        </Section>

        <Section title="Pengguna di bawah 18 tahun">
          <p>
            Hope.Ai dibuat untuk pelajar. Bila kamu belum 18 tahun, gunakan Hope.Ai dengan sepengetahuan orang tua, wali, atau
            gurumu.
          </p>
        </Section>
      </>
    ),
  },

  aksesibilitas: {
    title: "Pernyataan Aksesibilitas",
    intro:
      "Hope.Ai dibuat agar bisa dipakai dengan cara yang berbeda-beda. Halaman ini menjelaskan apa yang tersedia, apa yang sudah diuji, dan apa yang belum beres.",
    body: (
      <>
        <Section title="Yang tersedia">
          <List
            items={[
              "Teks bisa dibacakan dengan suara, dengan kecepatan dan volume yang bisa diatur.",
              "Perintah suara untuk berpindah halaman dan menekan tombol (tekan Ctrl+M, atau pakai tombol mikrofon).",
              "Ukuran teks sampai 200%, kontras tinggi, tema gelap, dan huruf ramah disleksia.",
              "Versi bahasa sederhana untuk materi dan ringkasan otomatis.",
              "Teks pendamping suara dan penanda visual sebagai pengganti bunyi.",
              "Pilihan Kurangi Gerakan, yang juga mengikuti pengaturan sistem operasimu.",
              "Seluruh halaman bisa dijalankan dengan keyboard, dengan penanda fokus yang terlihat.",
              "Kamus dan latihan abjad jari SIBI, serta 43 kata sehari-hari BISINDO dengan dua tangan.",
            ]}
          />
        </Section>

        <Section title="Yang sudah diuji">
          <List
            items={[
              "Tata letak pada lebar layar 320 sampai 1920 piksel.",
              "Navigasi keyboard dan urutan fokus di halaman utama.",
              "Kontras teks pada tombol dan kaki halaman.",
            ]}
          />
          <p>Pengujian bersama pengguna penyandang disabilitas dan dengan pembaca layar di perangkat asli masih berjalan.</p>
        </Section>

        <Section title="Keterbatasan yang kami ketahui">
          <List
            items={[
              "Perintah suara bergantung pada browser: berjalan di Chrome dan Safari, belum di Firefox.",
              "Latihan Isyarat mengenali 24 huruf abjad jari SIBI. Huruf J dan Z (yang memakai gerakan) belum dikenali, dan hasilnya bisa keliru pada pencahayaan redup.",
              "Pengenalan angka SIBI 1 sampai 9 masih tahap Beta: modelnya baru dilatih dari video satu peraga di Kamus SIBI, sehingga bisa keliru untuk gaya tangan orang lain. Angka 0, angka dua digit, dan kata bilangan baru tersedia di Kamus.",
              "Pengenal kata BISINDO mengenal 43 kata. Saat diuji pada peraga yang tidak ikut dilatih, tebakannya benar sekitar 81% (antara 52% dan 95% tergantung peraganya). Kata yang gerakannya mirip, seperti Pagi, Siang, dan Sore, atau Apa, Dimana, dan Cari, lebih sering tertukar. Sebagian besar kata berasal dari varian Banten, jadi isyarat dari daerah lain bisa tidak dikenali.",
              "Jawaban NeoTutor dibuat oleh AI dan bisa salah.",
            ]}
          />
        </Section>

        <Section title="Menemukan hambatan?">
          <p>Kabari kami, sebutkan halaman dan alat bantu yang kamu pakai. {contactLine}</p>
        </Section>
      </>
    ),
  },

  kredit: {
    title: "Kredit dan Sumber",
    intro: "Hope.Ai berdiri di atas karya banyak pihak. Berikut sumber yang kami pakai dan cara kami memakainya.",
    body: (
      <>
        <Section title="Bahasa isyarat">
          <List
            items={[
              <>
                Gambar dan video isyarat di Kamus berasal dari{" "}
                <External href={SIBI_URL}>Kamus SIBI, Kementerian Pendidikan Dasar dan Menengah RI</External>. Kami hanya
                menautkan ke sumber resminya; medianya tidak disalin ke server Hope.Ai.
              </>,
              <>
                Model pengenal abjad jari dilatih dari <External href={DATASET_URL}>SIBI Dataset karya Alvin Bintang</External>,
                dipakai dengan izin pembuatnya.
              </>,
              <>
                Model pengenal angka 1 sampai 9 dilatih dari posisi titik tangan yang dibaca dari video angka di{" "}
                <External href={SIBI_URL}>Kamus SIBI</External>. Yang disimpan hanya koordinat titik tangan, bukan videonya.
              </>,
              <>
                Video contoh dan model pengenal kata BISINDO memakai{" "}
                <External href={BISINDO_DATASET_URL}>BISINDO 40 Kata karya Anggi Yohanes Pardede</External> (lisensi MIT).
                Enam belas video contohnya disalin ke Hope.Ai.
              </>,
              <>
                Dua puluh tujuh kata BISINDO lainnya, termasuk video contohnya, berasal dari{" "}
                <External href={WL_BISINDO_URL}>WL-BISINDO</External> (varian Banten, lima peraga) dengan lisensi CC BY-NC 4.0,
                sehingga hanya dipakai untuk keperluan non-komersial. Videonya diperkecil dan suaranya dihapus. Model kata dilatih
                ulang dari kedua dataset itu.
              </>,
              <>
                Posisi tangan dideteksi dengan <strong>MediaPipe</strong> dari Google (lisensi Apache 2.0), dijalankan di
                browser.
              </>,
            ]}
          />
        </Section>

        <Section title="Kecerdasan buatan">
          <p>
            NeoTutor, ringkasan, versi bahasa sederhana, kuis otomatis, pembacaan tulisan dari foto, dan suara pembaca memakai{" "}
            <strong>Google Gemini</strong>.
          </p>
        </Section>

        <Section title="Huruf">
          <p>Logo Hope.Ai memakai huruf <strong>Cherry Bomb One</strong> (SIL Open Font License) dari Google Fonts. Teks lainnya memakai huruf bawaan perangkat.</p>
        </Section>

        <Section title="Gambar di halaman depan">
          <p>
            Animasi ilustrasi fitur dan maskot penguin di halaman depan berasal dari karya pihak lain. Daftar sumber dan
            lisensinya sedang kami lengkapi di halaman ini.
          </p>
        </Section>

        <Section title="Perangkat lunak">
          <p>
            Hope.Ai dibangun dengan React, Vite, Tailwind CSS, shadcn/ui, Framer Motion, ASP.NET Core, dan Supabase. Kode sumber
            Hope.Ai terbuka di <External href={REPO_URL}>GitHub</External>.
          </p>
        </Section>
      </>
    ),
  },

  ketentuan: {
    title: "Ketentuan Penggunaan",
    intro: "Aturan singkat supaya Hope.Ai tetap nyaman dan aman dipakai bersama.",
    body: (
      <>
        <Section title="Akunmu">
          <List
            items={[
              "Pakai data yang benar saat mendaftar dan jaga kerahasiaan kata sandimu.",
              "Satu akun untuk satu orang. Jangan memakai akun orang lain.",
            ]}
          />
        </Section>

        <Section title="Di forum">
          <List
            items={[
              "Bersikap sopan. Tidak boleh merundung, menghina, atau merendahkan siapa pun, termasuk karena disabilitasnya.",
              "Jangan membagikan data pribadi orang lain, konten tidak pantas, atau iklan.",
              "Admin boleh menghapus postingan yang melanggar dan memblokir akun yang terus melanggar.",
            ]}
          />
        </Section>

        <Section title="Tentang jawaban AI">
          <p>
            NeoTutor, ringkasan, kuis otomatis, dan pengenal isyarat dibuat dengan AI dan bisa keliru. Gunakan sebagai teman
            belajar, bukan pengganti guru, dan periksa lagi hal yang penting.
          </p>
        </Section>

        <Section title="Dokumen yang kamu unggah">
          <p>
            Dokumen tetap milikmu. Unggah hanya dokumen yang boleh kamu pakai, dan jangan mengunggah dokumen yang berisi data
            pribadi orang lain.
          </p>
        </Section>

        <Section title="Layanan">
          <p>
            Hope.Ai gratis dan dikembangkan oleh tim mahasiswa. Kami berusaha menjaganya tetap berjalan, tetapi tidak bisa
            menjamin layanan selalu tersedia. Ketentuan ini bisa berubah; tanggal di bawah judul menunjukkan pembaruan terakhir.
          </p>
        </Section>
      </>
    ),
  },
};

const nav: { slug: InfoSlug; label: string }[] = [
  { slug: "privasi", label: "Kebijakan Privasi" },
  { slug: "ketentuan", label: "Ketentuan Penggunaan" },
  { slug: "aksesibilitas", label: "Aksesibilitas" },
  { slug: "kredit", label: "Kredit dan Sumber" },
];

export default function Info({ slug }: { slug: InfoSlug }) {
  const page = pages[slug];

  useEffect(() => {
    document.title = `${page.title} - Hope.Ai`;
    window.scrollTo(0, 0);
    return () => {
      document.title = "Hope.Ai - AI untuk Pendidikan Inklusif";
    };
  }, [page.title]);

  return (
    <div className="relative min-h-screen bg-slate-50 text-foreground dark:bg-background">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:shadow-lg"
      >
        Lompat ke isi halaman
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/landing" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src="/images/logo.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-cherry text-2xl tracking-wide" translate="no">
              Hope.Ai
            </span>
          </Link>
          <Link
            to="/landing"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
          </Link>
        </div>
      </header>

      <main id="isi" className="px-4 pb-16 pt-8 md:pt-12">
        <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card px-5 py-8 text-base leading-relaxed shadow-sm md:px-12 md:py-12 md:text-lg">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-balance">{page.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">Terakhir diperbarui {UPDATED}</p>
            <p className="mt-6 text-lg leading-relaxed text-foreground/80 md:text-xl text-pretty">{page.intro}</p>
            {page.body}

            <nav aria-label="Halaman informasi" className="mt-12 border-t border-border pt-5">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {nav.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to={`/${item.slug}`}
                      aria-current={item.slug === slug ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center rounded font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        item.slug === slug ? "text-foreground" : "text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
        </article>
      </main>
    </div>
  );
}
