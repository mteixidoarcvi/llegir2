import { useEffect, useState } from "react";
import { DEFAULT_ONSETS, ONSETS } from "./syllables";

const SETTINGS_KEY = "llegir2-settings-v1";

/**
 * How written text is shown. Print styles use Andika, a typeface designed for
 * early readers (single-storey "a", distinct "l" and "I"). The joined style uses
 * Playwrite ES, modelled on the cursive taught in Spanish and Catalan schools.
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

const DEFAULTS = { script: "upper", onsets: DEFAULT_ONSETS };

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const script = SCRIPTS.some((s) => s.id === stored.script) ? stored.script : DEFAULTS.script;
    const known = Array.isArray(stored.onsets)
      ? stored.onsets.filter((letter) => ONSETS.some((onset) => onset.letter === letter))
      : [];
    return { script, onsets: known.length ? known : DEFAULTS.onsets };
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

  // Keep at least one consonant, otherwise the games would have nothing to show.
  const toggleOnset = (letter) =>
    setSettings((prev) => {
      const onsets = prev.onsets.includes(letter)
        ? prev.onsets.filter((l) => l !== letter)
        : [...prev.onsets, letter];
      return onsets.length ? { ...prev, onsets } : prev;
    });

  return { ...settings, setScript, toggleOnset };
}
