import React, { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { nextPath } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import LoadingScreen from "./components/LoadingScreen";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

// Halaman lain dimuat saat dibuka, supaya landing dan halaman masuk tidak ikut
// mengunduh kode seluruh aplikasi (bundel awal 628 KB sebelum dipecah)
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EyeRead = lazy(() => import("./pages/EyeRead"));
const NeoTutor = lazy(() => import("./pages/NeoTutor"));
const Flexa = lazy(() => import("./pages/Flexa"));
const Pathly = lazy(() => import("./pages/Pathly"));
const Forum = lazy(() => import("./pages/Forum"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TeacherRoom = lazy(() => import("./pages/TeacherRoom"));
const SignLanguage = lazy(() => import("./pages/SignLanguage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Info = lazy(() => import("./pages/Info"));

// IMPORT SETTINGS PROVIDER (Pastikan file ini sudah dibuat di src/context/SettingsContext.tsx)
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import AccessibilityAnnouncer from "./components/AccessibilityAnnouncer";
import AccessibilityPanel from "./components/AccessibilityPanel";
import { MotionConfig } from "framer-motion";

const queryClient = new QueryClient();

// Ditampilkan sebentar selama kode halaman diunduh
function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status">
      <div className="text-muted-foreground text-lg font-medium animate-pulse">Memuat…</div>
    </div>
  );
}

// Sudah masuk: lanjut ke halaman yang diminta lewat ?next=, atau ke Beranda
function AfterLogin() {
  const [searchParams] = useSearchParams();
  return <Navigate to={nextPath(searchParams.get("next"))} replace />;
}

function App() {
  // Layar pembuka: "tampil", lalu "memudar" (halaman sudah ada di belakangnya), lalu "selesai"
  const [splash, setSplash] = useState<"tampil" | "memudar" | "selesai">("tampil");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const splashScreen =
    splash === "selesai" ? null : <LoadingScreen key="pembuka" onReveal={() => setSplash("memudar")} onComplete={() => setSplash("selesai")} />;

  // Selama layar pembuka masih tampil penuh, halaman belum dipasang. Bentuk keluarannya
  // sama dengan di bawah (layar pembuka sebagai anak pertama), supaya React tidak
  // memasangnya ulang saat halaman mulai ditampilkan.
  if (splash === "tampil") return <>{splashScreen}</>;

  if (loading) {
    return (
      <>
        {splashScreen}
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground text-lg font-medium animate-pulse">Memuat…</div>
        </div>
      </>
    );
  }

  return (
    <>
    {splashScreen}
    <QueryClientProvider client={queryClient}>
      {/* WRAP APLIKASI DENGAN SETTINGS PROVIDER */}
      <SettingsProvider>
        <MotionSettings>
        <TooltipProvider>
          <AccessibilityAnnouncer />
          <AccessibilityPanel />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Routes */}
              {/* Landing page bisa dibuka siapa saja; pengguna yang sudah masuk mendapat tombol ke Beranda */}
              <Route path="/landing" element={<Landing isLoggedIn={!!session} />} />
              <Route path="/auth" element={session ? <AfterLogin /> : <Auth />} />
              {/* Halaman informasi, bisa dibuka tanpa masuk */}
              <Route path="/privasi" element={<Info slug="privasi" />} />
              <Route path="/ketentuan" element={<Info slug="ketentuan" />} />
              <Route path="/aksesibilitas" element={<Info slug="aksesibilitas" />} />
              <Route path="/kredit" element={<Info slug="kredit" />} />
              {/* Tautan dari email atur ulang password; pengguna datang dalam keadaan sudah masuk sementara */}
              <Route path="/reset-password" element={<ResetPassword hasSession={!!session} />} />
              
              {/* Protected Routes (Dibungkus Layout) */}
              <Route
                path="/"
                element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/eyeread"
                element={session ? <Layout><EyeRead /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/neotutor"
                element={session ? <Layout><NeoTutor /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/flexa"
                element={session ? <Layout><Flexa /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/pathly"
                element={session ? <Layout><Pathly /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/forum"
                element={session ? <Layout><Forum /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/profile"
                element={session ? <Layout><Profile /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/notifications"
                element={session ? <Layout><Notifications /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/settings"
                element={session ? <Layout><Settings /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/admin"
                element={session ? <Layout><AdminDashboard /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/isyarat"
                element={session ? <Layout><SignLanguage /></Layout> : <Navigate to="/landing" />}
              />
              <Route
                path="/guru"
                element={session ? <Layout><TeacherRoom /></Layout> : <Navigate to="/landing" />}
              />

              {/* Game Playground sudah menyatu di Pathly (tab Arena), tempat skornya tersimpan */}
              <Route path="/playground" element={<Navigate to="/pathly" replace />} />
              
              {/* Fallback 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </MotionSettings>
      </SettingsProvider>
    </QueryClientProvider>
    </>
  );
}

// Animasi framer-motion ikut pengaturan Kurangi Gerakan (dan pengaturan sistem operasi)
function MotionSettings({ children }: { children: React.ReactNode }) {
  const { effectiveReduceMotion, screenReaderMode } = useSettings();
  return (
    <MotionConfig reducedMotion={effectiveReduceMotion || screenReaderMode ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}

export default App;