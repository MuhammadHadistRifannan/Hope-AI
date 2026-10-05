import { Link } from "react-router-dom";
import {
  Camera,
  MessageSquare,
  BookOpen,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// --- CSS KHUSUS UNTUK 3D CARD (Uiverse Style) ---
// Kita menyisipkan ini sebagai string agar terisolasi dan pasti jalan
const cardCss = `
.parent {
  perspective: 1000px;
  height: 100%;
}

.card {
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

.content {
  padding: 100px 40px 0px 30px;
  transform: translate3d(0, 0, 26px);
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
  transform: translate3d(0, 0, 26px);
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

.bottom .view-more .view-more-button {
  background: none;
  border: none;
  font-weight: bolder;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bottom .view-more .svg {
  fill: none;
  stroke-width: 3px;
  max-height: 15px;
  margin-left: 8px;
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
`;

// --- 3D CARD COMPONENT ---
const ThreeDCard = ({ feature }: { feature: any }) => {
  return (
    <div className={`parent group w-full ${feature.colSpan}`}>
      <Link to={feature.href} className="block h-full">
        {/* Card Background dynamically applied from props */}
        <div className={`card bg-gradient-to-br ${feature.bgGradient}`}>
          
          <div className="glass"></div>

          {/* Logo Section */}
          <div className="logo">
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
              <button className={`view-more-button ${feature.textColor}`}>View more</button>
              <svg 
                className={`svg ${feature.iconColor.replace('text-', 'stroke-')}`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                stroke="currentColor"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

// --- CONFIGURATION FEATURES ---
const features = [
  {
    name: "EyeRead",
    description: "OCR canggih untuk mengubah teks fisik menjadi suara digital seketika.",
    icon: Camera,
    href: "/eyeread",
    colSpan: "md:col-span-8",
    bgGradient: "from-[#ccfbf1] to-[#2dd4bf]", // Tealish green like reference
    textColor: "text-[#0f766e]", // Dark teal text
    descColor: "text-[#115e59]",
    iconColor: "text-[#0f766e]",
  },
  {
    name: "NeoTutor",
    description: "Mentor AI pribadi 24/7 yang siap menjawab pertanyaanmu.",
    icon: MessageSquare,
    href: "/neotutor",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#e0e7ff] to-[#818cf8]", // Indigo
    textColor: "text-[#3730a3]",
    descColor: "text-[#312e81]",
    iconColor: "text-[#3730a3]",
  },
  {
    name: "Flexa",
    description: "Materi adaptif & Kamus Isyarat inklusif.",
    icon: BookOpen,
    href: "/flexa",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#dcfce7] to-[#4ade80]", // Green
    textColor: "text-[#14532d]",
    descColor: "text-[#166534]",
    iconColor: "text-[#14532d]",
  },
  {
    name: "Pathly",
    description: "Jalur belajar adaptif dan game asah otak.",
    icon: TrendingUp,
    href: "/pathly",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#ffedd5] to-[#fb923c]", // Orange
    textColor: "text-[#7c2d12]",
    descColor: "text-[#9a3412]",
    iconColor: "text-[#7c2d12]",
  },
  {
    name: "EchoForum",
    description: "Komunitas diskusi yang aman dan inklusif.",
    icon: Users,
    href: "/forum",
    colSpan: "md:col-span-4",
    bgGradient: "from-[#fae8ff] to-[#e879f9]", // Fuchsia
    textColor: "text-[#701a75]",
    descColor: "text-[#86198f]",
    iconColor: "text-[#701a75]",
  },
];

// --- COMPONENT BACKGROUND ---
const BackgroundGradient = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px] animate-pulse delay-1000" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
  </div>
);

// --- MAIN PAGE ---
export default function Home() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  // Path to your GIF file
  const penguinGif = "/gif/animasi-home.gif";

  return (
    <div className="min-h-screen relative font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Inject CSS Styles Here */}
      <style>{cardCss}</style>
      
      <BackgroundGradient />

      {/* Hero Section */}
      <section
        ref={targetRef}
        className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-[90vh] flex items-center"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          {/* Left Column (Text) */}
          <motion.div
            style={{ opacity, y }}
            className="relative z-10 text-center md:text-left order-2 md:order-1"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-white/20 backdrop-blur-md shadow-sm mb-6 hover:scale-105 transition-transform duration-300 cursor-default"
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI untuk Pendidikan Inklusif
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground"
            >
              Belajar Tanpa <br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-blue-600 to-secondary bg-clip-text text-transparent">
                  Batasan.
                </span>
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="absolute w-full h-3 -bottom-2 left-0 text-secondary"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 50 10 100 5"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed"
            >
              Hope.Ai menghadirkan ekosistem pembelajaran inklusif yang didukung
              AI. Personalisasi, aksesibilitas, dan komunitas dalam satu
              platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center"
            >
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 bg-primary hover:bg-primary/90 group"
                asChild
              >
                <Link to="/eyeread">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
                asChild
              >
                <Link to="/neotutor">Pelajari Lebih Lanjut</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column: GIF Penguin Animasi */}
          <motion.div 
            style={{ opacity, y }}
            className="relative z-10 order-1 md:order-2 flex justify-center items-center"
          >
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-full blur-[60px] -z-10" />
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <img 
                    src={penguinGif} 
                    alt="Animasi Home Penguin" 
                    className="w-96 h-96 md:w-[32rem] md:h-[32rem] object-contain drop-shadow-2xl"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features Section with 3D Card Hover */}
      <section className="px-4 md:px-8 py-20 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ staggerChildren: 0.1 }}
          className="mb-16 text-center"
        >
          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
          >
            Ekosistem Belajar Cerdas
          </motion.h2>
          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto"
          >
            Teknologi yang beradaptasi dengan Anda, bukan sebaliknya.
          </motion.p>
        </motion.div>

        {/* 3D CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[minmax(300px,auto)]">
          {features.map((feature, index) => (
            <ThreeDCard key={feature.name} feature={feature} index={index} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl relative"
        >
          {/* GAMBAR BANNER (Background Image) */}
          <div className="absolute inset-0">
            <img
              src="/images/logo.png" // Ganti dengan gambar motivasi/hero image yang inspiratif
              alt="Background Motivasi"
              className="w-full h-full object-cover opacity-20 bg-blue-900" // Opacity rendah agar teks terbaca
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-purple-900/80 to-transparent" />
          </div>

          <div className="relative z-10 p-12 md:p-20 grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-sm font-medium text-white/90 w-fit">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>Kutipan Hari Ini</span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                "Setiap Keterbatasan Adalah{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                  Peluang Baru
                </span>
                "
              </h2>

              <p className="text-lg text-blue-100/90 leading-relaxed max-w-lg">
                Jangan biarkan hambatan fisik membatasi mimpimu. Di Hope.Ai,
                kami percaya bahwa pendidikan adalah hak semua orang, dan
                teknologi ada untuk meruntuhkan dinding penghalang itu.
              </p>

              <div className="pt-4 flex items-center gap-4">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-purple-900 bg-white/20 backdrop-blur-sm"
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-white/80">
                  Bergabung dengan 10,000+ Pelajar Lainnya
                </p>
              </div>
            </div>

            {/* Ilustrasi Dekoratif Kanan */}
            <div className="hidden md:flex justify-end relative">
              <Zap className="w-64 h-64 text-yellow-400 opacity-20 absolute -top-20 -right-20 animate-pulse" />
              <Star
                className="w-32 h-32 text-white opacity-10 absolute bottom-0 right-10 animate-spin-slow"
                style={{ animationDuration: "10s" }}
              />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}