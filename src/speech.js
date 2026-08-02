export const SPEECH_RESTART_DELAY_MS = 50;

/**
 * Chrome on Android can drop an utterance when speak() is called immediately
 * after cancel(). Give its speech service a moment to finish cancelling first.
 */
export function restartSpeech(synth, utterance, schedule = setTimeout) {
  synth.cancel();

  return schedule(() => {
    // Mobile browsers can leave synthesis paused after being backgrounded.
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  }, SPEECH_RESTART_DELAY_MS);
}
