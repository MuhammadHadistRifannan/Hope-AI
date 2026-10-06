#!/usr/bin/env python3
"""Merekam materi Flexa ke cache suara AI di server.

Tiap bab dibacakan Gemini TTS satu kali, lalu berkasnya ditaruh di cache backend.
Setelah itu bab tersebut selalu diputar seketika tanpa memakai kuota.

Kuota gratis sangat kecil (sekitar 10 permintaan per hari per model), jadi skrip ini
melewati bab yang sudah ada dan berhenti sendiri saat kuota habis. Jalankan lagi
keesokan harinya sampai semua bab selesai.

Pemakaian:  python3 deploy/warm_tts.py
Butuh: kunci Gemini di BE/appsettings.json dan akses SSH ke server.
"""
import base64
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SSH = ["ssh", "-i", str(Path.home() / ".ssh/hopeai"), "-o", "IdentitiesOnly=yes",
       "-o", "BatchMode=yes", "root@103.143.12.123"]
EXEC = "cd /opt/hopeai && docker compose exec -T backend sh -c"

# Harus sama dengan BE/Services/TtsService.cs
VOICE = "Leda"
STYLE_VERSION = "v3"
MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"]
SECONDS_BETWEEN_REQUESTS = 21  # batas 3 permintaan per menit per model


def clean_markdown(text: str) -> str:
    """Sama dengan cleanMarkdown di Frontend/src/pages/Flexa.tsx."""
    text = re.sub(r"[#*`_~]", "", text)
    text = text.replace("---", "").replace("&lt;", "").replace("&gt;", "")
    text = re.sub(r"</?[^>]+(>|$)", "", text)
    return re.sub(r"\s+", " ", text).strip()


def split_into_chunks(text: str, max_length: int = 500) -> list[str]:
    """Sama dengan splitIntoChunks di Frontend/src/lib/speech.ts."""
    sentences = re.findall(r"[^.!?\n]+[.!?]*\s*", re.sub(r"\s+", " ", text).strip())
    chunks, current = [], ""
    for sentence in sentences:
        if current and len(current + sentence) > max_length:
            chunks.append(current.strip())
            current = ""
        if len(sentence) > max_length:
            for word in sentence.split(" "):
                if len(current + " " + word) > max_length:
                    chunks.append(current.strip())
                    current = ""
                current += (" " if current else "") + word
        else:
            current += sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks


def cache_key(text: str) -> str:
    return hashlib.sha256(f"{STYLE_VERSION}|{VOICE}|{text}".encode()).hexdigest()


def read_materials() -> list[tuple[str, str]]:
    seed = (ROOT / "Frontend/supabase/seed.sql").read_text()
    section = seed[seed.index("INSERT INTO public.materials"):seed.index("ON CONFLICT (slug)")]
    rows = re.findall(r"\('([a-z]\d+)', '(?:mudah|menengah|sulit)', \d+, '((?:[^']|'')*)', '((?:[^']|'')*)'\)", section)
    return [(slug, content.replace("''", "'")) for slug, _title, content in rows]


def synthesize(key: str, model: str, text: str) -> bytes | None:
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.load(response)
        return base64.b64decode(data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    except urllib.error.HTTPError as error:
        if error.code == 429:
            return None
        raise


def main() -> None:
    key = json.loads((ROOT / "BE/appsettings.json").read_text())["APIKEY"]
    existing = set(subprocess.run(SSH + [f"{EXEC} 'ls /data/tts'"], capture_output=True, text=True, check=True).stdout.split())

    todo = []
    for slug, content in read_materials():
        for chunk in split_into_chunks(clean_markdown(content)):
            if f"{cache_key(chunk)}.wav" not in existing:
                todo.append((slug, chunk))

    total = sum(len(split_into_chunks(clean_markdown(c))) for _, c in read_materials())
    print(f"{total - len(todo)} dari {total} potongan sudah ada di cache; {len(todo)} perlu direkam.")

    exhausted: set[str] = set()
    done = 0
    for slug, chunk in todo:
        audio = None
        for model in MODELS:
            if model in exhausted:
                continue
            audio = synthesize(key, model, chunk)
            if audio is None:
                print(f"  kuota {model} habis")
                exhausted.add(model)
                continue
            break
        if audio is None:
            print(f"Kuota semua model habis. {done} direkam hari ini, {len(todo) - done} tersisa. Jalankan lagi besok.")
            sys.exit(0)

        name = f"{cache_key(chunk)}.wav"
        subprocess.run(SSH + [f"{EXEC} 'cat > /data/tts/{name}.tmp && mv /data/tts/{name}.tmp /data/tts/{name}'"],
                       input=audio, check=True)
        done += 1
        print(f"  {slug}: {len(audio) // 1024} KB direkam ({done}/{len(todo)})")
        time.sleep(SECONDS_BETWEEN_REQUESTS)

    print(f"Selesai. Semua {total} potongan materi sudah ada di cache.")


if __name__ == "__main__":
    main()
