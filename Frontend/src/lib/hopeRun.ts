// Mesin permainan Hope Run: penguin berlari otomatis, pemain melompati rintangan
// dan mengumpulkan bintang. Berkas ini hanya berisi aturan mainnya (tanpa gambar
// dan tanpa masukan), supaya bisa diuji tersendiri.

export const WORLD = { width: 320, height: 180, ground: 152 };
export const PLAYER = { x: 44, width: 22, height: 26 };
// Kotak tabrak lebih kecil daripada gambarnya, supaya terasa adil
const HITBOX = { left: 6, right: 16, top: 5, bottom: 26 };

const GRAVITY = 900;
const JUMP_SPEED = 330;
const JUMP_CUT = 120; // tombol dilepas lebih awal: lompatan jadi lebih pendek
// Mode Bantuan: lebih lambat, rintangan lebih jarang, dan ada kesempatan tambahan
export type Mode = "normal" | "bantuan";
const MODES: Record<Mode, { start: number; max: number; acceleration: number; spacing: number; lives: number }> = {
  normal: { start: 110, max: 240, acceleration: 4, spacing: 1, lives: 1 },
  bantuan: { start: 80, max: 150, acceleration: 2, spacing: 1.6, lives: 3 },
};
const SHIELD = 1.4; // detik kebal setelah menabrak di Mode Bantuan
const STAR_POINTS = 10;
const STEP = 1 / 120;
const MAX_FRAME = 0.05; // jeda panjang (tab tertinggal) tidak membuat dunia melompat jauh

export type ObstacleKind = "batu" | "batang" | "batu-lebar";
export type Obstacle = { x: number; width: number; height: number; kind: ObstacleKind };
export type Star = { x: number; y: number; size: number };
export type Status = "ready" | "running" | "paused" | "over";

export type GameState = {
  status: Status;
  mode: Mode;
  lives: number;
  shield: number; // sisa waktu kebal
  hits: number; // jumlah tabrakan, untuk bunyi dan getar
  speed: number;
  distance: number;
  stars: number;
  score: number;
  y: number; // tepi atas pemain
  velocity: number;
  grounded: boolean;
  obstacles: Obstacle[];
  pickups: Star[];
  nextObstacle: number; // jarak sampai rintangan berikutnya muncul
  nextStar: number;
};

const SHAPES: Record<ObstacleKind, { width: number; height: number }> = {
  batu: { width: 14, height: 12 },
  batang: { width: 10, height: 20 },
  "batu-lebar": { width: 26, height: 13 },
};

export function createGame(mode: Mode = "normal"): GameState {
  return {
    status: "ready",
    mode,
    lives: MODES[mode].lives,
    shield: 0,
    hits: 0,
    speed: MODES[mode].start,
    distance: 0,
    stars: 0,
    score: 0,
    y: WORLD.ground - PLAYER.height,
    velocity: 0,
    grounded: true,
    obstacles: [],
    pickups: [],
    nextObstacle: 260,
    nextStar: 140,
  };
}

export function startGame(mode: Mode = "normal"): GameState {
  return { ...createGame(mode), status: "running" };
}

export function togglePause(state: GameState) {
  if (state.status === "running") state.status = "paused";
  else if (state.status === "paused") state.status = "running";
}

// Lompat hanya dari tanah; mengembalikan true bila lompatan terjadi
export function jump(state: GameState) {
  if (state.status !== "running" || !state.grounded) return false;
  state.velocity = -JUMP_SPEED;
  state.grounded = false;
  return true;
}

export function releaseJump(state: GameState) {
  if (state.status === "running" && state.velocity < -JUMP_CUT) state.velocity = -JUMP_CUT;
}

export function playerBox(state: GameState) {
  return {
    left: PLAYER.x + HITBOX.left,
    right: PLAYER.x + HITBOX.right,
    top: state.y + HITBOX.top,
    bottom: state.y + HITBOX.bottom,
  };
}

const overlaps = (
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function advance(state: GameState, dt: number, random: () => number) {
  const rules = MODES[state.mode];
  state.speed = Math.min(rules.max, state.speed + rules.acceleration * dt);
  state.shield = Math.max(0, state.shield - dt);
  const moved = state.speed * dt;
  state.distance += moved;

  // Gerak pemain
  state.velocity += GRAVITY * dt;
  state.y += state.velocity * dt;
  const floor = WORLD.ground - PLAYER.height;
  if (state.y >= floor) {
    state.y = floor;
    state.velocity = 0;
    state.grounded = true;
  }

  // Dunia bergeser ke kiri
  for (const obstacle of state.obstacles) obstacle.x -= moved;
  for (const star of state.pickups) star.x -= moved;
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -8);
  state.pickups = state.pickups.filter((star) => star.x + star.size > -8);

  // Rintangan baru: jaraknya mengikuti kecepatan, jadi selalu ada waktu untuk melompat
  state.nextObstacle -= moved;
  if (state.nextObstacle <= 0) {
    const kinds: ObstacleKind[] = ["batu", "batang", "batu-lebar"];
    const kind = kinds[Math.floor(random() * kinds.length)] ?? "batu";
    state.obstacles.push({ x: WORLD.width + 8, kind, ...SHAPES[kind] });
    state.nextObstacle = Math.max(150, state.speed * (0.85 + random() * 0.9)) * rules.spacing;
  }
  state.nextStar -= moved;
  if (state.nextStar <= 0) {
    state.pickups.push({ x: WORLD.width + 8, y: WORLD.ground - (30 + random() * 42), size: 9 });
    state.nextStar = 90 + random() * 160;
  }

  // Bintang terkumpul, lalu tabrakan
  const box = playerBox(state);
  state.pickups = state.pickups.filter((star) => {
    const taken = overlaps(box, { left: star.x, right: star.x + star.size, top: star.y, bottom: star.y + star.size });
    if (taken) state.stars += 1;
    return !taken;
  });
  for (const obstacle of state.obstacles) {
    const body = {
      left: obstacle.x + 1,
      right: obstacle.x + obstacle.width - 1,
      top: WORLD.ground - obstacle.height + 1,
      bottom: WORLD.ground,
    };
    if (state.shield === 0 && overlaps(box, body)) {
      state.hits += 1;
      state.lives -= 1;
      if (state.lives <= 0) {
        state.status = "over";
      } else {
        // Masih ada kesempatan: rintangan itu disingkirkan dan pemain kebal sebentar
        state.obstacles = state.obstacles.filter((other) => other !== obstacle);
        state.shield = SHIELD;
      }
      break;
    }
  }
  state.score = Math.floor(state.distance / 10) + state.stars * STAR_POINTS;
}

// Majukan permainan sebesar `dt` detik. Waktu dipecah menjadi langkah kecil yang
// tetap, sehingga hasilnya sama di layar 60 Hz maupun 144 Hz.
export function update(state: GameState, dt: number, random: () => number = Math.random) {
  let remaining = Math.min(Math.max(dt, 0), MAX_FRAME);
  while (remaining > 1e-6 && state.status === "running") {
    const slice = Math.min(STEP, remaining);
    advance(state, slice, random);
    remaining -= slice;
  }
}
