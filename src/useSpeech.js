import { useEffect, useRef, useState } from "react";
import { restartSpeech } from "./speech";
import audioManifest from "./audioManifest.json";

export function useSpeech(preferredLangs = ["ca-ES", "ca", "es-ES", "es"]) {
  const [voice, setVoice] = useState(null);
  const utteranceRef = useRef(null);
  const restartTimerRef = useRef(null);
  const audioRef = useRef(null);
  const sequenceTimerRef = useRef(null);

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

  useEffect(() => () => {
    clearTimeout(restartTimerRef.current);
    clearTimeout(sequenceTimerRef.current);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  const speakWithSynth = (text, onEnd) => {
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

    // Keep a strong reference until Chrome reports that playback finished.
    // Some mobile implementations otherwise garbage-collect the utterance.
    utteranceRef.current = utter;
    const releaseUtterance = () => {
      if (utteranceRef.current === utter) utteranceRef.current = null;
    };
    utter.onend = () => {
      releaseUtterance();
      onEnd?.();
    };
    utter.onerror = (event) => {
      console.warn(`speechSynthesis failed for "${text}":`, event.error);
      releaseUtterance();
    };

    clearTimeout(restartTimerRef.current);
    restartTimerRef.current = restartSpeech(synth, utter);
  };

  /**
   * Pre-rendered clips are the primary source: they always sound like Catalan,
   * whatever voices the device has installed. The synthesiser is only a fallback
   * for words added since the last `npm run audio`.
   *
   * `onEnd` fires once the sound finishes, unless something else interrupts it.
   */
  const speak = (text, onEnd) => {
    clearTimeout(sequenceTimerRef.current);
    const file = audioManifest[text];
    if (!file) {
      speakWithSynth(text, onEnd);
      return;
    }

    const previous = audioRef.current;
    if (previous) {
      previous.pause();
      previous.currentTime = 0;
    }

    const audio = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
    audioRef.current = audio;
    if (onEnd) audio.addEventListener("ended", onEnd, { once: true });
    audio.play()?.catch((err) => {
      console.warn(`clip playback failed for "${text}":`, err);
      speakWithSynth(text, onEnd);
    });
  };

  /** Plays several sounds one after another, with a short gap between them. */
  const speakSequence = ([first, ...rest], gapMs = 350) => {
    if (!first) return;
    speak(first, () => {
      sequenceTimerRef.current = setTimeout(() => speakSequence(rest, gapMs), gapMs);
    });
  };

  return { speak, speakSequence };
}
