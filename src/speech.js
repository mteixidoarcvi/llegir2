export const SPEECH_RETRY_DELAY_MS = 50;

/**
 * Speaks an utterance, working around two mobile quirks at once.
 *
 * speak() runs synchronously because Chrome on Android drops utterances that
 * start outside the tap that triggered them. But cancel() is asynchronous in
 * some implementations and can swallow whatever was queued right behind it, so
 * we retry once shortly after if nothing actually started.
 */
export function restartSpeech(synth, utterance, schedule = setTimeout) {
  let started = false;
  utterance.addEventListener?.("start", () => {
    started = true;
  });

  synth.cancel();
  // Mobile browsers can leave synthesis paused after being backgrounded.
  if (synth.paused) synth.resume();
  synth.speak(utterance);

  return schedule(() => {
    if (started || synth.speaking || synth.pending) return;
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  }, SPEECH_RETRY_DELAY_MS);
}
