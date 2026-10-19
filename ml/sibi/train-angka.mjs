// Melatih model angka SIBI (1-9, dan 0 bila datanya ada) untuk browser, tanpa paket tambahan.
//
//   node ml/sibi/train-angka.mjs ml/sibi/data/*.csv --out Frontend/public/models/sibi-angka.json
//
// Masukan: CSV dengan kolom yang sama seperti tab Rekam Data di halaman Isyarat
// (label, source, group, x0, y0, z0, ... x20, y20, z20; koordinat dalam piksel).
// Baris berlabel huruf diabaikan; model huruf dilatih terpisah di sibi_training.ipynb
// karena beberapa angka berbentuk sama dengan huruf (2 dan V, 6 dan W, 9 dan F).
//
// Langkah:
//   1. Normalisasi sama persis dengan Frontend/src/lib/sign/landmarks.ts.
//   2. Per label dan per group, frame yang jauh dari pose tengahnya dibuang
//      (misalnya saat tangan sedang naik atau turun di video kamus).
//   3. Bila ada lebih dari satu group (peraga), diuji dengan meninggalkan satu
//      peraga di luar pelatihan, bergantian. Angka itulah yang jujur dilaporkan.
//   4. Model akhir dilatih dari semua data dan diekspor dalam format classifier.ts.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : "Frontend/public/models/sibi-angka.json";
const files = args.filter((arg, i) => !arg.startsWith("--") && i !== outIndex + 1);
if (files.length === 0) {
  console.error("Pakai: node ml/sibi/train-angka.mjs <data.csv ...> --out <model.json>");
  process.exit(1);
}

// --- Angka acak yang bisa diulang, supaya hasil pelatihan sama setiap dijalankan ---
let seed = 20261017;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const gaussian = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());

// --no-z: abaikan kedalaman (z). Skala z dari foto, video, dan kamera berbeda-beda,
// sehingga model satu peraga mudah terpaku padanya. Bobot z diekspor sebagai nol,
// jadi format model dan normalisasi di browser tetap sama.
const NO_Z = args.includes("--no-z");

// --- Normalisasi: identik dengan normalizeLandmarks() di landmarks.ts ---
const normalize = (pixels) => {
  const [ox, oy, oz] = pixels.slice(0, 3);
  const centered = [];
  for (let i = 0; i < 63; i += 3) centered.push(pixels[i] - ox, pixels[i + 1] - oy, pixels[i + 2] - oz);
  let scale = Math.hypot(centered[27], centered[28]);
  if (scale < 1e-6) scale = 1;
  return centered.map((v, i) => (NO_Z && i % 3 === 2 ? 0 : v / scale));
};

// --- Baca data ---
const samples = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const at = (name) => header.indexOf(name);
  const first = at("x0");
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const label = cells[at("label")];
    if (!/^\d$/.test(label)) continue;
    const pixels = cells.slice(first, first + 63).map(Number);
    if (pixels.length !== 63 || pixels.some((v) => !Number.isFinite(v))) continue;
    samples.push({ label, group: cells[at("group")] || file, features: normalize(pixels) });
  }
}

// --- Buang frame peralihan: jauh dari pose tengah (medoid) label dan group-nya ---
const distance = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
const MAX_FROM_CENTER = 1.0;
const kept = [];
const clusters = new Map();
for (const sample of samples) {
  const key = `${sample.label}|${sample.group}`;
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(sample);
}
for (const group of clusters.values()) {
  let center = group[0];
  let best = Infinity;
  for (const candidate of group) {
    const total = group.reduce((sum, other) => sum + distance(candidate.features, other.features), 0);
    if (total < best) [best, center] = [total, candidate];
  }
  // Batasnya jarak tetap, tetapi separuh frame terdekat selalu disimpan supaya label
  // yang videonya didominasi gerakan (misalnya angka 4) tidak kehabisan data
  const sorted = group.map((sample) => distance(sample.features, center.features)).sort((x, y) => x - y);
  const limit = Math.max(MAX_FROM_CENTER, sorted[Math.floor((sorted.length - 1) / 2)]);
  kept.push(...group.filter((sample) => distance(sample.features, center.features) <= limit));
}

