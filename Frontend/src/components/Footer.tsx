import { Link } from "react-router-dom";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="px-sidebar text-slate-200 mt-auto border-t-4">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* 1. BRAND & DESCRIPTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                {/* --- MEMASANG LOGO DI SINI --- */}
                <img 
                  src="/images/logo.png" 
                  alt="Hope.Ai Logo" 
                  className="w-full h-full object-contain filter drop-shadow-sm"
                />
              </div>
              <div>
                <h3 className="px-title text-lg text-white" translate="no">Hope.Ai</h3>
                <p className="text-xs text-blue-200 font-medium">AI untuk Pendidikan Inklusif</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
              Membangun masa depan pendidikan inklusif dengan teknologi AI yang dapat diakses oleh semua pelajar tanpa batasan.
            </p>
          </div>

          {/* 2. FITUR UTAMA */}
          <div>
            <h4 className="px-title text-base text-amber-300 mb-5">Fitur</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/eyeread" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-amber-300 group-hover:bg-white transition-colors" />
                  EyeRead
                </Link>
              </li>
              <li>
                <Link to="/neotutor" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-amber-300 group-hover:bg-white transition-colors" />
                  NeoTutor
                </Link>
              </li>
              <li>
                <Link to="/flexa" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-amber-300 group-hover:bg-white transition-colors" />
                  Flexa
                </Link>
              </li>
              <li>
                <Link to="/pathly" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-amber-300 group-hover:bg-white transition-colors" />
                  Pathly
                </Link>
              </li>
              <li>
                <Link to="/forum" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-amber-300 group-hover:bg-white transition-colors" />
                  EchoForum
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. DUKUNGAN */}
          <div>
            <h4 className="px-title text-base text-amber-300 mb-5">Bantuan</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/profile" className="text-slate-300 hover:text-white transition-colors">
                  Profil Saya
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-slate-300 hover:text-white transition-colors">
                  Pengaturan Aksesibilitas
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/MuhammadHadistRifannan/Hope-AI#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Panduan Pengguna<span className="sr-only"> (membuka tab baru)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* 4. PROYEK */}
          <div>
            <h4 className="px-title text-base text-amber-300 mb-5">Proyek</h4>
            <a
              href="https://github.com/MuhammadHadistRifannan/Hope-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors bg-white/5 p-3 border-[3px] border-white/30 hover:border-white/60"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              Kode sumber di GitHub<span className="sr-only"> (membuka tab baru)</span>
            </a>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t-4 border-dotted border-white/25 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-300">
          <p>&copy; {new Date().getFullYear()} Tim Hope.Ai. Dibuat untuk UINIC 8.0.</p>
        </div>
      </div>
    </footer>
  );
}
