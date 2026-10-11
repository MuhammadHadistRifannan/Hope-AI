import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";

export type RunnerScene = { folder: string; layers: number };

type Props = {
  scenes: RunnerScene[];
  // Kemajuan gulir 0..1 sepanjang seluruh perjalanan
  progress: MotionValue<number>;
  // false: latar tidak bergeser (Kurangi Gerakan); adegan tetap berganti
  animated: boolean;
};

// Jarak yang ditempuh lapisan paling depan selama seluruh perjalanan, dalam lebar adegan
const JOURNEY_TILES = 9;
// Tiap lapisan diulang sebanyak ini ke samping agar selalu menutup layar
const COPIES = 4;
const TILE_RATIO = 576 / 324;

function Layer({
  src,
  speed,
  progress,
  tileWidth,
  animated,
}: {
  src: string;
  speed: number; // 0..1, lapisan depan paling cepat
  progress: MotionValue<number>;
  tileWidth: React.MutableRefObject<number>;
  animated: boolean;
}) {
  // Bergeser ke kiri lalu kembali tepat satu lebar adegan: karena lapisannya
  // bisa disambung, pergeseran terlihat tanpa ujung.
  const x = useTransform(progress, (value) => {
    const width = tileWidth.current;
    return width ? -((value * JOURNEY_TILES * width * speed) % width) : 0;
  });

  return (
    <motion.div
      className={`absolute inset-y-0 left-0 flex w-max ${animated ? "will-change-transform" : ""}`}
      style={animated ? { x } : undefined}
    >
      {Array.from({ length: COPIES }, (_, i) => (
        <img
          key={i}
          src={src}
          alt=""
          width={576}
          height={324}
          decoding="async"
          draggable={false}
          className="h-full w-auto max-w-none select-none"
          style={{ imageRendering: "pixelated" }}
        />
      ))}
    </motion.div>
  );
}

function Scene({
  scene,
  index,
  total,
  progress,
  tileWidth,
  animated,
}: {
  scene: RunnerScene;
  index: number;
  total: number;
  progress: MotionValue<number>;
  tileWidth: React.MutableRefObject<number>;
  animated: boolean;
}) {
  // Adegan tampil penuh di sekitar bagiannya, lalu memudar ke adegan berikutnya
  const opacityAt = (value: number) => {
    if (index === 0) return 1;
    const distance = value * (total - 1) - (index - 1);
    return Math.min(1, Math.max(0, (distance - 0.2) / 0.3));
  };
  const opacity = useTransform(progress, opacityAt);

  // Adegan yang tertutup adegan berikutnya, atau belum muncul, tidak perlu digambar
  // dan digeser; gambarnya pun baru dimuat saat perjalanan sudah dekat.
  const isShown = (value: number) => {
    const position = value * (total - 1);
    return opacityAt(value) > 0 && position < index + 1.6;
  };
  const isNear = (value: number) => Math.abs(value * (total - 1) - index) < 1.6;
  const [shown, setShown] = useState(() => isShown(progress.get()));
  const [loaded, setLoaded] = useState(() => index <= 1 || isNear(progress.get()));
  useMotionValueEvent(progress, "change", (value) => {
    setShown(isShown(value));
    if (isNear(value)) setLoaded(true);
  });

  return (
    <motion.div className="absolute inset-0" style={{ opacity, visibility: shown ? "visible" : "hidden" }}>
      {loaded &&
        Array.from({ length: scene.layers }, (_, i) => (
          <Layer
            key={i}
            src={`/parallax/${scene.folder}/${i + 1}.png`}
            // Langit hampir diam, tanah di depan paling cepat
            speed={scene.layers > 1 ? 0.06 + (i / (scene.layers - 1)) * 0.94 : 1}
            progress={progress}
            tileWidth={tileWidth}
            animated={animated && shown}
          />
        ))}
    </motion.div>
  );
}

// Latar bergaya game endless runner: adegan berlapis yang bergeser ke samping
// saat halaman digulir. Lapisan jauh bergerak pelan, lapisan dekat bergerak
// cepat, dan adegan berganti seiring perjalanan.
export default function RunnerStage({ scenes, progress, animated }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tileWidth = useRef(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      tileWidth.current = stage.clientHeight * TILE_RATIO;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stageRef} aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#7cc4e8]">
      {scenes.map((scene, i) => (
        <Scene
          key={i}
          scene={scene}
          index={i}
          total={scenes.length}
          progress={progress}
          tileWidth={tileWidth}
          animated={animated}
        />
      ))}
    </div>
  );
}
