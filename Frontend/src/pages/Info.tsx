import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Halaman informasi yang bisa dibuka tanpa masuk: privasi, aksesibilitas, kredit,
// dan ketentuan. Isinya ditulis mengikuti apa yang benar-benar dilakukan aplikasi;
// bila perilaku aplikasi berubah, halaman ini ikut diperbarui.

export type InfoSlug = "privasi" | "aksesibilitas" | "kredit" | "ketentuan";

const UPDATED = "11 Oktober 2026";
const REPO_URL = "https://github.com/MuhammadHadistRifannan/Hope-AI";
const SIBI_URL = "https://pkplk.kemendikdasmen.go.id/sibi/";
const DATASET_URL = "https://www.kaggle.com/datasets/alvinbintang/sibi-dataset";

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline underline-offset-4 hover:text-amber-200 rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300">
      {children}
      <span className="sr-only"> (membuka tab baru)</span>
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-pixel text-sm md:text-base leading-[1.7] text-amber-300">{title}</h2>
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

// Latar tiap halaman diambil dari adegan landing page, supaya tampilannya senada
const scenes: Record<InfoSlug, { folder: string; layers: number }> = {
  privasi: { folder: "s6", layers: 5 },
  ketentuan: { folder: "s4", layers: 3 },
  aksesibilitas: { folder: "s5", layers: 4 },
  kredit: { folder: "s1", layers: 4 },
};

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
                <strong>Google Gemini</strong> menerima pertanyaanmu ke NeoTutor, teks materi yang dibahas, foto untuk dibaca
                EyeRead, dan teks yang diminta dibacakan, untuk menghasilkan jawaban, ringkasan, kuis, dan suara.
              </>,
              <>
                <strong>Google Fonts</strong> menyediakan huruf, dan <strong>Kamus SIBI Kemendikdasmen</strong> menyediakan
                gambar serta video isyarat. Keduanya dimuat langsung dari server mereka, sehingga mereka menerima alamat IP-mu.
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
              "Kamus dan latihan abjad jari SIBI.",
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
              "Latihan Isyarat mengenali 24 huruf abjad jari SIBI. Huruf J dan Z (yang memakai gerakan), angka, dan kata belum dikenali, dan hasilnya bisa keliru pada pencahayaan redup.",
              "Halaman depan selalu memakai huruf pixel, walaupun huruf ramah disleksia diaktifkan. Pengaturan itu berlaku di semua halaman setelah masuk.",
              "Teks di halaman depan berada di atas gambar; keterbacaannya dijaga dengan garis tepi gelap pada huruf.",
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
          <List
            items={[
              "Press Start 2P karya CodeMan38 dan Pixelify Sans karya Stefie Justprince, untuk halaman depan.",
              "Cherry Bomb One, untuk judul di dalam aplikasi.",
            ]}
          />
          <p>Ketiganya berlisensi SIL Open Font License dan dimuat lewat Google Fonts.</p>
        </Section>

        <Section title="Gambar di halaman depan">
          <p>
            Ilustrasi tiap fitur, ikon di kaki halaman, tombol, dan animasi maskot di halaman depan digambar dengan kode khusus
            untuk Hope.Ai.
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

  const scene = scenes[slug];
  const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300";

  return (
    <div className="relative min-h-screen bg-[#7cc4e8]">
      {/* Pemandangan pixel yang sama dengan landing page, diam di belakang isi */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
        {Array.from({ length: scene.layers }, (_, i) => (
          <img
            key={i}
            src={`/parallax/${scene.folder}/${i + 1}.png`}
            alt=""
            width={576}
            height={324}
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ))}
      </div>

      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:shadow-lg"
      >
        Lompat ke isi halaman
      </a>

      <div className="relative">
        <header className="flex items-center justify-between gap-2 p-3 md:p-5">
          <Link to="/landing" className={`flex shrink-0 items-center gap-2 md:gap-3 rounded-2xl font-pixel ${focusRing}`}>
            <img src="/images/logo.png" alt="" width={72} height={72} className="w-11 h-11 md:w-[72px] md:h-[72px] object-contain drop-shadow-[3px_4px_0_rgba(10,26,79,0.6)]" />
            <span className="pixel-text-lg hidden min-[440px]:inline text-xs sm:text-lg md:text-2xl" translate="no">
              Hope.Ai
            </span>
          </Link>
          <Link to="/landing" className="pixel-button pixel-button-blue pixel-text font-pixel gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
          </Link>
        </header>

        {/* Lembar gelap bergaya pixel: teks panjang tetap terbaca di atas pemandangan */}
        <main id="isi" className="px-3 pb-12 pt-4 md:px-5 md:pt-8">
          <div className="pixel-sheet pixel-body-plain mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12 text-base md:text-lg leading-relaxed text-white">
            <h1 className="font-pixel text-[clamp(1.15rem,4.6vw,2rem)] leading-[1.4] text-balance">{page.title}</h1>
            <p className="mt-3 text-sm md:text-base text-amber-300">Terakhir diperbarui {UPDATED}</p>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-pretty">{page.intro}</p>
            {page.body}

            <nav aria-label="Halaman informasi" className="mt-12 border-t-4 border-dotted border-white/25 pt-5">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {nav.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to={`/${item.slug}`}
                      aria-current={item.slug === slug ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center rounded underline-offset-4 hover:underline ${focusRing} ${
                        item.slug === slug ? "text-amber-300" : "text-white underline"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
