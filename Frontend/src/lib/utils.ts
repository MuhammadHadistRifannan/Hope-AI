import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tujuan setelah masuk (?next=/eyeread). Hanya alamat di dalam aplikasi yang diterima,
// supaya tautan masuk tidak bisa dipakai untuk melempar pengguna ke situs lain.
export function nextPath(value: string | null) {
  return value && /^\/[a-z-]+$/.test(value) ? value : "/";
}
