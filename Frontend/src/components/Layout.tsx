import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client"; 
import { 
  Home, Camera, MessageSquare, BookOpen, TrendingUp, 
  Users, Bell, Settings, User, LogOut, Sparkles, Shield, GraduationCap, Hand, Menu, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Footer from "./Footer"; 
import { Gamepad2 } from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import OnboardingDialog from "./OnboardingDialog";
import VoiceAssistant from "./VoiceAssistant";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navigation = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "EyeRead", href: "/eyeread", icon: Camera },
  { name: "NeoTutor", href: "/neotutor", icon: MessageSquare },
  { name: "Flexa", href: "/flexa", icon: BookOpen },
  { name: "Pathly", href: "/pathly", icon: TrendingUp },
  { name: "Isyarat", href: "/isyarat", icon: Hand },
  { name: "EchoForum", href: "/forum", icon: Users },
];

const secondaryNav = [
  { name: "Profil", href: "/profile", icon: User },
  { name: "Notifikasi", href: "/notifications", icon: Bell },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

// Di layar ponsel menu pindah ke bilah bawah: dua menu di kiri, NeoTutor di
// tengah, satu menu di kanan, dan sisanya di lembar "Lainnya".
const bottomLeft = [navigation[0], navigation[1]];
const bottomCenter = navigation[2];
const bottomRight = [navigation[3]];
const bottomHrefs = [...bottomLeft, bottomCenter, ...bottomRight].map((item) => item.href);

// Halaman pertama setelah aplikasi dibuka tidak memindahkan fokus
let hasOpenedPage = false;

// Sidebar di layar lebar bisa diperkecil menjadi deret ikon; pilihannya diingat perangkat
const SIDEBAR_KEY = "hopeSidebarKecil";
const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleSidebar = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, current ? "0" : "1");
      } catch {
        // Penyimpanan diblokir: pilihan hanya berlaku selama halaman terbuka
      }
      return !current;
    });
  };
  // Kelas yang hanya berlaku di layar lebar selagi sidebar terbuka penuh
  const wide = (classes: string) => (collapsed ? "" : classes);

  const location = useLocation();
  const navigate = useNavigate(); 

  // Setiap pindah halaman: kembali ke atas, dan fokus pindah ke konten utama agar
  // pengguna keyboard dan pembaca layar langsung berada di halaman baru.
  // (Layout dipasang ulang untuk tiap halaman, jadi efek ini jalan sekali per halaman.)
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!hasOpenedPage) {
      hasOpenedPage = true;
      return;
    }
    document.getElementById("konten-utama")?.focus({ preventScroll: true });
  }, [location.pathname]);
  const { toast } = useToast();
  const { isAdmin, isStaff } = useRoles();

  // Menu guru dan admin hanya tampil untuk peran itu; halamannya sendiri juga memeriksa peran
  const secondaryItems = [
    ...secondaryNav,
    ...(isStaff ? [{ name: "Ruang Guru", href: "/guru", icon: GraduationCap }] : []),
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: Shield }] : []),
  ];

  const moreItems = [...navigation.filter((item) => !bottomHrefs.includes(item.href)), ...secondaryItems];
  const moreActive = moreItems.some((item) => item.href === location.pathname);

  const bottomTab = (item: (typeof navigation)[number]) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 border-t-4 text-[11px]",
          isActive ? "border-amber-400 bg-amber-300/25 text-foreground font-bold" : "border-transparent text-muted-foreground"
        )}
      >
        <item.icon className="w-5 h-5" aria-hidden="true" />
        <span className="truncate max-w-full px-1">{item.name}</span>
      </Link>
    );
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      toast({
        title: "Berhasil keluar",
        description: "Sampai jumpa lagi!",
      });

      navigate("/landing", { replace: true });

    } catch (error: any) {
      toast({
        title: "Gagal keluar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans">
      <OnboardingDialog />
      <VoiceAssistant />

      {/* Tautan lompat untuk pengguna keyboard dan pembaca layar */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:shadow-lg"
      >
        Lompat ke konten utama
      </a>

      {/* Sidebar: hanya di tablet dan desktop */}
      <aside className={`px-sidebar hidden md:flex w-20 ${wide("lg:w-64")} fixed h-screen flex-col border-r-4 z-40 transition-[width] duration-200`}>
        {/* Logo Section */}
        <div className={`p-4 ${wide("lg:p-5")} border-b-4 border-white/10`}>
          <Link to="/" aria-label="Hope.Ai, ke Beranda" className="flex min-w-0 items-center gap-3 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="" width={48} height={48} className="w-full h-full object-contain" />
            </div>
            <div className={`hidden ${wide("lg:block")} min-w-0`}>
              <p className="px-title text-xl" translate="no">Hope.Ai</p>
              <p className="mt-1 text-xs text-white/75">AI untuk Pendidikan Inklusif</p>
            </div>
          </Link>
        </div>

        {/* Buka-tutup sidebar: tab kecil di tepi kanan sidebar, sejajar logo, menempel di
            perbatasan sidebar dan isi halaman. Hanya di layar lebar; di tablet sidebar
            memang selalu berupa ikon. */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Lebarkan sidebar" : "Perkecil sidebar"}
          title={collapsed ? "Lebarkan sidebar" : "Perkecil sidebar"}
          className="absolute -right-[22px] top-6 z-10 hidden h-10 w-10 items-center justify-center border-[3px] border-[#060f33] bg-[#0a1a4f] text-white shadow-[3px_3px_0_rgba(10,26,79,0.35)] hover:bg-[#1b2a63] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300 lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
        </button>

        {/* Main Navigation */}
        <nav aria-label="Menu utama" className={`flex-1 p-3 ${wide("lg:p-4")} overflow-y-auto space-y-6`}>
          <div className="space-y-1.5">
            <p className={`px-title px-2 text-sm text-amber-300 hidden ${wide("lg:block")} mb-2`}>Menu Utama</p>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return ( 
                <Link
                  key={item.name}
                  to={item.href}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className={`px-nav-item justify-center px-2 ${wide("lg:justify-start lg:px-3")}`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className={`hidden ${wide("lg:block")} font-semibold`}>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="pt-4 border-t-4 border-white/10">
            <p className={`px-title px-2 text-sm text-amber-300 hidden ${wide("lg:block")} mb-2`}>Lainnya</p>
            <div className="space-y-1.5">
              {secondaryItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-label={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-nav-item justify-center px-2 ${wide("lg:justify-start lg:px-3")}`}
                  title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className={`hidden ${wide("lg:block")} font-semibold`}>{item.name}</span>
                  </Link>
                );
              })}
              
              <button
                onClick={handleLogout}
                aria-label="Keluar"
                className={`px-nav-item mt-4 w-full justify-center px-2 hover:!bg-red-500/30 ${wide("lg:justify-start lg:px-3")}`}
                title={collapsed ? "Keluar" : undefined}
              >
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className={`hidden ${wide("lg:block")} font-semibold`}>Keluar</span>
              </button>
            </div>
          </div>
        </nav>

      </aside>

      {/* Main Content Wrapper */}
      <main id="konten-utama" tabIndex={-1} className={`flex-1 md:ml-20 ${wide("lg:ml-64")} pb-20 md:pb-0 flex flex-col min-w-0 transition-[margin] duration-200 focus:outline-none`}>
        {/* Page Content */}
        <div className="flex-1 w-full max-w-[1920px] mx-auto p-2 md:p-6 lg:p-8">
          {children}
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Bilah menu bawah: hanya di ponsel */}
      <nav
        aria-label="Menu utama"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-card border-t-4 border-foreground pb-[env(safe-area-inset-bottom)]"
      >
        {bottomLeft.map(bottomTab)}

        <div className="flex-1 flex justify-center">
          <Link
            to={bottomCenter.href}
            aria-label={bottomCenter.name}
            aria-current={location.pathname === bottomCenter.href ? "page" : undefined}
            className={cn(
              "-mt-5 w-14 h-14 flex items-center justify-center border-[3px] border-foreground bg-[#2f6fe4] text-white shadow-[3px_3px_0_hsl(var(--foreground)/0.35)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
              location.pathname === bottomCenter.href && "bg-amber-300 text-[#0a1a4f]"
            )}
          >
            <bottomCenter.icon className="w-6 h-6" aria-hidden="true" />
          </Link>
        </div>

        {bottomRight.map(bottomTab)}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(
            "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 border-t-4 text-[11px]",
            moreActive ? "border-amber-400 bg-amber-300/25 text-foreground font-bold" : "border-transparent text-muted-foreground"
          )}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
          <span>Lainnya</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-none border-t-4 border-foreground max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Menu Lainnya</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {moreItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 min-h-20 p-3 border-[3px] border-foreground text-sm text-center",
                    isActive ? "bg-amber-300 text-[#0a1a4f] font-bold" : "bg-card text-foreground"
                  )}
                >
                  <item.icon className="w-6 h-6" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                handleLogout();
              }}
              className="flex flex-col items-center justify-center gap-2 min-h-20 p-3 border-[3px] border-destructive text-sm bg-destructive/10 text-destructive"
            >
              <LogOut className="w-6 h-6" aria-hidden="true" />
              Keluar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}