const labels = [...new Set(kept.map((s) => s.label))].sort();
const groups = [...new Set(kept.map((s) => s.group))];
const count = (list) => Object.fromEntries(labels.map((l) => [l, list.filter((s) => s.label === l).length]));
console.log(`${samples.length} baris angka, ${kept.length} dipakai setelah membuang frame peralihan`);
console.log("per label:", count(kept));
console.log("peraga:", groups.join(", "));

// --- Augmentasi: tangan kiri (dicerminkan), sedikit diputar, dan sedikit getaran ---
const augment = (features) => {
  const mirror = random() < 0.5 ? -1 : 1;
  const angle = (random() * 2 - 1) * (20 * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const result = new Array(63);
  for (let i = 0; i < 63; i += 3) {
    const x = features[i] * mirror;
    const y = features[i + 1];
    result[i] = x * cos - y * sin + gaussian() * 0.03;
    result[i + 1] = x * sin + y * cos + gaussian() * 0.03;
    result[i + 2] = NO_Z ? 0 : features[i + 2] * (0.8 + random() * 0.4) + gaussian() * 0.02;
  }
  // Skala ulang seperti normalisasi: pergelangan tetap di pusat, jarak titik 0-9 tetap 1
  let scale = Math.hypot(result[27], result[28]);
  if (scale < 1e-6) scale = 1;
  return result.map((v) => v / scale);
};

// --- Jaringan kecil: 63 -> 64 (relu) -> jumlah label (softmax), dilatih dengan Adam ---
const HIDDEN = 64;
const train = (data, epochs = 120) => {
  const K = labels.length;
  const init = (rows, cols) =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => gaussian() * Math.sqrt(2 / rows)));
  const params = { W1: init(63, HIDDEN), b1: new Array(HIDDEN).fill(0), W2: init(HIDDEN, K), b2: new Array(K).fill(0) };
  const moments = {};
  for (const [name, value] of Object.entries(params)) {
    const zeros = () => (Array.isArray(value[0]) ? value.map((row) => row.map(() => 0)) : value.map(() => 0));
    moments[name] = { m: zeros(), v: zeros() };
  }
  let step = 0;
  const rate = 0.003;
  const adam = (name, grad) => {
    step++;
    const { m, v } = moments[name];
    const p = params[name];
    const update = (arr, g, mm, vv, i) => {
      mm[i] = 0.9 * mm[i] + 0.1 * g;
      vv[i] = 0.999 * vv[i] + 0.001 * g * g;
      const mh = mm[i] / (1 - 0.9 ** step);
      const vh = vv[i] / (1 - 0.999 ** step);
      arr[i] -= (rate * mh) / (Math.sqrt(vh) + 1e-8);
    };
    if (Array.isArray(p[0])) p.forEach((row, r) => row.forEach((_, c) => update(row, grad[r][c], m[r], v[r], c)));
    else p.forEach((_, i) => update(p, grad[i], m, v, i));
  };

  // Kelas yang datanya sedikit diberi bobot lebih, supaya tidak kalah oleh kelas yang banyak
  const perLabel = count(data);
  const weight = Object.fromEntries(labels.map((l) => [l, data.length / (K * Math.max(1, perLabel[l]))]));

  const BATCH = 32;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const order = data.map((_, i) => i).sort(() => random() - 0.5);
    for (let start = 0; start < order.length; start += BATCH) {
      const batch = order.slice(start, start + BATCH);
      const gW1 = params.W1.map((row) => row.map(() => 0));
      const gb1 = new Array(HIDDEN).fill(0);
      const gW2 = params.W2.map((row) => row.map(() => 0));
      const gb2 = new Array(K).fill(0);
      for (const index of batch) {
        const sample = data[index];
        const x = augment(sample.features);
        const h = params.b1.slice();
        for (let i = 0; i < 63; i++) for (let j = 0; j < HIDDEN; j++) h[j] += x[i] * params.W1[i][j];
        const a = h.map((v) => (v > 0 ? v : 0));
        const z = params.b2.slice();
        for (let j = 0; j < HIDDEN; j++) for (let k = 0; k < K; k++) z[k] += a[j] * params.W2[j][k];
        const max = Math.max(...z);
        const e = z.map((v) => Math.exp(v - max));
        const sum = e.reduce((s, v) => s + v, 0);
        const scale = weight[sample.label] / batch.length;
        const dz = e.map((v, k) => (v / sum - (labels[k] === sample.label ? 1 : 0)) * scale);
        for (let j = 0; j < HIDDEN; j++) for (let k = 0; k < K; k++) gW2[j][k] += a[j] * dz[k];
        dz.forEach((v, k) => (gb2[k] += v));
        const da = new Array(HIDDEN).fill(0);
        for (let j = 0; j < HIDDEN; j++) {
          if (h[j] <= 0) continue;
          for (let k = 0; k < K; k++) da[j] += params.W2[j][k] * dz[k];
        }
        for (let i = 0; i < 63; i++) for (let j = 0; j < HIDDEN; j++) gW1[i][j] += x[i] * da[j];
        da.forEach((v, j) => (gb1[j] += v));
      }
      adam("W1", gW1);
      adam("b1", gb1);
      adam("W2", gW2);
      adam("b2", gb2);
    }
  }
  return params;
};

