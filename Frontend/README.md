# Hope.Ai Frontend

React 18 + TypeScript + Vite + Tailwind (shadcn/ui). Panduan lengkap proyek, arsitektur, dan cara
deploy ada di [README utama](../README.md).

## Menjalankan

```bash
cp .env.example .env   # isi VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_URL
npm install
npm run dev            # http://localhost:5173
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm test` | Tes unit (vitest) |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run build` | Build produksi ke `dist/` |

## Struktur singkat

- `src/pages/` satu berkas per halaman (Landing, Beranda, EyeRead, NeoTutor, Flexa, Pathly, Isyarat, Forum, dan lainnya)
- `src/components/` komponen bersama; `src/components/ui/` kit shadcn/ui
- `src/lib/` logika murni beserta tesnya (`*.test.ts`)
- `public/` aset statis: model isyarat, video BISINDO, animasi, dan font
- `supabase/migrations/` skema database
