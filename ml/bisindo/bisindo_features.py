"""Fitur kata BISINDO dari titik tangan dan tubuh MediaPipe.

Harus identik dengan Frontend/src/lib/sign/bisindo.ts. Tes di
Frontend/src/lib/sign/bisindo.test.ts memeriksanya dengan contoh dari
models/bisindo-kata.samples.json, yang dibuat oleh train.py.

Per frame (semua titik dalam piksel: x * lebar, y * tinggi, z * lebar):
  1. Titik tubuh wajib ada. Pusat = tengah kedua bahu (titik 11 dan 12),
     skala = jarak kedua bahu di bidang xy.
  2. Tiap tangan dimasukkan ke slot 0 atau 1 menurut pergelangan tubuh
     terdekat (titik 15 dan 16), jadi urutannya tidak bergantung pada label
     kiri/kanan dari MediaPipe.
  3. Tiap slot: penanda ada (1/0) lalu 21 titik (x, y, z) relatif terhadap
     pusat dan dibagi skala. Slot kosong berisi nol.
  4. Ditambah titik tubuh 0, 11, 12, 13, 14, 15, 16 (x, y saja).
Ukuran: 2 * (1 + 63) + 7 * 2 = 142.

Satu isyarat = frame bertangan yang berurutan tanpa celah lebih dari GAP_MS,
lalu disamakan menjadi FRAMES frame menurut waktu.
"""

import numpy as np

FRAMES = 30
POSE_POINTS = [0, 11, 12, 13, 14, 15, 16]
HAND_SIZE = 1 + 21 * 3
FEATURE_SIZE = 2 * HAND_SIZE + len(POSE_POINTS) * 2
MIN_FRAMES = 6
GAP_MS = 400


def frame_features(hands, pose):
    """hands: daftar array (21, 3) dalam piksel; pose: array (33, 3) dalam piksel atau None."""
    if pose is None:
        return None
    left, right = pose[11], pose[12]
    ox, oy = (left[0] + right[0]) / 2, (left[1] + right[1]) / 2
    scale = float(np.hypot(left[0] - right[0], left[1] - right[1]))
    if scale < 1e-6:
        return None

    slots = [None, None]
    wrists = [pose[15], pose[16]]
    dist = lambda hand, wrist: float(np.hypot(hand[0][0] - wrist[0], hand[0][1] - wrist[1]))
    if len(hands) == 1:
        slot = 0 if dist(hands[0], wrists[0]) <= dist(hands[0], wrists[1]) else 1
        slots[slot] = hands[0]
    elif len(hands) >= 2:
        a, b = hands[0], hands[1]
        straight = dist(a, wrists[0]) + dist(b, wrists[1])
        swapped = dist(a, wrists[1]) + dist(b, wrists[0])
        slots = [a, b] if straight <= swapped else [b, a]

    out = []
    for hand in slots:
        if hand is None:
            out.extend([0.0] * HAND_SIZE)
            continue
        out.append(1.0)
        for x, y, z in hand:
            out.extend([(x - ox) / scale, (y - oy) / scale, z / scale])
    for i in POSE_POINTS:
        out.extend([(pose[i][0] - ox) / scale, (pose[i][1] - oy) / scale])
    return np.asarray(out, dtype=np.float32)


def resample(features, times, frames=FRAMES):
    """Menyamakan urutan frame (n, F) dengan waktu (n,) menjadi (frames, F) secara linear."""
    features = np.asarray(features, dtype=np.float32)
    times = np.asarray(times, dtype=np.float64)
    if len(features) == 1:
        return np.repeat(features, frames, axis=0)
    targets = np.linspace(times[0], times[-1], frames)
    out = np.empty((frames, features.shape[1]), dtype=np.float32)
    j = 0
    for k, t in enumerate(targets):
        while j < len(times) - 2 and times[j + 1] < t:
            j += 1
        span = times[j + 1] - times[j]
        w = 0.0 if span <= 0 else min(1.0, max(0.0, (t - times[j]) / span))
        out[k] = features[j] * (1 - w) + features[j + 1] * w
    return out


def sign_sequence(frames):
    """frames: daftar (waktu_ms, hands, pose). Mengembalikan (FRAMES, F) atau None.

    Tangan yang hilang lebih dari GAP_MS memisahkan dua isyarat (di browser,
    saat itulah isyarat dianggap selesai). Dari video latih diambil bagian
    dengan frame bertangan terbanyak, sehingga deteksi sesaat di tepi video
    tidak ikut.
    """
    # Hanya frame dengan tangan dan bahu terlihat; celah di antaranya diisi
    # interpolasi oleh resample (browser juga melewati frame tanpa tangan)
    valid = []
    for t, hands, pose in frames:
        f = frame_features(hands, pose) if len(hands) > 0 else None
        if f is not None:
            valid.append((t, f))

    runs, current = [], []
    for item in valid:
        if current and item[0] - current[-1][0] > GAP_MS:
            runs.append(current)
            current = []
        current.append(item)
    if current:
        runs.append(current)
    if not runs:
        return None

    best = max(runs, key=len)
    if len(best) < MIN_FRAMES:
        return None
    return resample([f for _, f in best], [t for t, _ in best])


def mirror(seq):
    """Isyarat yang sama diperagakan dengan tangan sebaliknya (untuk augmentasi)."""
    seq = np.array(seq, dtype=np.float32, copy=True)
    hands = seq[:, : 2 * HAND_SIZE].reshape(len(seq), 2, HAND_SIZE)
    hands[:, :, 1::3] *= -1  # x
    hands = hands[:, ::-1]
    pose = seq[:, 2 * HAND_SIZE :].reshape(len(seq), len(POSE_POINTS), 2)
    pose[:, :, 0] *= -1
    pose = pose[:, [0, 2, 1, 4, 3, 6, 5]]
    return np.concatenate([hands.reshape(len(seq), -1), pose.reshape(len(seq), -1)], axis=1)
