"""Audit model kata BISINDO: isyarat mana yang mirip dan mudah tertukar.

    python audit.py <keluaran extract.py .pkl ...> --out <folder> [--epochs 150]

Semua angka dihitung pada sesi rekaman yang tidak ikut dilatih (lihat
cross_session di train.py), lalu ditulis ke <folder>/audit.json.

Yang diperiksa:
  1. Akurasi dan peluang per kata, serta pasangan yang tertukar.
  2. Kemiripan menurut model: kata kedua terkuat tiap video, dan jarak
     representasi model antar kata.
  3. Kemiripan tanpa model: jarak rata-rata urutan fitur antar kata dan
     tetangga terdekat tiap video di sesi lain.
  4. Uji ketahanan: derau, frame hilang, satu tangan tidak terlacak, kamera
     lambat, gerakan lebih cepat.
  5. Ciri gerakan tiap kata: berapa tangan dan di mana tangan berada.
"""

import argparse
import json
import os
from collections import defaultdict

import numpy as np

from bisindo_features import FEATURE_SIZE, HAND_SIZE, mirror, sign_sequence
from train import SEED, build, cross_session, forward_json, load, print_confusion


def pair_key(a, b):
    return " ~ ".join(sorted([a, b]))


def top_pairs(scores, n=10):
    return sorted(scores.items(), key=lambda kv: -kv[1])[:n]


def drop_frames(frames, rng, rate):
    return [f for f in frames if rng.random() >= rate]


def one_hand(frames):
    """Hanya tangan yang paling banyak bergerak yang terlacak (tangan kedua hilang)."""
    out = []
    for t, hands, pose in frames:
        if len(hands) >= 2:
            # Tangan dominan: pergelangan lebih tinggi di layar (y lebih kecil)
            hands = [min(hands, key=lambda h: h[0][1])]
        out.append((t, hands, pose))
    return out


