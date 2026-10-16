"""Melatih model kata BISINDO dan mengekspornya untuk browser.

    python train.py <keluaran extract.py .pkl ...> [rekaman .json ...] --out <folder>

Langkah:
  1. Uji lintas sesi: dataset BISINDO 40 Kata direkam dalam dua sesi (video
     001–025 dan 026–050, beda latar, pakaian, dan hari). Model dilatih di
     satu sesi dan diuji di sesi lainnya, bergantian. Angka inilah yang
     dicatat, karena pembagian acak hampir selalu 100%.
  2. Model akhir dilatih dengan semua video.

Menghasilkan:
  bisindo-kata.json          model untuk Frontend/public/models/
  bisindo-kata.samples.json  contoh untuk tes kesamaan browser (models/ di akar repo)

Model: Conv1D(64, 5) → Conv1D(64, 5) → rata-rata waktu → Dense(64) → Dense(kata).
Format JSON dijalankan oleh Frontend/src/lib/sign/bisindo.ts tanpa library ML.
"""

import argparse
import json
import os
import pickle
import random
from collections import Counter

import numpy as np
import torch
from torch import nn

from bisindo_features import FEATURE_SIZE, FRAMES, HAND_SIZE, POSE_POINTS, mirror, sign_sequence

SEED = 42
DECIMALS = 5


def load(paths):
    """Keluaran extract.py (.pkl) atau rekaman tab Rekam Data di halaman Isyarat (.json)."""
    clips = []
    for path in paths:
        if path.endswith(".json"):
            with open(path, encoding="utf-8") as f:
                recording = json.load(f)
            for clip in recording["clips"]:
                frames = [
                    (
                        float(fr["t"]),
                        [np.array([[p["x"], p["y"], p["z"]] for p in h], dtype=np.float32) for h in fr["hands"]],
                        np.array([[p["x"], p["y"], p["z"]] for p in fr["pose"]], dtype=np.float32),
                    )
                    for fr in clip["frames"]
                ]
                clips.append({"label": clip["label"], "file": f"{os.path.basename(path)}:{clip['signer']}", "frames": frames})
        else:
            with open(path, "rb") as f:
                clips.extend(pickle.load(f))
    return clips


# --- Augmentasi pada urutan yang sudah disamakan panjangnya ---

COORDS = np.zeros(FEATURE_SIZE, dtype=bool)
for slot in range(2):
    COORDS[slot * HAND_SIZE + 1 : (slot + 1) * HAND_SIZE] = True
COORDS[2 * HAND_SIZE :] = True
X_INDEX = np.array(
    [s * HAND_SIZE + 1 + 3 * i for s in range(2) for i in range(21)]
    + [2 * HAND_SIZE + 2 * i for i in range(len(POSE_POINTS))]
)
Y_INDEX = X_INDEX + 1


def time_crop(seq, rng):
    n = len(seq)
    start = rng.uniform(0, 0.15) * (n - 1)
    end = (n - 1) - rng.uniform(0, 0.15) * (n - 1)
    positions = np.linspace(start, end, n)
    low = np.floor(positions).astype(int)
    high = np.minimum(low + 1, n - 1)
    w = (positions - low)[:, None]
    return seq[low] * (1 - w) + seq[high] * w


def augment(seq, rng):
    seq = seq.copy()
    if rng.random() < 0.5:
        seq = mirror(seq)
    seq = time_crop(seq, rng)
    present = [seq[:, s * HAND_SIZE] > 0 for s in range(2)]

    angle = np.radians(rng.uniform(-12, 12))
    scale = rng.uniform(0.85, 1.15)
    shift = rng.uniform(-0.15, 0.15, size=2)
    x, y = seq[:, X_INDEX], seq[:, Y_INDEX]
    seq[:, X_INDEX] = scale * (np.cos(angle) * x - np.sin(angle) * y) + shift[0]
    seq[:, Y_INDEX] = scale * (np.sin(angle) * x + np.cos(angle) * y) + shift[1]
    seq[:, COORDS] += rng.normal(0, 0.02, size=(len(seq), COORDS.sum()))

    # Pelacak sering kehilangan satu tangan (tangan bersilangan atau keluar
    # kamera). Pada isyarat dua tangan, kadang satu tangan dihilangkan di
    # sebagian frame atau sepanjang isyarat. Tangan yang tersisa tetap di
    # slotnya, sama seperti frameFeatures saat hanya satu tangan terlihat.
    if present[0].mean() > 0.3 and present[1].mean() > 0.3:
        roll = rng.random()
        slot = int(rng.integers(2))
        if roll < 0.15:
            present[slot] = np.zeros_like(present[slot])
        elif roll < 0.4:
            present[slot] = present[slot] & (rng.random(len(seq)) > rng.uniform(0.2, 0.6))

    # Slot tangan yang kosong tetap nol, seperti saat dipakai sungguhan
    for s in range(2):
        seq[~present[s], s * HAND_SIZE : (s + 1) * HAND_SIZE] = 0
    return seq.astype(np.float32)


