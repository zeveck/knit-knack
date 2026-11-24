// audio.js — Web Audio: clip loading with onset trim, tick slicing per needle family (with code clicks
// as fallback), at most 3 tick voices through a gentle limiter, music streamed from two <audio>
// elements with crossfades, ambience, mute and volumes.

const SFX = {
  ticks: 0, 'ticks-metal': 0, 'ticks-glass': 0,
  row: 16, yarn: 0, caston: 16, rip: 0, 'rip-loop': 15, finish: -2, steam: -2, unlock: -3, ui: -6,
  counter: 2, dress: 0, bell: -4, peg: 0, card: 16, milestone: -3, page: -2, mew: -2, purr: 16, 'amb-fire': -16,
};
// per-family slicing limits, as in tools/tick-check.html
export const FAMILIES = {
  wood: { decayMs: 120, sliceMs: 120, fadeMs: 5 },
  metal: { decayMs: 200, sliceMs: 220, fadeMs: 30 },
  glass: { decayMs: 200, sliceMs: 220, fadeMs: 30 },
};
const MIN_GAP_MS = 150;
const DECAY_DB = -40;
export const NEEDLE_FAMILY = {
  bamboo: 'wood', birch: 'wood', rosewood: 'wood', cherry: 'wood', ebony: 'wood', glowtip: 'wood', oak: 'wood',
  nickel: 'metal', rainbow: 'metal', gold: 'metal', candy: 'glass', glass: 'glass',
};
const MUSIC = {
  nook: ['assets/audio/music/mus-nook-1.mp3', 'assets/audio/music/mus-nook-2.mp3', 'assets/audio/music/mus-nook-3.mp3'],
  gallery: ['assets/audio/music/mus-gallery.mp3'],
  scarf: ['assets/audio/music/mus-scarf.mp3'],
};
const MUSIC_BASE = 0.32; // the tracks are mastered loud
const XFADE = 3.5;

let ctx = null, master = null, sfxBus = null, musicBus = null, limiter = null;
const raw = {};       // name -> ArrayBuffer promise
const buf = {};       // name -> AudioBuffer (trimmed)
const ticks = { wood: [], metal: [], glass: [] };
let family = 'wood';
const voices = [];
let musicMuted = false, sfxMuted = false, musicVol = 0.55, sfxVol = 0.85;
let ripLoop = null, amb = null, ambWanted = false;

// ---------------------------------------------------------------- loading
export function prefetch() {
  for (const n of Object.keys(SFX)) {
    if (raw[n]) continue;
    raw[n] = fetch(`assets/audio/sfx/sfx-${n}.mp3`.replace('sfx-amb-fire', 'amb-fire')).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
}

// Called from the first tap or key (the title's "Tap to start").
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  limiter.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(limiter);
  musicBus = ctx.createGain(); musicBus.connect(master);
  applyVolumes();
  prefetch();
  for (const n of Object.keys(SFX)) decodeOne(n);
  if (ctx.state === 'suspended') ctx.resume();
}

async function decodeOne(n) {
  const ab = await raw[n];
  if (!ab) return;
  try {
    const audio = await ctx.decodeAudioData(ab.slice(0));
    if (n.startsWith('ticks')) {
      const fam = n === 'ticks' ? 'wood' : n.slice(6);
      ticks[fam] = sliceTicks(audio, fam);
    } else buf[n] = n === 'amb-fire' || n === 'rip-loop' ? audio : trimLead(audio);
    if (n === 'amb-fire' && ambWanted) startAmb();
  } catch (e) { /* keep the fallback */ }
}

