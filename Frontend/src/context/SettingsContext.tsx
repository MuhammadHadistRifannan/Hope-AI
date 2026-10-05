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

  // Actions
  updateSetting: (key: string, value: any) => void;
  saveSettings: () => void;
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
});

// Buat Context
const SettingsContext = createContext<SettingsType | undefined>(undefined);

// Provider Component
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [userId, setUserId] = useState<string | null>(null);

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
    if (!userId) return;
    let cancelled = false;

    const loadFromAccount = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('large_text, high_contrast, screen_reader, text_size, auto_play_audio, speaking_rate, volume, language')
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
      };
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

  }, [settings.highContrast, settings.textSize]);

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

  return (
    <SettingsContext.Provider value={{ ...settings, updateSetting, saveSettings }}>
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
