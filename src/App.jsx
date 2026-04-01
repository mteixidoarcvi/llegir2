import React, { useMemo, useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

const WORD_LISTS = [
  {
    id: "base",
    name: "Bàsica",
    words: [
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
    ],
  },
  {
    id: "animals",
    name: "Animals",
    words: [
      { key: "gos", emoji: "🐶" },
      { key: "gat", emoji: "🐱" },
      { key: "ocell", emoji: "🐦" },
      { key: "serp", emoji: "🐍" },
      { key: "peix", emoji: "🐟" },
      { key: "vaca", emoji: "🐄" },
      { key: "cavall", emoji: "🐴" },
      { key: "conill", emoji: "🐰" },
      { key: "lleó", emoji: "🦁" },
      { key: "elefant", emoji: "🐘" },
    ],
  },
  {
    id: "casa",
    name: "Casa i escola",
    words: [
      { key: "llit", emoji: "🛏️" },
      { key: "taula", emoji: "🪑" },
      { key: "porta", emoji: "🚪" },
      { key: "llibre", emoji: "📚" },
      { key: "llapis", emoji: "✏️" },
      { key: "paper", emoji: "📄" },
      { key: "tissora", emoji: "✂️" },
      { key: "motxilla", emoji: "🎒" },
      { key: "finestra", emoji: "🪟" },
      { key: "rellotge", emoji: "⏰" },
    ],
  },
];

const STATS_STORAGE_KEY = "llegir2-stats-v1";
const LAST_LIST_KEY = "llegir2-last-list";

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

function useSpeech(preferredLangs = ["ca-ES", "ca", "es-ES", "es"]) {
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const pickVoice = () => {
      const list = synth.getVoices?.() || [];
      if (!list.length) return;
      const chosen = preferredLangs
        .map((pl) => list.find((v) => v.lang?.toLowerCase().startsWith(pl.toLowerCase())))
        .find(Boolean) || list[0];
      setVoice(chosen || null);
    };

    pickVoice();
    const handler = () => pickVoice();
    synth.addEventListener?.("voiceschanged", handler);
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
      utter.lang = voice.lang;
    } else {
      utter.lang = preferredLangs[0];
    }
    utter.rate = 0.9;
    utter.pitch = 1.0;
    synth.cancel();
    synth.speak(utter);
  };

  return { speak };
}

function emptySelection() {
  return { word: null, sound: null, image: null };
}

