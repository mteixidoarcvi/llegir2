import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_WORDS = [
  { key: "gos", emoji: "🐶" },
  { key: "gat", emoji: "🐱" },
  { key: "sol", emoji: "☀️" },
  { key: "sí", emoji: "✅" },
  { key: "no", emoji: "❌" },
  { key: "papa", emoji: "👨" },
  { key: "mama", emoji: "👩" },
  { key: "lluna", emoji: "🌙" },
  { key: "paper", emoji: "📄" },
  { key: "pal", emoji: "🪵" },
  { key: "poma", emoji: "🍎" },
  { key: "kiwi", emoji: "🥝" },
  { key: "plàtan", emoji: "🍌" },
  { key: "menjar", emoji: "🍽️" },
  { key: "pastís", emoji: "🎂" },
  { key: "cotxe", emoji: "🚗" },
  { key: "cor", emoji: "❤️" },
  { key: "avió", emoji: "✈️" },
  { key: "ulls", emoji: "👀" },
  { key: "foc", emoji: "🔥" },
  { key: "serp", emoji: "🐍" },
  { key: "llibre", emoji: "📚" },
  { key: "cuiner", emoji: "👨‍🍳" },
  { key: "llapis", emoji: "✏️" },
  { key: "tissora", emoji: "✂️" },
  { key: "llit", emoji: "🛏️" },
  { key: "bebé", emoji: "👶" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useBeeps() {
  const ctxRef = useRef(null);
  const getCtx = () => (ctxRef.current ??= new (window.AudioContext || window.webkitAudioContext)());

  const beep = (freq = 880, ms = 140, type = "sine", vol = 0.05) => {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => o.stop(), ms);
  };

  const success = () => {
    beep(880, 120, "sine");
    setTimeout(() => beep(1320, 120, "sine"), 120);
  };
  const error = () => {
    beep(200, 180, "square");
    setTimeout(() => beep(160, 220, "square"), 180);
  };
  return { success, error };
}

// --- Web Speech: selecció de veu i idioma robusta ---------------------------
function useSpeech(preferredLangs = ["ca-ES", "ca", "es-ES", "es"]) {
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const pickVoice = () => {
      const list = synth.getVoices?.() || [];
      if (!list.length) return; // esperarem a voiceschanged
      // Tria per ordre de preferència: ca-ES -> ca -> es-ES -> es -> primera
      const chosen = preferredLangs
        .map((pl) => list.find((v) => v.lang?.toLowerCase().startsWith(pl.toLowerCase())))
        .find(Boolean) || list[0];
      setVoice(chosen || null);
    };

    // Prova d'agafar immediatament (Chrome desktop sol tenir-les ja)
    pickVoice();

    // iPhone/Android: les veus arriben més tard
    const handler = () => pickVoice();
    synth.addEventListener?.("voiceschanged", handler);
    // Safari: propietat tradicional
    synth.onvoiceschanged = handler;

    return () => {
      synth.removeEventListener?.("voiceschanged", handler);
      if (synth.onvoiceschanged === handler) synth.onvoiceschanged = null;
    };
  }, [preferredLangs.join("|")]);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);

    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang; // assegura idioma congruent amb la veu
    } else {
      // Encara sense veu carregada: força idioma perquè no caigui en anglès
      utter.lang = preferredLangs[0];
    }
    utter.rate = 0.9;
    utter.pitch = 1.0;
    synth.cancel();
    synth.speak(utter);
  };

  return { speak, voice };
}

