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

/** Proves the shipped CC0 recordings actually reach the audio graph and rotate their variants.
 * A silent regression here (wrong glob, bad filename, undecodable file) is invisible in play:
 * every cue would simply fall back to synthesis and still make a noise.
 */
export async function exerciseSamples() {
  const context = new AudioContext();
  try {
    const { SoundBank, sampleUrls } = await import('../src/runtime/audio/sound-bank.js');
    const bank = new SoundBank();
    await bank.load(context);
    const smash = [bank.get('smash'), bank.get('smash'), bank.get('smash'), bank.get('smash')];
    return {
      declared: sampleUrls().length,
      cues: bank.size,
      smashTakes: bank.countFor('smash'),
      stepTakes: bank.countFor('step'),
      // Four draws over three takes: all three appear, and the fourth wraps to the first.
      distinctSmash: new Set(smash.filter(Boolean)).size,
      wrapsAround: smash[0] === smash[3],
      allDecoded: smash.every((buffer) => (buffer?.duration ?? 0) > 0),
      synthesizedCue: bank.countFor('victory'),
    };
  } finally {
    if (context.state !== 'closed') await context.close();
  }
}
