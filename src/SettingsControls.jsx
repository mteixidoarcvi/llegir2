import React from "react";
import { SCRIPTS, formatText, scriptClass } from "./settings";
import { ONSETS } from "./syllables";

export function ScriptPicker({ script, onChange, compact = false }) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1 gap-1" role="radiogroup" aria-label="Tipus de lletra">
      {SCRIPTS.map((option) => {
        const active = option.id === script;
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border-0 ${compact ? "px-3 py-1" : "px-4 py-2"} ${
              active ? "bg-white shadow text-indigo-700" : "bg-transparent text-slate-600"
            }`}
          >
            <span className={`${scriptClass(option.id)} ${compact ? "text-xl" : "text-2xl"} font-bold block leading-tight`}>
              {option.sample}
            </span>
            {!compact && <span className="text-xs font-semibold block">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function OnsetGroup({ title, hint, onsets, selected, script, onToggle }) {
  return (
    <div>
      <div className="text-sm font-bold text-slate-700">{title}</div>
      <div className="text-xs text-slate-500 mb-2">{hint}</div>
      <div className="flex flex-wrap gap-2">
        {onsets.map(({ letter }) => {
          const active = selected.includes(letter);
          return (
            <button
              key={letter}
              aria-pressed={active}
              onClick={() => onToggle(letter)}
              className={`w-14 h-14 p-0 rounded-2xl text-2xl font-bold ${scriptClass(script)} ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow"
                  : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              {formatText(letter, script)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OnsetPicker({ selected, script, onToggle }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <OnsetGroup
        title="Sons llargs"
        hint="Es poden allargar: mmmm, ssss…"
        onsets={ONSETS.filter((onset) => !onset.stop)}
        selected={selected}
        script={script}
        onToggle={onToggle}
      />
      <OnsetGroup
        title="Sons curts (oclusives)"
        hint="Només sonen quan arriba la vocal: pa, ta…"
        onsets={ONSETS.filter((onset) => onset.stop)}
        selected={selected}
        script={script}
        onToggle={onToggle}
      />
    </div>
  );
}
