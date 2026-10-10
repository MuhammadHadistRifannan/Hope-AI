import { useEffect, useMemo, useRef } from "react";

type Props = {
  text: string;
  // Posisi baca 0..1, atau null bila tidak sedang dibacakan
  progress: number | null;
  className?: string;
};

// Teks dengan kata yang sedang dibacakan tersorot, dan ikut bergulir ke kata itu.
export default function HighlightedText({ text, progress, className = "" }: Props) {
  const tokens = useMemo(() => {
    let offset = 0;
    return text.split(/(\s+)/).map((part) => {
      const token = { part, start: offset, end: offset + part.length, isWord: part.trim().length > 0 };
      offset += part.length;
      return token;
    });
  }, [text]);

  const position = progress === null ? -1 : Math.floor(progress * text.length);
  const active =
    position < 0
      ? -1
      : tokens.findIndex((token) => token.isWord && position < token.end);

  const activeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {tokens.map((token, i) =>
        token.isWord ? (
          <span
            key={i}
            ref={i === active ? activeRef : undefined}
            className={i === active ? "bg-yellow-300 text-black rounded px-0.5 -mx-0.5" : undefined}
          >
            {token.part}
          </span>
        ) : (
          token.part
        )
      )}
    </p>
  );
}
