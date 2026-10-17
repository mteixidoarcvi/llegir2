import { useEffect, useState } from "react";
import { DEFAULT_ONSETS, ONSETS } from "./syllables";

const SETTINGS_KEY = "llegir2-settings-v1";

/**
 * How written text is shown. Print styles use Andika, a typeface designed for
 * early readers (single-storey "a", distinct "l" and "I"). The joined style uses
 * Escolar (Antonio Herrera, 1992), the school cursive used in Spanish and
 * Catalan classrooms. It is bundled from src/assets/fonts.
 */
export const SCRIPTS = [
  { id: "upper", label: "Majúscula", sample: "MA" },
  { id: "lower", label: "Minúscula", sample: "ma" },
  { id: "cursive", label: "Lligada", sample: "ma" },
];

export function formatText(text, script) {
  return script === "upper" ? text.toUpperCase() : text.toLowerCase();
}

export function scriptClass(script) {
  return script === "cursive" ? "font-cursive" : "font-print";
}

/**
 * How "Ajunta els sons" reveals the syllable. In the easy level it is said as
 * soon as the letters join; in the advanced one the child reads it first and
 * taps it to check.
 */
export const BLEND_LEVELS = [
  { id: "easy", label: "Fàcil", hint: "En ajuntar-los, se sent la síl·laba." },
  { id: "advanced", label: "Avançat", hint: "Primer la llegeix i després toca per comprovar-ho." },
];

const DEFAULTS = { script: "upper", onsets: DEFAULT_ONSETS, blendLevel: "easy" };

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const script = SCRIPTS.some((s) => s.id === stored.script) ? stored.script : DEFAULTS.script;
    const known = Array.isArray(stored.onsets)
      ? stored.onsets.filter((letter) => ONSETS.some((onset) => onset.letter === letter))
      : [];
    const blendLevel = BLEND_LEVELS.some((l) => l.id === stored.blendLevel) ? stored.blendLevel : DEFAULTS.blendLevel;
    return { script, onsets: known.length ? known : DEFAULTS.onsets, blendLevel };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just won't survive a reload.
    }
  }, [settings]);

  const setScript = (script) => setSettings((prev) => ({ ...prev, script }));
  const setBlendLevel = (blendLevel) => setSettings((prev) => ({ ...prev, blendLevel }));

  // Keep at least one consonant, otherwise the games would have nothing to show.
  const toggleOnset = (letter) =>
    setSettings((prev) => {
      const onsets = prev.onsets.includes(letter)
        ? prev.onsets.filter((l) => l !== letter)
        : [...prev.onsets, letter];
      return onsets.length ? { ...prev, onsets } : prev;
    });

  return { ...settings, setScript, setBlendLevel, toggleOnset };
}