// ---------------------------------------------------------------- onset trim and tick slicing
function mono(ab) {
  const n = ab.length, out = new Float32Array(n);
  for (let c = 0; c < ab.numberOfChannels; c++) { const d = ab.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ab.numberOfChannels; }
  return out;
}
function envelope(x, sr, frameMs = 1) {
  const hop = Math.max(1, Math.round((sr * frameMs) / 1000));
  const n = Math.floor(x.length / hop), env = new Float32Array(n);
  for (let f = 0; f < n; f++) { let p = 0; for (let i = f * hop, e = i + hop; i < e; i++) { const a = Math.abs(x[i]); if (a > p) p = a; } env[f] = p; }
  return env;
}
// Same slicer as tools/tick-check.html.
export function findClicks(x, sr, fam) {
  const F = FAMILIES[fam] || FAMILIES.wood;
  const env = envelope(x, sr, 1);
  let gp = 0; for (const v of env) if (v > gp) gp = v;
  const onLin = Math.max(gp * Math.pow(10, -26 / 20), Math.pow(10, -50 / 20));
  const offLin = onLin * Math.pow(10, -12 / 20);
  const clicks = [];
  let armed = true, quiet = 15;
  for (let f = 0; f < env.length; f++) {
    if (env[f] < offLin) quiet++; else if (env[f] < onLin) { /* hysteresis */ } else quiet = 0;
    if (!armed && quiet >= 15) armed = true;
    if (armed && env[f] >= onLin) {
      armed = false; quiet = 0;
      let s = f; while (s > 0 && env[s - 1] >= offLin && f - s < 5) s--;
      let pk = 0, pf = f;
      for (let g = f; g < Math.min(env.length, f + 30); g++) if (env[g] > pk) { pk = env[g]; pf = g; }
      const lim = pk * Math.pow(10, DECAY_DB / 20);
      let decay = null;
      for (let g = pf; g < env.length; g++) {
        if (env[g] < lim) {
          let ok = true;
          for (let h = g; h < Math.min(env.length, g + 10); h++) if (env[h] >= lim) { ok = false; break; }
          if (ok) { decay = g - s; break; }
        }
      }
      clicks.push({ onsetMs: s, peak: pk, decayMs: decay });
    }
  }
  for (let i = 0; i < clicks.length; i++) {
    const c = clicks[i], next = clicks[i + 1];
    const startMs = Math.max(0, c.onsetMs - 2);
    let endMs = c.onsetMs + F.sliceMs;
    if (next) endMs = Math.min(endMs, next.onsetMs - 5);
    c.startSample = Math.round((startMs * sr) / 1000);
    c.endSample = Math.min(x.length, Math.round((endMs * sr) / 1000));
  }
  return { clicks, peak: gp };
}
export function sliceBuffers(ab, clicks, fam, ac) {
  const F = FAMILIES[fam] || FAMILIES.wood, sr = ab.sampleRate;
  return clicks.map((c) => {
    const len = Math.max(1, c.endSample - c.startSample);
    const out = ac.createBuffer(ab.numberOfChannels, len, sr);
    const fi = Math.round(0.005 * sr), fo = Math.min(len, Math.round((F.fadeMs / 1000) * sr));
    for (let ch = 0; ch < ab.numberOfChannels; ch++) {
      const src = ab.getChannelData(ch).subarray(c.startSample, c.endSample), d = out.getChannelData(ch);
      for (let i = 0; i < len; i++) { let g = 1; if (i < fi) g = i / fi; if (i > len - fo) g = Math.min(g, (len - i) / fo); d[i] = src[i] * g; }
    }
    return out;
  });
}
function sliceTicks(ab, fam) {
  const F = FAMILIES[fam];
  const { clicks, peak } = findClicks(mono(ab), ab.sampleRate, fam);
  let last = -1e9; const spaced = [];
  for (const c of clicks) if (c.onsetMs - last >= MIN_GAP_MS) { spaced.push(c); last = c.onsetMs; }
  // keep clicks that decay in time and aren't stray soft ones (the metal clip has one)
  const good = spaced.filter((c) => c.decayMs !== null && c.decayMs <= F.decayMs && c.peak >= peak * 0.2);
  const slices = sliceBuffers(ab, good, fam, ctx);
  // level the slices so no click jumps out
  return slices.map((b, i) => ({ buffer: b, gain: Math.min(2.5, (peak * 0.7) / Math.max(1e-4, good[i].peak)) }));
}
function trimLead(ab) {
  const x = mono(ab);
  let pk = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; }
  const thr = pk * Math.pow(10, -36 / 20);
  let s = 0; while (s < x.length && Math.abs(x[s]) < thr) s++;
  s = Math.max(0, s - Math.round(ab.sampleRate * 0.003));
  if (s < ab.sampleRate * 0.004) return ab;
  const len = ab.length - s;
  const out = ctx.createBuffer(ab.numberOfChannels, len, ab.sampleRate);
  for (let c = 0; c < ab.numberOfChannels; c++) out.getChannelData(c).set(ab.getChannelData(c).subarray(s));
  return out;
}

