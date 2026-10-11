import { describe, expect, it } from "vitest";
import { PLAYER, WORLD, createGame, jump, playerBox, releaseJump, startGame, togglePause, update } from "./hopeRun";

// Angka acak tetap, supaya hasil uji selalu sama
const fixed = (value: number) => () => value;
const run = (state: ReturnType<typeof startGame>, seconds: number, random = fixed(0.5)) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) update(state, 1 / 60, random);
};

describe("hopeRun", () => {
  it("diam sebelum dimulai dan saat dijeda", () => {
    const ready = createGame();
    update(ready, 1);
    expect(ready.distance).toBe(0);
    expect(jump(ready)).toBe(false);

    const game = startGame();
    run(game, 0.5);
    const before = game.distance;
    togglePause(game);
    run(game, 1);
    expect(game.distance).toBe(before);
    togglePause(game);
    run(game, 0.2);
    expect(game.distance).toBeGreaterThan(before);
  });

  it("melompat dari tanah, tidak bisa lompat lagi di udara, lalu mendarat", () => {
    const game = startGame();
    game.nextObstacle = 99999;
    expect(jump(game)).toBe(true);
    run(game, 0.1);
    expect(game.y).toBeLessThan(WORLD.ground - PLAYER.height);
    expect(jump(game)).toBe(false);
    run(game, 1);
    expect(game.grounded).toBe(true);
    expect(game.y).toBe(WORLD.ground - PLAYER.height);
  });

  it("melepas tombol lebih awal membuat lompatan lebih pendek", () => {
    const peak = (cut: boolean) => {
      const game = startGame();
      game.nextObstacle = 99999;
      game.nextStar = 99999;
      jump(game);
      let top = game.y;
      for (let i = 0; i < 60; i++) {
        if (cut && i === 3) releaseJump(game);
        update(game, 1 / 60, fixed(0.5));
        top = Math.min(top, game.y);
      }
      return top;
    };
    expect(peak(true)).toBeGreaterThan(peak(false));
  });

  it("menabrak rintangan mengakhiri permainan, melompatinya tidak", () => {
    const crash = startGame();
    crash.nextStar = 99999;
    crash.obstacles.push({ x: PLAYER.x + 40, width: 14, height: 12, kind: "batu" });
    crash.nextObstacle = 99999;
    run(crash, 1);
    expect(crash.status).toBe("over");
    const frozen = crash.distance;
    run(crash, 1);
    expect(crash.distance).toBe(frozen);

    const clear = startGame();
    clear.nextStar = 99999;
    clear.nextObstacle = 99999;
    clear.obstacles.push({ x: PLAYER.x + 60, width: 14, height: 12, kind: "batu" });
    // Lompat ketika rintangan sudah dekat
    for (let i = 0; i < 120; i++) {
      const obstacle = clear.obstacles[0];
      if (obstacle && obstacle.x - playerBox(clear).right < 14) jump(clear);
      update(clear, 1 / 60, fixed(0.5));
    }
    expect(clear.status).toBe("running");
    expect(clear.obstacles.length).toBe(0);
  });

  it("bintang menambah skor dan hilang setelah diambil", () => {
    const game = startGame();
    game.nextObstacle = 99999;
    game.nextStar = 99999;
    game.pickups.push({ x: PLAYER.x + 30, y: WORLD.ground - 14, size: 9 });
    run(game, 0.6);
    expect(game.stars).toBe(1);
    expect(game.pickups.length).toBe(0);
    expect(game.score).toBe(Math.floor(game.distance / 10) + 10);
  });

  it("kecepatan naik bertahap dan berhenti di batasnya", () => {
    const game = startGame();
    const start = game.speed;
    // Tanpa tabrakan: semua rintangan disingkirkan sebelum sampai
    for (let i = 0; i < 60 * 90; i++) {
      game.obstacles = [];
      update(game, 1 / 60, fixed(0.5));
    }
    expect(game.speed).toBeGreaterThan(start);
    expect(game.speed).toBeLessThanOrEqual(240);
    expect(game.speed).toBe(240);
  });

  it("hasilnya sama di 60 Hz dan 144 Hz, dan jeda panjang tidak membuat dunia melompat", () => {
    const at = (hz: number) => {
      const game = startGame();
      game.nextObstacle = 99999;
      game.nextStar = 99999;
      for (let i = 0; i < hz * 2; i++) update(game, 1 / hz, fixed(0.5));
      return game.distance;
    };
    expect(Math.abs(at(60) - at(144))).toBeLessThan(2);

    const game = startGame();
    update(game, 5, fixed(0.5));
    expect(game.distance).toBeLessThan(10);
  });

  it("rintangan yang muncul selalu berjarak cukup untuk dilompati", () => {
    const game = startGame();
    let random = 0;
    const next = () => (random = (random + 0.37) % 1);
    let closest = Infinity;
    for (let i = 0; i < 60 * 60; i++) {
      update(game, 1 / 60, next);
      if (game.status === "over") {
        game.status = "running";
        game.obstacles.shift();
      }
      const xs = game.obstacles.map((obstacle) => obstacle.x).sort((a, b) => a - b);
      for (let k = 1; k < xs.length; k++) closest = Math.min(closest, xs[k] - xs[k - 1]);
    }
    expect(closest).toBeGreaterThanOrEqual(149);
  });

  it("Mode Bantuan: lebih lambat, rintangan lebih jarang, dan ada tiga kesempatan", () => {
    const assist = startGame("bantuan");
    const normal = startGame("normal");
    expect(assist.speed).toBeLessThan(normal.speed);
    expect(assist.lives).toBe(3);

    // Batas kecepatan lebih rendah
    for (let i = 0; i < 60 * 90; i++) {
      assist.obstacles = [];
      update(assist, 1 / 60, fixed(0.5));
    }
    expect(assist.speed).toBe(150);

    // Jarak antarrintangan lebih lebar pada kecepatan yang sama
    const gap = (mode: "normal" | "bantuan") => {
      const game = startGame(mode);
      game.speed = 120;
      game.nextObstacle = 0.001;
      update(game, 1 / 120, fixed(0.5));
      return game.nextObstacle;
    };
    expect(gap("bantuan")).toBeGreaterThan(gap("normal") * 1.4);
  });

  it("Mode Bantuan: tabrakan pertama dan kedua tidak mengakhiri permainan, yang ketiga iya", () => {
    const game = startGame("bantuan");
    game.nextObstacle = 99999;
    game.nextStar = 99999;
    const crash = () => {
      game.obstacles.push({ x: PLAYER.x + 8, width: 14, height: 12, kind: "batu" });
      update(game, 1 / 60, fixed(0.5));
    };
    crash();
    expect(game.status).toBe("running");
    expect(game.lives).toBe(2);
    expect(game.obstacles.length).toBe(0);
    // Selama kebal, rintangan berikutnya tidak mengurangi kesempatan
    crash();
    expect(game.lives).toBe(2);
    game.obstacles = [];
    run(game, 1.6);
    crash();
    expect(game.lives).toBe(1);
    game.obstacles = [];
    run(game, 1.6);
    crash();
    expect(game.status).toBe("over");
    expect(game.hits).toBe(3);
  });
});
