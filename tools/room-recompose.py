#!/usr/bin/env python3
"""Recompose the room pictures for Change 4 (CHANGE_4.md 9a): roomier landscape shelves, the scarf's pegs.

usage: python3 tools/room-recompose.py SRC_DIR OUT_DIR

SRC_DIR holds the Change 3 room-land.webp and room-port.webp (kept in .gamegen/candidates/room4/src).
Everything is done in Pillow and numpy, to the pixel; no generator is used:

1. the old shelves (and, in landscape, the sconce) are lifted off as layers: their pixels' difference
   from the wall behind them (a normalized-convolution estimate of the bare wall) gives each pixel's alpha,
   so the boards keep their outlines and their soft painted shadows;
2. the wall under them is filled: the low frequencies by normalized convolution of the bare wall around
   (no single colour offset, so the sconce's glow carries straight across), plus the wall's own grain (the
   high-pass of a clean patch of the same picture), feathered 24 px into the original;
3. the shelves go back at their new lines (only the plank between the brackets is stretched or shrunk);
   landscape's low board passes behind the armchair (the chair's pixels pasted back over it);
4. the sconce goes back 0.04 higher (landscape), with a small extra glow at its shade;
5. a peg rail is built from the shelf's own front plank, its turned knobs drawn from that wood's colours,
   with the shelves' plum shadow.
Writes OUT_DIR/room-land.webp, room-port.webp (quality 90, as before) and the PNGs for checking, and
prints the chair-back polygon (fractions) for each JSON.
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

rng = np.random.default_rng(4)


def gauss(a, s):
    if a.ndim == 3:
        return np.stack([nd.gaussian_filter(a[..., c], s, mode='nearest') for c in range(a.shape[2])], -1)
    return nd.gaussian_filter(a, s, mode='nearest')


def nconv(img, keep, s):
    num = gauss(img * keep[..., None], s)
    den = gauss(keep.astype(np.float64), s)
    return num / np.maximum(den, 1e-6)[..., None], den


def poly_mask(W, H, pts, ss=4):
    m = Image.new('L', (W * ss, H * ss), 0)
    ImageDraw.Draw(m).polygon([(x * W * ss, y * H * ss) for x, y in pts], fill=255)
    return np.asarray(m.resize((W, H), Image.LANCZOS)).astype(np.float64) / 255


def rect_mask(W, H, x0, y0, x1, y1):
    m = np.zeros((H, W), bool)
    m[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
    return m


def chair_outline(L, W, H, xs, y_from, y_to, x_left_from, ys):
    """the chair back's top edge (first dark pixel down from y_from at each x) and its left edge"""
    top = []
    for xf in xs:
        x = int(xf * W)
        col = L[int(y_from * H):int(y_to * H), x]
        d = np.where(col < 150)[0]
        top.append((xf, (int(y_from * H) + d[0] - 2) / H if len(d) else y_to))
    left = []
    for yf in ys:
        y = int(yf * H)
        row = L[y, int(x_left_from * W):]
        d = np.where(row < 150)[0]
        left.append(((int(x_left_from * W) + d[0] - 2) / W, yf))
    return top, left


