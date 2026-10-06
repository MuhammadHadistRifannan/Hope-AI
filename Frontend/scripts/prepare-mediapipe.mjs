// Menyiapkan berkas MediaPipe di public/mediapipe sebelum dev dan build:
// runtime WASM disalin dari node_modules, model pelacak tangan diunduh sekali.
// Berkasnya besar, jadi tidak disimpan di git.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const target = join(root, "public/mediapipe");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

mkdirSync(target, { recursive: true });

for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
  copyFileSync(join(source, file), join(target, file));
}

const model = join(target, "hand_landmarker.task");
if (!existsSync(model)) {
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Gagal mengunduh model pelacak tangan: ${response.status}`);
  writeFileSync(model, Buffer.from(await response.arrayBuffer()));
}

console.log("MediaPipe siap di public/mediapipe");
