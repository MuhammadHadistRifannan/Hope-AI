// Kenali Warna: menamai warna dari kamera dalam bahasa Indonesia sehari-hari,
// untuk pengguna buta warna atau low vision. Semuanya dihitung di perangkat.

const toHsl = (r: number, g: number, b: number) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === rn ? 60 * (((gn - bn) / d + 6) % 6) : max === gn ? 60 * ((bn - rn) / d + 2) : 60 * ((rn - gn) / d + 4);
  return { h, s, l };
};

// Warna dasar menurut rona (derajat). Batasnya mengikuti cara orang menyebut warna,
// bukan pembagian rata.
const hueName = (h: number) => {
  if (h < 12 || h >= 345) return "merah";
  if (h < 40) return "oranye";
  if (h < 65) return "kuning";
  if (h < 160) return "hijau";
  if (h < 195) return "toska";
  if (h < 250) return "biru";
  if (h < 320) return "ungu";
  return "merah muda";
};

const hexOf = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export const nameColor = (r: number, g: number, b: number) => {
  const { h, s, l } = toHsl(r, g, b);
  const result = (name: string) => ({ name, hex: hexOf(r, g, b) });

  if (l < 0.12) return result("hitam");
  if (l > 0.92) return result("putih");
  if (s < 0.12) {
    if (l > 0.88) return result("putih");
    if (l > 0.7) return result("abu-abu muda");
    if (l < 0.3) return result("abu-abu tua");
    return result("abu-abu");
  }

  const base = hueName(h);
  // Oranye atau kuning yang gelap terlihat sebagai coklat
  if ((base === "oranye" || base === "kuning") && l < 0.4) return result("coklat");
  // Merah yang sangat terang disebut merah muda
  if (base === "merah" && l > 0.7) return result("merah muda");
  if (base === "merah muda" || base === "kuning") return result(base);
  if (l > 0.7) return result(`${base} muda`);
  if (l < 0.3) return result(`${base} tua`);
  return result(base);
};

// Rata-rata warna dari data piksel RGBA (misalnya getImageData().data)
export const averageColor = (pixels: ArrayLike<number>) => {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) return { r: 0, g: 0, b: 0 };
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < count * 4; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
};
