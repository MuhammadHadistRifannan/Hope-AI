import { useState, useEffect } from "react";
import { clickable } from "@/lib/a11y";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Flame, Zap, Timer, RefreshCcw, X, Brain, 
  Calculator, Volume2, Star,
  // Import ikon buah-buahan
  Apple, Cherry, Banana, Grape, Citrus, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { useSettings } from "@/context/SettingsContext";

// --- TYPE DEFINITIONS ---
type CardType = {
  id: number;
  content: string;
  matchId: number;
  type: string;
  isFlipped?: boolean;
  isMatched?: boolean;
};

// --- DATA KARTU (MEMORY GAME) ---
const cardsData = [
  { id: 1, content: "🍎", matchId: 1, type: "icon" },
  { id: 2, content: "Apel", matchId: 1, type: "text" },
  { id: 3, content: "🐱", matchId: 2, type: "icon" },
  { id: 4, content: "Kucing", matchId: 2, type: "text" },
  { id: 5, content: "🚗", matchId: 3, type: "icon" },
  { id: 6, content: "Mobil", matchId: 3, type: "text" },
  { id: 7, content: "🌟", matchId: 4, type: "icon" },
  { id: 8, content: "Bintang", matchId: 4, type: "text" },
  { id: 9, content: "🏠", matchId: 5, type: "icon" },
  { id: 10, content: "Rumah", matchId: 5, type: "text" },
  { id: 11, content: "✈️", matchId: 6, type: "icon" },
  { id: 12, content: "Pesawat", matchId: 6, type: "text" },
];

// --- KONFIGURASI VISUAL BUAH (MATH GAME) ---
const fruitIcons = [
  { icon: Apple, color: "text-red-500", name: "apel" },
  { icon: Cherry, color: "text-rose-600", name: "ceri" },
  { icon: Banana, color: "text-yellow-500", name: "pisang" },
  { icon: Grape, color: "text-purple-500", name: "anggur" },
  { icon: Citrus, color: "text-orange-500", name: "jeruk" },
  // { icon: Strawberry, color: "text-red-600", name: "stroberi" },
];

// Helper Component untuk menampilkan sejumlah buah
const FruitDisplay = ({ count, fruitIndex }: { count: number, fruitIndex: number }) => {
  const FruitIcon = fruitIcons[fruitIndex].icon;
  const fruitColor = fruitIcons[fruitIndex].color;
  
  return (
    <div className="flex flex-wrap justify-center gap-1 bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl shadow-sm border-2 border-green-100 dark:border-green-900/30 min-w-[80px] min-h-[80px] items-center">
      {count > 0 ? Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring" }}
        >
           <FruitIcon className={`w-8 h-8 ${fruitColor} drop-shadow-sm fill-current opacity-90`} />
        </motion.div>
      )) : (
        <span className="text-3xl font-bold text-slate-300 dark:text-slate-600">0</span>
      )}
      {/* Menampilkan angka kecil di bawah untuk bantuan */}
      <div className="w-full text-center text-xs font-bold text-slate-500 mt-1">{count}</div>
    </div>
  );
};


