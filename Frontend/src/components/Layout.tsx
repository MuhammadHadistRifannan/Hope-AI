import { Link, useLocation, useNavigate } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client"; 
import { 
  Home, Camera, MessageSquare, BookOpen, TrendingUp, 
  Users, Bell, Settings, User, LogOut, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Footer from "./Footer"; 
import { Gamepad2 } from "lucide-react";

const navigation = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "EyeRead", href: "/eyeread", icon: Camera },
  { name: "NeoTutor", href: "/neotutor", icon: MessageSquare },
  { name: "Flexa", href: "/flexa", icon: BookOpen },
  { name: "Pathly", href: "/pathly", icon: TrendingUp },
  { name: "EchoForum", href: "/forum", icon: Users },
];

const secondaryNav = [
  { name: "Profil", href: "/profile", icon: User },
  { name: "Notifikasi", href: "/notifications", icon: Bell },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate(); 
  const { toast } = useToast();

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
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-gradient-to-b from-primary via-primary to-secondary text-primary-foreground fixed h-screen flex flex-col border-r border-white/10 shadow-2xl z-40 transition-all duration-300">
        {/* Logo Section */}
        <div className="p-4 lg:p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg group-hover:shadow-secondary/50 transition-shadow duration-300 p-1">
              {/* --- PERUBAHAN HANYA DISINI: Ikon Sparkles diganti Image Logo --- */}
              <img 
                src="/images/logo.png" 
                alt="Hope.Ai Logo" 
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
        <nav className="flex-1 p-3 lg:p-4 overflow-y-auto space-y-6">
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
              {secondaryNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
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
      <main className="flex-1 ml-20 lg:ml-64 flex flex-col min-w-0 transition-all duration-300">
        {/* Page Content */}
        <div className="flex-1 w-full max-w-[1920px] mx-auto p-6 lg:p-8">
          {children}
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}