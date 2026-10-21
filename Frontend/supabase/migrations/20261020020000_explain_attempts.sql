-- "Jelaskan dengan suaramu" di Flexa: hasil penilaian penjelasan siswa.
-- Teks penjelasan siswa sengaja tidak disimpan; yang disimpan hanya skor dan
-- butir materi yang terlewat atau keliru, supaya guru tahu bagian yang perlu diulang.
CREATE TABLE public.explain_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Pengenal materi di Flexa (id materi, atau id dokumen unggahan)
  chapter_key TEXT NOT NULL CHECK (char_length(chapter_key) BETWEEN 1 AND 200),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  missing TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(missing) <= 4),
  wrong TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(wrong) <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX explain_attempts_user_id_idx ON public.explain_attempts (user_id, created_at DESC);

ALTER TABLE public.explain_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own explain attempts"
ON public.explain_attempts FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Users can insert their own explain attempts"
ON public.explain_attempts FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