// ---------------------------------------------------------------- playing
const dbToGain = (db) => Math.pow(10, db / 20);
export function play(name, { gain = 1, rate = 1, when = 0 } = {}) {
  if (!ctx || sfxMuted) return null;
  const b = buf[name];
  if (!b) return null;
  const src = ctx.createBufferSource();
  src.buffer = b; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = dbToGain(SFX[name] || 0) * gain;
  src.connect(g); g.connect(sfxBus);
  src.start(ctx.currentTime + when);
  return src;
}

export function setNeedles(id) { family = NEEDLE_FAMILY[id] || 'wood'; }

// one stitch's tick: purl a little lower, every 10th row a little higher
export function tick({ purl = false, high = false } = {}) {
  if (!ctx || sfxMuted) return;
  const now = ctx.currentTime;
  for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= now) voices.splice(i, 1);
  while (voices.length >= 3) { const v = voices.shift(); try { v.g.gain.setTargetAtTime(0, now, 0.004); v.src.stop(now + 0.02); } catch { /* */ } }
  const set = ticks[family];
  const rate = (0.95 + Math.random() * 0.1) * (purl ? 0.88 : 1) * (high ? 1.12 : 1);
  const g = ctx.createGain(); g.connect(sfxBus);
  if (set.length >= 4) {
    const pick = set[(Math.random() * set.length) | 0];
    const src = ctx.createBufferSource(); src.buffer = pick.buffer; src.playbackRate.value = rate;
    g.gain.value = 0.75 * pick.gain;
    src.connect(g); src.start(now);
    voices.push({ src, g, end: now + pick.buffer.duration / rate });
  } else {
    voices.push(synthClick(g, now, rate));
  }
}
// code clicks, one per family
function synthClick(out, t, rate) {
  const noise = (dur) => { const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = ctx.createBufferSource(); s.buffer = b; return s; };
  const sine = (f, dur, amp) => { const o = ctx.createOscillator(); o.frequency.value = f * rate; const g = ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.01); return o; };
  let src, end;
  if (family === 'metal') {
    const n = noise(0.002); const g = ctx.createGain(); g.gain.value = 0.25; n.connect(g); g.connect(out); n.start(t);
    src = sine(4000 + Math.random() * 2000, 0.12, 0.18); end = t + 0.13;
  } else if (family === 'glass') {
    const f = 3000 + Math.random() * 1500;
    sine(f * 1.5, 0.15, 0.08); src = sine(f, 0.15, 0.14); end = t + 0.16;
  } else {
    const n = noise(0.003); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0.9; n.connect(bp); bp.connect(g); g.connect(out); n.start(t);
    src = sine(1800 + Math.random() * 700, 0.04, 0.22); end = t + 0.05;
  }
  return { src, g: out, end };
}

export function ripLoopStart() {
  if (!ctx || sfxMuted || ripLoop || !buf['rip-loop']) return;
  const src = ctx.createBufferSource(); src.buffer = buf['rip-loop']; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(dbToGain(SFX['rip-loop']) * 0.8, ctx.currentTime, 0.05);
  src.connect(g); g.connect(sfxBus); src.start();
  ripLoop = { src, g };
}
export function ripLoopStop() {
  if (!ripLoop) return;
  const { src, g } = ripLoop; ripLoop = null;
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); src.stop(ctx.currentTime + 0.25);
}

