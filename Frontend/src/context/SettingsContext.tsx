import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Tipe Data untuk Pengaturan
type SettingsType = {
  // Aksesibilitas Visual
  largeText: boolean;
  highContrast: boolean;
  screenReader: boolean;
  textSize: number; // 0 - 100

  // Audio
  autoPlayAudio: boolean;
  speakingRate: string; // 'slow' | 'normal' | 'fast'
  volume: number; // 0 - 100

  // Sistem
  language: string;

  // Profil kebutuhan
  needs: string[];
  dyslexiaFont: boolean;
  needsOnboarding: boolean;

  // Actions
  updateSetting: (key: string, value: any) => void;
  saveSettings: () => void;
  completeOnboarding: (needs: string[]) => Promise<void>;
};

// Nilai Default
const defaultSettings = {
  largeText: false,
  highContrast: false,
  screenReader: true,
  textSize: 50,
  autoPlayAudio: false,
  speakingRate: 'normal',
  volume: 75,
  language: 'id',
  needs: [] as string[],
  dyslexiaFont: false,
};

type SettingsValues = typeof defaultSettings;

const STORAGE_KEY = 'hopeAiSettings';

// Pemetaan antara nama field di aplikasi dan kolom tabel user_settings
const toRow = (s: SettingsValues) => ({
  large_text: s.largeText,
  high_contrast: s.highContrast,
  screen_reader: s.screenReader,
  text_size: s.textSize,
  auto_play_audio: s.autoPlayAudio,
  speaking_rate: s.speakingRate,
  volume: s.volume,
  language: s.language,
  needs: s.needs,
  dyslexia_font: s.dyslexiaFont,
});

// Pilihan kebutuhan yang ditawarkan saat pertama kali masuk
export const needOptions = [
  { id: 'netra', label: 'Tunanetra', hint: 'Saya memakai pembaca layar atau mengandalkan suara' },
  { id: 'low_vision', label: 'Low vision', hint: 'Saya butuh teks besar dan kontras tinggi' },
  { id: 'tuli', label: 'Tuli / hambatan pendengaran', hint: 'Saya mengandalkan teks dan isyarat' },
  { id: 'disleksia', label: 'Disleksia', hint: 'Saya lebih mudah membaca dengan huruf berjarak renggang' },
  { id: 'kognitif', label: 'Hambatan belajar', hint: 'Saya butuh penjelasan pelan dan sederhana' },
  { id: 'motorik', label: 'Hambatan gerak', hint: 'Saya memakai keyboard atau alat bantu, bukan mouse' },
];

// Pengaturan awal yang cocok untuk tiap kebutuhan; pengguna tetap bisa mengubahnya nanti
const applyNeeds = (base: SettingsValues, needs: string[]): SettingsValues => {
  const next = { ...base, needs };
  const has = (need: string) => needs.includes(need);

  if (has('low_vision')) {
    next.highContrast = true;
    next.largeText = true;
    next.textSize = 80;
  }
  if (has('disleksia') || has('kognitif')) {
    next.textSize = Math.max(next.textSize, 65);
    next.speakingRate = 'slow';
  }
  if (has('disleksia')) {
    next.dyslexiaFont = true;
  }
  if (has('netra')) {
    next.screenReader = true;
    next.autoPlayAudio = true;
  } else if (has('tuli')) {
    next.autoPlayAudio = false;
  }
  return next;
};

// Buat Context
const SettingsContext = createContext<SettingsType | undefined>(undefined);

// Provider Component
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [userId, setUserId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Load settings dari LocalStorage saat pertama kali render
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Gagal memuat pengaturan:", e);
      }
    }
  }, []);

  // Ikuti status login agar pengaturan bisa diambil dari akun
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

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
        .select('large_text, high_contrast, screen_reader, text_size, auto_play_audio, speaking_rate, volume, language, needs, dyslexia_font, onboarded_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Gagal memuat pengaturan akun:", error);
        return;
      }
      if (!data) return;

      const fromAccount: SettingsValues = {
        largeText: data.large_text,
        highContrast: data.high_contrast,
        screenReader: data.screen_reader,
        textSize: data.text_size,
        autoPlayAudio: data.auto_play_audio,
        speakingRate: data.speaking_rate,
        volume: data.volume,
        language: data.language,
        needs: data.needs,
        dyslexiaFont: data.dyslexia_font,
      };
      setNeedsOnboarding(data.onboarded_at === null);
      setSettings(fromAccount);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fromAccount));
    };

    loadFromAccount();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Efek Global: Terapkan CSS Class & Font Size ke HTML/Body
  useEffect(() => {
    const root = document.documentElement;

    // 1. High Contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 2. Text Size (Base font size percentage)
    // 50 = 100%, 100 = 150%, 0 = 80%
    const baseSizePercentage = 100 + (settings.textSize - 50);
    root.style.fontSize = `${baseSizePercentage}%`;

    // 3. Huruf ramah disleksia
    root.classList.toggle('dyslexia-font', settings.dyslexiaFont);

  }, [settings.highContrast, settings.textSize, settings.dyslexiaFont]);

  // Fungsi Update State
  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Fungsi Simpan Permanen: ke perangkat, dan ke akun bila sedang login
  const saveSettings = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (!userId) {
      toast.success("Pengaturan disimpan di perangkat ini.");
      return;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...toRow(settings) });

    if (error) {
      console.error("Gagal menyimpan pengaturan ke akun:", error);
      toast.error("Pengaturan tersimpan di perangkat ini, tetapi gagal disimpan ke akun.");
      return;
    }

    toast.success("Pengaturan berhasil disimpan!");
  };

  // Menyimpan profil kebutuhan dari dialog pertama masuk dan menerapkan pengaturan awalnya
  const completeOnboarding = async (needs: string[]) => {
    const next = applyNeeds(settings, needs);
    setSettings(next);
    setNeedsOnboarding(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (!userId) return;
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...toRow(next), onboarded_at: new Date().toISOString() });

    if (error) {
      console.error("Gagal menyimpan profil kebutuhan:", error);
      toast.error("Profil kebutuhan belum tersimpan ke akun.");
      return;
    }
    if (needs.length > 0) toast.success("Tampilan sudah disesuaikan. Bisa diubah kapan saja di Pengaturan.");
  };

  return (
    <SettingsContext.Provider value={{ ...settings, needsOnboarding, updateSetting, saveSettings, completeOnboarding }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom Hook agar mudah dipanggil
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
