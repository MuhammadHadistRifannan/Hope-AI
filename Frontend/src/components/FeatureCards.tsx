import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, Hand, MessageSquare, TrendingUp, Users, type LucideIcon } from "lucide-react";

export type Feature = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  colSpan: string;
  bgGradient: string;
  textColor: string;
  descColor: string;
  iconColor: string;
};

// --- CSS KHUSUS UNTUK 3D CARD (Uiverse Style) ---
// Kita menyisipkan ini sebagai string agar terisolasi dan pasti jalan
const cardCss = `
.parent {
  perspective: 1000px;
  height: 100%;
}

.card {
  position: relative;
  height: 100%;
  min-height: 320px;
  border-radius: 50px;
  transition: all 0.5s ease-in-out;
  transform-style: preserve-3d;
  box-shadow: rgba(5, 71, 17, 0) 40px 50px 25px -40px, rgba(5, 71, 17, 0.2) 0px 25px 25px -5px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass {
  transform-style: preserve-3d;
  position: absolute;
  inset: 8px;
  border-radius: 55px;
  border-top-right-radius: 100%;
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.82) 100%);
  transform: translate3d(0px, 0px, 25px);
  border-left: 1px solid white;
  border-bottom: 1px solid white;
  transition: all 0.5s ease-in-out;
}

/* Teks selalu di depan lingkaran dekorasi (lingkaran paling atas di 120px) */
.content {
  position: relative;
  padding: 100px 40px 70px 30px;
  transform: translate3d(0, 0, 130px);
}

.content .title {
  display: block;
  font-weight: 900;
  font-size: 24px;
}

.content .text {
  display: block;
  font-size: 15px;
  margin-top: 20px;
  line-height: 1.6;
  font-weight: 500;
}

.bottom {
  padding: 10px 12px;
  transform-style: preserve-3d;
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  transform: translate3d(0, 0, 130px);
}

.bottom .view-more {
  display: flex;
  align-items: center;
  width: auto;
  justify-content: flex-end;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.bottom .view-more:hover {
  transform: translate3d(0, 0, 10px);
}

.bottom .view-more .view-more-label {
  font-weight: 700;
  font-size: 15px;
}

.logo {
  position: absolute;
  right: 0;
  top: 0;
  transform-style: preserve-3d;
}

.logo .circle {
  display: block;
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  top: 0;
  right: 0;
  box-shadow: rgba(100, 100, 111, 0.2) -10px 10px 20px 0px;
  backdrop-filter: blur(5px);
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.5s ease-in-out;
}

.logo .circle1 { width: 170px; transform: translate3d(0, 0, 20px); top: 8px; right: 8px; }
.logo .circle2 { width: 140px; transform: translate3d(0, 0, 40px); top: 10px; right: 10px; transition-delay: 0.4s; }
.logo .circle3 { width: 110px; transform: translate3d(0, 0, 60px); top: 17px; right: 17px; transition-delay: 0.8s; }
.logo .circle4 { width: 80px; transform: translate3d(0, 0, 80px); top: 23px; right: 23px; transition-delay: 1.2s; }
.logo .circle5 { width: 50px; transform: translate3d(0, 0, 100px); top: 30px; right: 30px; display: grid; place-content: center; transition-delay: 1.6s; }

/* HOVER EFFECTS */
.parent:hover .card {
  transform: rotate3d(1, 1, 0, 30deg);
  box-shadow: rgba(5, 71, 17, 0.3) 30px 50px 25px -40px, rgba(5, 71, 17, 0.1) 0px 25px 30px 0px;
}
.parent:hover .card .logo .circle2 { transform: translate3d(0, 0, 60px); }
.parent:hover .card .logo .circle3 { transform: translate3d(0, 0, 80px); }
.parent:hover .card .logo .circle4 { transform: translate3d(0, 0, 100px); }
.parent:hover .card .logo .circle5 { transform: translate3d(0, 0, 120px); }

.parent:focus-within .card { outline: 3px solid #1d4ed8; outline-offset: 4px; }

@media (prefers-reduced-motion: reduce) {
  .card, .glass, .logo .circle, .bottom .view-more { transition: none; }
  .parent:hover .card { transform: none; }
}
`;