function startAmb() {
  if (!ctx || amb || !buf['amb-fire']) return;
  const src = ctx.createBufferSource(); src.buffer = buf['amb-fire']; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(dbToGain(SFX['amb-fire']), ctx.currentTime, 1.2);
  src.connect(g); g.connect(sfxBus); src.start();
  amb = { src, g };
}
export function ambience(on) {
  ambWanted = on;
  if (on) startAmb();
  else if (amb) { const a = amb; amb = null; a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6); a.src.stop(ctx.currentTime + 3); }
}

export function vibrate(on) { if (on && navigator.vibrate) try { navigator.vibrate(5); } catch { /* */ } }

// ---------------------------------------------------------------- music: two elements, crossfaded
const deck = [];
let musicSet = null, order = [], orderPos = 0, active = -1, xfTimer = 0;
function ensureDeck() {
  if (deck.length || !ctx) return;
  for (let i = 0; i < 2; i++) {
    const el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous';
    let node = null, g = null;
    try { node = ctx.createMediaElementSource(el); g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(musicBus); } catch { g = null; }
    deck.push({ el, g, src: '' });
  }
}
function nextTrack() {
  const list = MUSIC[musicSet];
  if (orderPos >= order.length) {
    order = list.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    if (order.length > 1 && deck[active] && order[0] === deck[active].src) order.push(order.shift());
    orderPos = 0;
  }
  return order[orderPos++];
}
function startOn(i, src, fadeIn) {
  const d = deck[i];
  d.src = src; d.el.src = src; d.el.currentTime = 0;
  const p = d.el.play(); if (p && p.catch) p.catch(() => {});
  if (d.g) { const t = ctx.currentTime; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(1, t + fadeIn); }
}
function fadeOut(i, dur) {
  const d = deck[i]; if (!d) return;
  if (d.g) { const t = ctx.currentTime; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(0, t + dur); }
  setTimeout(() => { if (deck[active] !== d) d.el.pause(); }, dur * 1000 + 100);
}
function crossTo(src, dur = XFADE) {
  const first = active < 0;
  const next = first ? 0 : 1 - active;
  if (!first) fadeOut(active, dur);
  active = next;
  startOn(active, src, first ? 1.5 : dur);
}
export function music(set) {
  if (!ctx || !MUSIC[set] || set === musicSet) return;
  ensureDeck();
  if (!deck.length) return;
  musicSet = set; order = []; orderPos = 0;
  crossTo(nextTrack(), XFADE);
  if (!xfTimer) xfTimer = setInterval(watchMusic, 250);
}
function watchMusic() {
  const d = deck[active];
  if (!d || !musicSet || !isFinite(d.el.duration) || d.el.paused) return;
  if (d.el.duration - d.el.currentTime <= XFADE) crossTo(nextTrack(), XFADE);
}

// ---------------------------------------------------------------- volume and mute
function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(musicMuted ? 0 : MUSIC_BASE * musicVol, t, 0.08);
  sfxBus.gain.setTargetAtTime(sfxMuted ? 0 : sfxVol, t, 0.03);
}
export function setVolumes(m, s) { musicVol = m; sfxVol = s; applyVolumes(); }
export function setMuted(mm, sm = mm) { musicMuted = !!mm; sfxMuted = !!sm; applyVolumes(); if (sfxMuted) ripLoopStop(); }
export const muted = () => musicMuted && sfxMuted;
export function audioState() { return { context: ctx ? ctx.state : undefined, musicMuted, sfxMuted, family, ticks: { wood: ticks.wood.length, metal: ticks.metal.length, glass: ticks.glass.length }, music: musicSet, voices: voices.length }; }
export function suspendForHidden(hidden) {
  if (!ctx) return;
  if (hidden) { deck.forEach((d) => d.el.pause()); ctx.suspend(); }
  else { ctx.resume(); const d = deck[active]; if (d && musicSet) { const p = d.el.play(); if (p && p.catch) p.catch(() => {}); } }
}
