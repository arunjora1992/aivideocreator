import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

// Duration in seconds, or null if the file can't be read (not generated yet).
export const tryGetAudioDuration = async (
  src: string,
): Promise<number | null> => {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src, { getRetryDelay: () => null }),
    });
    const d = await input.computeDuration();
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
};

// Estimate speaking time from narration when no audio exists yet (~2.6 wps).
export const estimateNarrationSeconds = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.5, words / 2.6 + 0.9);
};