export default function App() {
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [uppercase, setUppercase] = useState(true);
  const [roundSize, setRoundSize] = useState(4);
  const [currentKeys, setCurrentKeys] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selection, setSelection] = useState({ word: null, sound: null, image: null });
  const [celebrate, setCelebrate] = useState(false);
  const { success, error } = useBeeps();
  const { speak } = useSpeech();

  useEffect(() => {
    const keys = shuffle(words).slice(0, roundSize).map(w => w.key);
    setCurrentKeys(keys);
    setCompleted([]);
    setSelection({ word: null, sound: null, image: null });
  }, [words, roundSize]);

  const pool = useMemo(() => words.filter(w => currentKeys.includes(w.key)), [words, currentKeys]);

  const cols = useMemo(() => ({
    word: shuffle(pool),
    sound: shuffle(pool),
    image: shuffle(pool),
  }), [pool]);

  const allDone = completed.length === currentKeys.length && currentKeys.length > 0;

  useEffect(() => {
    const { word, sound, image } = selection;
    if (!word || !sound || !image) return;
    if (word === sound && word === image) {
      if (!completed.includes(word)) {
        setCompleted(c => [...c, word]);
      }
      setSelection({ word: null, sound: null, image: null });
      success();
    } else {
      setSelection({ word: null, sound: null, image: null });
      error();
    }
  }, [selection]);

  useEffect(() => {
    if (allDone) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1800);
    }
  }, [allDone]);

  const nextRound = () => {
    const keys = shuffle(words).slice(0, roundSize).map(w => w.key);
    setCurrentKeys(keys);
    setCompleted([]);
    setSelection({ word: null, sound: null, image: null });
  };

  const Card = ({ type, item }) => {
    const isDone = completed.includes(item.key);
    const isSelected = selection[type] === item.key;

    const handleClick = () => {
      if (isDone) return;
      setSelection(prev => ({ ...prev, [type]: prev[type] === item.key ? null : item.key }));
      if (type === "sound") {
        speak(item.key);
      }
    };

    return (
      <motion.button
        layout
        onClick={handleClick}
        className={`w-full p-4 md:p-5 rounded-2xl shadow ${
          isDone ? "bg-green-100" : isSelected ? "ring-4 ring-blue-400 bg-white" : "bg-white"
        } text-center active:scale-[0.98]`}
        whileTap={{ scale: 0.98 }}
        animate={isSelected ? { scale: 1.03 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        aria-label={`${type} ${item.key}`}
      >
        {type === "word" && (
          <div className="text-3xl md:text-4xl font-bold tracking-widest text-black">
            {uppercase ? item.key.toUpperCase() : item.key}
          </div>
        )}
        {type === "sound" && (
          <div className="flex items-center justify-center">
            <span className="text-3xl">🔊</span>
          </div>
        )}
        {type === "image" && (
          <div className="text-4xl md:text-5xl" aria-hidden>
            {item.emoji}
          </div>
        )}
      </motion.button>
    );
  };

  const Pill = ({ children }) => (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200">
      {children}
    </span>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-indigo-50 flex flex-col">
      <header className="p-4 md:p-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📚</span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Joc de paraules</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Pill>{completed.length}/{currentKeys.length}</Pill>
          <button
            onClick={nextRound}
            className="px-3 py-2 md:px-4 md:py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow active:scale-95"
          >
            Nova ronda
          </button>
        </div>
      </header>

      <div className="px-4 md:px-6 pb-2 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          Majúscules
        </label>
        <label className="flex items-center gap-2 text-sm">
          Elements: 
          <select
            className="bg-white border rounded-lg px-2 py-1"
            value={roundSize}
            onChange={(e) => setRoundSize(parseInt(e.target.value))}
          >
            {[4,6,8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <main className="flex-1 px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <section>
            <h2 className="text-lg font-bold mb-2">Paraula</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.word.map(item => (
                <Card key={`word-${item.key}`} type="word" item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">So</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.sound.map(item => (
                <Card key={`sound-${item.key}`} type="sound" item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Imatge</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.image.map(item => (
                <Card key={`image-${item.key}`} type="image" item={item} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="p-4 md:p-6 flex items-center justify-between text-sm text-slate-600">
        <div>👆 Toca una targeta de cada columna per fer la parella de 3. Toca 🔊 per escoltar.</div>
        <button onClick={() => window.location.reload()} className="underline">Reinicia</button>
      </footer>

      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.1 }}
              exit={{ scale: 0.8 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl px-6 py-4 shadow-2xl border"
            >
              <div className="text-4xl">🎉</div>
              <div className="text-xl font-bold">Molt bé!</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        html, body, #root { height: 100%; }
        body { color: black; }
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}
