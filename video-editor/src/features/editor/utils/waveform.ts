import { AudioData, getAudioData } from "@remotion/media-utils";
import { resolveWaveformSrc } from "./proxy-map";

const PEAKS_PER_SECOND = 100;
const cache = new Map<string, Promise<AudioData>>();

export function loadWaveformData(src: string): Promise<AudioData> {
  const waveformUrl = resolveWaveformSrc(src);
  if (!waveformUrl) return getAudioData(src); // no peaks yet: old behavior

  let p = cache.get(waveformUrl);
  if (!p) {
    p = fetch(waveformUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`waveform fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        const samples = new Float32Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) samples[i] = bytes[i] / 255;
        return {
          channelWaveforms: [samples],
          sampleRate: PEAKS_PER_SECOND,
          durationInSeconds: bytes.length / PEAKS_PER_SECOND,
          numberOfChannels: 1,
          resultId: waveformUrl,
          isRemote: true
        } as AudioData;
      })
      .catch(() => {
        cache.delete(waveformUrl);
        return getAudioData(src);
      });
    cache.set(waveformUrl, p);
  }
  return p;
}