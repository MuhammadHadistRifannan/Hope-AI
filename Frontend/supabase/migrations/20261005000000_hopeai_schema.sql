-- HopeAI: skema lengkap (profil, peran, aksesibilitas, belajar, forum, chat, notifikasi, storage).
-- Aman dijalankan di project kosong maupun setelah migrasi profiles yang lama.

-- ---------------------------------------------------------------------------
-- Fungsi umum
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Profil
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Nama dan avatar dibutuhkan forum, jadi terbaca oleh pengguna yang login saja
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Peran (dipisah dari profiles supaya pengguna tidak bisa menaikkan perannya sendiri)
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER agar policy bisa mengecek peran tanpa rekursi RLS.
-- Ditaruh di skema private supaya tidak terbuka sebagai RPC di Data API
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('teacher', 'admin')
  );
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can grant roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role((SELECT auth.uid()), 'admin'));

-- ---------------------------------------------------------------------------
-- Pengaturan aksesibilitas per akun
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  needs TEXT[] NOT NULL DEFAULT '{}'
    CHECK (needs <@ ARRAY['netra', 'low_vision', 'tuli', 'disleksia', 'kognitif', 'motorik']),
  large_text BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  screen_reader BOOLEAN NOT NULL DEFAULT true,
  text_size SMALLINT NOT NULL DEFAULT 50 CHECK (text_size BETWEEN 0 AND 100),
  auto_play_audio BOOLEAN NOT NULL DEFAULT false,
  speaking_rate TEXT NOT NULL DEFAULT 'normal' CHECK (speaking_rate IN ('slow', 'normal', 'fast')),
  volume SMALLINT NOT NULL DEFAULT 75 CHECK (volume BETWEEN 0 AND 100),
  language TEXT NOT NULL DEFAULT 'id',
  dyslexia_font BOOLEAN NOT NULL DEFAULT false,
  -- NULL berarti pengguna belum mengisi profil kebutuhan saat pertama masuk
  onboarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Pendaftaran: buat profil, pengaturan, dan peran student
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Pathly: modul, soal, progres, percobaan kuis, skor game
-- ---------------------------------------------------------------------------
CREATE TABLE public.learning_modules (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-emerald-500',
  position TEXT NOT NULL DEFAULT 'center' CHECK (position IN ('left', 'center', 'right')),
  material_title TEXT NOT NULL,
  material_content TEXT NOT NULL,
  material_summary TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array'),
  answer TEXT NOT NULL,
  -- 1 mudah, 2 sedang, 3 sulit; dipakai kuis adaptif
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX quiz_questions_module_id_idx ON public.quiz_questions (module_id, sort_order);

CREATE TABLE public.module_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked', 'completed')),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

CREATE INDEX module_progress_module_id_idx ON public.module_progress (module_id);

CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (score <= total)
);

CREATE INDEX quiz_attempts_user_id_idx ON public.quiz_attempts (user_id, created_at DESC);
CREATE INDEX quiz_attempts_module_id_idx ON public.quiz_attempts (module_id);

CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK (game IN ('memory', 'math')),
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX game_scores_user_id_idx ON public.game_scores (user_id, game, created_at DESC);

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published modules are viewable by authenticated users"
ON public.learning_modules FOR SELECT TO authenticated
USING (is_published OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can insert modules"
ON public.learning_modules FOR INSERT TO authenticated
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can update modules"
ON public.learning_modules FOR UPDATE TO authenticated
USING (private.is_staff((SELECT auth.uid())))
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can delete modules"
ON public.learning_modules FOR DELETE TO authenticated
USING (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Questions are viewable by authenticated users"
ON public.quiz_questions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can insert questions"
ON public.quiz_questions FOR INSERT TO authenticated
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can update questions"
ON public.quiz_questions FOR UPDATE TO authenticated
USING (private.is_staff((SELECT auth.uid())))
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can delete questions"
ON public.quiz_questions FOR DELETE TO authenticated
USING (private.is_staff((SELECT auth.uid())));

-- Guru dan admin boleh membaca progres siswa untuk pemantauan
CREATE POLICY "Users can view their own progress"
ON public.module_progress FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Users can insert their own progress"
ON public.module_progress FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own progress"
ON public.module_progress FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own attempts"
ON public.quiz_attempts FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Users can insert their own attempts"
ON public.quiz_attempts FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own game scores"
ON public.game_scores FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own game scores"
ON public.game_scores FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TRIGGER update_learning_modules_updated_at
BEFORE UPDATE ON public.learning_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_progress_updated_at
BEFORE UPDATE ON public.module_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Flexa: materi, kamus isyarat, dokumen milik pengguna (hasil pindai/unggah)
-- ---------------------------------------------------------------------------
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL CHECK (level IN ('mudah', 'menengah', 'sulit')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX materials_level_idx ON public.materials (level, sort_order);

CREATE TABLE public.sign_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (category, slug)
);

CREATE TABLE public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('scan', 'upload')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX user_documents_user_id_idx ON public.user_documents (user_id, created_at DESC);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published materials are viewable by authenticated users"
ON public.materials FOR SELECT TO authenticated
USING (is_published OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can insert materials"
ON public.materials FOR INSERT TO authenticated
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can update materials"
ON public.materials FOR UPDATE TO authenticated
USING (private.is_staff((SELECT auth.uid())))
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can delete materials"
ON public.materials FOR DELETE TO authenticated
USING (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Sign items are viewable by authenticated users"
ON public.sign_items FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can insert sign items"
ON public.sign_items FOR INSERT TO authenticated
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can update sign items"
ON public.sign_items FOR UPDATE TO authenticated
USING (private.is_staff((SELECT auth.uid())))
WITH CHECK (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Staff can delete sign items"
ON public.sign_items FOR DELETE TO authenticated
USING (private.is_staff((SELECT auth.uid())));

CREATE POLICY "Users can view their own documents"
ON public.user_documents FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.user_documents FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own documents"
ON public.user_documents FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.user_documents FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER update_materials_updated_at
BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at
BEFORE UPDATE ON public.user_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- NeoTutor: sesi dan pesan chat per pengguna
-- ---------------------------------------------------------------------------
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Percakapan baru',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX chat_sessions_user_id_idx ON public.chat_sessions (user_id, updated_at DESC);

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_session_id_idx ON public.chat_messages (session_id, created_at);
CREATE INDEX chat_messages_user_id_idx ON public.chat_messages (user_id);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own chat sessions"
ON public.chat_sessions FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON public.chat_sessions FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Pesan hanya boleh masuk ke sesi milik sendiri
CREATE POLICY "Users can insert messages into their own sessions"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = (SELECT auth.uid())
  )
);

CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sesi chat bisa membahas satu dokumen milik pengguna atau satu bab materi
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.user_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_sessions_document_id_idx ON public.chat_sessions (document_id);
CREATE INDEX IF NOT EXISTS chat_sessions_material_id_idx ON public.chat_sessions (material_id);

-- Hasil kuis yang dibuat AI dari dokumen atau materi
CREATE TABLE public.document_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (score <= total)
);

CREATE INDEX document_quiz_attempts_user_id_idx ON public.document_quiz_attempts (user_id, created_at DESC);

ALTER TABLE public.document_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document quiz attempts"
ON public.document_quiz_attempts FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR private.is_staff((SELECT auth.uid())));

CREATE POLICY "Users can insert their own document quiz attempts"
ON public.document_quiz_attempts FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Forum: postingan, komentar, suka
-- ---------------------------------------------------------------------------
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Mengacu ke profiles agar nama dan avatar bisa di-join lewat API
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX forum_posts_created_at_idx ON public.forum_posts (created_at DESC);
CREATE INDEX forum_posts_author_id_idx ON public.forum_posts (author_id);

CREATE TABLE public.forum_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX forum_comments_post_id_idx ON public.forum_comments (post_id, created_at);
CREATE INDEX forum_comments_author_id_idx ON public.forum_comments (author_id);

CREATE TABLE public.forum_post_likes (
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX forum_post_likes_user_id_idx ON public.forum_post_likes (user_id);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by authenticated users"
ON public.forum_posts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Users can update their own posts"
ON public.forum_posts FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = author_id)
WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors and admins can delete posts"
ON public.forum_posts FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = author_id OR private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Comments are viewable by authenticated users"
ON public.forum_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create their own comments"
ON public.forum_comments FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors and admins can delete comments"
ON public.forum_comments FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = author_id OR private.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Likes are viewable by authenticated users"
ON public.forum_post_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can like as themselves"
ON public.forum_post_likes FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove their own likes"
ON public.forum_post_likes FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Notifikasi
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'info', 'warning', 'achievement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tidak ada policy INSERT: notifikasi hanya dibuat oleh trigger/server
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Beri tahu penulis postingan saat ada balasan dari orang lain
CREATE OR REPLACE FUNCTION public.notify_post_author_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _post_author UUID;
  _commenter TEXT;
BEGIN
  SELECT author_id INTO _post_author FROM public.forum_posts WHERE id = NEW.post_id;

  IF _post_author IS NOT NULL AND _post_author <> NEW.author_id THEN
    SELECT COALESCE(full_name, 'Seseorang') INTO _commenter
    FROM public.profiles WHERE id = NEW.author_id;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      _post_author,
      'info',
      'Balasan Forum',
      _commenter || ' membalas postingan Anda.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_forum_comment_created
AFTER INSERT ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_post_author_on_comment();

-- ---------------------------------------------------------------------------
-- Statistik untuk Admin Dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang boleh melihat statistik' USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users_7d', (
      SELECT count(*) FROM public.profiles
      WHERE last_active_date >= current_date - 7
    ),
    'active_modules', (SELECT count(*) FROM public.learning_modules WHERE is_published),
    'forum_posts', (SELECT count(*) FROM public.forum_posts),
    'forum_comments', (SELECT count(*) FROM public.forum_comments),
    'quiz_attempts', (SELECT count(*) FROM public.quiz_attempts),
    'avg_quiz_score_pct', (
      SELECT COALESCE(round(avg(score * 100.0 / total)), 0) FROM public.quiz_attempts
    ),
    'chat_messages', (SELECT count(*) FROM public.chat_messages WHERE role = 'user'),
    'documents_scanned', (SELECT count(*) FROM public.user_documents WHERE source = 'scan'),
    'documents_uploaded', (SELECT count(*) FROM public.user_documents WHERE source = 'upload'),
    'game_plays', (SELECT count(*) FROM public.game_scores)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Hak akses Data API: hanya pengguna login, RLS tetap membatasi baris
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.module_progress TO authenticated;
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT ON public.game_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sign_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.document_quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.forum_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.forum_post_likes TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.is_staff(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_post_author_on_comment() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: foto profil di bucket "avatars", path "<user_id>/<file>"
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Bucket publik: file dibaca lewat URL publik. SELECT hanya untuk folder sendiri,
-- dibutuhkan oleh upload dengan upsert, tanpa membuka daftar file orang lain
CREATE POLICY "Users can view their own avatar files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
