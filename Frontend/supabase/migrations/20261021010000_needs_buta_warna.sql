-- Kebutuhan baru: sulit membedakan warna (buta warna). Menyalakan palet ramah
-- buta warna dan menyarankan alat Kenali Warna di EyeRead.
ALTER TABLE public.user_settings DROP CONSTRAINT user_settings_needs_check;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_needs_check
  CHECK (needs <@ ARRAY['netra', 'low_vision', 'tuli', 'disleksia', 'kognitif', 'motorik', 'wicara', 'buta_warna']);
