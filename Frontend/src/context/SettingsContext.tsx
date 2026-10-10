import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { setSpeechPreferences } from '@/lib/speech';

export type Theme = 'system' | 'light' | 'dark';

// Nilai pengaturan yang disimpan di perangkat dan di akun
type SettingsValues = {
  // Tampilan
  textSize: number; // tambahan ukuran teks: 0 = 100%, 100 = 200%
  highContrast: boolean;
  dyslexiaFont: boolean;
  theme: Theme;
  reduceMotion: boolean | null; // null = ikuti sistem operasi
  // Pembaca layar: suara asisten dimatikan, umpan balik lewat aria-live, tampilan disederhanakan
  screenReaderMode: boolean;
  // Pendengaran
  captions: boolean; // semua suara aplikasi juga tampil sebagai teks
  visualNotifications: boolean; // bunyi aplikasi diganti kedipan dan pesan di layar
  // Suara
  autoPlayAudio: boolean;
  speakingRate: string; // 'slow' | 'normal' | 'fast'
  volume: number; // 0 - 100
  aiVoice: boolean; // suara AI dari server, atau suara bawaan perangkat
  language: string;
  // Profil kebutuhan
  needs: string[];
  needsConsent: boolean; // setuju data kebutuhan disimpan di akun
};

type SettingsType = SettingsValues & {
  needsOnboarding: boolean;
  // Nilai akhir setelah memperhitungkan pengaturan sistem operasi
  effectiveReduceMotion: boolean;
  effectiveDark: boolean;
  updateSetting: <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => void;
  // Mengubah satu pengaturan dan langsung menyimpannya ke perangkat dan akun
  setAndSave: <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => void;
  saveSettings: () => Promise<void>;
  completeOnboarding: (needs: string[], consent: boolean) => Promise<void>;
  restartOnboarding: () => void;
};

const prefers = (query: string) =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

// Nilai awal mengikuti pengaturan sistem operasi bila ada
const initialSettings = (): SettingsValues => ({
  textSize: 0,
  highContrast: prefers('(prefers-contrast: more)'),
  dyslexiaFont: false,
  theme: 'light',
  reduceMotion: null,
  screenReaderMode: false,
  captions: false,
  visualNotifications: false,
  autoPlayAudio: false,
  speakingRate: 'normal',
  volume: 75,
  aiVoice: true,
  language: 'id',
  needs: [],
  needsConsent: false,
});

const STORAGE_KEY = 'hopeAiSettings';

// Pemetaan antara nama field di aplikasi dan kolom tabel user_settings.
// Data kebutuhan hanya dikirim ke akun bila pengguna menyetujuinya.
const toRow = (s: SettingsValues) => ({
  text_size: s.textSize,
  large_text: s.textSize >= 50,
  high_contrast: s.highContrast,
  dyslexia_font: s.dyslexiaFont,
  theme: s.theme,
  reduce_motion: s.reduceMotion,
  screen_reader_mode: s.screenReaderMode,
  captions: s.captions,
  visual_notifications: s.visualNotifications,
  auto_play_audio: s.autoPlayAudio,
  speaking_rate: s.speakingRate,
  volume: s.volume,
  ai_voice: s.aiVoice,
  language: s.language,
  needs: s.needsConsent ? s.needs : [],
});

const readLocal = (): Partial<SettingsValues> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // Simpanan lama memakai skala 0..100 dengan 50 = normal
    if (parsed.textSize !== undefined && parsed.largeText !== undefined) {
      parsed.textSize = Math.max(0, (parsed.textSize - 50) * 2);
      delete parsed.largeText;
    }
    return parsed;
  } catch {
    return {};
  }
};

const writeLocal = (s: SettingsValues) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Penyimpanan perangkat tidak tersedia (misalnya mode privat); akun tetap dipakai
  }
};

// Pilihan kebutuhan saat pertama masuk. Ditanyakan sebagai kebutuhan, bukan label disabilitas.
export const needOptions = [
  { id: 'netra', label: 'Saya lebih mudah mendengar daripada melihat layar', hint: 'Materi dibacakan otomatis dan aplikasi bisa dikendalikan dengan suara' },
  { id: 'low_vision', label: 'Saya butuh tulisan besar dan warna yang kontras', hint: 'Teks diperbesar dan warna dibuat lebih tegas' },
  { id: 'tuli', label: 'Saya berkomunikasi dengan bahasa isyarat atau sulit mendengar suara', hint: 'Isyarat ditampilkan di depan, suara selalu disertai teks' },
  { id: 'disleksia', label: 'Saya kesulitan membaca teks yang padat', hint: 'Huruf ramah disleksia dan baris yang lebih pendek' },
  { id: 'kognitif', label: 'Saya lebih mudah paham dengan penjelasan pelan dan sederhana', hint: 'Versi bahasa sederhana dan suara lebih pelan' },
  { id: 'motorik', label: 'Saya lebih nyaman memakai keyboard daripada mouse atau layar sentuh', hint: 'Semua menu bisa dijangkau dengan keyboard dan suara' },
  { id: 'wicara', label: 'Saya lebih nyaman mengetik daripada berbicara', hint: 'Tombol mikrofon disembunyikan, NeoTutor memakai ketik dan pilihan cepat' },
];

