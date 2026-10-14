import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, Hand, MessageSquare, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { landingArt } from "@/components/LandingArt";
import { useSettings } from "@/context/SettingsContext";

export type Feature = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  // Ilustrasi pixel yang sama dengan landing page
  art: string;
};

export const features: Feature[] = [
  { key: "eyeread", name: "EyeRead", description: "Arahkan kamera ke buku atau papan tulis, lalu dengarkan isinya.", icon: Camera, href: "/eyeread", art: "eyeread" },
  { key: "neotutor", name: "NeoTutor", description: "Tutor AI yang siap menjawab pertanyaanmu kapan saja.", icon: MessageSquare, href: "/neotutor", art: "neotutor" },
  { key: "flexa", name: "Flexa", description: "Materi yang bisa dibaca, didengar, disederhanakan, dan kamus isyarat SIBI.", icon: BookOpen, href: "/flexa", art: "flexa" },
  { key: "pathly", name: "Pathly", description: "Peta belajar bertahap dengan kuis di tiap level.", icon: TrendingUp, href: "/pathly", art: "pathly" },
  { key: "forum", name: "EchoForum", description: "Tempat bertanya dan berdiskusi dengan teman belajar.", icon: Users, href: "/forum", art: "echoforum" },
  { key: "isyarat", name: "Isyarat", description: "Kamus abjad SIBI dan latihan mengeja dengan kamera.", icon: Hand, href: "/isyarat", art: "isyarat" },
];

// Kartu fitur bergaya pixel: ilustrasi di atas, nama dan penjelasan di bawah.
// Ilustrasinya baru bergerak saat kartu disorot atau difokus, supaya halaman tetap tenang.
export function FeatureCard({ feature }: { feature: Feature }) {
  const { effectiveReduceMotion } = useSettings();
  const [lively, setLively] = useState(false);
  const Art = landingArt[feature.art];

  return (
    <Link
      to={feature.href}
      onMouseEnter={() => setLively(true)}
      onMouseLeave={() => setLively(false)}
      onFocus={() => setLively(true)}
      onBlur={() => setLively(false)}
      className="px-card flex h-full flex-col"
    >
      <span aria-hidden="true" className="flex h-32 items-center justify-center border-b-[3px] border-foreground bg-[#7cc4e8] p-3">
        {Art && <Art animated={lively && !effectiveReduceMotion} className="h-full w-auto" />}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="px-title text-sm">{feature.name}</span>
        <span className="flex-1 leading-relaxed text-muted-foreground">{feature.description}</span>
        <span className="mt-1 flex items-center gap-2 font-semibold text-primary">
          Buka {feature.name} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </span>
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