def grain_field(img, patch, H, W, s=5):
    """the wall's own grain: the high-pass of a clean patch, tiled in 96 px blocks at random offsets"""
    x0, y0, x1, y1 = patch
    p = img[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
    hp = p - gauss(p, s)
    ph, pw = hp.shape[:2]
    out = np.zeros((H, W, 3))
    B = 96
    for by in range(0, H, B):
        for bx in range(0, W, B):
            oy, ox = rng.integers(0, ph - B), rng.integers(0, pw - B)
            h, w = min(B, H - by), min(B, W - bx)
            out[by:by + h, bx:bx + w] = hp[oy:oy + h, ox:ox + w]
    # soften the block joins a touch (grain only: a 1 px blur keeps its texture)
    return gauss(out, 0.6)


def lift_layer(img, bg, rect, W, H, lo=7.0, hi=24.0, reach=12):
    """an RGBA layer of what differs from the bare wall inside rect (alpha from the difference), kept only
    near the thing itself (its strong pixels grown by `reach` px, softly), so no stray wall comes along"""
    x0, y0, x1, y1 = [int(v) for v in (rect[0] * W, rect[1] * H, rect[2] * W, rect[3] * H)]
    d = np.abs(img[y0:y1, x0:x1] - bg[y0:y1, x0:x1]).max(-1)
    a = np.clip((d - lo) / (hi - lo), 0, 1)
    core = d > 40
    near = nd.gaussian_filter(nd.binary_dilation(core, iterations=reach).astype(np.float64), reach / 3)
    a = a * np.clip(near * 1.6, 0, 1)
    return img[y0:y1, x0:x1].copy(), a, (x0, y0)


def remap_cols(rgb, a, x_split, new_w):
    """keep the columns before x_split[0] and after x_split[1]; resample the middle to fill new_w"""
    w = rgb.shape[1]
    s0, s1 = x_split
    mid_new = new_w - s0 - (w - s1)
    src = np.concatenate([np.arange(s0), s0 + (np.arange(mid_new) + 0.5) * (s1 - s0) / mid_new, s1 + np.arange(w - s1)])
    xi = np.clip(src, 0, w - 1)
    i0 = np.floor(xi).astype(int); i1 = np.minimum(i0 + 1, w - 1); f = (xi - i0)[None, :]
    rgb2 = rgb[:, i0] * (1 - f[..., None]) + rgb[:, i1] * f[..., None]
    a2 = a[:, i0] * (1 - f) + a[:, i1] * f
    return rgb2, a2


def paste(out, rgb, a, x, y):
    h, w = a.shape
    H, W = out.shape[:2]
    xs, ys = max(0, -x), max(0, -y)
    xe, ye = min(w, W - x), min(h, H - y)
    region = out[y + ys:y + ye, x + xs:x + xe]
    aa = a[ys:ye, xs:xe, None]
    region[:] = rgb[ys:ye, xs:xe] * aa + region * (1 - aa)


def shadow(out, a, x, y, color=(59, 39, 56), alpha=0.25, dx=2, dy=6, blur=8):
    h, w = a.shape
    pad = blur * 3
    m = np.zeros((h + pad * 2, w + pad * 2))
    m[pad:pad + h, pad:pad + w] = a
    m = nd.gaussian_filter(m, blur / 2) * alpha
    rgb = np.broadcast_to(np.array(color, float), m.shape + (3,))
    paste(out, rgb, m, x - pad + dx, y - pad + dy)


def knob(r, light, mid, dark, line, ss=4):
    """a turned wooden peg seen nearly front-on: shaft, knob with a turned ring, light from the upper left"""
    R = int(r * 1.5) + 4
    S = R * 2 * ss
    yy, xx = (np.mgrid[0:S, 0:S] + 0.5) / ss - R
    rgb = np.zeros((S, S, 3)); a = np.zeros((S, S))
    # the shaft into the rail (a little up-left of the knob: we see it from slightly below-right)
    sh = ((xx + r * 0.12) ** 2 + (yy + r * 0.1) ** 2) <= (r * 0.62) ** 2
    rgb[sh] = dark; a[sh] = 1
    # the knob: a disc, shaded as a dome
    cx, cy = r * 0.08, r * 0.1
    rr = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    k = rr <= r
    lx, ly = -0.45, -0.55
    nz = np.sqrt(np.clip(1 - (rr / r) ** 2, 0, 1))
    shade = np.clip(((xx - cx) / r) * lx + ((yy - cy) / r) * ly + nz * 0.7, 0, 1.2)
    base = np.where(shade[..., None] > 0.75, light * (shade[..., None] - 0.75) / 0.45 + mid * (1 - (shade[..., None] - 0.75) / 0.45), mid * (shade[..., None] / 0.75) + dark * (1 - shade[..., None] / 0.75))
    base = np.clip(base, 0, 255)
    rgb[k] = base[k]; a[k] = 1
    # the turned ring and the rim line
    ring = k & (np.abs(rr - r * 0.56) < r * 0.07)
    rgb[ring] = rgb[ring] * 0.82 + line * 0.18
    rim = k & (rr > r - max(1.6, r * 0.13))
    rgb[rim] = line
    shrim = sh & ~k & (np.sqrt((xx + r * 0.12) ** 2 + (yy + r * 0.1) ** 2) > r * 0.62 - 1.6)
    rgb[shrim] = line
    # a soft highlight
    hl = np.exp(-(((xx - cx + r * 0.38) ** 2 + (yy - cy + r * 0.42) ** 2) / (2 * (r * 0.2) ** 2)))
    rgb = rgb + (np.array([255, 246, 225]) - rgb) * (hl[..., None] * 0.55 * k[..., None])
    im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8), 'RGBA').resize((R * 2, R * 2), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float64)
    return arr[..., :3], arr[..., 3] / 255, R


