import { AudioFeedback } from '../src/runtime/audio/audio-feedback.js';

/** Uses a real browser audio graph to measure output, mute, pause, resume and disposal. */
export async function exerciseAudio() {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  const originalGain = context.createGain.bind(context);
  let first = true;
  context.createGain = () => {
    const gain = originalGain();
    if (first) {
      first = false;
      gain.connect(analyser);
      analyser.connect(context.destination);
    }
    return gain;
  };
  let factoryCalls = 0;
  const audio = new AudioFeedback(() => {
    factoryCalls++;
    return context;
  });
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const energy = () => {
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    return Math.max(...buffer.map((n) => Math.abs(n - 128)));
  };
  try {
    audio.start();
    await context.resume();
    audio.victory();
    await wait(80);
    const audible = energy();
    audio.muted = true;
    await wait(80);
    const muted = energy();
    audio.muted = false;
    audio.play('jump');
    await wait(50);
    const unmuted = energy();
    audio.pause();
    await wait(50);
    const paused = context.state;
    audio.start();
    await context.resume();
    const resumed = context.state;
    audio.dispose();
    await wait(50);
    return { audible, muted, unmuted, paused, resumed, closed: context.state, factoryCalls };
  } finally {
    if (context.state !== 'closed') await context.close();
  }
}
