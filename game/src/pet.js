// pet.js — petting the cat. A tap that starts on her (the knitting and scarf baskets, the title, the
// finish, the doll shelf) is a pet, never a stitch: a purr (a mew now and then), a few hearts rising
// from the spot, and a little wiggle and happy squint the drawing code reads from petPose(). Taps that
// land on her mid-drumming (within 250 ms of a knit tap) do nothing at all, so drumming never purrs.
import * as audio from './audio.js';
import * as S from './state.js';

let petAt = -1e9, purrUntil = 0, lastKnit = -1e9, pets = 0;
const WIGGLE_MS = 900;
const DRUM_MS = 250;

// the knitting screens tell us when a stitch was tapped
export const noteKnitTap = () => { lastKnit = performance.now(); };
export const drumming = () => performance.now() - lastKnit < DRUM_MS;

// pet her (client coords for the hearts). Returns false when it was swallowed as drumming.
export function pet(x, y) {
  const now = performance.now();
  if (now - lastKnit < DRUM_MS) return false;
  petAt = now; pets += 1;
  audio.unlock && audio.unlock();
  if (now > purrUntil) {
    audio.play('purr', { gain: 0.9 });
    purrUntil = now + 1400;
    if (Math.random() < 0.3) audio.play('mew', { gain: 0.8, when: 0.25 });
  }
  if (S.get().equipped.purl.includes('bell')) audio.play('bell', { gain: 0.4 });
  hearts(x, y);
  return true;
}

// {k: 0..1 how petted she is right now, wig: radians, squash: scale} (k is 0 when not)
export function petPose(t = performance.now()) {
  const e = t - petAt;
  if (e < 0 || e > WIGGLE_MS) return { k: 0, wig: 0, squash: 1 };
  const k = 1 - e / WIGGLE_MS;
  return { k, wig: Math.sin(e / 55) * 0.05 * k, squash: 1 - 0.035 * Math.sin((e / WIGGLE_MS) * Math.PI) };
}
export const petCount = () => pets;

function hearts(x, y) {
  const layer = document.body;
  for (let i = 0; i < 4; i++) {
    const h = document.createElement('span');
    h.className = 'pet-heart';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>';
    const dx = (i - 1.5) * 16 + (Math.random() - 0.5) * 10;
    h.style.left = `${x + dx}px`; h.style.top = `${y - 10}px`;
    h.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
    h.style.animationDelay = `${i * 90}ms`;
    h.style.setProperty('--s', String(0.75 + Math.random() * 0.5));
    layer.append(h);
    setTimeout(() => h.remove(), 1500 + i * 90);
  }
}