def rail(img, bg, W, H, board, lip_y, length, pegs_px, r):
    """the peg rail: the shelf board's front lip (the same wood), cut to length with its own ends, and its knobs"""
    bx0, bx1 = board
    y0, y1 = lip_y
    rgb, a, _ = lift_layer(img, bg, (bx0 / W, y0 / H, (bx1 + 1) / W, y1 / H), W, H, lo=10, reach=4)
    w = rgb.shape[1]
    end = 26
    rgb2, a2 = remap_cols(rgb, a, (end, w - end), length)
    wood = rgb[a > 0.95]
    lum = wood.mean(-1)
    pick = lambda q: wood[np.argsort(lum)[int(q * (len(lum) - 1))]]
    light, mid, dark, line = pick(0.92), pick(0.55), pick(0.18), pick(0.02)
    kn = knob(r, np.array(light), np.array(mid), np.array(dark), np.array(line))
    return rgb2, a2, kn


def soften_glow(out, wall, W, H, grain, band, ramp, keep_out):
    """(portrait) the sconce's lit box was bounded by the shelves; where they're gone its edges are blurred
    into a soft glow: the unlit wall U (estimated from outside the band) plus the light above it, the light
    blurred more the further right of ramp[0] (the sconce itself is left out of the blur)"""
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    inband = (xx >= band[0]) & (yy >= band[1]) & (xx <= band[2]) & (yy <= band[3])
    keepU = wall & ~inband
    U60, den = nconv(out, keepU, 60)
    U160, _ = nconv(out, keepU, 160)
    w60 = np.clip((den - 0.02) / 0.1, 0, 1)[..., None]
    U = U60 * w60 + U160 * (1 - w60)
    E = out - U
    k = wall & ~rect_mask(W, H, *keep_out)
    Eb, _ = nconv(E, k, 36)
    t = np.clip((xx - ramp[0]) / (ramp[1] - ramp[0]), 0, 1)
    w = (t * t * (3 - 2 * t))[..., None] * inband[..., None] * wall[..., None]
    w = gauss(w, 6)
    # the sconce itself is never blurred: its pixels (what stands out from the blurred light) are kept
    ko = rect_mask(W, H, *keep_out)
    lamp = ko & (np.abs(out - (U + Eb)).max(-1) > 18)
    lamp = nd.gaussian_filter(nd.binary_dilation(lamp, iterations=3).astype(np.float64), 1.5)[..., None]
    w = w * (1 - lamp)
    return out * (1 - w) + (U + Eb + grain) * w