// --- 3D CARD COMPONENT ---
export const FeatureCard = ({ feature }: { feature: Feature }) => {
  return (
    <div className={`parent group w-full ${feature.colSpan}`}>
      <Link to={feature.href} className="block h-full rounded-[50px] focus:outline-none">
        {/* Card Background dynamically applied from props */}
        <div className={`card bg-gradient-to-br ${feature.bgGradient}`}>
          
          <div className="glass" aria-hidden="true"></div>

          {/* Logo Section */}
          <div className="logo" aria-hidden="true">
            <span className="circle circle1"></span>
            <span className="circle circle2"></span>
            <span className="circle circle3"></span>
            <span className="circle circle4"></span>
            <span className="circle circle5">
               <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
            </span>
          </div>

          {/* Content Section */}
          <div className="content">
            <span className={`title ${feature.textColor}`}>{feature.name}</span>
            <span className={`text ${feature.descColor}`}>{feature.description}</span>
          </div>

          {/* Bottom Section */}
          <div className="bottom">
            <div className="view-more">
              <span className={`view-more-label flex items-center gap-2 ${feature.textColor}`}>
                Buka {feature.name}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

// --- CONFIGURATION FEATURES ---
export const features: Feature[] = [
  {
    key: "eyeread",
    name: "EyeRead",
    description: "Arahkan kamera ke buku atau papan tulis, lalu dengarkan isinya.",
    icon: Camera,
    href: "/eyeread",
    colSpan: "md:col-span-8",
    bgGradient: "from-[#ccfbf1] to-[#2dd4bf]", // Tealish green like reference
    textColor: "text-[#042f2e]",
    descColor: "text-[#042f2e]",
    iconColor: "text-[#042f2e]",
  },
  {
    key: "neotutor",
    name: "NeoTutor",
    description: "Tutor AI yang siap menjawab pertanyaanmu kapan saja.",
    icon: MessageSquare,
    href: "/neotutor",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#e0e7ff] to-[#818cf8]", // Indigo
    textColor: "text-[#1e1b4b]",
    descColor: "text-[#1e1b4b]",
    iconColor: "text-[#1e1b4b]",
  },
  {
    key: "flexa",
    name: "Flexa",
    description: "Materi yang bisa dibaca, didengar, disederhanakan, dan kamus isyarat SIBI.",
    icon: BookOpen,
    href: "/flexa",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#dcfce7] to-[#4ade80]", // Green
    textColor: "text-[#14532d]",
    descColor: "text-[#14532d]",
    iconColor: "text-[#14532d]",
  },
  {
    key: "pathly",
    name: "Pathly",
    description: "Jalur belajar adaptif dan game asah otak.",
    icon: TrendingUp,
    href: "/pathly",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#ffedd5] to-[#fb923c]", // Orange
    textColor: "text-[#431407]",
    descColor: "text-[#431407]",
    iconColor: "text-[#431407]",
  },
  {
    key: "forum",
    name: "EchoForum",
    description: "Komunitas diskusi yang aman dan inklusif.",
    icon: Users,
    href: "/forum",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#fae8ff] to-[#e879f9]", // Fuchsia
    textColor: "text-[#4a044e]",
    descColor: "text-[#4a044e]",
    iconColor: "text-[#4a044e]",
  },
  {
    key: "isyarat",
    name: "Isyarat",
    description: "Kamus abjad SIBI dan latihan mengeja dengan kamera.",
    icon: Hand,
    href: "/isyarat",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#cffafe] to-[#22d3ee]",
    textColor: "text-[#083344]",
    descColor: "text-[#083344]",
    iconColor: "text-[#083344]",
  },
];


// Kartu-kartu fitur dalam tata letak bento. Urutan mengikuti kebutuhan pengguna.
export default function FeatureCards({ order }: { order: string[] }) {
  const sorted = [...features].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  // Kartu pertama dibuat lebar, sisanya sepertiga
  const spans = ["md:col-span-8", "md:col-span-4", "md:col-span-4", "md:col-span-4", "md:col-span-4", "md:col-span-12"];
  return (
    <>
      <style>{cardCss}</style>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 auto-rows-[minmax(280px,auto)]">
        {sorted.map((feature, i) => (
          <FeatureCard key={feature.key} feature={{ ...feature, colSpan: spans[i] ?? "md:col-span-4" }} />
        ))}
      </div>
    </>
  );
}
