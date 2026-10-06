#!/usr/bin/env python3
"""Melatih pengenal isyarat abjad SIBI dari titik tangan (landmark).

Masukan: satu atau lebih berkas JSON hasil tab "Rekam Data" di halaman Isyarat.
Tiap berkas berisi daftar {"signer", "label", "features": [[63 angka], ...]}.

Keluaran: Frontend/public/models/sibi-abjad.json, dibaca langsung oleh browser.

Akurasi dilaporkan dengan cara yang jujur: model diuji pada peraga yang sama
sekali tidak ikut dilatih (leave-one-signer-out). Angka itulah yang mendekati
pengalaman pengguna baru. Model akhir dilatih dengan semua data.

Pemakaian:  python3 ml/sibi/train.py data/*.json
Butuh: numpy.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

FEATURE_SIZE = 63
ROOT = Path(__file__).resolve().parent.parent.parent


def load_samples(paths):
    features, labels, signers = [], [], []
    for path in paths:
        for sample in json.loads(Path(path).read_text()):
            for row in sample["features"]:
                if len(row) != FEATURE_SIZE:
                    continue
                features.append(row)
                labels.append(sample["label"])
                signers.append(sample["signer"])
    return np.array(features, dtype=np.float64), np.array(labels), np.array(signers)


def train_mlp(x, y, classes, hidden, epochs, seed):
    """Jaringan satu lapis tersembunyi, dilatih dengan Adam. Mengembalikan bobotnya."""
    rng = np.random.default_rng(seed)
    n_in, n_out = x.shape[1], len(classes)
    w1 = rng.normal(0, np.sqrt(2 / n_in), (hidden, n_in))
    b1 = np.zeros(hidden)
    w2 = rng.normal(0, np.sqrt(2 / hidden), (n_out, hidden))
    b2 = np.zeros(n_out)
    params = [w1, b1, w2, b2]
    moments = [(np.zeros_like(p), np.zeros_like(p)) for p in params]
    targets = np.eye(n_out)[y]
    rate, beta1, beta2, decay, batch = 0.003, 0.9, 0.999, 1e-4, 128
    step = 0

    for _ in range(epochs):
        order = rng.permutation(len(x))
        for start in range(0, len(x), batch):
            index = order[start:start + batch]
            xb = x[index] + rng.normal(0, 0.02, (len(index), n_in))  # sedikit derau agar tahan goyangan
            hidden_out = np.maximum(0, xb @ w1.T + b1)
            logits = hidden_out @ w2.T + b2
            logits -= logits.max(axis=1, keepdims=True)
            probs = np.exp(logits)
            probs /= probs.sum(axis=1, keepdims=True)

            grad_logits = (probs - targets[index]) / len(index)
            grad_hidden = (grad_logits @ w2) * (hidden_out > 0)
            grads = [grad_hidden.T @ xb + decay * w1, grad_hidden.sum(0),
                     grad_logits.T @ hidden_out + decay * w2, grad_logits.sum(0)]

            step += 1
            for i, (param, grad) in enumerate(zip(params, grads)):
                m, v = moments[i]
                m[:] = beta1 * m + (1 - beta1) * grad
                v[:] = beta2 * v + (1 - beta2) * grad ** 2
                param -= rate * (m / (1 - beta1 ** step)) / (np.sqrt(v / (1 - beta2 ** step)) + 1e-8)
    return params


def predict(params, x):
    w1, b1, w2, b2 = params
    return (np.maximum(0, x @ w1.T + b1) @ w2.T + b2).argmax(axis=1)


def standardize(train, *others):
    mean = train.mean(axis=0)
    std = train.std(axis=0)
    std[std < 1e-6] = 1.0
    return mean, std, [(a - mean) / std for a in (train, *others)]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="+", help="berkas JSON hasil Rekam Data")
    parser.add_argument("--output", default=str(ROOT / "Frontend/public/models/sibi-abjad.json"))
    parser.add_argument("--hidden", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    x, labels, signers = load_samples(args.files)
    if len(x) == 0:
        sys.exit("Tidak ada data yang terbaca.")

    classes = sorted(set(labels))
    y = np.array([classes.index(label) for label in labels])
    unique_signers = sorted(set(signers))
    per_class = Counter(labels)
    print(f"{len(x)} frame, {len(classes)} isyarat, {len(unique_signers)} peraga")
    print("frame per isyarat: paling sedikit", min(per_class.values()), "| paling banyak", max(per_class.values()))

    held_out_accuracy = None
    if len(unique_signers) >= 2:
        correct = total = 0
        per_class_hits, per_class_total = Counter(), Counter()
        for signer in unique_signers:
            test = signers == signer
            # Hanya isyarat yang juga ada di data latih yang bisa dinilai
            known = np.isin(y[test], np.unique(y[~test]))
            if not known.any():
                continue
            _, _, (train_x, test_x) = standardize(x[~test], x[test][known])
            params = train_mlp(train_x, y[~test], classes, args.hidden, args.epochs, args.seed)
            guesses = predict(params, test_x)
            truth = y[test][known]
            hits = guesses == truth
            correct += hits.sum()
            total += len(truth)
            for t, h in zip(truth, hits):
                per_class_total[classes[t]] += 1
                per_class_hits[classes[t]] += int(h)
            print(f"  peraga '{signer}' sebagai penguji: {hits.mean():.1%} dari {len(truth)} frame")
        held_out_accuracy = correct / total if total else None
        if held_out_accuracy is not None:
            print(f"Akurasi pada peraga yang tidak ikut dilatih: {held_out_accuracy:.1%}")
            weakest = sorted(per_class_total, key=lambda c: per_class_hits[c] / per_class_total[c])[:5]
            print("Isyarat paling sering salah:",
                  ", ".join(f"{c} ({per_class_hits[c] / per_class_total[c]:.0%})" for c in weakest))
    else:
        print("Hanya satu peraga: akurasi pada orang baru tidak bisa diukur. Rekam minimal dua orang.")

    mean, std, (all_x,) = standardize(x)
    w1, b1, w2, b2 = train_mlp(all_x, y, classes, args.hidden, args.epochs, args.seed)
    print(f"Akurasi pada data latih: {(predict((w1, b1, w2, b2), all_x) == y).mean():.1%}")

    model = {
        "labels": classes,
        "mean": np.round(mean, 6).tolist(),
        "std": np.round(std, 6).tolist(),
        "layers": [
            {"weights": np.round(w1, 5).tolist(), "bias": np.round(b1, 5).tolist()},
            {"weights": np.round(w2, 5).tolist(), "bias": np.round(b2, 5).tolist()},
        ],
        "meta": {
            "frames": int(len(x)),
            "signers": len(unique_signers),
            "heldOutAccuracy": None if held_out_accuracy is None else round(float(held_out_accuracy), 4),
        },
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(model, separators=(",", ":")))
    print(f"Model disimpan ke {output} ({output.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
