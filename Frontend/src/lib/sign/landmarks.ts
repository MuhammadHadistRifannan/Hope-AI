// Mengubah 21 titik tangan dari MediaPipe menjadi vektor ciri yang tidak
// bergantung pada posisi tangan di layar, jaraknya dari kamera, atau tangan
// kiri/kanan. Halaman Isyarat memakai fungsi ini baik saat merekam data latih
// maupun saat mengenali, sehingga model selalu melihat bentuk ciri yang sama.

export type Point = { x: number; y: number; z: number };

export const LANDMARK_COUNT = 21;
export const FEATURE_SIZE = LANDMARK_COUNT * 3;

export const toFeatures = (landmarks: Point[], handedness: string): number[] | null => {
  if (landmarks.length !== LANDMARK_COUNT) return null;

  const wrist = landmarks[0];
  // Tangan kiri dicerminkan supaya tampak seperti tangan kanan
  const mirror = handedness === "Left" ? -1 : 1;

  const relative = landmarks.map((p) => ({
    x: (p.x - wrist.x) * mirror,
    y: p.y - wrist.y,
    z: p.z - wrist.z,
  }));

  // Skala: jarak terjauh dari pergelangan, supaya ukuran tangan tidak berpengaruh
  const scale = Math.max(...relative.map((p) => Math.hypot(p.x, p.y, p.z)));
  if (!Number.isFinite(scale) || scale < 1e-6) return null;

  return relative.flatMap((p) => [p.x / scale, p.y / scale, p.z / scale]);
};
