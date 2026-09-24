import React, { useEffect, useMemo, useState } from "react";
import MatchingGame from "./MatchingGame";
import { SYLLABLES, soundKey, syllableKey } from "./syllables";
import { useSpeech } from "./useSpeech";

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A shuffled pass through every syllable, so none repeats until all have come up. */
function useSyllableDeck() {
  const [deck, setDeck] = useState(() => shuffle(SYLLABLES));
  const [index, setIndex] = useState(0);

  const next = () => {
    if (index + 1 < deck.length) {
      setIndex(index + 1);
      return;
    }
    // Avoid the same syllable twice in a row across two passes.
    let fresh = shuffle(SYLLABLES);
    if (fresh[0] === deck[index]) fresh = [...fresh.slice(1), fresh[0]];
    setDeck(fresh);
    setIndex(0);
  };

  return { current: deck[index], next, round: `${deck.length}-${index}-${deck[0].syllable}` };
}

function ModePicker({ onSelect }) {
  const modes = [
    {
      id: "blend",
      icon: "🧲",
      title: "Ajunta els sons",
      subtitle: "M + A → MA",
      description: "Arrossega mentalment els sons fins que quedin enganxats.",
    },
    {
      id: "choose",
      icon: "👂",
      title: "Escolta i tria",
      subtitle: "🔊 → MA / MO / SA",
      description: "Escolta una síl·laba i troba com s'escriu.",
    },
    {
      id: "matching",
      icon: "🧩",
      title: "Paraula, so i imatge",
      subtitle: "El joc original",
      description: "Relaciona la paraula escrita, el so i la imatge.",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 p-5 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">📚</div>
          <h1 className="text-3xl font-extrabold">Aprenem a llegir</h1>
          <p className="text-slate-600 mt-2">Avui, què vols practicar?</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className="bg-white rounded-3xl p-6 shadow border text-left active:scale-[0.98]"
            >
              <div className="text-5xl mb-4">{mode.icon}</div>
              <div className="text-xl font-extrabold">{mode.title}</div>
              <div className="text-indigo-700 font-bold mt-1">{mode.subtitle}</div>
              <p className="text-sm text-slate-600 mt-3">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function GameHeader({ title, onHome }) {
  return (
    <header className="p-4 flex items-center justify-between">
      <button onClick={onHome} className="px-3 py-2 rounded-xl bg-white shadow border">
        ← Jocs
      </button>
      <h1 className="font-extrabold text-lg">{title}</h1>
      <div className="w-20" />
    </header>
  );
}

function BlendGame({ onHome }) {
  const { current, next: nextSyllable } = useSyllableDeck();
  const [joined, setJoined] = useState(false);
  const { speak, speakSequence } = useSpeech();

  const next = () => {
    setJoined(false);
    nextSyllable();
  };

  const playParts = () => speakSequence([soundKey(current.onset), soundKey(current.vowel)]);

  // Play straight from the tap: mobile browsers may block sound started later.
  const join = () => {
    setJoined(true);
    speak(syllableKey(current.syllable));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <GameHeader title="Ajunta els sons" onHome={onHome} />
      <main className="max-w-2xl mx-auto px-5 py-8 text-center">
        <p className="text-slate-600 mb-8">Escolta els dos sons. Després ajunta'ls sense fer pausa.</p>

        <div className="flex items-center justify-center gap-8 md:gap-16 mb-8">
          <button
            onClick={() => speak(soundKey(current.onset))}
            className="w-32 h-32 rounded-3xl bg-white shadow-lg border text-7xl font-black active:scale-95"
          >
            {current.onset}
          </button>
          <div className="text-4xl text-slate-400">+</div>
          <button
            onClick={() => speak(soundKey(current.vowel))}
            className="w-32 h-32 rounded-3xl bg-white shadow-lg border text-7xl font-black active:scale-95"
          >
            {current.vowel}
          </button>
        </div>

        <button onClick={playParts} className="px-5 py-3 rounded-2xl bg-white shadow border font-bold mb-6">
          🔊 Escolta'ls separats
        </button>

        <div className="relative h-36 flex items-center justify-center">
          <div
            className={`absolute text-7xl font-black transition-all duration-700 ${
              joined ? "-translate-x-6" : "-translate-x-28"
            }`}
          >
            {current.onset}
          </div>
          <div
            className={`absolute text-7xl font-black transition-all duration-700 ${
              joined ? "translate-x-6" : "translate-x-28"
            }`}
          >
            {current.vowel}
          </div>
        </div>

        {!joined ? (
          <button
            onClick={join}
            className="w-full max-w-sm px-6 py-4 rounded-2xl bg-indigo-600 text-white text-xl font-extrabold shadow active:scale-95"
          >
            🧲 AJUNTA'LS
          </button>
        ) : (
          <div>
            <button
              onClick={() => speak(syllableKey(current.syllable))}
              className="text-8xl font-black tracking-wide bg-white rounded-3xl px-10 py-6 shadow-lg border"
            >
              {current.syllable}
            </button>
            <p className="mt-4 font-semibold">Digues-ho tu també!</p>
            <button
              onClick={next}
              className="mt-7 px-7 py-4 rounded-2xl bg-emerald-600 text-white text-xl font-bold shadow"
            >
              Següent →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ChooseGame({ onHome }) {
  const { current: target, next, round } = useSyllableDeck();
  const [feedback, setFeedback] = useState(null);
  const { speak } = useSpeech();
  const playTarget = () => speak(syllableKey(target.syllable));

  // One distractor differs only in the consonant and one only in the vowel,
  // so getting it right means having heard both sounds.
  const options = useMemo(() => {
    const others = SYLLABLES.filter((s) => s !== target);
    const sameVowel = shuffle(others.filter((s) => s.vowel === target.vowel))[0];
    const sameOnset = shuffle(others.filter((s) => s.onset === target.onset))[0];
    return shuffle([target, sameVowel, sameOnset]);
  }, [target]);

  // Say each new syllable without waiting for a tap. The first round follows
  // the tap that opened the game, so browsers allow the sound.
  useEffect(() => {
    speak(syllableKey(target.syllable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const answer = (syllable) => {
    if (feedback === "ok") return;
    if (syllable === target.syllable) {
      setFeedback("ok");
      setTimeout(() => {
        setFeedback(null);
        next();
      }, 1100);
    } else {
      setFeedback("ko");
      playTarget();
      setTimeout(() => setFeedback(null), 900);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-cyan-50">
      <GameHeader title="Escolta i tria" onHome={onHome} />
      <main className="max-w-2xl mx-auto p-5 text-center">
        <p className="text-slate-600 mt-6">Escolta. Quina síl·laba has sentit?</p>
        <button
          onClick={playTarget}
          className="mt-8 w-40 h-40 rounded-full bg-white shadow-xl border text-7xl active:scale-95"
        >
          🔊
        </button>

        <div className="grid grid-cols-3 gap-3 mt-10">
          {options.map((option) => (
            <button
              key={option.syllable}
              onClick={() => answer(option.syllable)}
              className="bg-white rounded-3xl py-8 text-4xl md:text-5xl font-black shadow border active:scale-95"
            >
              {option.syllable}
            </button>
          ))}
        </div>

        <div className="h-24 flex items-center justify-center">
          {feedback === "ok" && <div className="text-5xl">🎉 Molt bé!</div>}
          {feedback === "ko" && <div className="text-4xl">👂 Torna-ho a escoltar</div>}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);

  if (!mode) return <ModePicker onSelect={setMode} />;
  if (mode === "blend") return <BlendGame onHome={() => setMode(null)} />;
  if (mode === "choose") return <ChooseGame onHome={() => setMode(null)} />;
  return (
    <div>
      <button
        onClick={() => setMode(null)}
        className="fixed z-50 bottom-4 left-4 px-3 py-2 rounded-xl bg-white border shadow font-semibold"
      >
        ← Jocs
      </button>
      <MatchingGame />
    </div>
  );
}
