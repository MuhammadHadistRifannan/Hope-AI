import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, Hand, MessageSquare, TrendingUp, Users, type LucideIcon } from "lucide-react";

export type Feature = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  // Kunci warna dan ikon di featureStyle
  art: string;
};

// Warna lembut tiap fitur, dipakai di kartu Beranda dan di kepala halaman fitur
export const featureStyle: Record<string, { icon: LucideIcon; tile: string }> = {
  eyeread: { icon: Camera, tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  neotutor: { icon: MessageSquare, tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  flexa: { icon: BookOpen, tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  pathly: { icon: TrendingUp, tile: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  isyarat: { icon: Hand, tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  echoforum: { icon: Users, tile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
};

export const features: Feature[] = [
  { key: "eyeread", name: "EyeRead", description: "Arahkan kamera ke buku atau papan tulis, lalu dengarkan isinya.", icon: Camera, href: "/eyeread", art: "eyeread" },
  { key: "neotutor", name: "NeoTutor", description: "Tutor AI yang siap menjawab pertanyaanmu kapan saja.", icon: MessageSquare, href: "/neotutor", art: "neotutor" },
  { key: "flexa", name: "Flexa", description: "Materi yang bisa dibaca, didengar, disederhanakan, dan kamus isyarat SIBI.", icon: BookOpen, href: "/flexa", art: "flexa" },
  { key: "pathly", name: "Pathly", description: "Peta belajar bertahap dengan kuis di tiap level.", icon: TrendingUp, href: "/pathly", art: "pathly" },
  { key: "forum", name: "EchoForum", description: "Tempat bertanya dan berdiskusi dengan teman belajar.", icon: Users, href: "/forum", art: "echoforum" },
  { key: "isyarat", name: "Isyarat", description: "Kamus abjad SIBI dan latihan mengeja dengan kamera.", icon: Hand, href: "/isyarat", art: "isyarat" },
];

// Kartu fitur: ikon berwarna, nama, satu kalimat penjelas, dan ajakan membuka.
export function FeatureCard({ feature }: { feature: Feature }) {
  const style = featureStyle[feature.art];
  const Icon = style?.icon ?? feature.icon;

  return (
    <Link to={feature.href} className="px-card group flex h-full flex-col gap-3 p-5">
      <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${style?.tile ?? ""}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="px-title text-lg">{feature.name}</span>
      <span className="flex-1 leading-relaxed text-muted-foreground">{feature.description}</span>
      <span className="mt-1 flex items-center gap-2 font-semibold text-primary">
        Buka {feature.name} <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

// Kartu-kartu fitur. Urutan mengikuti kebutuhan pengguna.
export default function FeatureCards({ order }: { order: string[] }) {
  const sorted = [...features].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((feature) => (
        <li key={feature.key}>
          <FeatureCard feature={feature} />
        </li>
      ))}
    </ul>
  );
}
