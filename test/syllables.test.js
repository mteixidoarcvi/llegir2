import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ONSETS, blendingClips, soundKey } from "../src/syllables.js";

const manifest = JSON.parse(readFileSync(new URL("../src/audioManifest.json", import.meta.url), "utf8"));

test("stops get no isolated sound clip, since Polly renders them as silence", () => {
  const keys = new Set(blendingClips().map((clip) => clip.key));
  for (const onset of ONSETS) {
    assert.equal(keys.has(soundKey(onset.letter)), !onset.stop, onset.letter);
  }
});

test("every blending clip has been rendered (run `npm run audio` if this fails)", () => {
  const missing = blendingClips().filter((clip) => !manifest[clip.key]);
  assert.deepEqual(missing.map((clip) => clip.key), []);
});
