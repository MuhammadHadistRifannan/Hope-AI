import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import LoadingScreen from "./components/LoadingScreen";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import EyeRead from "./pages/EyeRead";
import NeoTutor from "./pages/NeoTutor";
import Flexa from "./pages/Flexa";
import Pathly from "./pages/Pathly";
import Forum from "./pages/Forum";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherRoom from "./pages/TeacherRoom";
import NotFound from "./pages/NotFound";
import Playground from "./pages/Playground";

// IMPORT SETTINGS PROVIDER (Pastikan file ini sudah dibuat di src/context/SettingsContext.tsx)
import { SettingsProvider } from "./context/SettingsContext";

const queryClient = new QueryClient();

function App() {
  const [showLoading, setShowLoading] = useState(true);
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

  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent">
        <div className="text-white text-2xl font-bold animate-pulse">Memuat...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* WRAP APLIKASI DENGAN SETTINGS PROVIDER */}
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/landing" element={session ? <Navigate to="/" /> : <Landing />} />
              <Route path="/auth" element={session ? <Navigate to="/" /> : <Auth />} />
              
              {/* Protected Routes (Dibungkus Layout) */}
              <Route
                path="/"
                element={session ? <Layout><Home /></Layout> : <Navigate to="/landing" />}
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
                path="/guru"
                element={session ? <Layout><TeacherRoom /></Layout> : <Navigate to="/landing" />}
              />

              <Route
   path="/playground"
   element={session ? <Layout><Playground /></Layout> : <Navigate to="/landing" />}
/>
              
              {/* Fallback 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;