export default function App() {
  const [selectedListId, setSelectedListId] = useState(null);
  const [showStart, setShowStart] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [uppercase, setUppercase] = useState(true);
  const [roundSize, setRoundSize] = useState(4);
  const [currentKeys, setCurrentKeys] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selection, setSelection] = useState(emptySelection());
  const [celebrate, setCelebrate] = useState(false);
  const [statsByList, setStatsByList] = useState({});
  const { success, error } = useBeeps();
  const { speak } = useSpeech();

  useEffect(() => {
    try {
      const storedStats = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || "{}");
      if (storedStats && typeof storedStats === "object") setStatsByList(storedStats);
      const lastList = localStorage.getItem(LAST_LIST_KEY);
      if (lastList && WORD_LISTS.some((list) => list.id === lastList)) setSelectedListId(lastList);
    } catch {
      setStatsByList({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(statsByList));
  }, [statsByList]);

  useEffect(() => {
    if (selectedListId) localStorage.setItem(LAST_LIST_KEY, selectedListId);
  }, [selectedListId]);

  const selectedList = useMemo(
    () => WORD_LISTS.find((list) => list.id === selectedListId) || WORD_LISTS[0],
    [selectedListId]
  );
  const words = selectedList.words;
  const maxRound = Math.min(8, words.length);

  useEffect(() => {
    if (roundSize > maxRound) setRoundSize(maxRound);
  }, [roundSize, maxRound]);

  const startRound = () => {
    const keys = shuffle(words)
      .slice(0, Math.min(roundSize, words.length))
      .map((w) => w.key);
    setCurrentKeys(keys);
    setCompleted([]);
    setSelection(emptySelection());
  };

  useEffect(() => {
    if (!showStart) startRound();
  }, [selectedListId, roundSize, showStart]);

  const pool = useMemo(() => words.filter((w) => currentKeys.includes(w.key)), [words, currentKeys]);
  const cols = useMemo(
    () => ({
      word: shuffle(pool),
      sound: shuffle(pool),
      image: shuffle(pool),
    }),
    [pool]
  );
  const allDone = completed.length === currentKeys.length && currentKeys.length > 0;

  const markStat = (wordKey, type) => {
    setStatsByList((prev) => {
      const listStats = prev[selectedList.id] || {};
      const entry = listStats[wordKey] || { ok: 0, ko: 0 };
      const nextEntry = { ...entry, [type]: entry[type] + 1 };
      return {
        ...prev,
        [selectedList.id]: { ...listStats, [wordKey]: nextEntry },
      };
    });
  };

  useEffect(() => {
    const { word, sound, image } = selection;
    if (!word || !sound || !image) return;
    if (word === sound && word === image) {
      if (!completed.includes(word)) {
        setCompleted((c) => [...c, word]);
        markStat(word, "ok");
      }
      setSelection(emptySelection());
      success();
    } else {
      [word, sound, image].forEach((item) => item && markStat(item, "ko"));
      setSelection(emptySelection());
      error();
    }
  }, [selection]);

  useEffect(() => {
    if (allDone) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1800);
    }
  }, [allDone]);

  const statsRows = useMemo(() => {
    const listStats = statsByList[selectedList.id] || {};
    return words
      .map((word) => ({
        key: word.key,
        emoji: word.emoji,
        ok: listStats[word.key]?.ok || 0,
        ko: listStats[word.key]?.ko || 0,
      }))
      .sort((a, b) => b.ko - a.ko || b.ok - a.ok || a.key.localeCompare(b.key));
  }, [statsByList, selectedList.id, words]);

  const resetStats = () => {
    setStatsByList((prev) => ({ ...prev, [selectedList.id]: {} }));
  };

  const Card = ({ type, item }) => {
    const isDone = completed.includes(item.key);
    const isSelected = selection[type] === item.key;

    const handleClick = () => {
      if (isDone) return;
      setSelection((prev) => ({ ...prev, [type]: prev[type] === item.key ? null : item.key }));
      if (type === "sound") speak(item.key);
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
          <Pill>{selectedList.name}</Pill>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Pill>
            {completed.length}/{currentKeys.length}
          </Pill>
          <button
            onClick={() => setShowStats(true)}
            className="px-3 py-2 md:px-4 md:py-2 rounded-xl bg-slate-700 text-white font-semibold shadow active:scale-95"
          >
            📊 Menú
          </button>
          <button
            onClick={startRound}
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
            onChange={(e) => setRoundSize(parseInt(e.target.value, 10))}
          >
            {[4, 6, 8]
              .filter((n) => n <= words.length)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        </label>
      </div>

      <main className="flex-1 px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <section>
            <h2 className="text-lg font-bold mb-2">Paraula</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.word.map((item) => (
                <Card key={`word-${item.key}`} type="word" item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">So</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.sound.map((item) => (
                <Card key={`sound-${item.key}`} type="sound" item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Imatge</h2>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {cols.image.map((item) => (
                <Card key={`image-${item.key}`} type="image" item={item} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="p-4 md:p-6 flex items-center justify-between text-sm text-slate-600">
        <div>👆 Toca una targeta de cada columna per fer la parella de 3. Toca 🔊 per escoltar.</div>
        <button onClick={() => setShowStart(true)} className="underline">
          Canvia llista
        </button>
      </footer>

      <AnimatePresence>
        {showStart && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-3">Tria la llista de paraules</h2>
              <div className="space-y-2">
                {WORD_LISTS.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 border ${
                      selectedListId === list.id
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:border-indigo-400"
                    }`}
                  >
                    <div className="font-semibold">{list.name}</div>
                    <div className="text-sm text-slate-600">{list.words.length} paraules</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowStart(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
                  disabled={!selectedListId}
                >
                  Comença
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStats && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStats(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <h2 className="text-2xl font-bold mb-1">Estadístiques locals</h2>
              <p className="text-sm text-slate-600 mb-4">
                Guardades al navegador per la llista <strong>{selectedList.name}</strong>.
              </p>
              <div className="max-h-80 overflow-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Paraula</th>
                      <th className="text-right px-3 py-2">OK</th>
                      <th className="text-right px-3 py-2">KO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsRows.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="px-3 py-2">
                          {row.emoji} {row.key}
                        </td>
                        <td className="px-3 py-2 text-right">{row.ok}</td>
                        <td className="px-3 py-2 text-right font-semibold">{row.ko}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-between">
                <button onClick={resetStats} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">
                  Reinicia estadístiques
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowStats(false);
                      setShowStart(true);
                    }}
                    className="px-3 py-2 rounded-lg border"
                  >
                    Canviar llista
                  </button>
                  <button onClick={() => setShowStats(false)} className="px-3 py-2 rounded-lg bg-slate-900 text-white">
                    Tanca
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        body {
          color: black;
          touch-action: manipulation;
        }
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}
