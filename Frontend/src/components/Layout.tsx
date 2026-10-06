import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client"; 
import { 
  Home, Camera, MessageSquare, BookOpen, TrendingUp, 
  Users, Bell, Settings, User, LogOut, Sparkles, Shield, GraduationCap, Hand, Menu
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); 
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
          "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 border-t-2 text-[11px] transition-colors",
          isActive
            ? "border-primary text-primary font-bold bg-gradient-to-b from-primary/10 to-transparent"
            : "border-transparent text-muted-foreground"
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
      <aside className="hidden md:flex w-20 lg:w-64 bg-gradient-to-b from-primary via-primary to-secondary text-primary-foreground fixed h-screen flex-col border-r border-white/10 shadow-2xl z-40 transition-all duration-300">
        {/* Logo Section */}
        <div className="p-4 lg:p-6 border-b border-white/10">
          <Link to="/" aria-label="Hope.Ai, ke Beranda" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg group-hover:shadow-secondary/50 transition-shadow duration-300 p-1">
              {/* --- PERUBAHAN HANYA DISINI: Ikon Sparkles diganti Image Logo --- */}
              <img 
                src="/images/logo.png" 
                alt="" 
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
              {/* --------------------------------------------------------------- */}
            </div>
            <div className="hidden lg:block">
              <h1 className="text-2xl font-cherry tracking-tight">Hope.Ai</h1>
              <p className="text-xs text-primary-foreground/70 font-medium">AI untuk Pendidikan Inklusif</p>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav aria-label="Menu utama" className="flex-1 p-3 lg:p-4 overflow-y-auto space-y-6">
          <div className="space-y-1.5">
            <p className="px-4 text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider hidden lg:block mb-2">
              Menu Utama
            </p>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return ( 
                <Link
                  key={item.name}
                  to={item.href}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    isActive
                      ? "bg-gradient-to-r from-secondary to-accent text-white shadow-md font-medium"
                      : "text-primary-foreground/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 lg:w-6 lg:h-6 transition-transform duration-200", 
                    isActive ? "scale-100" : "group-hover:scale-110"
                  )} />
                  <span className="hidden lg:block">{item.name}</span>
                  
                  {isActive && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white hidden lg:block" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="pt-4 border-t border-white/10">
            <p className="px-4 text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider hidden lg:block mb-2">
              Lainnya
            </p>
            <div className="space-y-1.5">
              {secondaryItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-label={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-white/20 text-white font-medium"
                        : "text-primary-foreground/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                    )}
                  >
                    <item.icon className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden lg:block">{item.name}</span>
                  </Link>
                );
              })}
              
              <button
                onClick={handleLogout}
                aria-label="Keluar"
                className="flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 text-primary-foreground/70 hover:bg-red-500/20 hover:text-white w-full group mt-4 hover:translate-x-1"
              >
                <LogOut className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden lg:block">Keluar</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <main id="konten-utama" tabIndex={-1} className="flex-1 md:ml-20 lg:ml-64 pb-20 md:pb-0 flex flex-col min-w-0 transition-all duration-300 focus:outline-none">
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]"
      >
        {bottomLeft.map(bottomTab)}

        <div className="flex-1 flex justify-center">
          <Link
            to={bottomCenter.href}
            aria-label={bottomCenter.name}
            aria-current={location.pathname === bottomCenter.href ? "page" : undefined}
            className={cn(
              "-mt-5 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-primary to-secondary ring-4 ring-card transition-transform active:scale-95",
              location.pathname === bottomCenter.href && "ring-primary/30"
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
            "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 border-t-2 text-[11px] transition-colors",
            moreActive
              ? "border-primary text-primary font-bold bg-gradient-to-b from-primary/10 to-transparent"
              : "border-transparent text-muted-foreground"
          )}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
          <span>Lainnya</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl max-h-[85vh] overflow-y-auto">
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
                    "flex flex-col items-center justify-center gap-2 min-h-20 p-3 rounded-xl text-sm text-center transition-colors",
                    isActive ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground"
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
              className="flex flex-col items-center justify-center gap-2 min-h-20 p-3 rounded-xl text-sm bg-destructive/10 text-destructive"
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