import test from "node:test";
import assert from "node:assert/strict";

import { restartSpeech, SPEECH_RESTART_DELAY_MS } from "../src/speech.js";

test("waits after cancelling before starting an utterance", () => {
  const calls = [];
  const utterance = {};
  const synth = {
    paused: false,
    cancel: () => calls.push("cancel"),
    speak: (value) => calls.push(["speak", value]),
  };
  let scheduled;

  const timer = restartSpeech(synth, utterance, (callback, delay) => {
    scheduled = callback;
    calls.push(["schedule", delay]);
    return 42;
  });

  assert.equal(timer, 42);
  assert.deepEqual(calls, ["cancel", ["schedule", SPEECH_RESTART_DELAY_MS]]);

  scheduled();
  assert.deepEqual(calls.at(-1), ["speak", utterance]);
});

test("resumes a paused mobile speech service before speaking", () => {
  const calls = [];
  const synth = {
    paused: true,
    cancel: () => calls.push("cancel"),
    resume: () => calls.push("resume"),
    speak: () => calls.push("speak"),
  };

  restartSpeech(synth, {}, (callback) => callback());

  assert.deepEqual(calls, ["cancel", "resume", "speak"]);
});
