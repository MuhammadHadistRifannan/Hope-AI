/**
 * Penerima jawaban kuesioner UEQ Hope.Ai.
 *
 * Skrip ini dipasang dari Google Sheet tujuan (Ekstensi > Apps Script), lalu
 * di-deploy sebagai Web App. Tiap jawaban dari index.html menjadi satu baris
 * baru di lembar pertama. Lihat SETUP.md.
 */

// Urutan kolom di lembar. Kolom UEQ 1–26 berurutan supaya bisa langsung
// disalin ke alat analisis UEQ (UEQ Data Analysis Tool).
var FIELDS = [
  ["nama", "Nama"],
  ["usia", "Usia"],
  ["jk", "Jenis Kelamin"],
  ["pekerjaan", "Pekerjaan"],
  ["freq", "Frekuensi"],
  ["familiar", "Familiar"],
  ["setuju", "Setuju"]
];
var UEQ_ITEMS = 26;
var COMMENTS = [
  ["komentar1", "Komentar 1: paling disukai"],
  ["komentar2", "Komentar 2: membingungkan"],
  ["komentar3", "Komentar 3: saran"]
];

function headers() {
  var row = ["Timestamp"];
  FIELDS.forEach(function (f) { row.push(f[1]); });
  for (var i = 1; i <= UEQ_ITEMS; i++) row.push("UEQ" + i);
  COMMENTS.forEach(function (f) { row.push(f[1]); });
  return row;
}

// Teks yang diawali = + - @ akan dibaca Google Sheet sebagai rumus.
// Diberi tanda petik di depan supaya tetap tersimpan sebagai teks biasa.
function asText(value) {
  var text = String(value || "").slice(0, 5000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function doPost(e) {
  // Kunci mencegah dua kiriman bersamaan menulis di baris yang sama
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var p = (e && e.parameter) || {};

    var row = [new Date()];
    for (var f = 0; f < FIELDS.length; f++) {
      var value = String(p[FIELDS[f][0]] || "").trim();
      if (!value) return reply("Isian \"" + FIELDS[f][1] + "\" kosong.");
      row.push(asText(value));
    }
    for (var i = 1; i <= UEQ_ITEMS; i++) {
      var answer = Number(p["ueq" + i]);
      if (!(answer >= 1 && answer <= 7 && Math.floor(answer) === answer)) {
        return reply("Jawaban UEQ nomor " + i + " tidak valid.");
      }
      row.push(answer);
    }
    COMMENTS.forEach(function (c) { row.push(asText(p[c[0]])); });

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers());
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(row);
    return reply("OK");
  } catch (error) {
    return reply("Terjadi kesalahan di server: " + error.message);
  } finally {
    lock.releaseLock();
  }
}

// Membuka URL Web App di browser menampilkan pesan ini: tanda deploy berhasil
function doGet() {
  return reply("Penerima kuesioner UEQ Hope.Ai aktif. Kirim jawaban lewat index.html.");
}

function reply(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
