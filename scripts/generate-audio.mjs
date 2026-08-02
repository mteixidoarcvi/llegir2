/**
 * Pre-renders one audio clip per word in src/wordLists.js using Amazon Polly,
 * so playback never depends on the voices a device happens to have installed.
 *
 * Clips land in public/audio/, and src/audioManifest.json maps each word to its
 * file so the app knows synchronously which clips exist.
 *
 *   npm run audio                 # generate anything missing
 *   npm run audio -- --force      # re-render everything
 *   npm run audio -- --list-voices
 *
 * Uses the AWS CLI's credentials. Override with the usual environment
 * variables (AWS_PROFILE, AWS_REGION) plus POLLY_VOICE / POLLY_ENGINE /
 * POLLY_RATE.
 */

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const MANIFEST_PATH = path.join(ROOT, "src", "audioManifest.json");

// Arlet is Polly's only Catalan voice, and it is neural-only.
const LANGUAGE_CODE = process.env.POLLY_LANGUAGE || "ca-ES";
const VOICE_ID = process.env.POLLY_VOICE || "Arlet";
const ENGINE = process.env.POLLY_ENGINE || "neural";
// Slightly slowed down: these are single words for a child learning to read.
const RATE = process.env.POLLY_RATE || "90%";
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-west-1";

const force = process.argv.includes("--force");
const listVoices = process.argv.includes("--list-voices");

/** ASCII filename for a word, so URLs stay free of accents and encoding quirks. */
export function slugify(word) {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeSsml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function aws(args, outputFile) {
  const { stdout } = await execFileAsync(
    "aws",
    ["polly", ...args, "--region", REGION, ...(outputFile ? [outputFile] : [])],
    { maxBuffer: 32 * 1024 * 1024 }
  );
  return stdout;
}

async function uniqueWords() {
  const { WORD_LISTS } = await import(path.join(ROOT, "src", "wordLists.js"));
  const words = new Set();
  for (const list of WORD_LISTS) {
    for (const word of list.words) words.add(word.key);
  }
  return [...words].sort((a, b) => a.localeCompare(b, "ca"));
}

/** Maps each word to a collision-free ASCII filename. */
function buildManifest(words) {
  const manifest = {};
  const taken = new Set();
  for (const word of words) {
    let slug = slugify(word) || "word";
    if (taken.has(slug)) {
      let n = 2;
      while (taken.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    taken.add(slug);
    manifest[word] = `${slug}.mp3`;
  }
  return manifest;
}

async function synthesize(word, target) {
  // Neural voices support prosody rate, so SSML is only needed to slow speech.
  const useSsml = RATE && RATE !== "100%";
  const text = useSsml
    ? `<speak><prosody rate="${RATE}">${escapeSsml(word)}</prosody></speak>`
    : word;

  await aws(
    [
      "synthesize-speech",
      "--text", text,
      "--text-type", useSsml ? "ssml" : "text",
      "--voice-id", VOICE_ID,
      "--engine", ENGINE,
      "--language-code", LANGUAGE_CODE,
      "--output-format", "mp3",
    ],
    target
  );
}

async function main() {
  if (listVoices) {
    const stdout = await aws([
      "describe-voices",
      "--language-code", LANGUAGE_CODE,
      "--output", "json",
    ]);
    for (const voice of JSON.parse(stdout).Voices) {
      console.log(
        `${voice.Id.padEnd(12)} ${voice.Gender.padEnd(8)} ${voice.SupportedEngines.join(", ")}`
      );
    }
    return;
  }

  const words = await uniqueWords();
  const manifest = buildManifest(words);
  await mkdir(AUDIO_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  for (const word of words) {
    const file = manifest[word];
    const target = path.join(AUDIO_DIR, file);
    if (!force && existsSync(target)) {
      skipped += 1;
      continue;
    }
    await synthesize(word, target);
    generated += 1;
    console.log(`  ${word.padEnd(12)} -> audio/${file}`);
  }

  // Drop clips for words that no longer appear in any list.
  const expected = new Set(Object.values(manifest));
  const orphans = (await readdir(AUDIO_DIR)).filter((f) => f.endsWith(".mp3") && !expected.has(f));
  for (const orphan of orphans) {
    await unlink(path.join(AUDIO_DIR, orphan));
    console.log(`  removed stale audio/${orphan}`);
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `\n${words.length} words | ${generated} generated, ${skipped} already present, ${orphans.length} removed`
  );
  console.log(`voice: ${VOICE_ID} (${LANGUAGE_CODE}, ${ENGINE}) at rate ${RATE} in ${REGION}`);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exitCode = 1;
});
