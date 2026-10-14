import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Pause, Play, RotateCcw, Settings2, X } from "lucide-react";
import { MASCOT, MASCOT_COLORS, MASCOT_FLAP } from "@/components/LandingArt";
import { PLAYER, WORLD, createGame, jump, releaseJump, startGame, togglePause, update, type GameState, type Mode, type Status } from "@/lib/hopeRun";

// Hope Run: permainan lari tanpa akhir di landing page. Aturan mainnya ada di
// lib/hopeRun.ts; berkas ini mengurus masukan, putaran gambar, dan tampilannya.

const TILE = 320; // lebar satu ubin latar setelah diperkecil ke ukuran dunia
const LAYERS = [1, 2, 3, 4].map((n) => `/parallax/s2/${n}.png`);
const NAVY = "#0a1a4f";

// --- Pengaturan pemain, disimpan di perangkat ---

type Keys = "semua" | "spasi" | "apa-saja";
type Size = "sedang" | "besar" | "sangat-besar";
type Options = { mode: Mode; keys: Keys; sound: boolean; size: Size };

const DEFAULTS: Options = { mode: "normal", keys: "semua", sound: false, size: "sedang" };
const OPTIONS_KEY = "hopeRunOptions";
const bestKey = (mode: Mode) => (mode === "bantuan" ? "hopeRunBestBantuan" : "hopeRunBest");

function readOptions(): Options {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}
function readBest(mode: Mode) {
  try {
    return Number(localStorage.getItem(bestKey(mode))) || 0;
  } catch {
    return 0;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Penyimpanan diblokir: pilihan dan skor hanya berlaku selama halaman terbuka
  }
}

const isJumpKey = (event: KeyboardEvent, keys: Keys) => {
  if (keys === "spasi") return event.key === " ";
  if (keys === "semua") return event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W";
  // "Tombol apa saja": cocok untuk saklar atau papan ketik bantu. Tombol pengubah tidak dihitung.
  return !["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape", "p", "P"].includes(event.key);
};

const JUMP_BUTTON: Record<Size, string> = {
  sedang: "!min-h-16 !text-[13px]",
  besar: "!min-h-24 !text-base",
  "sangat-besar": "!min-h-36 !text-xl",
};

// --- Bunyi pendek dari Web Audio; hanya dibuat bila pemain menyalakan suara ---

function createSound() {
  const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return null;
  const audio = new Audio();
  const beep = (from: number, to: number, seconds: number, type: OscillatorType = "square") => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(to, audio.currentTime + seconds);
    gain.gain.setValueAtTime(0.06, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + seconds);
  };
  return {
    jump: () => beep(330, 660, 0.12),
    star: () => beep(880, 1320, 0.1),
    hit: () => beep(220, 80, 0.3, "sawtooth"),
    close: () => void audio.close(),
  };
}

// --- Gambar ---

function drawMascot(context: CanvasRenderingContext2D, x: number, y: number, stride: boolean, airborne: boolean) {
  MASCOT.forEach((line, row) => {
    // Sirip mengepak saat di udara, kaki bergantian saat berlari
    const source = airborne ? (MASCOT_FLAP[row] ?? line) : line;
    for (let column = 0; column < source.length; column++) {
      const cell = source[column];
      if (cell === ".") continue;
      // Saat berlari, telapak kaki kiri dan kanan terangkat bergantian
      const foot = column <= 6 ? "kiri" : column >= 15 ? "kanan" : "";
      if (!airborne && row >= 23 && foot === (stride ? "kiri" : "kanan")) continue;
      context.fillStyle = MASCOT_COLORS[cell];
      context.fillRect(Math.round(x) + column, Math.round(y) + row, 1, 1);
    }
  });
}

