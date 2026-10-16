// Menyiapkan berkas MediaPipe di public/mediapipe sebelum dev dan build:
// runtime WASM disalin dari node_modules, model pelacak tangan dan tubuh diunduh sekali.
// Berkasnya besar, jadi tidak disimpan di git.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const target = join(root, "public/mediapipe");
// Pelacak tangan (SIBI dan BISINDO) dan pelacak tubuh (posisi tangan terhadap bahu, BISINDO)
const MODELS = {
  "hand_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  "pose_landmarker_lite.task":
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
};

mkdirSync(target, { recursive: true });

for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
  copyFileSync(join(source, file), join(target, file));
}

for (const [file, url] of Object.entries(MODELS)) {
  const model = join(target, file);
  if (existsSync(model)) continue;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal mengunduh ${file}: ${response.status}`);
  writeFileSync(model, Buffer.from(await response.arrayBuffer()));
}

console.log("MediaPipe siap di public/mediapipe");