def compose(o, src, outdir):
    img0 = Image.open(os.path.join(src, f'room-{o}.webp')).convert('RGB')
    W, H = img0.size
    img = np.asarray(img0).astype(np.float64)
    L = img.mean(-1)
    P = PLAN[o]
    # the chair back's outline (from the untouched picture)
    top, left = chair_outline(L, W, H, *P['chair_scan'])
    chair_poly = [(x, y) for x, y in top] + P['chair_close'](top, left)
    chair = poly_mask(W, H, chair_poly) > 0.5
    # what's bare wall (for the estimates): the wall area, minus the chair (grown) and the things on it
    wall = rect_mask(W, H, *P['wall'])
    wall &= ~nd.binary_dilation(chair, iterations=10)
    hole = np.zeros((H, W), bool)
    for r in P['holes']:
        hole |= rect_mask(W, H, *r)
    hole &= ~nd.binary_dilation(chair, iterations=6)
    keep = wall & ~hole
    # the bare wall's low frequencies: two scales, the finer where it reaches
    est40, den40 = nconv(img, keep, 40)
    est14, den14 = nconv(img, keep, 14)
    wfine = np.clip((den14 - 0.25) / 0.35, 0, 1)[..., None]
    low = est14 * wfine + est40 * (1 - wfine)
    grain = grain_field(img, P['grain'], H, W) * P.get('grain_k', 1.0)
    fill = low + grain
    # lift the things off first (their difference from the bare wall, estimated without them)
    things = np.zeros((H, W), bool)
    for spec in P['lift'].values():
        things |= rect_mask(W, H, *spec['rect'])
    k2 = keep & ~nd.binary_dilation(things, iterations=6)
    e40, _ = nconv(img, k2, 40)
    e14, d14 = nconv(img, k2, 14)
    wf = np.clip((d14 - 0.25) / 0.35, 0, 1)[..., None]
    low_lift = e14 * wf + e40 * (1 - wf)
    layers = {}
    for name, spec in P['lift'].items():
        layers[name] = lift_layer(img, low_lift, spec['rect'], W, H)
    # feathered paste of the fill into the hole
    soft = nd.gaussian_filter(nd.binary_dilation(hole, iterations=4).astype(np.float64), 8)
    soft = np.maximum(soft, hole)
    out = img * (1 - soft[..., None]) + fill * soft[..., None]
    if 'soften' in P:
        out = soften_glow(out, wall, W, H, grain, **P['soften'])
    base = out.copy()
    # the shelves back
    for name, spec in P['shelves'].items():
        rgb, a, (x0, y0) = layers[name]
        nw = int(round((spec['x1'] - spec['x0']) * W))
        s0, s1 = int(spec['split'][0] * W) - x0, int(spec['split'][1] * W) - x0
        if spec.get('join'):
            # shortened: the board's left part as it is, then its own right end (bracket and all) moved left,
            # the two cross-faded over `join` px of plank
            J = spec['join']
            right = rgb[:, s1 - J:].copy(), a[:, s1 - J:]
            # the right end was in the unlit wall: its wood is matched to the plank it now joins
            Lw = rgb[:, s0 - 40:s0][a[:, s0 - 40:s0] > 0.95]
            Rw = right[0][:, :40][right[1][:, :40] > 0.95]
            if len(Lw) and len(Rw):
                gain = Lw.mean(0) / np.maximum(Rw.mean(0), 1)
                right[0][:] = right[0] * (1 + (gain - 1) * right[1][..., None])
            at = nw - right[0].shape[1]
            rgb2, a2 = rgb[:, :nw].copy(), a[:, :nw].copy()
            at = min(at, s0)
            rgb2[:, at:], a2[:, at:] = rgb[:, at:nw], a[:, at:nw]
            f = np.linspace(0, 1, J)[None, :]
            rgb2[:, at:at + J] = rgb2[:, at:at + J] * (1 - f[..., None]) + right[0][:, :J] * f[..., None]
            a2[:, at:at + J] = a2[:, at:at + J] * (1 - f) + right[1][:, :J] * f
            rgb2[:, at + J:] = right[0][:, J:]; a2[:, at + J:] = right[1][:, J:]
        else:
            rgb2, a2 = remap_cols(rgb, a, (s0, s1), nw)
        nx, ny = int(round(spec['x0'] * W)), y0 + int(round(spec['dy'] * H))
        if spec.get('from'):  # only the part from here on is new (the rest of the picture is untouched)
            a2 = a2.copy(); a2[:, :max(0, int(spec['from'] * W) - nx)] = 0
        paste(out, rgb2, a2, nx, ny)
        if spec.get('behind_chair'):
            cm = poly_mask(W, H, chair_poly)
            out = out * (1 - cm[..., None]) + img * cm[..., None]
    # the sconce (landscape): 0.04 higher, a little extra glow at its shade
    if 'sconce' in P:
        rgb, a, (x0, y0) = layers['sconce']
        dy = int(round(P['sconce']['dy'] * H))
        paste(out, rgb, a, x0, y0 + dy)
        gx, gy, gr = [v * s for v, s in zip(P['sconce']['glow'], (W, H, H))]
        yy, xx = np.mgrid[0:H, 0:W]
        g = np.exp(-(((xx - gx) ** 2 + (yy - gy) ** 2) / (2 * (gr / 2) ** 2))) * P['sconce']['glow_a']
        honey = np.array([255, 217, 138], float)
        scr = 255 - (255 - out) * (255 - honey) / 255
        out = out * (1 - g[..., None]) + scr * g[..., None]
        out = out * (1 - chair[..., None]) + img * chair[..., None]   # never on the chair
    # the peg rail
    R = P['rail']
    rgb2, a2, (krgb, ka, KR) = rail(img, low_lift, W, H, R['board'], R['lip_y'], int(round((R['x1'] - R['x0']) * W)), None, R['r'])
    rx, ry = int(round(R['x0'] * W)), int(round(R['y'] * H - a2.shape[0] / 2))
    # its shadow first (rail and knobs together), then the rail, then each knob
    sh = np.zeros((H, W))
    sh[ry:ry + a2.shape[0], rx:rx + a2.shape[1]] = np.maximum(sh[ry:ry + a2.shape[0], rx:rx + a2.shape[1]], a2)
    for px in R['pegs']:
        kx, ky = int(round(px * W)) - KR, int(round(R['y'] * H)) - KR
        sh[ky:ky + ka.shape[0], kx:kx + ka.shape[1]] = np.maximum(sh[ky:ky + ka.shape[0], kx:kx + ka.shape[1]], ka)
    shadow(out, sh, 0, 0, dx=3, dy=6, blur=8)
    paste(out, rgb2, a2, rx, ry)
    for px in R['pegs']:
        paste(out, krgb, ka, int(round(px * W)) - KR, int(round(R['y'] * H)) - KR)
    res = Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8), 'RGB')
    res.save(os.path.join(outdir, f'room-{o}.png'))
    res.save(os.path.join(outdir, f'room-{o}.webp'), quality=90, method=6)
    Image.fromarray((np.clip(np.rint(base), 0, 255)).astype(np.uint8)).save(os.path.join(outdir, f'room-{o}-bare.png'))
    # the chair-back front: its top edge (from x0 on) round its right side down to the arms
    F = P['front']
    L = np.clip(np.rint(out), 0, 255).mean(-1)   # (scanned on the new picture: the old brackets are gone)
    top2 = []
    for xf in np.linspace(F['x0'], F['x1'], 28):
        x = int(xf * W); col = L[int(F['y_from'] * H):int(0.7 * H), x]
        d = np.where(col < 165)[0]
        if len(d): top2.append((round(xf, 4), round((int(F['y_from'] * H) + d[0] - 1.5) / H, 4)))
    # a faint stretch of outline: the median of its neighbours
    ys = [y for _, y in top2]
    top2 = [(x, y if abs(y - np.median(ys[max(0, i - 2):i + 3])) < 0.01 else float(np.median(ys[max(0, i - 2):i + 3]))) for i, (x, y) in enumerate(top2)]
    side = []
    for yf in np.linspace(top2[-1][1] + 0.004, F['y_bottom'], 10):
        y = int(yf * H); row = L[y, int(F['x0'] * W):int(F['scan_from'] * W)][::-1]
        d = np.where(row < 150)[0]
        if len(d): side.append((round((int(F['scan_from'] * W) - d[0] + 1.5) / W, 4), round(yf, 4)))
    poly = top2 + side + [(side[-1][0], F['y_bottom']), (F['x0'], F['y_bottom'])]
    hang = [[x, round(y + 3 / H, 4)] for x, y in top2] + [[x, round(y, 4)] for x, y in side[:3]]
    return {'chair_back': [[x, y] for x, y in poly], 'hang': hang}


