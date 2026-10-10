// Kredit untuk gambar dan video isyarat yang dimuat langsung dari Kamus SIBI
// Kemendikdasmen. Media itu tidak disalin ke server Hope.Ai.
export const SIBI_SOURCE_URL = "https://pkplk.kemendikdasmen.go.id/sibi/";

export default function SignCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Gambar dan video isyarat:{" "}
      <a
        href={SIBI_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-primary"
      >
        Kamus SIBI, Kementerian Pendidikan Dasar dan Menengah RI
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
      . Hak cipta tetap milik pemiliknya; Hope.Ai hanya menautkan ke sumber resmi.
    </p>
  );
}