class WordModel(nn.Module):
    def __init__(self, classes):
        super().__init__()
        self.conv1 = nn.Conv1d(FEATURE_SIZE, 64, 5, padding=2)
        self.conv2 = nn.Conv1d(64, 64, 5, padding=2)
        self.drop = nn.Dropout(0.3)
        self.dense = nn.Linear(64, 64)
        self.out = nn.Linear(64, classes)

    def forward(self, x):  # x: (batch, frame, fitur)
        x = x.transpose(1, 2)
        x = torch.relu(self.conv1(x))
        x = torch.relu(self.conv2(x))
        x = x.mean(dim=2)
        x = torch.relu(self.dense(self.drop(x)))
        return self.out(self.drop(x))


def export(model, labels, mean, std):
    r = lambda a: np.round(a.astype(np.float64), DECIMALS).tolist()
    w = {k: v.detach().cpu().numpy() for k, v in model.state_dict().items()}
    return {
        "kind": "sequence",
        "labels": labels,
        "frames": FRAMES,
        "feature_size": FEATURE_SIZE,
        "normalization": "lihat ml/bisindo/bisindo_features.py",
        "mean": r(mean),
        "std": r(std),
        "layers": [
            {"type": "conv1d", "W": r(w["conv1.weight"].transpose(2, 1, 0)), "b": r(w["conv1.bias"]), "activation": "relu"},
            {"type": "conv1d", "W": r(w["conv2.weight"].transpose(2, 1, 0)), "b": r(w["conv2.bias"]), "activation": "relu"},
            {"type": "globalavgpool"},
            {"type": "dense", "W": r(w["dense.weight"].T), "b": r(w["dense.bias"]), "activation": "relu"},
            {"type": "dense", "W": r(w["out.weight"].T), "b": r(w["out.bias"]), "activation": "softmax"},
        ],
    }


def forward_json(model, seq, until=None):
    """Perhitungan yang sama persis dengan browser, untuk memeriksa ekspor.

    until: berhenti setelah lapisan ke-sekian (representasi antara untuk audit.py).
    """
    x = (np.asarray(seq, dtype=np.float64) - np.array(model["mean"])) / np.array(model["std"])
    for layer in model["layers"][:until]:
        if layer["type"] == "conv1d":
            W, b = np.array(layer["W"]), np.array(layer["b"])
            k = W.shape[0]
            pad = (k - 1) // 2
            padded = np.pad(x, ((pad, k - 1 - pad), (0, 0)))
            x = np.stack([b + sum(padded[t + j] @ W[j] for j in range(k)) for t in range(len(x))])
        elif layer["type"] == "globalavgpool":
            x = x.mean(axis=0)
        else:
            x = x @ np.array(layer["W"]) + np.array(layer["b"])
        if layer.get("activation") == "relu":
            x = np.maximum(x, 0)
        elif layer.get("activation") == "softmax":
            e = np.exp(x - x.max())
            x = e / e.sum()
    return x


def session_of(clip):
    """Video 001–025 dan 026–050 di BISINDO 40 Kata adalah dua sesi rekaman
    berbeda; rekaman dari halaman Isyarat dikelompokkan per peraga."""
    name = clip["file"]
    if ":" in name:
        return "rekaman:" + name.split(":", 1)[1]
    return "A" if int(os.path.splitext(name)[0]) <= 25 else "B"


def build(clips):
    labels = sorted({c["label"] for c in clips})
    items, skipped = [], Counter()
    for clip in clips:
        seq = sign_sequence(clip["frames"])
        if seq is None:
            skipped[clip["label"]] += 1
            continue
        items.append({"label": clip["label"], "clip": clip, "seq": seq, "session": session_of(clip)})
    return labels, items, skipped


def fit(items, labels, epochs, seed, log=None):
    """Melatih dengan jumlah epoch tetap, jadi tidak ada pilihan yang diambil dari data uji."""
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    index = {label: i for i, label in enumerate(labels)}
    train_x = np.stack([it["seq"] for it in items])
    train_y = np.array([index[it["label"]] for it in items])
    flat = train_x.reshape(-1, FEATURE_SIZE)
    # Dibulatkan seperti di JSON supaya model dilatih dengan angka yang sama
    mean = np.round(flat.mean(axis=0), DECIMALS)
    std = np.round(np.maximum(flat.std(axis=0), 1e-2), DECIMALS)
    norm = lambda x: torch.tensor((x - mean) / std, dtype=torch.float32)

    model = WordModel(len(labels))
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    schedule = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)
    for epoch in range(epochs):
        model.train()
        order = rng.permutation(len(train_x))
        for start in range(0, len(order), 32):
            batch = order[start : start + 32]
            x = norm(np.stack([augment(train_x[i], rng) for i in batch]))
            optimizer.zero_grad()
            loss = loss_fn(model(x), torch.tensor(train_y[batch]))
            loss.backward()
            optimizer.step()
        schedule.step()
        if log and (epoch % 25 == 0 or epoch == epochs - 1):
            log(f"  epoch {epoch:3d}  loss {loss.item():.3f}")
    model.eval()
    return export(model, labels, mean, std)


