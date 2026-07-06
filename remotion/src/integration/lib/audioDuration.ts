import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

// Returns the audio duration in seconds, or null if the file cannot be read
// (e.g. it hasn't been generated yet). Works in browser + Node render.
export const tryGetAudioDuration = async (
  src: string,
): Promise<number | null> => {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src, { getRetryDelay: () => null }),
    });
    const duration = await input.computeDuration();
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
};

// Estimate speaking time from a narration line when no audio exists yet.
// ~2.6 words/second is a natural narration pace, plus a little padding.
export const estimateNarrationSeconds = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.5, words / 2.6 + 0.9);
};
