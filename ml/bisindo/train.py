"""Melatih model kata BISINDO dan mengekspornya untuk browser.

    python train.py <keluaran extract.py .pkl ...> [rekaman .json ...] --out <folder>

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
from collections import Counter, defaultdict

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


def forward_json(model, seq):
    """Perhitungan yang sama persis dengan browser, untuk memeriksa ekspor."""
    x = (np.asarray(seq, dtype=np.float64) - np.array(model["mean"])) / np.array(model["std"])
    for layer in model["layers"]:
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--out", required=True)
    parser.add_argument("--epochs", type=int, default=150)
    args = parser.parse_args()

    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    rng = np.random.default_rng(SEED)

    clips = load(args.inputs)
    labels = sorted({c["label"] for c in clips})
    by_label = defaultdict(list)
    skipped = Counter()
    for clip in clips:
        seq = sign_sequence(clip["frames"])
        if seq is None:
            skipped[clip["label"]] += 1
            continue
        by_label[clip["label"]].append((clip, seq))
    print("kata:", len(labels), "| video terpakai:", sum(map(len, by_label.values())), "| terbuang:", dict(skipped))

    # Pembagian acak per kata: 70% latih, 15% validasi, 15% uji
    split = {"train": [], "val": [], "test": []}
    for label in labels:
        items = by_label[label]
        rng.shuffle(items)
        n_val = n_test = max(1, round(len(items) * 0.15))
        split["test"] += [(label, *it) for it in items[:n_test]]
        split["val"] += [(label, *it) for it in items[n_test : n_test + n_val]]
        split["train"] += [(label, *it) for it in items[n_test + n_val :]]

    index = {label: i for i, label in enumerate(labels)}
    train_x = np.stack([seq for _, _, seq in split["train"]])
    train_y = np.array([index[label] for label, _, _ in split["train"]])
    mean = train_x.reshape(-1, FEATURE_SIZE).mean(axis=0)
    std = np.maximum(train_x.reshape(-1, FEATURE_SIZE).std(axis=0), 1e-2)
    # Dibulatkan seperti di JSON supaya model dilatih dengan angka yang sama
    mean, std = np.round(mean, DECIMALS), np.round(std, DECIMALS)
    norm = lambda x: torch.tensor((x - mean) / std, dtype=torch.float32)

    def tensors(name):
        xs = np.stack([seq for _, _, seq in split[name]])
        ys = torch.tensor([index[label] for label, _, _ in split[name]])
        return norm(xs), ys

    val_x, val_y = tensors("val")
    test_x, test_y = tensors("test")

    model = WordModel(len(labels))
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    schedule = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, args.epochs)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)
    best_acc, best_state = -1.0, None

    for epoch in range(args.epochs):
        model.train()
        order = rng.permutation(len(train_x))
        for start in range(0, len(order), 32):
            batch = order[start : start + 32]
            x = norm(np.stack([augment(train_x[i], rng) for i in batch]))
            y = torch.tensor(train_y[batch])
            optimizer.zero_grad()
            loss = loss_fn(model(x), y)
            loss.backward()
            optimizer.step()
        schedule.step()

        model.eval()
        with torch.no_grad():
            acc = (model(val_x).argmax(1) == val_y).float().mean().item()
        if acc >= best_acc:
            best_acc, best_state = acc, {k: v.clone() for k, v in model.state_dict().items()}
        if epoch % 10 == 0 or epoch == args.epochs - 1:
            print(f"epoch {epoch:3d}  loss {loss.item():.3f}  val {acc:.3f}")

    model.load_state_dict(best_state)
    model.eval()
    exported = export(model, labels, mean, std)

    # Akurasi uji dihitung dengan model hasil ekspor, cara yang sama dengan browser
    confusion = np.zeros((len(labels), len(labels)), dtype=int)
    confidences = []
    for label, _, seq in split["test"]:
        probs = forward_json(exported, seq)
        confusion[index[label], probs.argmax()] += 1
        confidences.append(probs.max())
    accuracy = np.trace(confusion) / confusion.sum()
    print(f"\nvalidasi terbaik {best_acc:.3f} | uji {accuracy:.3f} ({np.trace(confusion)}/{confusion.sum()})")
    print("keyakinan rata-rata pada data uji:", round(float(np.mean(confidences)), 3))
    for i, label in enumerate(labels):
        wrong = {labels[j]: int(n) for j, n in enumerate(confusion[i]) if n and j != i}
        print(f"  {label:14s} {confusion[i, i]}/{confusion[i].sum()}" + (f"  salah ke {wrong}" if wrong else ""))

    # Uji ketahanan: kamera lebih lambat (tiap frame kedua dibuang, ±15 fps)
    # dan peraga kidal (gerakan dicerminkan)
    def accuracy_of(make):
        hits = total = 0
        for label, clip, seq in split["test"]:
            variant = make(clip, seq)
            if variant is None:
                continue
            total += 1
            hits += int(labels[forward_json(exported, variant).argmax()] == label)
        return hits / max(total, 1)

    slow = accuracy_of(lambda clip, _: sign_sequence(clip["frames"][::2]))
    mirrored = accuracy_of(lambda _, seq: mirror(seq))
    print(f"uji ±15 fps {slow:.3f} | uji dicerminkan (kidal) {mirrored:.3f}")

    exported["evaluation"] = {
        "split": "acak per video 70/15/15; peraga uji juga ada di data latih",
        "test_accuracy": round(float(accuracy), 4),
        "test_accuracy_15fps": round(float(slow), 4),
        "test_accuracy_mirrored": round(float(mirrored), 4),
        "test_videos": int(confusion.sum()),
    }
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "bisindo-kata.json"), "w", encoding="utf-8") as f:
        json.dump(exported, f, separators=(",", ":"))

    # Contoh untuk tes browser: titik mentah (dibulatkan; tubuh cukup titik
    # 0–16 yang dipakai fitur), fitur, dan peluang
    samples = []
    for label in labels[:2]:
        clip = next(c for l, c, _ in split["test"] if l == label)
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
