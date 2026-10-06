// Tipe database HopeAI. Selaraskan dengan supabase/migrations bila skema berubah.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Kolom yang punya nilai default di database boleh dikosongkan saat insert
type Table<Row extends Record<string, unknown>, Optional extends keyof Row = never> = {
  Row: Row
  Insert: Omit<Row, Optional> & Partial<Pick<Row, Optional>>
  Update: Partial<Row>
  Relationships: []
}

export type AppRole = "student" | "teacher" | "admin"

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          full_name: string | null
          avatar_url: string | null
          xp: number
          streak: number
          last_active_date: string | null
          created_at: string
          updated_at: string
        },
        "full_name" | "avatar_url" | "xp" | "streak" | "last_active_date" | "created_at" | "updated_at"
      >
      user_roles: Table<
        { user_id: string; role: AppRole; created_at: string },
        "created_at"
      >
      user_settings: Table<
        {
          user_id: string
          needs: string[]
          large_text: boolean
          high_contrast: boolean
          screen_reader: boolean
          text_size: number
          auto_play_audio: boolean
          speaking_rate: string
          volume: number
          language: string
          dyslexia_font: boolean
          onboarded_at: string | null
          created_at: string
          updated_at: string
        },
        | "needs"
        | "dyslexia_font"
        | "onboarded_at"
        | "large_text"
        | "high_contrast"
        | "screen_reader"
        | "text_size"
        | "auto_play_audio"
        | "speaking_rate"
        | "volume"
        | "language"
        | "created_at"
        | "updated_at"
      >
      learning_modules: Table<
        {
          id: number
          sort_order: number
          title: string
          topic: string
          color: string
          position: string
          material_title: string
          material_content: string
          material_summary: string | null
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        },
        "id" | "color" | "position" | "material_summary" | "is_published" | "created_by" | "created_at" | "updated_at"
      >
      quiz_questions: Table<
        {
          id: string
          module_id: number
          sort_order: number
          question: string
          options: Json
          answer: string
          difficulty: number
          created_at: string
        },
        "id" | "sort_order" | "difficulty" | "created_at"
      >
      module_progress: Table<
        {
          user_id: string
          module_id: number
          status: string
          best_score: number
          completed_at: string | null
          updated_at: string
        },
        "status" | "best_score" | "completed_at" | "updated_at"
      >
      quiz_attempts: Table<
        {
          id: string
          user_id: string
          module_id: number
          score: number
          total: number
          created_at: string
        },
        "id" | "created_at"
      >
      game_scores: Table<
        { id: string; user_id: string; game: string; score: number; created_at: string },
        "id" | "created_at"
      >
      materials: Table<
        {
          id: string
          slug: string
          level: string
          sort_order: number
          title: string
          content: string
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        },
        "id" | "sort_order" | "is_published" | "created_by" | "created_at" | "updated_at"
      >
      sign_items: Table<
        {
          id: string
          category: string
          slug: string
          sort_order: number
          title: string
          description: string
          image_url: string | null
          video_url: string | null
          created_at: string
        },
        "id" | "sort_order" | "image_url" | "video_url" | "created_at"
      >
      user_documents: Table<
        {
          id: string
          user_id: string
          source: string
          title: string
          content: string
          summary: string | null
          created_at: string
          updated_at: string
        },
        "id" | "summary" | "created_at" | "updated_at"
      >
      chat_sessions: Table<
        {
          id: string
          user_id: string
          title: string
          document_id: string | null
          material_id: string | null
          created_at: string
          updated_at: string
        },
        "id" | "title" | "document_id" | "material_id" | "created_at" | "updated_at"
      >
      document_quiz_attempts: Table<
        { id: string; user_id: string; title: string; score: number; total: number; created_at: string },
        "id" | "created_at"
      >
      chat_messages: Table<
        {
          id: string
          session_id: string
          user_id: string
          role: string
          content: string
          created_at: string
        },
        "id" | "created_at"
      >
      forum_posts: Table<
        { id: string; author_id: string; content: string; created_at: string; updated_at: string },
        "id" | "created_at" | "updated_at"
      >
      forum_comments: Table<
        { id: string; post_id: string; author_id: string; content: string; created_at: string },
        "id" | "created_at"
      >
      forum_post_likes: Table<
        { post_id: string; user_id: string; created_at: string },
        "created_at"
      >
      notifications: Table<
        {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        },
        "id" | "type" | "is_read" | "created_at"
      >
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json }
    }
    Enums: {
      app_role: AppRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