export default function Playground() {
  const { toast } = useToast();
  const { volume } = useSettings();
  
  // GLOBAL STATS
  const [xp, setXp] = useState(1250);
  const [streak, setStreak] = useState(5);
  const [activeTab, setActiveTab] = useState("memory");

  // --- STATE: MEMORY GAME ---
  const [memIsPlaying, setMemIsPlaying] = useState(false);
  const [cards, setCards] = useState<CardType[]>([]);
  const [flippedCards, setFlippedCards] = useState<CardType[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [memScore, setMemScore] = useState(0);
  const [memTimeLeft, setMemTimeLeft] = useState(60);
  const [memGameOver, setMemGameOver] = useState(false);

  // --- STATE: MATH GAME (UPDATED STRUCTURE) ---
  const [mathIsPlaying, setMathIsPlaying] = useState(false);
  // Struktur soal baru: menyimpan detail angka dan indeks buah
  const [mathQuestion, setMathQuestion] = useState({ 
    num1: 0, 
    num2: 0, 
    operator: '+', 
    answer: 0,
    fruitIndex: 0 // Indeks untuk array fruitIcons
  });
  const [mathOptions, setMathOptions] = useState<number[]>([]);
  const [mathScore, setMathScore] = useState(0);
  const [mathTimeLeft, setMathTimeLeft] = useState(45); // Waktu sedikit ditambah agar tidak buru-buru melihat gambar
  const [mathGameOver, setMathGameOver] = useState(false);

  // ==========================================
  // LOGIC: MEMORY MATCH (TIDAK BERUBAH)
  // ==========================================
  const startMemoryGame = () => {
    const shuffled = [...cardsData]
      .sort(() => Math.random() - 0.5)
      .map(card => ({ ...card, isFlipped: false, isMatched: false }));
    setCards(shuffled);
    setMemIsPlaying(true);
    setMemGameOver(false);
    setMemScore(0);
    setMatchedCount(0);
    setMemTimeLeft(60);
    setFlippedCards([]);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (memIsPlaying && memTimeLeft > 0 && !memGameOver) {
      timer = setInterval(() => setMemTimeLeft((prev) => prev - 1), 1000);
    } else if (memTimeLeft === 0 && memIsPlaying) {
      setMemGameOver(true);
      setMemIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [memIsPlaying, memTimeLeft, memGameOver]);

  const handleCardClick = (clickedCard: CardType) => {
    if (memGameOver || clickedCard.isFlipped || clickedCard.isMatched || flippedCards.length >= 2) return;
    const newCards = cards.map(c => c.id === clickedCard.id ? { ...c, isFlipped: true } : c);
    setCards(newCards);
    playTone(400, 0.1); 
    const newFlipped = [...flippedCards, clickedCard];
    setFlippedCards(newFlipped);
    if (newFlipped.length === 2) {
      checkForMatch(newFlipped);
    }
  };

  const checkForMatch = (currentFlipped: CardType[]) => {
    const [card1, card2] = currentFlipped;
    if (card1.matchId === card2.matchId) {
      setTimeout(() => {
        setCards(prev => prev.map(c => c.id === card1.id || c.id === card2.id ? { ...c, isMatched: true } : c));
        setFlippedCards([]);
        setMemScore(prev => prev + 20);
        setMatchedCount(prev => {
          const newCount = prev + 1;
          if (newCount === cardsData.length / 2) {
            setMemGameOver(true);
            setMemIsPlaying(false);
            setXp(prevXP => prevXP + memScore + 50);
            confetti();
          }
          return newCount;
        });
        playTone(600, 0.2); 
      }, 500);
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c => c.id === card1.id || c.id === card2.id ? { ...c, isFlipped: false } : c));
        setFlippedCards([]);
      }, 1000);
    }
  };

  // ==========================================
  // LOGIC: MATH WHIZ (VISUAL UPDATE)
  // ==========================================
  const generateQuestion = () => {
    // 1. Pilih jenis buah
    const fruitIdx = Math.floor(Math.random() * fruitIcons.length);
    
    // 2. Tentukan operator dan angka (max 10 agar tampilan tidak terlalu penuh)
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    let num2 = Math.floor(Math.random() * 9) + 1;

    if (operator === '-' && num1 < num2) [num1, num2] = [num2, num1];

    const answer = operator === '+' ? num1 + num2 : num1 - num2;
    
    // 3. Generate opsi jawaban
    const options = new Set<number>();
    options.add(answer);
    while(options.size < 4) {
      const wrong = answer + Math.floor(Math.random() * 8) - 4;
      // Pastikan jawaban positif dan tidak terlalu besar
      if (wrong >= 0 && wrong !== answer && wrong <= 20) options.add(wrong);
    }

    // 4. Simpan state terstruktur
    setMathQuestion({ num1, num2, operator, answer, fruitIndex: fruitIdx });
    setMathOptions(Array.from(options).sort(() => Math.random() - 0.5));
    
    // Auto speak question (Disesuaikan dengan nama buah)
    const fruitName = fruitIcons[fruitIdx].name;
    const opText = operator === '+' ? 'ditambah' : 'dikurang';
    speak(`${num1} ${fruitName} ${opText} ${num2} ${fruitName}, sama dengan berapa?`);
  };

  const startMathGame = () => {
    setMathIsPlaying(true);
    setMathGameOver(false);
    setMathScore(0);
    setMathTimeLeft(45);
    generateQuestion();
  };

  const handleMathAnswer = (selected: number) => {
    if (selected === mathQuestion.answer) {
      setMathScore(prev => prev + 10);
      playTone(800, 0.1); 
      toast({ title: "Benar! 👍", duration: 500, className: "bg-green-500 text-white border-none" });
      generateQuestion();
    } else {
      playTone(200, 0.3); 
      toast({ title: "Salah! 😅", duration: 500, variant: "destructive" });
      setMathTimeLeft(prev => Math.max(0, prev - 3)); // Hukuman waktu lebih besar
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mathIsPlaying && mathTimeLeft > 0 && !mathGameOver) {
      timer = setInterval(() => setMathTimeLeft((prev) => prev - 1), 1000);
    } else if (mathTimeLeft === 0 && mathIsPlaying) {
      setMathGameOver(true);
      setMathIsPlaying(false);
      setXp(prev => prev + mathScore);
      if (mathScore > 50) confetti();
    }
    return () => clearInterval(timer);
  }, [mathIsPlaying, mathTimeLeft, mathGameOver]);


  // --- HELPER AUDIO ---
  const playTone = (freq: number, duration: number) => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = volume / 100 * 0.1;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel previous utterance to avoid overlap
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.volume = volume / 100;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="min-h-screen p-4 md:p-8 pb-20">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <Card className="p-4 flex items-center gap-3 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <Flame className="w-8 h-8 text-orange-500 fill-orange-500 animate-pulse" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Streak</p>
                <p className="text-xl font-bold text-orange-600">{streak} Hari</p>
              </div>
           </Card>
           <Card className="p-4 flex items-center gap-3 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Total XP</p>
                <p className="text-xl font-bold text-blue-600">{xp}</p>
              </div>
           </Card>
           <Card className="p-4 flex items-center gap-3 border-purple-200 bg-purple-50 dark:bg-purple-900/20 md:col-span-2">
              <Trophy className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Liga Saat Ini</p>
                <p className="text-xl font-bold text-purple-600">Berlian</p>
              </div>
           </Card>
        </div>

        {/* TABS CONTAINER */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 dark:bg-slate-800 p-1 mb-6 rounded-2xl">
            <TabsTrigger value="memory" className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">
              <Brain className="w-5 h-5 mr-2" /> Memory Match
            </TabsTrigger>
            <TabsTrigger value="math" className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">
              <Calculator className="w-5 h-5 mr-2" /> Math Whiz
            </TabsTrigger>
          </TabsList>

          {/* GAME 1: MEMORY MATCH (TIDAK BERUBAH TAMPILANNYA) */}
          <TabsContent value="memory">
            <Card className="p-6 min-h-[550px] relative overflow-hidden bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-slate-950 border-2 border-blue-100 dark:border-slate-800 shadow-xl rounded-3xl">
              
              {!memIsPlaying && !memGameOver && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-8 text-center">
                   <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                      <Brain className="w-12 h-12 text-blue-600" />
                   </div>
                   <h1 className="text-4xl font-black mb-3 text-slate-800 dark:text-white">Memory Match</h1>
                   <p className="text-slate-500 mb-8 max-w-md text-lg">
                     Latih ingatanmu dengan mencocokkan kartu gambar dan kata sebelum waktu habis!
                   </p>
                   <Button size="lg" onClick={startMemoryGame} className="rounded-full px-12 h-16 text-xl shadow-xl shadow-blue-500/20 hover:scale-105 transition-transform bg-blue-600 hover:bg-blue-700">
                     Mulai Main
                   </Button>
                </div>
              )}

              {/* HUD MEMORY */}
              <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                   <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">
                     <Timer className="w-6 h-6 text-slate-500" />
                   </div>
                   <span className={`text-2xl font-mono font-bold ${memTimeLeft < 10 ? 'text-red-500 animate-pulse' : ''}`}>
                     {memTimeLeft}s
                   </span>
                </div>
                <div className="flex-1 mx-6">
                   <Progress value={(matchedCount / (cardsData.length / 2)) * 100} className="h-4 rounded-full" />
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-xl text-blue-700 dark:text-blue-300 font-bold text-xl">
                   Score: {memScore}
                </div>
              </div>

              {/* GRID MEMORY */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                 {cards.map((card) => (
                   <motion.div
                     key={card.id}
                     layout
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     {...clickable(
                       () => handleCardClick(card),
                       card.isFlipped || card.isMatched ? `Kartu ${card.content}` : "Kartu tertutup"
                     )}
                     className={`
                       aspect-square cursor-pointer rounded-2xl flex items-center justify-center text-center p-2 text-sm md:text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.1)] transition-all duration-300 border-2 select-none
                       ${card.isMatched 
                          ? 'bg-green-100 border-green-400 text-green-600 opacity-50 scale-95 cursor-default' 
                          : card.isFlipped 
                            ? 'bg-white border-blue-400 text-slate-800 ring-4 ring-blue-100' 
                            : 'bg-blue-500 text-white border-blue-700 hover:bg-blue-400'
                        }
                     `}
                   >
                     {card.isFlipped || card.isMatched ? (
                       <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="flex flex-col items-center">
                         <span className="text-3xl mb-1">{card.type === 'icon' ? card.content : ''}</span>
                         <span className="text-sm">{card.type === 'text' ? card.content : ''}</span>
                       </motion.div>
                     ) : (
                       <span className="text-3xl opacity-20">?</span>
                     )}
                   </motion.div>
                 ))}
              </div>

              {/* GAME OVER MODAL MEMORY */}
              <AnimatePresence>
                {memGameOver && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-8 text-center"
                  >
                     {matchedCount === cardsData.length / 2 ? (
                       <>
                         <Trophy className="w-32 h-32 text-yellow-400 mb-6 animate-bounce drop-shadow-lg" />
                         <h2 className="text-4xl font-black text-green-600 mb-2">Luar Biasa!</h2>
                         <p className="text-muted-foreground mb-8 text-lg">Semua kartu cocok!</p>
                       </>
                     ) : (
                       <>
                         <X className="w-32 h-32 text-red-400 mb-6" />
                         <h2 className="text-4xl font-black text-slate-700 mb-2">Waktu Habis!</h2>
                         <p className="text-muted-foreground mb-8 text-lg">Jangan menyerah, coba lagi!</p>
                       </>
                     )}
                     
                     <Button size="lg" onClick={startMemoryGame} className="gap-2 rounded-full px-8 h-12 text-lg">
                        <RefreshCcw className="w-5 h-5" /> Main Lagi
                     </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </TabsContent>

          {/* GAME 2: MATH WHIZ (TAMPILAN VISUAL BARU) */}
          <TabsContent value="math">
            <Card className="p-6 min-h-[550px] relative overflow-hidden bg-gradient-to-b from-white to-green-50 dark:from-slate-900 dark:to-slate-950 border-2 border-green-100 dark:border-slate-800 shadow-xl rounded-3xl">
              
              {!mathIsPlaying && !mathGameOver && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-8 text-center">
                   <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Calculator className="w-12 h-12 text-green-600" />
                   </div>
                   <h1 className="text-4xl font-black mb-3 text-slate-800 dark:text-white">Math Whiz</h1>
                   <p className="text-slate-500 mb-8 max-w-md text-lg">
                     Hitung jumlah buah-buahan yang muncul. Jawab secepatnya sebelum waktu habis!
                   </p>
                   <Button size="lg" onClick={startMathGame} className="rounded-full px-12 h-16 text-xl shadow-xl shadow-green-500/20 hover:scale-105 transition-transform bg-green-600 hover:bg-green-700 text-white">
                     Mulai Berhitung
                   </Button>
                </div>
              )}

              {/* HUD MATH */}
              <div className="flex justify-between items-center mb-10 px-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-green-50 dark:border-slate-700">
                 <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 px-4 py-2 rounded-full">
                    <Timer className="w-6 h-6" />
                    <span className={`text-2xl font-mono font-bold ${mathTimeLeft < 10 ? 'animate-pulse' : ''}`}>
                      {mathTimeLeft}s
                    </span>
                 </div>
                 <div className="text-3xl font-black text-green-600 drop-shadow-sm bg-green-50 dark:bg-green-900/20 px-6 py-2 rounded-full">
                    {mathScore} Pts
                 </div>
              </div>

              {/* VISUAL QUESTION AREA (BAGIAN INI YANG DIUBAH TOTAL) */}
              <div className="max-w-2xl mx-auto mb-12">
                 <motion.div 
                   key={mathQuestion.num1 + mathQuestion.operator + mathQuestion.num2} // Key untuk trigger animasi saat soal berubah
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-green-200 dark:border-green-900/50"
                 >
                    {/* Kelompok Buah 1 */}
                    <FruitDisplay count={mathQuestion.num1} fruitIndex={mathQuestion.fruitIndex} />
                    
                    {/* Operator */}
                    <div className="text-5xl md:text-6xl font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 w-16 h-16 flex items-center justify-center rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                       {mathQuestion.operator}
                    </div>
                    
                    {/* Kelompok Buah 2 */}
                    <FruitDisplay count={mathQuestion.num2} fruitIndex={mathQuestion.fruitIndex} />
                    
                    {/* Sama Dengan & Tanda Tanya */}
                     <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-5xl md:text-6xl font-black text-slate-400 dark:text-slate-500">
                          =
                        </div>
                        <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-2xl border-4 border-green-200 dark:border-green-700 text-5xl font-bold text-green-600 animate-pulse">
                         ?
                       </div>
                     </div>
                 </motion.div>
                 
                 <div className="flex justify-center mt-4">
                    <Button variant="ghost" size="sm" onClick={() => speak(`${mathQuestion.num1} ${fruitIcons[mathQuestion.fruitIndex].name} ${mathQuestion.operator === '+' ? 'ditambah' : 'dikurang'} ${mathQuestion.num2} ${fruitIcons[mathQuestion.fruitIndex].name}, sama dengan berapa?`)} className="text-slate-500 hover:text-green-600 gap-2">
                       <Volume2 className="w-5 h-5" /> Dengarkan Soal
                    </Button>
                 </div>
              </div>

              {/* OPTIONS GRID MATH */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {mathOptions.map((opt, idx) => (
                  <motion.button
                    key={`${mathQuestion.num1}-${idx}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMathAnswer(opt)}
                    className="h-28 rounded-3xl bg-white dark:bg-slate-800 border-b-[6px] border-slate-200 dark:border-slate-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 text-5xl font-black text-slate-700 dark:text-slate-200 shadow-lg transition-all flex items-center justify-center relative overflow-hidden group"
                  >
                      <span className="relative z-10 group-hover:text-green-700 transition-colors">{opt}</span>
                      <div className="absolute inset-0 bg-green-200/0 group-hover:bg-green-200/20 transition-colors z-0" />
                  </motion.button>
                ))}
              </div>

              {/* GAME OVER MODAL MATH */}
              <AnimatePresence>
                {mathGameOver && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-8 text-center"
                  >
                     <Star className="w-32 h-32 text-yellow-400 mb-6 animate-spin-slow drop-shadow-lg" />
                     <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2">Selesai!</h2>
                     <p className="text-muted-foreground mb-4 text-lg">Skor Akhir Kamu:</p>
                     <div className="text-7xl font-black text-green-600 mb-10 drop-shadow-sm">{mathScore}</div>
                     
                     <Button size="lg" onClick={startMathGame} className="gap-2 rounded-full px-10 h-14 text-xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20">
                        <RefreshCcw className="w-6 h-6" /> Coba Lagi
                     </Button>
                  </motion.div>
                )}
              </AnimatePresence>

            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}