// Mengubah 21 titik tangan dari MediaPipe menjadi 63 angka masukan model.
// Harus identik dengan fungsi normalize() di ml/sibi/sibi_training.ipynb:
//   1. koordinat piksel: x * lebar, y * tinggi, z * lebar
//   2. titik 0 (pergelangan) menjadi pusat
//   3. dibagi jarak titik 0 ke titik 9 di bidang xy
// Tanpa normalisasi rotasi dan tanpa pencerminan (model dilatih dengan
// augmentasi tangan kiri dan kanan).

export type Point = { x: number; y: number; z: number };

export const LANDMARK_COUNT = 21;
export const FEATURE_SIZE = 63;

// Titik MediaPipe bernilai 0..1 terhadap ukuran gambar; model memakai piksel
export const toPixels = (landmarks: Point[], width: number, height: number): Point[] =>
  landmarks.map((p) => ({ x: p.x * width, y: p.y * height, z: p.z * width }));

export const normalizeLandmarks = (pixels: Point[]): number[] | null => {
  if (pixels.length !== LANDMARK_COUNT) return null;

  const origin = pixels[0];
  const centered = pixels.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y, z: p.z - origin.z }));
  let scale = Math.hypot(centered[9].x, centered[9].y);
  if (scale < 1e-6) scale = 1;

  return centered.flatMap((p) => [p.x / scale, p.y / scale, p.z / scale]);
};

export const toFeatures = (landmarks: Point[], width: number, height: number) =>
  normalizeLandmarks(toPixels(landmarks, width, height));
