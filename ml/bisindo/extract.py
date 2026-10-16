"""Mengambil titik tangan dan tubuh dari video kata BISINDO.

    python extract.py <folder video> <folder model .task> <berkas keluaran .pkl> [kata,kata,...]

Folder video berisi satu subfolder per kata (nama subfolder = label), tiap
subfolder berisi video .mp4. Model .task sama dengan yang dipakai browser:
hand_landmarker.task dan pose_landmarker_lite.task (lihat
Frontend/scripts/prepare-mediapipe.mjs untuk alamat unduhnya).

Keluaran: daftar {label, file, frames}, dengan frames berisi
(waktu_ms, daftar tangan (21, 3) piksel, tubuh (33, 3) piksel atau None).
Titik mentah disimpan, bukan fitur, supaya fitur bisa diubah tanpa
mengulang ekstraksi yang lama.
"""

import os
import pickle
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision


def landmarkers(model_dir):
    hand = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=os.path.join(model_dir, "hand_landmarker.task")),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
        )
    )
    pose = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=os.path.join(model_dir, "pose_landmarker_lite.task")),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
        )
    )
    return hand, pose


def to_pixels(points, width, height):
    return np.array([[p.x * width, p.y * height, p.z * width] for p in points], dtype=np.float32)


def read_video(path, model_dir):
    # Pelacak mode VIDEO butuh waktu yang terus naik, jadi dibuat baru per video
    hand_marker, pose_marker = landmarkers(model_dir)
    capture = cv2.VideoCapture(path)
    fps = capture.get(cv2.CAP_PROP_FPS) or 30
    frames, index = [], 0
    try:
        while True:
            ok, bgr = capture.read()
            if not ok:
                break
            height, width = bgr.shape[:2]
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            t = int(round(index * 1000 / fps))
            hands = hand_marker.detect_for_video(image, t)
            pose = pose_marker.detect_for_video(image, t)
            frames.append(
                (
                    float(t),
                    [to_pixels(h, width, height) for h in hands.hand_landmarks],
                    to_pixels(pose.pose_landmarks[0], width, height) if pose.pose_landmarks else None,
                )
            )
            index += 1
    finally:
        capture.release()
        hand_marker.close()
        pose_marker.close()
    return frames


def main(video_dir, model_dir, output, only=""):
    # only: daftar kata dipisah koma, untuk menjalankan beberapa proses sekaligus
    wanted = {w for w in only.split(",") if w}
    clips = []
    if os.path.exists(output):
        with open(output, "rb") as f:
            clips = pickle.load(f)
    done = {(c["label"], c["file"]) for c in clips}

    for label in sorted(os.listdir(video_dir)):
        folder = os.path.join(video_dir, label)
        if not os.path.isdir(folder) or (wanted and label not in wanted):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.lower().endswith(".mp4") or (label, name) in done:
                continue
            frames = read_video(os.path.join(folder, name), model_dir)
            clips.append({"label": label, "file": name, "frames": frames})
            print(label, name, len(frames), "frame", flush=True)
        # Disimpan per kata supaya bisa dilanjutkan bila terhenti
        with open(output, "wb") as f:
            pickle.dump(clips, f)
    print("selesai:", len(clips), "video")


if __name__ == "__main__":
    main(*sys.argv[1:5])