function drawObstacle(context: CanvasRenderingContext2D, x: number, width: number, height: number, kind: string) {
  const left = Math.round(x);
  const top = WORLD.ground - height;
  // Garis tepi dengan sudut terpangkas, supaya bentuknya tampak membulat
  context.fillStyle = NAVY;
  context.fillRect(left + 1, top, width - 2, height);
  context.fillRect(left, top + 1, width, height - 1);
  if (kind === "batang") {
    context.fillStyle = "#9a5b2c";
    context.fillRect(left + 1, top + 1, width - 2, height - 1);
    context.fillStyle = "#c98a4b";
    context.fillRect(left + 2, top + 3, 2, height - 5);
    context.fillStyle = "#e6c08a";
    context.fillRect(left + 1, top + 1, width - 2, 2);
  } else {
    context.fillStyle = "#8a93a6";
    context.fillRect(left + 1, top + 1, width - 2, height - 1);
    context.fillStyle = "#c3cad8";
    context.fillRect(left + 2, top + 2, Math.max(2, Math.floor(width / 3)), 2);
  }
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, twinkle: boolean) {
  const left = Math.round(x);
  const top = Math.round(y);
  context.fillStyle = NAVY;
  context.fillRect(left + 3, top - 1, 3, 11);
  context.fillRect(left - 1, top + 3, 11, 3);
  context.fillRect(left + 1, top + 1, 7, 7);
  context.fillStyle = twinkle ? "#fde68a" : "#fcd34d";
  context.fillRect(left + 4, top, 1, 9);
  context.fillRect(left, top + 4, 9, 1);
  context.fillRect(left + 2, top + 2, 5, 5);
}

type Props = {
  onClose: () => void;
  // true: latar tidak bergeser dan tidak ada kedipan (Kurangi Gerakan)
  calm: boolean;
};

