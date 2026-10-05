import { Link } from "react-router-dom";
import { BookOpen, Mail, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* 1. BRAND & DESCRIPTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20 p-1">
                {/* --- MEMASANG LOGO DI SINI --- */}
                <img 
                  src="/images/logo.png" 
                  alt="Hope.Ai Logo" 
                  className="w-full h-full object-contain filter drop-shadow-sm"
                />
              </div>
              <div>
                <h3 className="text-xl font-cherry text-white tracking-tight">Hope.Ai</h3>
                <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">AI Untuk Pendidikan Inklusif</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Membangun masa depan pendidikan inklusif dengan teknologi AI yang dapat diakses oleh semua pelajar tanpa batasan.
            </p>
          </div>

          {/* 2. FITUR UTAMA */}
          <div>
            <h4 className="font-semibold text-white mb-6">Ekosistem Belajar</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/eyeread" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                  EyeRead
                </Link>
              </li>
              <li>
                <Link to="/neotutor" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                  NeoTutor
                </Link>
              </li>
              <li>
                <Link to="/flexa" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                  Flexa
                </Link>
              </li>
              <li>
                <Link to="/pathly" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                  Pathly
                </Link>
              </li>
              <li>
                <Link to="/forum" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                  EchoForum
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. DUKUNGAN */}
          <div>
            <h4 className="font-semibold text-white mb-6">Pusat Bantuan</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/profile" className="text-slate-400 hover:text-white transition-colors">
                  Profil Saya
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-slate-400 hover:text-white transition-colors">
                  Pengaturan Aksesibilitas
                </Link>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Panduan Pengguna
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  Syarat & Ketentuan
                </a>
              </li>
            </ul>
          </div>

          {/* 4. KONTAK & SOSMED */}
          <div>
            <h4 className="font-semibold text-white mb-6">Hubungi Kami</h4>
            <div className="flex flex-col gap-4">
              <a 
                href="mailto:halo@hope-ai.edu" 
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-3 rounded-lg border border-slate-800 hover:border-slate-700"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                halo@hope-ai.edu
              </a>

              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Social Media</p>
                <div className="flex gap-3">
                  <SocialLink href="#" icon={<Facebook className="w-4 h-4" />} />
                  <SocialLink href="#" icon={<Twitter className="w-4 h-4" />} />
                  <SocialLink href="#" icon={<Instagram className="w-4 h-4" />} />
                  <SocialLink href="#" icon={<Youtube className="w-4 h-4" />} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Hope.Ai Inc. Mewujudkan Pendidikan Tanpa Batas.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Komponen Kecil untuk Social Link
function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a 
      href={href} 
      className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-blue-500/25 hover:-translate-y-1"
    >
      {icon}
    </a>
  );
}