def faster(seq):
    """Isyarat diperagakan lebih cepat: hanya 70% bagian tengah gerakan."""
    n = len(seq)
    positions = np.linspace(0.15 * (n - 1), 0.85 * (n - 1), n)
    low = np.floor(positions).astype(int)
    high = np.minimum(low + 1, n - 1)
    w = (positions - low)[:, None]
    return seq[low] * (1 - w) + seq[high] * w


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--out", required=True)
    parser.add_argument("--epochs", type=int, default=150)
    args = parser.parse_args()
    rng = np.random.default_rng(SEED)

    labels, items, _ = build(load(args.inputs))
    index = {label: i for i, label in enumerate(labels)}
    confusion, held_out = cross_session(labels, items, args.epochs)
    report = {"labels": labels, "videos": len(held_out)}

    # --- 1. Akurasi, peluang, dan pasangan yang tertukar ---
    accuracy = np.trace(confusion) / confusion.sum()
    print(f"\n1. Lintas sesi: {accuracy:.3f} ({np.trace(confusion)}/{confusion.sum()})")
    print_confusion(confusion, labels)
    per_word = {}
    runner_up = defaultdict(float)
    runner_count = defaultdict(int)
    for label in labels:
        rows = [(it, p) for it, p, _ in held_out if it["label"] == label]
        true_p = [p[index[label]] for _, p in rows]
        margins = []
        for _, p in rows:
            others = p.copy()
            others[index[label]] = -1
            j = int(others.argmax())
            margins.append(p[index[label]] - p[j])
            runner_up[pair_key(label, labels[j])] += p[j]
            runner_count[(label, labels[j])] += 1
        second = max(((l2, n) for (l1, l2), n in runner_count.items() if l1 == label), key=lambda kv: kv[1])
        per_word[label] = {
            "accuracy": round(confusion[index[label], index[label]] / confusion[index[label]].sum(), 3),
            "mean_true_prob": round(float(np.mean(true_p)), 3),
            "min_true_prob": round(float(np.min(true_p)), 3),
            "mean_margin": round(float(np.mean(margins)), 3),
            "below_threshold": int(sum(p < 0.6 for p in true_p)),
            "most_similar": second[0],
        }
    print("\n   kata            benar  p(benar) rata/min  selisih  <0,6  paling mirip")
    for label, w in sorted(per_word.items(), key=lambda kv: kv[1]["mean_margin"]):
        print(
            f"   {label:14s} {w['accuracy']:6.2f}  {w['mean_true_prob']:.2f}/{w['min_true_prob']:.2f}"
            f"       {w['mean_margin']:.2f}    {w['below_threshold']:2d}   {w['most_similar']}"
        )
    report["per_word"] = per_word
    swaps = defaultdict(int)
    for i, a in enumerate(labels):
        for j, b in enumerate(labels):
            if i != j and confusion[i, j]:
                swaps[pair_key(a, b)] += int(confusion[i, j])
    report["confused_pairs"] = top_pairs(swaps)

    # --- 2. Kemiripan menurut model ---
    # a. Jumlah peluang yang jatuh ke kata lain (dibagi jumlah video kedua kata)
    model_sim = {k: v / 100 for k, v in runner_up.items()}
    print("\n2a. Pasangan dengan peluang 'kata kedua' terbesar (rata-rata per video):")
    for k, v in top_pairs(model_sim, 8):
        print(f"   {k:30s} {v:.3f}")
    report["model_runner_up_pairs"] = [(k, round(v, 4)) for k, v in top_pairs(model_sim)]

    # b. Jarak kosinus representasi model (lapisan Dense 64) antar rata-rata kata
    embed = defaultdict(list)
    for it, _, exported in held_out:
        embed[it["label"]].append(forward_json(exported, it["seq"], until=4))
    centers = {l: np.mean(v, axis=0) for l, v in embed.items()}
    cos = {}
    for i, a in enumerate(labels):
        for b in labels[i + 1 :]:
            u, v = centers[a], centers[b]
            cos[pair_key(a, b)] = float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))
    print("\n2b. Pasangan dengan representasi model paling mirip (kosinus):")
    for k, v in top_pairs(cos, 8):
        print(f"   {k:30s} {v:.3f}")
    report["model_embedding_pairs"] = [(k, round(v, 4)) for k, v in top_pairs(cos)]

    # --- 3. Kemiripan tanpa model ---
    all_x = np.stack([it["seq"] for it in items]).reshape(-1, FEATURE_SIZE)
    mean, std = all_x.mean(axis=0), np.maximum(all_x.std(axis=0), 1e-2)
    z = {id(it): ((it["seq"] - mean) / std).ravel() for it in items}
    templates = {l: np.mean([z[id(it)] for it in items if it["label"] == l], axis=0) for l in labels}
    raw_dist = {}
    for i, a in enumerate(labels):
        for b in labels[i + 1 :]:
            raw_dist[pair_key(a, b)] = float(np.linalg.norm(templates[a] - templates[b]) / np.sqrt(templates[a].size))
    closest = sorted(raw_dist.items(), key=lambda kv: kv[1])[:8]
    print("\n3a. Pasangan dengan gerakan rata-rata paling dekat (tanpa model, makin kecil makin mirip):")
    for k, v in closest:
        print(f"   {k:30s} {v:.3f}")
    report["raw_template_pairs"] = [(k, round(v, 4)) for k, v in closest]

    # Tetangga terdekat lintas sesi (1-NN): seberapa mudah kata dikenali tanpa model
    nn_hits, nn_wrong = 0, defaultdict(int)
    for it in items:
        others = [o for o in items if o["session"] != it["session"]]
        d = [np.linalg.norm(z[id(it)] - z[id(o)]) for o in others]
        nearest = others[int(np.argmin(d))]["label"]
        nn_hits += nearest == it["label"]
        if nearest != it["label"]:
            nn_wrong[pair_key(it["label"], nearest)] += 1
    print(f"\n3b. Tetangga terdekat lintas sesi tanpa model: {nn_hits / len(items):.3f}")
    for k, v in top_pairs(nn_wrong, 8):
        print(f"   {k:30s} {v} video")
    report["nearest_neighbor_accuracy"] = round(nn_hits / len(items), 4)
    report["nearest_neighbor_confusions"] = top_pairs(nn_wrong)

    # --- 4. Uji ketahanan pada sesi yang tidak dilatih ---
    tests = {
        "derau kuat (σ=0,05)": lambda it: it["seq"] + rng.normal(0, 0.05, it["seq"].shape).astype(np.float32) * (it["seq"] != 0),
        "30% frame hilang": lambda it: sign_sequence(drop_frames(it["clip"]["frames"], rng, 0.3)),
        "kamera ±10 fps": lambda it: sign_sequence(it["clip"]["frames"][::3]),
        "hanya satu tangan terlacak": lambda it: sign_sequence(one_hand(it["clip"]["frames"])),
        "gerakan lebih cepat (70%)": lambda it: faster(it["seq"]),
        "dicerminkan (kidal)": lambda it: mirror(it["seq"]),
    }
    print("\n4. Uji ketahanan (sesi yang tidak dilatih):")
    report["stress"] = {}
    for name, make in tests.items():
        hits = total = 0
        swaps_here = defaultdict(int)
        for it, _, exported in held_out:
            variant = make(it)
            if variant is None:
                continue
            total += 1
            guess = labels[int(forward_json(exported, variant).argmax())]
            hits += guess == it["label"]
            if guess != it["label"]:
                swaps_here[f"{it['label']} → {guess}"] += 1
        worst = top_pairs(swaps_here, 4)
        print(f"   {name:28s} {hits / total:.3f}   " + ", ".join(f"{k} ({v})" for k, v in worst))
        report["stress"][name] = {"accuracy": round(hits / total, 4), "top_errors": worst}

    # --- 5. Ciri gerakan tiap kata ---
    print("\n5. Ciri gerakan (rata-rata per kata):")
    print("   kata            2 tangan  tinggi tangan*  gerak**")
    traits = {}
    for label in labels:
        two, height, motion = [], [], []
        for it in (it for it in items if it["label"] == label):
            seq = it["seq"]
            present = (seq[:, 0] > 0.5) & (seq[:, HAND_SIZE] > 0.5)
            two.append(present.mean())
            # Pergelangan tangan yang terlihat, relatif terhadap bahu (negatif = di atas bahu)
            wrists = [seq[:, s * HAND_SIZE + 2] for s in range(2) if (seq[:, s * HAND_SIZE] > 0.5).mean() > 0.5]
            if wrists:
                height.append(float(np.min([w.mean() for w in wrists])))
            xy = seq[:, [1, 2, HAND_SIZE + 1, HAND_SIZE + 2]]
            motion.append(float(np.abs(np.diff(xy, axis=0)).sum(axis=0).max()))
        traits[label] = {
            "two_hands": round(float(np.mean(two)), 2),
            "wrist_height": round(float(np.mean(height)), 2) if height else None,
            "path_length": round(float(np.mean(motion)), 2),
        }
        t = traits[label]
        print(f"   {label:14s} {t['two_hands']:8.2f}  {t['wrist_height']:14.2f}  {t['path_length']:7.2f}")
    print("   * dalam lebar bahu dari garis bahu; negatif = di atas bahu, positif = di bawah")
    print("   ** panjang lintasan pergelangan selama isyarat, dalam lebar bahu")
    report["traits"] = traits

    # Peraga lain (Halo 050, bukan peraga utama)
    other = [(it, p) for it, p, _ in held_out if it["label"] == "Halo" and it["clip"]["file"] == "050.mp4"]
    if other:
        it, p = other[0]
        order = np.argsort(p)[::-1][:3]
        guess = ", ".join(f"{labels[i]} {p[i]:.2f}" for i in order)
        print(f"\nPeraga lain (Halo 050): {guess}")
        report["other_signer_halo_050"] = guess

    report["cross_session_accuracy"] = round(float(accuracy), 4)
    report["confusion"] = confusion.tolist()
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "audit.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("\ntersimpan di", os.path.join(args.out, "audit.json"))


if __name__ == "__main__":
    main()
