/**
 * Sounds for the blending games. Continuous consonants come first because a
 * child can stretch them ("mmmm") straight into the vowel without a pause.
 *
 * `ipa` feeds Polly's <phoneme> tag in scripts/generate-audio.mjs, so each clip
 * says exactly this sound instead of whatever Polly guesses from the spelling.
 */
export const ONSETS = [
  { letter: "M", ipa: "m" },
  { letter: "S", ipa: "s" },
  { letter: "L", ipa: "l" },
  { letter: "F", ipa: "f" },
];

export const VOWELS = [
  { letter: "A", ipa: "a" },
  { letter: "E", ipa: "e" },
  { letter: "I", ipa: "i" },
  { letter: "O", ipa: "o" },
  { letter: "U", ipa: "u" },
];

export const SYLLABLES = ONSETS.flatMap((onset) =>
  VOWELS.map((vowel) => ({
    onset: onset.letter,
    vowel: vowel.letter,
    syllable: onset.letter + vowel.letter,
    ipa: `ˈ${onset.ipa}${vowel.ipa}`,
  }))
);

/**
 * Audio keys, as used in audioManifest.json. They double as the text the
 * speech synthesiser falls back to when a clip is missing.
 */
export const soundKey = (letter) => letter.toLowerCase().repeat(3);
export const syllableKey = (syllable) => syllable.toLowerCase();

/** Every clip the blending games need, with the SSML that renders it. */
export function blendingClips() {
  const stretched = (ipa, rate) =>
    `<speak><prosody rate="${rate}"><phoneme alphabet="ipa" ph="${ipa}">${ipa}</phoneme></prosody></speak>`;

  return [
    ...[...ONSETS, ...VOWELS].map(({ letter, ipa }) => ({
      key: soundKey(letter),
      file: `so-${letter.toLowerCase()}.mp3`,
      ssml: stretched(ipa, "20%"),
    })),
    ...SYLLABLES.map(({ syllable, ipa }) => ({
      key: syllableKey(syllable),
      file: `sil-${syllable.toLowerCase()}.mp3`,
      ssml: stretched(ipa, "50%"),
    })),
  ];
}