# ---------------------------------------------------------------- the two pictures
def land_close(top, left):
    # down the right side of the back to the arm, across under it, up the left edge
    return [(0.917, 0.45), (0.917, 0.555), (0.66, 0.555)] + [(x, y) for x, y in reversed(left)]


def port_close(top, left):
    return [(0.999, 0.47), (0.999, 0.56), (0.70, 0.56)] + [(x, y) for x, y in reversed(left)]


PLAN = {
    'land': {
        # chair scan: x positions along its top, scanned from y 0.31 to 0.50; its left edge from x 0.64 at these y
        'chair_scan': ([0.690, 0.695, 0.70, 0.71, 0.72, 0.735, 0.75, 0.775, 0.80, 0.825, 0.85, 0.875, 0.89, 0.90, 0.908, 0.914], 0.31, 0.50, 0.645, [0.40, 0.42, 0.45, 0.48, 0.52, 0.555]),
        'chair_close': land_close,
        'front': {'x0': 0.70, 'x1': 0.912, 'y_from': 0.30, 'scan_from': 0.95, 'y_bottom': 0.555},
        'wall': (0.405, 0.0, 1.0, 0.66),
        'holes': [(0.418, 0.125, 0.698, 0.228), (0.418, 0.278, 0.698, 0.378), (0.696, 0.112, 0.785, 0.275)],
        'grain': (0.80, 0.03, 0.99, 0.30),
        'lift': {
            'top': {'rect': (0.425, 0.132, 0.692, 0.222)},
            'low': {'rect': (0.425, 0.284, 0.692, 0.372)},
            'sconce': {'rect': (0.700, 0.118, 0.775, 0.268)},
        },
        'shelves': {
            # new line y minus old line y; the board's new x range; the plank between the brackets is resampled
            'top': {'x0': 0.4155, 'x1': 0.7045, 'dy': 0.235 - 0.1523, 'split': (0.50, 0.62)},
            'low': {'x0': 0.4060, 'x1': 0.6750, 'dy': 0.455 - 0.3037, 'split': (0.50, 0.62), 'behind_chair': True},
        },
        'sconce': {'dy': -0.040, 'glow': (0.740, 0.125, 0.07), 'glow_a': 0.22},
        'rail': {'board': (666, 1050), 'lip_y': (146, 168), 'x0': 0.775, 'x1': 0.975, 'y': 0.088, 'pegs': [0.80, 0.875, 0.95], 'r': 13},
    },
    'port': {
        'chair_scan': ([0.70, 0.72, 0.75, 0.78, 0.80, 0.83, 0.85, 0.88, 0.90, 0.93, 0.95, 0.97, 0.985], 0.36, 0.55, 0.66, [0.42, 0.45, 0.48, 0.52, 0.56]),
        'chair_close': port_close,
        'front': {'x0': 0.70, 'x1': 0.968, 'y_from': 0.383, 'scan_from': 0.999, 'y_bottom': 0.55},
        'wall': (0.41, 0.0, 1.0, 0.63),
        # the shelves' right ends (left of x 0.66 the picture is untouched)
        'holes': [(0.69, 0.135, 1.0, 0.205), (0.69, 0.322, 1.0, 0.385)],
        # the sconce's lit box: the shelves had bounded it; right of their new ends its edges go soft
        'soften': {'band': (0.42, 0.13, 1.0, 0.39), 'ramp': (0.64, 0.76), 'keep_out': (0.725, 0.205, 0.788, 0.315)},
        'grain': (0.45, 0.03, 0.75, 0.13),
        'lift': {
            'top': {'rect': (0.426, 0.140, 0.985, 0.200)},
            'low': {'rect': (0.426, 0.327, 0.985, 0.384)},
        },
        'shelves': {
            'top': {'x0': 0.4346, 'x1': 0.800, 'dy': 0.0, 'split': (0.70, 0.88), 'from': 0.60, 'join': 40},
            'low': {'x0': 0.4346, 'x1': 0.800, 'dy': 0.0, 'split': (0.70, 0.88), 'from': 0.60, 'join': 40},
        },
        'rail': {'board': (444, 996), 'lip_y': (197, 226), 'x0': 0.815, 'x1': 0.992, 'y': 0.055, 'pegs': [0.83, 0.975], 'r': 12},
    },
}

if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    info = {o: compose(o, src, outdir) for o in ('land', 'port')}
    json.dump(info, open(os.path.join(outdir, 'chair.json'), 'w'), indent=1)
    print(json.dumps(info))