// Pengaturan awal yang cocok untuk tiap kebutuhan; pengguna tetap bisa mengubahnya nanti
export const applyNeeds = (base: SettingsValues, needs: string[]): SettingsValues => {
  const next = { ...base, needs };
  const has = (need: string) => needs.includes(need);

  if (has('low_vision')) {
    next.highContrast = true;
    next.textSize = Math.max(next.textSize, 60);
  }
  if (has('disleksia') || has('kognitif')) {
    next.textSize = Math.max(next.textSize, 30);
    next.speakingRate = 'slow';
  }
  if (has('disleksia')) next.dyslexiaFont = true;
  if (has('netra')) next.autoPlayAudio = true;
  if (has('tuli')) {
    next.autoPlayAudio = false;
    next.captions = true;
    next.visualNotifications = true;
  }
  return next;
};

const SettingsContext = createContext<SettingsType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsValues>(() => ({ ...initialSettings(), ...readLocal() }));
  const [userId, setUserId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [osReduceMotion, setOsReduceMotion] = useState(() => prefers('(prefers-reduced-motion: reduce)'));
  const [osDark, setOsDark] = useState(() => prefers('(prefers-color-scheme: dark)'));
  const latest = useRef(settings);
  latest.current = settings;

  // Ikuti perubahan pengaturan sistem operasi saat aplikasi terbuka
  useEffect(() => {
    if (!window.matchMedia) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const onMotion = () => setOsReduceMotion(motion.matches);
    const onDark = () => setOsDark(dark.matches);
    motion.addEventListener('change', onMotion);
    dark.addEventListener('change', onDark);
    return () => {
      motion.removeEventListener('change', onMotion);
      dark.removeEventListener('change', onDark);
    };
  }, []);

  // Ikuti status login agar pengaturan bisa diambil dari akun
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Pengaturan di akun menimpa yang tersimpan di perangkat, supaya ikut pindah perangkat
  useEffect(() => {
    if (!userId) {
      setNeedsOnboarding(false);
      return;
    }
    let cancelled = false;

    const loadFromAccount = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Gagal memuat pengaturan akun:', error);
        return;
      }
      if (!data) return;

      const local = latest.current;
      const consent = data.needs_consent_at !== null;
      const fromAccount: SettingsValues = {
        textSize: data.text_size,
        highContrast: data.high_contrast,
        dyslexiaFont: data.dyslexia_font,
        theme: (data.theme as Theme) ?? 'light',
        reduceMotion: data.reduce_motion,
        screenReaderMode: data.screen_reader_mode,
        captions: data.captions,
        visualNotifications: data.visual_notifications,
        autoPlayAudio: data.auto_play_audio,
        speakingRate: data.speaking_rate,
        volume: data.volume,
        aiVoice: data.ai_voice,
        language: data.language,
        // Tanpa persetujuan, data kebutuhan hanya ada di perangkat ini
        needs: consent ? data.needs : local.needs,
        needsConsent: consent,
      };
      setNeedsOnboarding(data.onboarded_at === null);
      setSettings(fromAccount);
      writeLocal(fromAccount);
    };

    loadFromAccount();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const effectiveReduceMotion = settings.reduceMotion ?? osReduceMotion;
  const effectiveDark = settings.theme === 'dark' || (settings.theme === 'system' && osDark);

  // Terapkan pengaturan tampilan ke elemen HTML
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('dyslexia-font', settings.dyslexiaFont);
    root.classList.toggle('reduce-motion', effectiveReduceMotion || settings.screenReaderMode);
    root.classList.toggle('sr-mode', settings.screenReaderMode);
    root.classList.toggle('dark', effectiveDark && !settings.highContrast);
    root.style.fontSize = `${100 + settings.textSize}%`;
    setSpeechPreferences({ muteFeedback: settings.screenReaderMode });
  }, [settings, effectiveReduceMotion, effectiveDark]);

  const saveToAccount = useCallback(
    async (values: SettingsValues, extra: Record<string, unknown> = {}) => {
      writeLocal(values);
      if (!userId) return true;
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        ...toRow(values),
        needs_consent_at: values.needsConsent ? new Date().toISOString() : null,
        ...extra,
      });
      if (error) {
        console.error('Gagal menyimpan pengaturan ke akun:', error);
        return false;
      }
      return true;
    },
    [userId]
  );

  const updateSetting: SettingsType['updateSetting'] = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Disimpan dengan jeda singkat agar tombol A+ yang ditekan berulang tidak membanjiri server
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const setAndSave: SettingsType['setAndSave'] = (key, value) => {
    const next = { ...latest.current, [key]: value };
    latest.current = next;
    setSettings(next);
    writeLocal(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToAccount(latest.current), 600);
  };

  const saveSettings = async () => {
    const ok = await saveToAccount(settings);
    if (!userId) toast.success('Pengaturan disimpan di perangkat ini.');
    else if (ok) toast.success('Pengaturan berhasil disimpan!');
    else toast.error('Pengaturan tersimpan di perangkat ini, tetapi gagal disimpan ke akun.');
  };

  // Menyimpan profil kebutuhan dari dialog pertama masuk dan menerapkan pengaturan awalnya
  const completeOnboarding = async (needs: string[], consent: boolean) => {
    const next = { ...applyNeeds(settings, needs), needsConsent: consent && needs.length > 0 };
    setSettings(next);
    setNeedsOnboarding(false);
    const ok = await saveToAccount(next, { onboarded_at: new Date().toISOString() });
    if (!ok) {
      toast.error('Profil kebutuhan belum tersimpan ke akun.');
      return;
    }
    if (needs.length > 0) toast.success('Tampilan sudah disesuaikan. Bisa diubah kapan saja di Pengaturan.');
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        needsOnboarding,
        effectiveReduceMotion,
        effectiveDark,
        updateSetting,
        setAndSave,
        saveSettings,
        completeOnboarding,
        restartOnboarding: () => setNeedsOnboarding(true),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