const predict = (params, x) => {
  const h = params.b1.map((b, j) => {
    let v = b;
    for (let i = 0; i < 63; i++) v += x[i] * params.W1[i][j];
    return v > 0 ? v : 0;
  });
  const z = params.b2.map((b, k) => h.reduce((s, v, j) => s + v * params.W2[j][k], b));
  return labels[z.indexOf(Math.max(...z))];
};

// --- Uji: tinggalkan satu peraga di luar pelatihan, bila ada lebih dari satu ---
const report = { trained_on: kept.length, per_label: count(kept), signers: groups };
if (groups.length > 1) {
  let correct = 0;
  let total = 0;
  const perGroup = {};
  for (const group of groups) {
    const test = kept.filter((s) => s.group === group);
    const params = train(kept.filter((s) => s.group !== group));
    const right = test.filter((s) => predict(params, s.features) === s.label).length;
    perGroup[group] = `${right}/${test.length}`;
    correct += right;
    total += test.length;
  }
  report.leave_one_signer_out = { accuracy: Number((correct / total).toFixed(3)), per_signer: perGroup };
  console.log("uji per peraga (peraga diuji tidak ikut dilatih):", report.leave_one_signer_out);
} else {
  console.log("Baru ada satu peraga: akurasi untuk orang lain belum bisa diukur. Tambahkan rekaman lewat tab Rekam Data.");
}

// Model akhir dari semua data
const params = train(kept);
if (NO_Z) params.W1.forEach((row, i) => i % 3 === 2 && row.fill(0));
const trainAccuracy = kept.filter((s) => predict(params, s.features) === s.label).length / kept.length;
// Ketahanan terhadap tangan kiri dan sedikit putaran: data yang sama, diaugmentasi ulang
const augmentedAccuracy = kept.filter((s) => predict(params, augment(s.features)) === s.label).length / kept.length;
report.train_accuracy = Number(trainAccuracy.toFixed(3));
report.augmented_accuracy = Number(augmentedAccuracy.toFixed(3));
console.log(`akurasi data latih ${report.train_accuracy}, setelah dicerminkan/diputar ${report.augmented_accuracy}`);

const round = (v) => Number(v.toFixed(5));
const model = {
  labels,
  input_size: 63,
  normalization: "wrist-origin, scale by |p0-p9| (xy), pixel coords; sama dengan landmarks.ts",
  source: "train-angka.mjs",
  report,
  layers: [
    { W: params.W1.map((row) => row.map(round)), b: params.b1.map(round), activation: "relu" },
    { W: params.W2.map((row) => row.map(round)), b: params.b2.map(round), activation: "softmax" },
  ],
};
writeFileSync(out, JSON.stringify(model));
console.log(`model disimpan: ${out} (${labels.length} label)`);
