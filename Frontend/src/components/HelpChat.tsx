import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { ArrowRight, MessageCircle, Send, X } from "lucide-react";
import { HELP_ENTRIES, HELP_FALLBACK, HELP_SCOPE, HELP_SCOPE_SHORT, HELP_SUGGESTIONS, findAnswer, type HelpLink } from "@/lib/helpChat";

// "Tanya Hope": tombol obrolan di pojok kanan bawah landing page. Jawabannya sudah
// ditulis (bukan AI), dan batas kemampuannya diberitahukan sejak jendela dibuka.
//
// Di ponsel jendelanya berupa lembar yang naik dari bawah dan hanya memakan sebagian
// layar: halaman di belakangnya meredup, lembar bisa ditarik turun untuk menutup, dan
// isinya dibuat lapang. Di layar lebar ia menjadi jendela kecil di atas tombolnya.

type Message = { from: "hope" | "kamu"; text: string; link?: HelpLink };

const WELCOME: Message = { from: "hope", text: HELP_SCOPE };
// Pegas tanpa pantulan: lembar tiba dengan tenang
const SPRING = { type: "spring", bounce: 0, duration: 0.38 } as const;

function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

// Saat papan ketik ponsel muncul, lembar ikut naik supaya kotak ketik tetap terlihat
function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);
  return inset;
}

export default function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  // Pilihan pertanyaan tampil di bawah pesan terakhir: di awal, dan lagi saat diminta
  // atau saat pertanyaan tidak bisa dijawab.
  const [showList, setShowList] = useState(true);
  const phone = useIsPhone();
  const keyboard = useKeyboardInset(open && phone);
  const drag = useDragControls();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Saat dibuka fokus pindah ke jendela (bukan ke kotak ketik, supaya papan ketik ponsel
  // tidak langsung muncul); saat ditutup fokus kembali ke tombol pembukanya.
  useEffect(() => {
    if (open) closeRef.current?.focus();
    else if (wasOpen.current) toggleRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Pesan terbaru selalu terlihat
  useEffect(() => {
    const log = logRef.current;
    // Saat baru dibuka, pesan pertama (batas kemampuan) terbaca dari awal
    if (log) log.scrollTop = messages.length > 1 ? log.scrollHeight : 0;
  }, [messages, showList, open]);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question) return;
    const entry = findAnswer(question);
    setMessages((current) => [
      ...current,
      { from: "kamu", text: question },
      entry ? { from: "hope", text: entry.answer, link: entry.link } : { from: "hope", text: HELP_FALLBACK },
    ]);
    setDraft("");
    setShowList(!entry);
  };

  // Lembar ditutup bila ditarik cukup jauh ke bawah atau dilepas dengan sentakan ke bawah
  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) setOpen(false);
  };

  const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const press = "transition-transform duration-100 active:scale-[0.97]";

  return (
    <>
      {/* Tombol pembuka hanya tampil selagi jendela tertutup, jadi tidak pernah berdampingan dengan tombol kirim */}
      {!open && (
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Buka Tanya Hope, tanya-jawab tentang Hope.Ai"
          className={`fixed bottom-4 right-4 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 md:bottom-6 md:right-6 ${press} ${ring}`}
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <AnimatePresence>
        {open && phone && (
          // Di ponsel halaman di belakang meredup; ketuk di luar lembar untuk menutup
          <motion.div
            key="redup"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[59] bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        {open && (
          <motion.section
            key="jendela"
            aria-label="Tanya Hope"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
              }
            }}
            // Masuk dan keluar lewat jalur yang sama: dari bawah di ponsel, dari tombolnya di layar lebar
            initial={phone ? { y: "100%" } : { opacity: 0, scale: 0.92 }}
            animate={phone ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={phone ? { y: "100%" } : { opacity: 0, scale: 0.92 }}
            transition={SPRING}
            drag={phone ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            onDragEnd={onDragEnd}
            style={phone ? { bottom: keyboard } : { transformOrigin: "100% 100%" }}
            className={`fixed z-[60] flex flex-col overflow-hidden bg-card text-card-foreground ${
              phone
                ? "inset-x-0 max-h-[min(68svh,34rem)] rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-2xl"
                : "bottom-6 right-6 max-h-[min(32rem,calc(100svh-3rem))] w-[22rem] rounded-2xl border border-border shadow-2xl"
            }`}
          >
            {/* Kepala: di ponsel sekaligus menjadi pegangan untuk menarik lembar turun */}
            <header
              onPointerDown={(event) => {
                if (phone && !(event.target as HTMLElement).closest("button")) drag.start(event);
              }}
              className={`shrink-0 ${phone ? "touch-none" : ""}`}
            >
              {phone && <span aria-hidden="true" className="mx-auto mt-2 block h-1.5 w-10 rounded-full bg-muted-foreground/30" />}
              <div className="flex items-center justify-between gap-3 pl-4 pr-1.5">
                <h2 className="flex items-center gap-2.5 text-base font-semibold">
                  <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" /> Tanya Hope
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup Tanya Hope"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground ${press} ${ring}`}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {/* Batas kemampuan, versi pendek: selalu terlihat */}
              <p className="mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.8rem] leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{HELP_SCOPE_SHORT}</p>
            </header>

            <div ref={logRef} role="log" aria-live="polite" aria-label="Percakapan" className="help-scroll flex min-h-[7rem] flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.9rem] leading-[1.5] ${
                    message.from === "hope" ? "self-start rounded-bl-md bg-muted" : "self-end rounded-br-md bg-primary text-primary-foreground"
                  }`}
                >
                  <span className="sr-only">{message.from === "hope" ? "Hope: " : "Kamu: "}</span>
                  {message.text}
                  {message.link && (
                    <Link to={message.link.to} className={`mt-1 flex min-h-11 items-center gap-1.5 font-semibold text-primary underline underline-offset-4 ${ring}`}>
                      {message.link.label} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              ))}

              {/* Pilihan pertanyaan, tepat di bawah pesan terakhir */}
              {showList ? (
                <ul aria-label="Pertanyaan yang bisa kujawab" className="flex flex-wrap gap-2">
                  {HELP_SUGGESTIONS.map((id) => {
                    const entry = HELP_ENTRIES.find((item) => item.id === id);
                    if (!entry) return null;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => ask(entry.question)}
                          className={`min-h-11 rounded-full border border-primary/30 px-3.5 text-left text-[0.84rem] leading-tight text-primary hover:bg-primary/5 ${press} ${ring}`}
                        >
                          {entry.question}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowList(true)}
                  className={`min-h-11 self-start rounded-full border border-primary/30 px-3.5 text-[0.84rem] text-primary hover:bg-primary/5 ${press} ${ring}`}
                >
                  Lihat pertanyaan lain
                </button>
              )}
            </div>

            <form
              className="flex shrink-0 gap-2 border-t border-border px-4 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                ask(draft);
              }}
            >
              <label htmlFor="tanya-ketik" className="sr-only">
                Ketik pertanyaan tentang Hope.Ai
              </label>
              {/* 16px di ponsel supaya Safari tidak memperbesar halaman saat kotak ini disentuh */}
              <input
                id="tanya-ketik"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tanya tentang Hope.Ai…"
                maxLength={200}
                autoComplete="off"
                enterKeyHint="send"
                className={`h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base placeholder:text-muted-foreground sm:text-[0.9rem] ${ring}`}
              />
              <button
                type="submit"
                aria-label="Kirim pertanyaan"
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 ${press} ${ring}`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