def evaluate(exported, items, labels):
    """Matriks kebingungan dan peluang tiap video, dihitung seperti di browser."""
    index = {label: i for i, label in enumerate(labels)}
    confusion = np.zeros((len(labels), len(labels)), dtype=int)
    probs = []
    for it in items:
        p = forward_json(exported, it["seq"])
        confusion[index[it["label"]], p.argmax()] += 1
        probs.append(p)
    return confusion, probs


def cross_session(labels, items, epochs, log=print):
    """Latih di satu sesi, uji di sesi lain, bergantian. Mengembalikan gabungan
    matriks kebingungan dan (item, peluang, model) tiap video uji untuk audit."""
    confusion = np.zeros((len(labels), len(labels)), dtype=int)
    held_out = []
    for test_session in ("A", "B"):
        train_items = [it for it in items if it["session"] != test_session]
        test_items = [it for it in items if it["session"] == test_session]
        log(f"latih tanpa sesi {test_session} ({len(train_items)} video), uji sesi {test_session} ({len(test_items)} video)")
        exported = fit(train_items, labels, epochs, SEED)
        c, probs = evaluate(exported, test_items, labels)
        log(f"  akurasi sesi {test_session}: {np.trace(c) / c.sum():.3f}")
        confusion += c
        held_out += [(it, p, exported) for it, p in zip(test_items, probs)]
    return confusion, held_out


def print_confusion(confusion, labels, log=print):
    for i, label in enumerate(labels):
        wrong = {labels[j]: int(n) for j, n in enumerate(confusion[i]) if n and j != i}
        log(f"  {label:14s} {confusion[i, i]}/{confusion[i].sum()}" + (f"  salah ke {wrong}" if wrong else ""))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--out", required=True)
    parser.add_argument("--epochs", type=int, default=150)
    args = parser.parse_args()
    random.seed(SEED)
    np.random.seed(SEED)

    labels, items, skipped = build(load(args.inputs))
    print("kata:", len(labels), "| video terpakai:", len(items), "| terbuang:", dict(skipped))

    confusion, held_out = cross_session(labels, items, args.epochs)
    accuracy = np.trace(confusion) / confusion.sum()
    true_prob = [p[labels.index(it["label"])] for it, p, _ in held_out]
    print(f"\nakurasi lintas sesi {accuracy:.3f} ({np.trace(confusion)}/{confusion.sum()})")
    print("peluang rata-rata untuk kata yang benar:", round(float(np.mean(true_prob)), 3))
    print_confusion(confusion, labels)

    # Uji ketahanan pada sesi yang tidak dilatih: kamera ±15 fps dan peraga kidal
    def accuracy_of(make):
        hits = total = 0
        for it, _, exported in held_out:
            variant = make(it)
            if variant is None:
                continue
            total += 1
            hits += int(labels[forward_json(exported, variant).argmax()] == it["label"])
        return hits / max(total, 1)

    slow = accuracy_of(lambda it: sign_sequence(it["clip"]["frames"][::2]))
    mirrored = accuracy_of(lambda it: mirror(it["seq"]))
    print(f"lintas sesi ±15 fps {slow:.3f} | lintas sesi dicerminkan (kidal) {mirrored:.3f}")

    print("\nmodel akhir dengan semua video")
    exported = fit(items, labels, args.epochs, SEED, log=print)
    exported["evaluation"] = {
        "method": "lintas sesi: latih di satu sesi rekaman, uji di sesi lainnya (2 lipatan); peraganya sebagian besar orang yang sama",
        "cross_session_accuracy": round(float(accuracy), 4),
        "cross_session_accuracy_15fps": round(float(slow), 4),
        "cross_session_accuracy_mirrored": round(float(mirrored), 4),
        "videos": int(confusion.sum()),
        "confusion": confusion.tolist(),
    }
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "bisindo-kata.json"), "w", encoding="utf-8") as f:
        json.dump(exported, f, separators=(",", ":"))

    # Contoh untuk tes browser: titik mentah (dibulatkan; tubuh cukup titik
    # 0–16 yang dipakai fitur), fitur, dan peluang
    samples = []
    for label in labels[:2]:
        clip = next(it["clip"] for it in items if it["label"] == label)
        frames = [
            (t, [np.round(h, 1) for h in hands], None if pose is None else np.round(pose[:17], 1))
            for t, hands, pose in clip["frames"]
        ]
        seq = sign_sequence(frames)
        samples.append(
            {
                "label": label,
                "frames": [
                    {"t": t, "hands": [h.tolist() for h in hands], "pose": None if pose is None else pose.tolist()}
                    for t, hands, pose in frames
                ],
                "features": np.round(seq, 6).tolist(),
                "probs": np.round(forward_json(exported, seq), 6).tolist(),
            }
        )
    with open(os.path.join(args.out, "bisindo-kata.samples.json"), "w", encoding="utf-8") as f:
        json.dump(samples, f, separators=(",", ":"))
    print("tersimpan di", args.out)


if __name__ == "__main__":
    main()
