import { useEffect, useRef, useState, type RefObject } from "react";
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "@/lib/sign/landmarks";

// width dan height: ukuran asli gambar kamera, dipakai untuk koordinat piksel.
// landmarks dan handedness: tangan pertama (dipakai SIBI). hands: semua tangan
// yang terlihat; pose: titik tubuh, hanya diisi bila twoHands aktif (BISINDO).
export type HandFrame = {
  landmarks: Point[];
  handedness: string;
  hands: Point[][];
  pose: Point[] | null;
  width: number;
  height: number;
} | null;

type Status = "idle" | "loading" | "ready" | "error";

// Menyalakan kamera dan melacak tangan dengan MediaPipe, seluruhnya di
// browser: gambar kamera tidak pernah dikirim ke server. Satu tangan untuk
// SIBI; dua tangan ditambah titik tubuh untuk BISINDO (twoHands).
export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement>,
  enabled: boolean,
  onFrame: (frame: HandFrame, now: number) => void,
  twoHands = false
) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const latestOnFrame = useRef(onFrame);
  latestOnFrame.current = onFrame;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarker | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let frameRequest = 0;
    let lastVideoTime = -1;

    const start = async () => {
      setStatus("loading");
      setError("");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: twoHands ? 2 : 1,
        });
        if (twoHands) {
          poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
        if (cancelled) return;
        setStatus("ready");

        const loop = () => {
          if (cancelled || !landmarker) return;
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const now = performance.now();
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result.landmarks?.[0];
            const pose = landmarks && poseLandmarker ? poseLandmarker.detectForVideo(video, now).landmarks?.[0] : null;
            latestOnFrame.current(
              landmarks
                ? {
                    landmarks,
                    handedness: result.handedness?.[0]?.[0]?.categoryName ?? "Right",
                    hands: result.landmarks,
                    pose: pose ?? null,
                    width: video.videoWidth,
                    height: video.videoHeight,
                  }
                : null,
              now
            );
          }
          frameRequest = requestAnimationFrame(loop);
        };
        loop();
      } catch (cause: any) {
        if (cancelled) return;
        console.error("Pelacakan tangan gagal dimulai:", cause);
        setError(
          cause?.name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan kamera di browser lalu coba lagi."
            : cause?.name === "NotFoundError"
            ? "Kamera tidak ditemukan di perangkat ini."
            : "Kamera atau pelacak tangan gagal dimulai."
        );
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRequest);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
      poseLandmarker?.close();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [enabled, videoRef, twoHands]);

  return { status, error };
}
