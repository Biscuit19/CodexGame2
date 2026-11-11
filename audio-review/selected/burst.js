// Repeat the selected single-shot PCM. Keep every tail; only a constant gain may
// reduce the complete burst to prevent overload. No limiter or other effects.
export function makeBurst(context, single, rpm, rounds) {
  if (!Number.isFinite(rpm) || rpm < 30 || rpm > 1200)
    throw new RangeError("射速应为 30–1200 发/分");
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20)
    throw new RangeError("连发数量应为 1–20 发");
  const offsets = Array.from({ length: rounds }, (_, i) =>
    Math.round((i * single.sampleRate * 60) / rpm),
  );
  const result = context.createBuffer(
    single.numberOfChannels,
    offsets.at(-1) + single.length,
    single.sampleRate,
  );
  let peak = 0;
  for (let channel = 0; channel < single.numberOfChannels; channel++) {
    const original = single.getChannelData(channel);
    const mix = result.getChannelData(channel);
    for (const offset of offsets)
      for (let i = 0; i < original.length; i++) mix[offset + i] += original[i];
    for (let i = 0; i < mix.length; i++)
      peak = Math.max(peak, Math.abs(mix[i]));
  }
  const gain = Math.min(1, 10 ** (-1 / 20) / Math.max(peak, 1e-12));
  if (gain < 1)
    for (let channel = 0; channel < result.numberOfChannels; channel++) {
      const samples = result.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) samples[i] *= gain;
    }
  return { buffer: result, gain, offsets };
}
