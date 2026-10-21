# Sisa Perbaikan Sebelum Lomba — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last fake data from the app and make the voice-control hints correct on touch-only devices, before the UINIC 8.0 feature freeze (21 Oct 2026).

**Architecture:** Two independent frontend changes. Task 1 replaces a hardcoded Pathly stat card with real data the page already loads. Task 2 adds one small media-query helper plus a React hook, and uses it in the five places that tell the user to press Alt+M, so touch-only devices are told to tap the microphone instead.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind (shadcn/ui), vitest (node environment, no jsdom). All commands run from `Frontend/`.

**Spec:** None written. The requirements come from the user's chat request: "(1) kartu 'Liga Saat Ini: Berlian' di Pathly arena yang di-hardcode, (2) petunjuk mic di layar sentuh menyebut Alt+M padahal harus 'ketuk tombol mic'". Rulings made without a spec are provisional.

## Global Constraints

- All user-facing text is Indonesian, in the same plain style as the surrounding copy.
- No new dependencies.
- Do not change behaviour on desktop: on devices with a mouse or keyboard, every existing Alt+M hint stays exactly as it is.
- Verification commands, run from `Frontend/`: `npx tsc --noEmit -p tsconfig.app.json` (must print nothing), `npx vitest run` (all pass), `npm run build` (ends with `✓ built in`).
- Commit messages in Indonesian. **No `Co-Authored-By` line and no AI attribution of any kind** (the repository owner's standing rule).
- Never commit `.env*`, `appsettings.json`, keys, or `client_secret_*.json`.

## Review Focus

1. Pathly modules still loading when the arena opens → the card shows `…`, never `0 dari 0`.
2. A laptop with a touchscreen **and** a mouse/trackpad → treated as NOT touch-only (keeps the Alt+M hint), because `(hover: none) and (pointer: coarse)` is false there.
3. `window.matchMedia` missing (tests, very old browsers) → `isTouchOnly` returns `false` instead of throwing.
4. A tablet that gets a keyboard attached while the page is open → the hook re-renders through the `change` listener.
5. A screen reader user on a phone (TalkBack) → the mic button's `aria-label` no longer mentions Alt M / Ctrl M.

Items 2 and 3 are pinned by the unit tests in Task 2. Item 1 is pinned by Task 1, Step 2. Items 4 and 5 are covered by the code in Task 2, Steps 3 and 4.

---

### Task 1: Pathly arena — replace the fake "Liga Saat Ini: Berlian" card

The arena (mini-games) header has three stat cards. Streak and XP are real. The third card always says "Liga Saat Ini — Berlian", which is hardcoded. A league system does not exist. Replace it with "Modul Selesai", counted from `modulesState`, which the page already loads.

**Files:**
- Modify: `Frontend/src/pages/Pathly.tsx` (the third `<Card>` inside the `{/* Header Stats */}` grid, near line 1385)

**Interfaces:**
- Consumes: existing state in `Pathly.tsx`: `modulesState: PathModule[]` (each has `status: "locked" | "unlocked" | "completed"`), `isLoadingModules: boolean`.
- Produces: nothing used by other tasks.

- [ ] **Step 1: Find the card**

Run: `grep -n "Liga Saat Ini" -B4 -A4 src/pages/Pathly.tsx`
Expected: one hit, inside a card that looks like this:

```tsx
              <Card className="px-card p-4 flex items-center gap-3 md:col-span-2">
                <Trophy className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">
                    Liga Saat Ini
                  </p>
                  <p className="text-xl font-bold text-purple-600">Berlian</p>
                </div>
              </Card>
```

- [ ] **Step 2: Replace it with real data**

Replace that whole `<Card>` with:

```tsx
              <Card className="px-card p-4 flex items-center gap-3 md:col-span-2 xl:col-span-1">
                <Trophy className="w-8 h-8 text-purple-500" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">
                    Modul Selesai
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    {isLoadingModules
                      ? "…"
                      : `${modulesState.filter((mod) => mod.status === "completed").length} dari ${modulesState.length}`}
                  </p>
                </div>
              </Card>
```

Why `xl:col-span-1`: from `xl` up the stats grid becomes one column (`xl:grid-cols-1`). Without it, the card would still span 2 columns there and create an extra implicit column.

- [ ] **Step 3: Check that no fake league text is left**

Run: `grep -rn "Berlian\|Liga Saat Ini" src/`
Expected: no output.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run && npm run build`
Expected: tsc prints nothing; vitest all passed; build ends with `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Pathly.tsx
git commit -m "Pathly: ganti kartu liga palsu dengan jumlah modul selesai"
```

---

### Task 2: Touch-only devices see "ketuk tombol mikrofon" instead of Alt+M

Five places tell users to press Alt+M. A phone has no Alt key. Add a helper that detects touch-only devices, and switch those texts.

**Files:**
- Create: `Frontend/src/lib/inputMode.ts`
- Create: `Frontend/src/lib/inputMode.test.ts`
- Create: `Frontend/src/hooks/use-touch-only.ts`
- Modify: `Frontend/src/components/VoiceAssistant.tsx` (intro bubble text near line 541; mic button `aria-label` near line 622)
- Modify: `Frontend/src/pages/Dashboard.tsx` (near lines 170 and 191)
- Modify: `Frontend/src/pages/Landing.tsx` (near lines 458 and 491)
- Modify: `Frontend/src/components/OnboardingDialog.tsx` (`introText`, `consentText`, `yesLabel`, `noLabel`, near lines 35–45 and 124–125)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `TOUCH_ONLY_QUERY: string` = `"(hover: none) and (pointer: coarse)"`
  - `isTouchOnly(matchMedia?: (query: string) => { matches: boolean }): boolean`
  - `useTouchOnly(): boolean` (React hook, default export not used; named export)

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/lib/inputMode.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isTouchOnly, TOUCH_ONLY_QUERY } from "./inputMode";

const fakeMatchMedia = (matching: string[]) => (query: string) => ({ matches: matching.includes(query) });

describe("isTouchOnly", () => {
  it("true di perangkat yang hanya punya layar sentuh", () => {
    expect(isTouchOnly(fakeMatchMedia([TOUCH_ONLY_QUERY]))).toBe(true);
  });

  it("false di laptop layar sentuh yang juga punya tetikus", () => {
    expect(isTouchOnly(fakeMatchMedia([]))).toBe(false);
  });

  it("false bila matchMedia tidak tersedia", () => {
    expect(isTouchOnly(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/inputMode.test.ts`
Expected: FAIL, cannot resolve `./inputMode`.

- [ ] **Step 3: Write the helper and the hook**

Create `Frontend/src/lib/inputMode.ts`:

```ts
// Perangkat yang hanya punya layar sentuh (ponsel, tablet tanpa keyboard/tetikus).
// Laptop layar sentuh yang juga punya tetikus tidak termasuk, karena masih punya hover.
export const TOUCH_ONLY_QUERY = "(hover: none) and (pointer: coarse)";

export const isTouchOnly = (matchMedia?: (query: string) => { matches: boolean }) =>
  typeof matchMedia === "function" && matchMedia(TOUCH_ONLY_QUERY).matches;
```

Create `Frontend/src/hooks/use-touch-only.ts`:

```ts
import { useEffect, useState } from "react";
import { isTouchOnly, TOUCH_ONLY_QUERY } from "@/lib/inputMode";

// Ikut berubah bila keyboard atau tetikus dipasang/dilepas saat halaman terbuka
export function useTouchOnly() {
  const [touchOnly, setTouchOnly] = useState(
    () => typeof window !== "undefined" && isTouchOnly(window.matchMedia?.bind(window))
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(TOUCH_ONLY_QUERY);
    const onChange = () => setTouchOnly(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return touchOnly;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/inputMode.test.ts`
Expected: 3 passed.

- [ ] **Step 5: VoiceAssistant — intro bubble and button label**

In `Frontend/src/components/VoiceAssistant.tsx`:

1. Add the import next to the other `@/` imports:

```ts
import { useTouchOnly } from "@/hooks/use-touch-only";
```

2. Inside the component body, next to the other hooks at the top (for example right after `const location = useLocation();` or the first `useState`), add:

```ts
  const touchOnly = useTouchOnly();
```

3. Replace the intro paragraph (currently):

```tsx
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Tekan tombol mikrofon atau <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold">Alt+M</kbd>, lalu
            ucapkan perintah. Kamu bisa pindah halaman dan menekan tombol tanpa menyentuh layar.
          </p>
```

with:

```tsx
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {touchOnly ? (
              <>Ketuk tombol mikrofon, lalu ucapkan perintah. Kamu bisa pindah halaman dan menekan tombol hanya dengan suara.</>
            ) : (
              <>
                Tekan tombol mikrofon atau <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold">Alt+M</kbd>, lalu
                ucapkan perintah. Kamu bisa pindah halaman dan menekan tombol tanpa menyentuh layar.
              </>
            )}
          </p>
```

4. Replace the mic button's idle `aria-label` string:

```tsx
            : "Perintah suara. Tekan lalu bicara, atau tekan Alt M atau Ctrl M. Katakan bantuan untuk daftar perintah."
```

with:

```tsx
            : touchOnly
            ? "Perintah suara. Ketuk lalu bicara. Katakan bantuan untuk daftar perintah."
            : "Perintah suara. Tekan lalu bicara, atau tekan Alt M atau Ctrl M. Katakan bantuan untuk daftar perintah."
```

Leave the `title="Perintah suara (Alt+M atau Ctrl+M)"` attribute as it is (tooltips never show on touch).

- [ ] **Step 6: Dashboard — two hints**

In `Frontend/src/pages/Dashboard.tsx`, import `useTouchOnly` from `@/hooks/use-touch-only` and call `const touchOnly = useTouchOnly();` at the top of the component, next to the other hooks.

Replace:

```tsx
            Tekan lalu ucapkan perintah (Alt+M). Katakan "bantuan" untuk daftar perintah
```

with:

```tsx
            {touchOnly
              ? 'Ketuk lalu ucapkan perintah. Katakan "bantuan" untuk daftar perintah'
              : 'Tekan lalu ucapkan perintah (Alt+M). Katakan "bantuan" untuk daftar perintah'}
```

Replace:

```tsx
              Tekan mikrofon atau <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold">Alt+M</kbd>, lalu ucapkan perintah. Atau klik contoh di bawah untuk melihat hasilnya.
```

with:

```tsx
              {touchOnly ? (
                <>Ketuk tombol mikrofon, lalu ucapkan perintah. Atau ketuk contoh di bawah untuk melihat hasilnya.</>
              ) : (
                <>
                  Tekan mikrofon atau <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold">Alt+M</kbd>, lalu ucapkan perintah. Atau klik contoh di bawah untuk melihat hasilnya.
                </>
              )}
```

- [ ] **Step 7: Landing — two hints**

In `Frontend/src/pages/Landing.tsx`, import `useTouchOnly` from `@/hooks/use-touch-only` and call `const touchOnly = useTouchOnly();` at the top of the `Landing` component, next to its other hooks.

Replace:

```tsx
              Tekan tombol mikrofon atau <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-base font-semibold">Alt+M</kbd>, lalu
              ucapkan perintah. Siswa tunanetra atau yang sulit memakai tangan bisa pindah halaman, menekan tombol, dan
              mendengar isi halaman tanpa menyentuh layar.
```

with:

```tsx
              {touchOnly ? (
                <>Ketuk tombol mikrofon, lalu ucapkan perintah.</>
              ) : (
                <>
                  Tekan tombol mikrofon atau <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-base font-semibold">Alt+M</kbd>, lalu
                  ucapkan perintah.
                </>
              )}{" "}
              Siswa tunanetra atau yang sulit memakai tangan bisa pindah halaman, menekan tombol, dan
              mendengar isi halaman hanya dengan suara.
```

Replace:

```tsx
                    <Keyboard className="h-4 w-4" /> atau tekan Alt+M
```

with:

```tsx
                    {touchOnly ? (
                      "ketuk sekali untuk bicara"
                    ) : (
                      <>
                        <Keyboard className="h-4 w-4" /> atau tekan Alt+M
                      </>
                    )}
```

- [ ] **Step 8: Onboarding dialog — spoken text and button labels**

In `Frontend/src/components/OnboardingDialog.tsx`, import `useTouchOnly` from `@/hooks/use-touch-only` and add `const touchOnly = useTouchOnly();` right after the existing `useState` calls at the top of `OnboardingDialog`.

Replace `introText` with:

```ts
  const introText =
    "Selamat datang di Hope.Ai. Agar tampilan dan suara cocok untukmu, ada " +
    total +
    (touchOnly
      ? " pertanyaan singkat. Jawab ya atau tidak dengan mengetuk tombolnya. Ketuk Mulai, atau Lewati."
      : " pertanyaan singkat. Jawab ya atau tidak. Tekan Y untuk ya dan T untuk tidak, atau tekan Alt M lalu ucapkan jawabanmu. Tekan Y untuk mulai, atau T untuk melewati.");
```

Replace `consentText` with:

```ts
  const consentText = (needs: string[]) =>
    needs.length === 0
      ? touchOnly
        ? "Kamu tidak memilih kebutuhan apa pun. Ketuk Selesai."
        : "Kamu tidak memilih kebutuhan apa pun. Tekan Y untuk selesai."
      : "Bolehkah Hope.Ai menyimpan jawabanmu di akun, agar ikut terbawa saat masuk dari perangkat lain? Data ini hanya bisa dilihat olehmu. " +
        (touchOnly
          ? "Ketuk Simpan di akun, atau Simpan di perangkat ini saja."
          : "Tekan Y untuk menyimpan di akun, atau T untuk menyimpan di perangkat ini saja.");
```

Replace the two label lines (currently near line 124):

```ts
  const yesLabel = step === "intro" ? "Mulai (Y)" : step === "consent" ? (selected.length ? "Simpan di akun (Y)" : "Selesai (Y)") : "Ya (Y)";
  const noLabel = step === "intro" ? "Lewati (T)" : step === "consent" ? "Simpan di perangkat ini saja (T)" : "Tidak (T)";
```

with:

```ts
  // Huruf pintasan hanya berguna bila ada keyboard
  const key = (letter: string) => (touchOnly ? "" : ` (${letter})`);
  const yesLabel =
    (step === "intro" ? "Mulai" : step === "consent" ? (selected.length ? "Simpan di akun" : "Selesai") : "Ya") + key("Y");
  const noLabel = (step === "intro" ? "Lewati" : step === "consent" ? "Simpan di perangkat ini saja" : "Tidak") + key("T");
```

Do not change the Y/T keyboard handler; it stays for keyboard users.

- [ ] **Step 9: Check that every Alt+M hint is now conditional**

Run: `grep -n "Alt+M\|Alt M" src/components/VoiceAssistant.tsx src/pages/Dashboard.tsx src/pages/Landing.tsx src/components/OnboardingDialog.tsx`
Expected: every remaining hit is either a code comment, the `title=` attribute in VoiceAssistant, or inside the non-touch branch of a `touchOnly ?` expression written in Steps 5–8.

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx vitest run && npm run build`
Expected: tsc prints nothing; vitest all passed (including the 3 new `isTouchOnly` tests); build ends with `✓ built in`.

- [ ] **Step 11: Commit**

```bash
git add src/lib/inputMode.ts src/lib/inputMode.test.ts src/hooks/use-touch-only.ts src/components/VoiceAssistant.tsx src/pages/Dashboard.tsx src/pages/Landing.tsx src/components/OnboardingDialog.tsx
git commit -m "Petunjuk suara di layar sentuh: ketuk tombol mikrofon, bukan Alt+M"
```

---

## Not in this plan (and why)

- **Re-measure Lighthouse after deploy.** Needs a push to `main` (Vercel deploys from it). That is an outward action the user must approve. Run it after the branch is merged and pushed.
- **Heavy GIFs** (`animasi-login.gif` 5.3 MB on the sign-in page; landing GIFs 1.3–11 MB, lazy-loaded). Converting them to video needs an encoder. The only one available is a downloaded ffmpeg binary, which the user's permission settings blocked. Raise it with the user separately.
- **Other audit findings:** the Info page contrast hits from Lighthouse were captured mid fade-in animation (ratio 1.5 on text that is normally dark), so they are not real defects. No other open findings remain from the axe/keyboard audit.
