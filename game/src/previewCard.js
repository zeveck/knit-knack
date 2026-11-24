// previewCard.js — the "what you're making" card: a small flat canvas of the piece (one block per
// stitch, ghost cells for stitches still to come), stamped per tap, drawn into the card by a renderer.
//
// HOOK for the dolls helper: previewCard.setRenderer(fn). fn(ctx, info) draws the whole card:
//   info = { flat: HTMLCanvasElement (the flat piece, cellW × cellH device px per stitch, transparent outside the shape),
//            cellW, cellH, chart, pattern, piece, w, h (card size in device px), dpr, progress (0..1), large (enlarged sheet),
//            state: the save (for outfits / lastDoll / dolls unlocked) }
// It must only draw (no DOM changes). It runs at most once per animation frame and only after a change.
import { yarnColorAt } from './stitches.js';
import { el, openSheet } from './ui.js';
import * as S from './state.js';

const CW = 4, CH = 3; // device px per stitch on the flat canvas

class PreviewCard {
  constructor() {
    this.renderer = defaultRenderer;
    this.flat = document.createElement('canvas');
    this.cards = new Set(); // canvases showing the card
    this.chart = null; this.piece = null; this.pattern = null;
    this.dirty = false; this.lastTenth = 0;
    this._raf = 0;
  }
  setRenderer(fn) { this.renderer = fn || defaultRenderer; this.invalidate(); }
  attach(canvas) { this.cards.add(canvas); this.invalidate(); }
  detach(canvas) { this.cards.delete(canvas); }
  // build from the data on entering a piece
  load(chart, pattern, piece) {
    this.chart = chart; this.pattern = pattern; this.piece = piece;
    const f = this.flat;
    f.width = chart.width * CW; f.height = chart.height * CH;
    const g = f.getContext('2d');
    g.clearRect(0, 0, f.width, f.height);
    this._idx = new Map();
    for (let r = 1; r <= chart.height; r++) {
      const R = chart.row(r);
      for (const e of R.map) this._stampCell(g, r, e.col, chart.rowStart(r) + e.k);
    }
    this.lastTenth = Math.floor(this.progress() * 10);
    this.invalidate();
  }
  progress() { return this.chart && this.piece ? Math.min(1, this.piece.yarns.length / this.chart.total) : 0; }
  _stampCell(g, r, c, i) {
    const x = c * CW, y = (this.chart.height - r) * CH;
    g.clearRect(x, y, CW, CH);
    const y0 = this.piece.yarns[i];
    if (y0) {
      g.fillStyle = yarnColorAt(y0, i);
      g.fillRect(x, y, CW, CH);
      g.fillStyle = 'rgba(40,16,40,0.18)'; // a faint V shadow, so it reads as knitting
      g.fillRect(x + CW / 2 - 0.5, y, 1, CH);
    } else {
      g.fillStyle = 'rgba(91,58,94,0.16)';
      g.fillRect(x, y, CW, CH);
    }
  }
  // per tap: stamp only the new (or ripped) stitch
  stamp(i) {
    if (!this.chart) return;
    const L = this.chart.locate(i);
    if (!L) return;
    this._stampCell(this.flat.getContext('2d'), L.r, L.entry.col, i);
    const tenth = Math.floor(this.progress() * 10);
    if (tenth > this.lastTenth) { this.glow(); }
    this.lastTenth = tenth;
    this.invalidate();
  }
  glow() {
    for (const c of this.cards) { const b = c.parentElement; if (!b) continue; b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); }
  }
  invalidate() {
    this.dirty = true;
    if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  }
  draw() {
    if (!this.dirty || !this.chart) return;
    this.dirty = false;
    for (const c of this.cards) this.drawInto(c, false);
  }
  drawInto(canvas, large) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    try {
      this.renderer(g, { flat: this.flat, cellW: CW, cellH: CH, chart: this.chart, pattern: this.pattern, piece: this.piece, w, h, dpr, progress: this.progress(), large, state: S.get() });
    } catch (e) { console.warn('preview renderer failed', e); defaultRenderer(g, { flat: this.flat, w, h, dpr }); }
  }
  open() {
    const c = el('canvas', { style: { width: 'min(80vw, 420px)', height: 'min(80vw, 420px)', display: 'block', margin: '0 auto', borderRadius: '16px' } });
    openSheet('preview', el('div', {}, c), { title: this.pattern ? this.pattern.name : 'Preview' });
    requestAnimationFrame(() => this.drawInto(c, true));
  }
  state(canvas) {
    const r = canvas ? canvas.getBoundingClientRect() : null;
    return { doll: null, visible: !!(r && r.width && canvas.offsetParent), rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null };
  }
}

// simple flat card: the piece on a cream card with a stitched border
function defaultRenderer(g, { flat, w, h, dpr, large }) {
  const pad = Math.round(w * 0.06);
  const rr = Math.round(10 * dpr);
  g.save();
  roundRect(g, 0, 0, w, h, rr);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#fbf4e6'); bg.addColorStop(1, '#ead9bb');
  g.fillStyle = bg; g.fill();
  g.strokeStyle = 'rgba(158,42,58,0.55)'; g.lineWidth = Math.max(1, dpr * (large ? 2 : 1.2)); g.setLineDash([4 * dpr, 3 * dpr]);
  roundRect(g, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, rr * 0.7); g.stroke();
  g.setLineDash([]);
  if (flat && flat.width) {
    const k = Math.min((w - pad * 2) / flat.width, (h - pad * 2) / flat.height);
    const dw = flat.width * k, dh = flat.height * k;
    const x = (w - dw) / 2, y = (h - dh) / 2;
    g.shadowColor = 'rgba(40,16,40,0.35)'; g.shadowBlur = 6 * dpr; g.shadowOffsetY = 2 * dpr;
    g.imageSmoothingEnabled = k < 1;
    g.drawImage(flat, x, y, dw, dh);
  }
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export const previewCard = new PreviewCard();
export default previewCard;
