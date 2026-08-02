import test from "node:test";
import assert from "node:assert/strict";

import { restartSpeech, SPEECH_RETRY_DELAY_MS } from "../src/speech.js";

function makeUtterance() {
  const listeners = {};
  return {
    addEventListener: (name, fn) => {
      (listeners[name] ??= []).push(fn);
    },
    emit: (name) => (listeners[name] || []).forEach((fn) => fn()),
  };
}

function makeSynth(calls, overrides = {}) {
  return {
    paused: false,
    speaking: false,
    pending: false,
    cancel: () => calls.push("cancel"),
    resume: () => calls.push("resume"),
    speak: () => calls.push("speak"),
    ...overrides,
  };
}

test("speaks synchronously so the tap's user activation still applies", () => {
  const calls = [];
  const synth = makeSynth(calls);
  let scheduled;

  const timer = restartSpeech(synth, makeUtterance(), (callback, delay) => {
    scheduled = callback;
    calls.push(["schedule", delay]);
    return 42;
  });

  assert.equal(timer, 42);
  assert.deepEqual(calls, ["cancel", "speak", ["schedule", SPEECH_RETRY_DELAY_MS]]);
  assert.equal(typeof scheduled, "function");
});

test("resumes a paused mobile speech service before speaking", () => {
  const calls = [];
  const synth = makeSynth(calls, { paused: true });

  restartSpeech(synth, makeUtterance(), () => {});

  assert.deepEqual(calls, ["cancel", "resume", "speak"]);
});

test("retries once when cancel() swallowed the queued utterance", () => {
  const calls = [];
  const synth = makeSynth(calls);
  let scheduled;

  restartSpeech(synth, makeUtterance(), (callback) => {
    scheduled = callback;
  });
  calls.length = 0;

  scheduled();

  assert.deepEqual(calls, ["speak"]);
});

test("does not retry once the utterance has started", () => {
  const calls = [];
  const synth = makeSynth(calls);
  const utterance = makeUtterance();
  let scheduled;

  restartSpeech(synth, utterance, (callback) => {
    scheduled = callback;
  });
  utterance.emit("start");
  calls.length = 0;

  scheduled();

  assert.deepEqual(calls, []);
});

test("does not retry while speech is already in flight", () => {
  const calls = [];
  const synth = makeSynth(calls, { speaking: true });
  let scheduled;

  restartSpeech(synth, makeUtterance(), (callback) => {
    scheduled = callback;
  });
  calls.length = 0;

  scheduled();

  assert.deepEqual(calls, []);
});
