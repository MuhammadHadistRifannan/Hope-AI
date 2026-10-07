import { describe, expect, it } from "vitest";
import { editDistance, findDestination, isAppCommand, labelScore, normalizeCommand } from "./voiceCommands";

describe("normalizeCommand", () => {
  it("membuang basa-basi di awal dan akhir", () => {
    expect(normalizeCommand("Tolong buka Flexa dong.")).toBe("buka flexa");
    expect(normalizeCommand("Halo Hope, aku mau ke forum ya")).toBe("ke forum");
  });

  it("tidak mengosongkan jawaban yang hanya satu kata", () => {
    expect(normalizeCommand("Ya")).toBe("ya");
    expect(normalizeCommand("Tolong")).toBe("tolong");
  });

  it("tidak menyentuh kata basa-basi di tengah kalimat", () => {
    expect(normalizeCommand("tanya kenapa langit mau hujan")).toBe("tanya kenapa langit mau hujan");
  });
});

describe("findDestination", () => {
  it("mengenali berbagai cara meminta pindah halaman", () => {
    expect(findDestination("buka flexa")?.path).toBe("/flexa");
    expect(findDestination("masuk ke halaman pengaturan")?.path).toBe("/settings");
    expect(findDestination("forum")?.path).toBe("/forum");
  });

  it("memaklumi nama halaman yang salah dengar", () => {
    expect(findDestination("buka pleksa")?.path).toBe("/flexa");
    expect(findDestination("buka neotutur")?.path).toBe("/neotutor");
    expect(findDestination("buka notifikasih")?.path).toBe("/notifications");
  });

  it("membedakan latihan isyarat dari Pathly", () => {
    expect(findDestination("buka latihan isyarat")?.path).toBe("/isyarat");
    expect(findDestination("buka latihan")?.path).toBe("/pathly");
  });

  it("tidak menganggap kalimat panjang biasa sebagai perintah pindah", () => {
    expect(findDestination("jelaskan materi tentang tata surya")).toBeNull();
  });
});

describe("labelScore", () => {
  it("mengurutkan cocok persis di atas cocok sebagian", () => {
    const exact = labelScore("Ringkasan", "ringkasan");
    const prefix = labelScore("Bacakan Soal", "bacakan");
    const inside = labelScore("Buat Kuis dari Materi", "kuis");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(0);
  });

  it("mengabaikan tanda baca dan emoji pada nama tombol", () => {
    expect(labelScore("Benar! 🎉", "benar")).toBe(100);
  });

  it("memaklumi satu kata yang salah dengar", () => {
    expect(labelScore("Pengaturan", "pengaturam")).toBeGreaterThan(0);
  });

  it("menolak nama yang tidak berhubungan", () => {
    expect(labelScore("Hapus Postingan", "ringkasan")).toBe(0);
    expect(labelScore("Kirim", "")).toBe(0);
  });
});

describe("editDistance", () => {
  it("menghitung jumlah huruf yang berbeda", () => {
    expect(editDistance("fleksa", "fleksa")).toBe(0);
    expect(editDistance("pleksa", "fleksa")).toBe(1);
    expect(editDistance("forum", "profil")).toBeGreaterThan(2);
  });
});

describe("isAppCommand", () => {
  it("membedakan perintah aplikasi dari pertanyaan untuk tutor", () => {
    expect(isAppCommand("pilih ringkasan")).toBe(true);
    expect(isAppCommand("di mana saya")).toBe(true);
    expect(isAppCommand("tombol apa saja")).toBe(true);
    expect(isAppCommand("gulir ke bawah")).toBe(true);
    expect(isAppCommand("kenapa langit berwarna biru")).toBe(false);
    expect(isAppCommand("apa itu fotosintesis")).toBe(false);
    expect(isAppCommand("apa saja planet di tata surya")).toBe(false);
  });
});