export default function HopeRun({ onClose, calm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const game = useRef<GameState>(createGame());
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState(readOptions);
  const optionsRef = useRef(options);
  const [best, setBest] = useState(() => readBest(options.mode));
  const bestRef = useRef(best);
  const [lives, setLives] = useState(game.current.lives);
  const sound = useRef<ReturnType<typeof createSound>>(null);

  const choose = <K extends keyof Options>(key: K, value: Options[K]) => {
    const next = { ...optionsRef.current, [key]: value };
    optionsRef.current = next;
    setOptions(next);
    store(OPTIONS_KEY, JSON.stringify(next));
    if (key === "mode") {
      bestRef.current = readBest(next.mode);
      setBest(bestRef.current);
    }
  };

  // Suara baru dibuat setelah pemain menyalakannya dan menekan Mulai, tidak pernah otomatis
  useEffect(() => () => sound.current?.close(), []);
  const endedAt = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const begin = useCallback(() => {
    // Sesaat setelah kalah, tekanan tombol yang telanjur tidak langsung memulai ulang
    if (game.current.status === "over" && performance.now() - endedAt.current < 450) return;
    const chosen = optionsRef.current;
    if (chosen.sound && !sound.current) sound.current = createSound();
    if (!chosen.sound && sound.current) {
      sound.current.close();
      sound.current = null;
    }
    game.current = startGame(chosen.mode);
    setLives(game.current.lives);
    setScore(0);
    setStatus("running");
  }, []);

  // Fokus pindah ke arena begitu permainan berjalan, supaya spasi berarti lompat, bukan menekan tombol
  useEffect(() => {
    if (status === "running") stageRef.current?.focus();
  }, [status]);

  const pauseOrResume = useCallback(() => {
    togglePause(game.current);
    setStatus(game.current.status);
  }, []);

  const press = useCallback(() => {
    const state = game.current;
    if (state.status === "running") {
      if (jump(state)) sound.current?.jump();
    } else if (state.status === "over") begin();
  }, [begin]);

  // Kembali ke layar pengaturan
  const openSettings = useCallback(() => {
    game.current = createGame(optionsRef.current.mode);
    setScore(0);
    setStatus("ready");
  }, []);

  const arenaShown = status !== "ready";

  // --- Putaran permainan: hanya berjalan selama arena tampil ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.imageSmoothingEnabled = false;

    const layers = LAYERS.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    let frame = 0;
    let last = performance.now();
    let shownScore = -1;
    let shownStatus: Status = game.current.status;
    let seen = game.current;
    let stars = 0;
    let hits = 0;

    const render = (now: number) => {
      const state = game.current;
      context.fillStyle = "#7cc4e8";
      context.fillRect(0, 0, WORLD.width, WORLD.height);
      layers.forEach((image, i) => {
        if (!image.complete || image.naturalWidth === 0) return;
        // Lapisan jauh bergeser pelan, tanah di depan mengikuti kecepatan lari
        const depth = calm ? 0 : [0.05, 0.2, 0.5, 1][i];
        const offset = -((state.distance * depth) % TILE);
        context.drawImage(image, Math.round(offset), 0, TILE, WORLD.height);
        context.drawImage(image, Math.round(offset) + TILE, 0, TILE, WORLD.height);
      });

      // Bayangan di tanah mengecil saat penguin melompat
      const lift = WORLD.ground - PLAYER.height - state.y;
      context.fillStyle = "rgba(10, 26, 79, 0.28)";
      const shadow = Math.max(8, 16 - lift / 6);
      context.fillRect(Math.round(PLAYER.x + PLAYER.width / 2 - shadow / 2), WORLD.ground - 1, Math.round(shadow), 2);

      for (const obstacle of state.obstacles) drawObstacle(context, obstacle.x, obstacle.width, obstacle.height, obstacle.kind);
      const twinkle = !calm && Math.floor(now / 220) % 2 === 0;
      for (const star of state.pickups) drawStar(context, star.x, star.y, twinkle);
      const stride = state.status === "running" && Math.floor(state.distance / 9) % 2 === 0;
      // Selagi kebal setelah menabrak, penguin berkedip (tetap terlihat bila Kurangi Gerakan aktif)
      const hidden = state.shield > 0 && !calm && Math.floor(now / 90) % 2 === 0;
      if (!hidden) drawMascot(context, PLAYER.x, state.y, stride, !state.grounded);
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const state = game.current;
      const dt = (now - last) / 1000;
      last = now;
      update(state, dt);
      render(now);

      // Permainan baru: hitungan bunyi diulang dari nol
      if (state !== seen) {
        seen = state;
        stars = 0;
        hits = 0;
      }
      if (state.stars > stars) sound.current?.star();
      if (state.hits > hits) {
        sound.current?.hit();
        setLives(state.lives);
      }
      stars = state.stars;
      hits = state.hits;

      // Tampilan skor dan layar akhir hanya diperbarui saat nilainya berubah
      if (state.score !== shownScore) {
        shownScore = state.score;
        setScore(state.score);
      }
      if (state.status !== shownStatus) {
        shownStatus = state.status;
        setStatus(state.status);
        if (state.status === "over") endedAt.current = now;
        if (state.status === "over" && state.score > bestRef.current) {
          bestRef.current = state.score;
          setBest(state.score);
          store(bestKey(state.mode), String(state.score));
        }
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // Arena baru ada setelah layar pengaturan ditutup, jadi putaran dimulai saat itu
  }, [calm, arenaShown]);

  // --- Masukan keyboard, kehilangan fokus, dan kunci gulir halaman ---
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Sedang mengetik: tombol tidak dianggap perintah permainan
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (game.current.status === "running") pauseOrResume();
        else onClose();
        return;
      }
      if (event.key === "p" || event.key === "P") {
        if (game.current.status === "running" || game.current.status === "paused") pauseOrResume();
        return;
      }
      // Tab hanya berputar di antara tombol-tombol permainan
      if (event.key === "Tab") {
        const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []).filter(
          (item) => item.offsetParent !== null
        );
        if (items.length === 0) return;
        const index = items.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
        return;
      }
      // Di layar pengaturan, papan ketik dipakai untuk memilih, bukan untuk bermain
      if (game.current.status === "ready") return;
      if (!isJumpKey(event, optionsRef.current.keys)) return;
      // Spasi atau Enter pada tombol tetap berarti menekan tombol itu
      if ((event.key === " " || event.key === "Enter") && target?.closest("button, a")) return;
      event.preventDefault(); // halaman tidak ikut bergulir
      if (event.repeat) return; // menahan tombol tidak berarti melompat berulang-ulang
      if (game.current.status === "paused") pauseOrResume();
      else press();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isJumpKey(event, optionsRef.current.keys)) releaseJump(game.current);
    };
    // Pindah tab atau jendela: permainan berhenti sendiri
    const pauseIfRunning = () => {
      if (game.current.status === "running") pauseOrResume();
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfRunning();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", pauseIfRunning);
    document.addEventListener("visibilitychange", onVisibility);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", pauseIfRunning);
      document.removeEventListener("visibilitychange", onVisibility);
      document.body.style.overflow = overflow;
    };
  }, [onClose, pauseOrResume, press]);

  const playing = status === "running";
  const record = status === "over" && score > 0 && score >= best;
  const wide = "w-full max-w-[min(48rem,calc((100svh-13rem)*16/9))]";

  // Satu kelompok pilihan: tombol besar, yang terpilih ditandai warna dan aria-pressed
  const group = <K extends keyof Options>(label: string, key: K, choices: { value: Options[K]; text: string; hint?: string }[]) => (
    <fieldset className="min-w-0">
      <legend className="text-[11px] text-amber-300 md:text-xs">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = options[key] === choice.value;
          return (
            <button
              key={String(choice.value)}
              type="button"
              aria-pressed={selected}
              title={choice.hint}
              onClick={() => choose(key, choice.value)}
              className={`pixel-button pixel-text ${selected ? "pixel-button-green" : "pixel-button-blue opacity-80"}`}
            >
              {selected && <span aria-hidden="true">✓&nbsp;</span>}
              {choice.text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hope-run-judul"
      className="fixed inset-0 z-[80] flex flex-col items-center gap-3 overflow-y-auto bg-[#0a1a4f]/95 p-3 md:gap-4 md:p-6"
    >
      <div className={`${wide} my-auto flex flex-col gap-3 md:gap-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="hope-run-judul" className="pixel-text font-pixel text-sm md:text-lg !text-amber-300">
            Hope Run
          </h2>
          <div className="flex items-center gap-2">
            {(status === "running" || status === "paused") && (
              <button type="button" onClick={pauseOrResume} className="pixel-button pixel-button-blue pixel-text gap-2">
                {status === "paused" ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                {status === "paused" ? "Lanjut" : "Jeda"}
              </button>
            )}
            <button type="button" onClick={onClose} className="pixel-button pixel-button-blue pixel-text gap-2">
              <X className="h-4 w-4" aria-hidden="true" /> Tutup
            </button>
          </div>
        </div>

        {status === "ready" ? (
          /* Pengaturan sebelum bermain */
          <div className="pixel-sheet flex flex-col gap-5 px-4 py-6 text-white md:px-8 md:py-8">
            <p className="pixel-body-plain text-base leading-relaxed md:text-lg">
              Lompati rintangan dan kumpulkan bintang. Atur dulu cara bermain yang paling nyaman untukmu.
            </p>
            {group("Tingkat kesulitan", "mode", [
              { value: "normal", text: "Normal" },
              { value: "bantuan", text: "Mode Bantuan", hint: "Lebih lambat, rintangan lebih jarang, dan tiga kesempatan" },
            ])}
            {options.mode === "bantuan" && (
              <p className="pixel-body-plain -mt-2 text-sm md:text-base">Lebih lambat, rintangan lebih jarang, dan ada tiga kesempatan.</p>
            )}
            {group("Tombol lompat di papan ketik", "keys", [
              { value: "semua", text: "Spasi, W, Panah Atas" },
              { value: "spasi", text: "Spasi saja" },
              { value: "apa-saja", text: "Tombol apa saja", hint: "Cocok untuk saklar atau papan ketik bantu" },
            ])}
            {group("Ukuran tombol Lompat di layar", "size", [
              { value: "sedang", text: "Sedang" },
              { value: "besar", text: "Besar" },
              { value: "sangat-besar", text: "Sangat besar" },
            ])}
            {group("Suara", "sound", [
              { value: false, text: "Mati" },
              { value: true, text: "Nyala" },
            ])}
            <p className="pixel-body-plain text-sm md:text-base">Jeda kapan saja dengan P, Esc, atau tombol Jeda.</p>
            <button type="button" autoFocus onClick={begin} className="pixel-button pixel-button-green pixel-button-md pixel-text gap-3 self-start">
              <Play className="h-4 w-4" aria-hidden="true" /> Mulai
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 text-xs text-white md:text-sm">
              <p>
                Skor <span className="text-amber-300">{score}</span>
              </p>
              {options.mode === "bantuan" && (
                <p className="flex items-center gap-1" aria-label={`Kesempatan tersisa ${lives}`}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Heart key={i} aria-hidden="true" className={`h-4 w-4 ${i < lives ? "fill-pink-300 text-pink-300" : "text-white/30"}`} />
                  ))}
                </p>
              )}
              <p>
                Terbaik <span className="text-amber-300">{Math.max(best, status === "over" ? score : 0)}</span>
              </p>
            </div>

            {/* Arena: ketuk di mana saja untuk melompat */}
            <div
              ref={stageRef}
              tabIndex={-1}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                if (playing) press();
              }}
              onPointerUp={() => releaseJump(game.current)}
              className="relative touch-none select-none border-4 border-white/40 outline-none"
            >
              <canvas
                ref={canvasRef}
                width={WORLD.width}
                height={WORLD.height}
                aria-label="Arena permainan Hope Run"
                className="block w-full"
                style={{ imageRendering: "pixelated", aspectRatio: `${WORLD.width} / ${WORLD.height}` }}
              />

              {!playing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a1a4f]/70 p-4 text-center md:gap-5">
                  {status === "paused" && (
                    <>
                      <p className="pixel-text-lg font-pixel text-lg md:text-3xl">Jeda</p>
                      <button type="button" autoFocus onClick={pauseOrResume} className="pixel-button pixel-button-green pixel-button-md pixel-text gap-3">
                        <Play className="h-4 w-4" aria-hidden="true" /> Lanjut
                      </button>
                    </>
                  )}
                  {status === "over" && (
                    <>
                      <p className="pixel-text-lg font-pixel text-lg md:text-3xl">Game Over</p>
                      <p className="pixel-body text-base md:text-xl">
                        Skor {score}
                        {record ? " · Rekor baru!" : ""}
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <button type="button" autoFocus onClick={begin} className="pixel-button pixel-button-green pixel-button-md pixel-text gap-3">
                          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Main lagi
                        </button>
                        <button type="button" onClick={openSettings} className="pixel-button pixel-button-blue pixel-button-md pixel-text gap-3">
                          <Settings2 className="h-4 w-4" aria-hidden="true" /> Pengaturan
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tombol lompat di layar: untuk sentuhan maupun mouse, ukurannya mengikuti pilihan pemain */}
            <button
              type="button"
              disabled={!playing}
              onPointerDown={(event) => {
                event.preventDefault();
                press();
              }}
              onPointerUp={() => releaseJump(game.current)}
              onPointerLeave={() => releaseJump(game.current)}
              // Keyboard sudah ditangani di atas; ini mencegah satu tekanan dihitung dua kali
              onClick={(event) => event.preventDefault()}
              className={`pixel-button pixel-button-green pixel-button-md pixel-text mt-2 w-full touch-none select-none disabled:opacity-40 ${JUMP_BUTTON[options.size]}`}
            >
              Lompat
            </button>
          </>
        )}
      </div>

      {/* Pembaca layar diberi tahu saat permainan berakhir */}
      <p className="sr-only" aria-live="polite">
        {status === "over" ? `Permainan selesai. Skor ${score}.` : status === "paused" ? "Permainan dijeda." : ""}
      </p>
    </div>
  );
}
