"""Makes the soundtrack: four seamless loops, synthesised from scratch (no samples, no licences).

    python3 tools/make-music.py            # writes assets/music/*.ogg (game) and web/media/*.ogg|.m4a (site)

Needs numpy, scipy and ffmpeg. Every track is 32 bars and loops without a seam: the reverb tail of the
last bar is folded back onto the first one.
"""
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rng = np.random.default_rng(7)


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, dec):
    return np.exp(-np.arange(n) / SR / dec)


def flt(x, f, kind='low', order=2):
    if kind == 'band':
        b, a = butter(order, [f[0] / (SR / 2), min(f[1], SR / 2 - 100) / (SR / 2)], btype='band')
    else:
        b, a = butter(order, min(f, SR / 2 - 100) / (SR / 2), btype=kind)
    return lfilter(b, a, x, axis=0)


def saw(f, n, det=0.0, voices=1):
    t = np.arange(n) / SR
    x = np.zeros(n)
    ds = np.linspace(-det, det, voices) if voices > 1 else [0]
    for d in ds:
        x += 2 * ((t * f * (1 + d) + rng.random()) % 1) - 1
    return x / len(ds)


def square(f, n, pw=0.5):
    t = np.arange(n) / SR
    return np.where((t * f) % 1 < pw, 1.0, -1.0)


def adsr(n, a=0.005, r=0.05):
    i = np.arange(n)
    return np.minimum(1, i / (SR * a + 1)) * np.minimum(1, (n - i) / (SR * r + 1))


# ---------------- drums ----------------
def kick(punch=1.0, dec=0.22):
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    f = 44 + 150 * punch * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, dec)
    click = flt(rng.standard_normal(n), 3000, 'high') * env(n, 0.004) * 0.35
    return np.tanh((body + click) * 1.7)


def snare(tone=190, dec=0.09):
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    nz = flt(rng.standard_normal(n), (1300, 9000), 'band') * env(n, dec)
    return nz * 0.8 + np.sin(2 * np.pi * tone * t) * env(n, 0.05) * 0.6


def clap():
    n = int(SR * 0.3)
    s = np.zeros(n)
    for k in range(3):
        i = int(k * 0.011 * SR)
        s[i:] += flt(rng.standard_normal(n - i), (900, 6000), 'band') * env(n - i, 0.03 if k < 2 else 0.12)
    return s * 0.7


def hat(open_=False):
    n = int(SR * (0.25 if open_ else 0.05))
    return flt(rng.standard_normal(n), 8000, 'high') * env(n, 0.08 if open_ else 0.018) * 0.4


def shaker():
    n = int(SR * 0.08)
    return flt(rng.standard_normal(n), (5000, 12000), 'band') * np.sin(np.pi * np.arange(n) / n) ** 2 * 0.25


def crash():
    n = int(SR * 2.0)
    return flt(rng.standard_normal(n), 5000, 'high') * env(n, 0.6) * 0.35


def tom(f):
    n = int(SR * 0.4)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t * 20))) / SR) * env(n, 0.16) * 0.8


# ---------------- instruments ----------------
def bass(f, dur, cut=700, drive=2.0):
    n = int(SR * dur)
    x = saw(f, n, 0.004, 3) + 0.7 * np.sin(2 * np.pi * f / 2 * np.arange(n) / SR)
    return np.tanh(flt(x, cut) * drive) * adsr(n, 0.004, 0.03) * 0.5


def subbass(f, dur):
    n = int(SR * dur)
    x = np.sin(2 * np.pi * f * np.arange(n) / SR) + 0.25 * np.sin(4 * np.pi * f * np.arange(n) / SR)
    return x * adsr(n, 0.01, 0.05) * 0.55


def pluck(f, dur=0.25, bright=5000):
    n = int(SR * dur)
    x = 0.6 * saw(f, n, 0.01, 3) + 0.25 * square(f * 2, n)
    cut = 500 + bright * env(n, 0.05)
    y = np.zeros(n)
    for i in range(0, n, 512):
        y[i:i + 512] = flt(x[i:i + 512], cut[i])
    return y * env(n, 0.15) * 0.35


def ks(f, dur=0.9, damp=0.996, bright=0.5):
    """Karplus-Strong string: a clean guitar."""
    n = int(SR * dur)
    p = max(2, int(SR / f))
    y = np.zeros(n + 1)
    y[1:p + 1] = flt(rng.uniform(-1, 1, p), 1500 + 6000 * bright)
    for k in range(p + 1, n + 1, p):
        e = min(k + p, n + 1)
        y[k:e] = damp * 0.5 * (y[k - p:e - p] + y[k - p - 1:e - p - 1])
    return y[1:] * adsr(n, 0.001, 0.08) * 0.6


def pad(freqs, dur, cut=1600, att=0.4, rel=0.6):
    n = int(SR * dur)
    x = sum(saw(f, n, 0.008, 4) for f in freqs) / len(freqs)
    x = flt(x, cut)
    a = np.minimum(1, np.arange(n) / (SR * att)) * np.minimum(1, (n - np.arange(n)) / (SR * rel))
    l = x * a * 0.3
    return np.stack([l, np.roll(l, int(SR * 0.013))], 1)


def stab(freqs, dur=0.35, cut=4200):
    n = int(SR * dur)
    x = sum(saw(f, n, 0.014, 3) for f in freqs) / len(freqs)
    return flt(x, cut) * env(n, 0.11) * adsr(n, 0.002, 0.02) * 0.5


def lead(f, dur, kind='saw', vib=0.006, cut=3200, glide_from=None):
    n = int(SR * dur)
    t = np.arange(n) / SR
    fr = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25))
    if glide_from:
        fr = fr * (1 + (glide_from / f - 1) * np.exp(-t / 0.03))
    ph = np.cumsum(fr) / SR
    if kind == 'saw':
        x = (2 * (ph % 1) - 1) * 0.6 + (2 * ((ph * 1.004) % 1) - 1) * 0.4
    elif kind == 'square':
        x = np.where(ph % 1 < 0.5, 1.0, -1.0) * 0.5 + np.sin(2 * np.pi * ph) * 0.5
    else:  # whistle
        x = np.sin(2 * np.pi * ph) + 0.15 * np.sin(4 * np.pi * ph) + flt(rng.standard_normal(n), 3000) * 0.02
    return flt(x, cut) * adsr(n, 0.015, 0.06) * 0.3


def power(f, dur, mute=False):
    """A distorted power chord (root, fifth, octave): the scrap-metal guitar."""
    n = int(SR * dur)
    x = saw(f, n, 0.003, 2) + saw(f * 1.4983, n, 0.003, 2) + 0.7 * saw(f * 2, n, 0.003, 2)
    x = np.tanh(flt(x, 2400 if not mute else 900) * 5)
    x = flt(x, 4500)
    return x * (env(n, 0.07) if mute else adsr(n, 0.003, 0.05)) * 0.28


# ---------------- arranging ----------------
class Track:
    def __init__(self, bpm, bars):
        self.beat = 60 / bpm
        self.bar = 4 * self.beat
        self.L = int(SR * self.bar * bars)
        self.N = self.L + int(SR * 3)
        self.drums = np.zeros((self.N, 2))
        self.music = np.zeros((self.N, 2))
        self.kicks = []

    def T(self, bar, beat=0.0):
        return bar * self.bar + beat * self.beat

    def add(self, bus, sig, t, gain=1.0, pan=0.0):
        B = self.drums if bus == 'd' else self.music
        i = int(t * SR)
        j = min(self.N, i + len(sig))
        if j <= i:
            return
        s = sig[: j - i] * gain
        if s.ndim == 1:
            B[i:j, 0] += s * (1 - max(0, pan))
            B[i:j, 1] += s * (1 + min(0, pan))
        else:
            B[i:j] += s

    def kick(self, t, g=1.0, **k):
        self.add('d', kick(**k), t, g)
        self.kicks.append(t)

    def mix(self, duck=0.5, room=0.5, drums=0.9, music=0.8):
        N, L = self.N, self.L
        d = np.ones(N)
        dn = int(SR * 0.22)
        shape = 1 - duck * np.exp(-np.arange(dn) / SR / 0.06)
        for t in self.kicks:
            i = int(t * SR) % L
            j = min(N, i + dn)
            d[i:j] = np.minimum(d[i:j], shape[: j - i])
        self.music *= d[:, None]
        ir = rng.standard_normal(int(SR * 1.6)) * np.exp(-np.arange(int(SR * 1.6)) / SR / 0.45) * 0.02
        ir = flt(ir, 5000)
        for ch in range(2):
            self.music[:, ch] += fftconvolve(self.music[:, ch], np.roll(ir, ch * 41))[:N] * room
        mix = self.drums * drums + self.music * music
        # fold the tail back onto the start: a loop without a seam
        mix[: N - L] += mix[L:]
        mix = mix[:L]
        mix = flt(mix, 28, 'high')
        mix = np.tanh(mix * 1.25)
        return mix / (np.max(np.abs(mix)) * 1.05)


def chord_tones(ch):
    return [m2f(m) for m in ch]


# ---- 1. Hangar (menu & garage): laid-back groove, A minor ----
def hangar():
    t = Track(102, 32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]]
    roots = [45, 41, 48, 43]
    motif = [(0, 76, 1), (1, 74, .5), (1.5, 72, .5), (2, 69, 1.5), (4, 72, 1), (5, 74, .5), (5.5, 76, .5), (6, 77, 1.5),
             (8, 79, 1.5), (9.5, 77, .5), (10, 76, 1), (11, 74, 1), (12, 74, 1), (13, 72, .5), (13.5, 71, .5), (14, 67, 2)]
    for b in range(32):
        c = b % 4
        sec = 'intro' if b < 8 else 'groove' if b < 24 else 'break'
        t.add('m', pad([f * 2 for f in chord_tones(chords[c])], t.bar + 0.3, 1300 if sec != 'groove' else 1900), t.T(b), 0.55)
        for k in range(16):
            if sec == 'break' and k % 2:
                continue
            ch = chords[c]
            m = ch[[0, 1, 2, 1][k % 4]] + (12 if (k // 4) % 2 else 24)
            t.add('m', pluck(m2f(m), 0.22, 3500), t.T(b, k * .25), 0.28 if sec != 'intro' else 0.22, 0.4 if k % 2 else -0.4)
        if sec != 'intro' or b >= 4:
            for k in range(8):
                if k % 2 == 1 or sec == 'groove':
                    t.add('m', bass(m2f(roots[c]), t.beat * 0.42, 600), t.T(b, k * .5), 0.7)
        if sec == 'groove' or (sec == 'break' and b >= 28):
            for k in range(4):
                t.kick(t.T(b, k), 0.85, punch=0.8)
                if k in (1, 3):
                    t.add('d', clap(), t.T(b, k), 0.55)
                    t.add('d', snare(220, 0.06), t.T(b, k), 0.3)
            for k in range(8):
                t.add('d', hat(k % 2 == 1), t.T(b, k * .5 + (0.04 if k % 2 else 0)), 0.3 if k % 2 else 0.18, 0.3)
        elif sec != 'groove':
            for k in range(4):
                t.add('d', shaker(), t.T(b, k + .5), 0.6, -0.2)
            if b % 4 == 0:
                t.kick(t.T(b), 0.6, punch=0.6)
        if 16 <= b < 24 and b % 4 == 0:
            for beat, m, d in motif:
                t.add('m', lead(m2f(m), d * t.beat * 0.95, 'square', 0.008, 2600), t.T(b, beat), 0.45, 0.1)
    for b in (8, 24):
        t.add('d', crash(), t.T(b), 0.5, 0.3)
    return t.mix(duck=0.45, room=0.55)


# ---- 2. Scrap Metal (battle): heavy riffs, E minor ----
def scrap_metal():
    t = Track(144, 32)
    roots = [40, 36, 43, 38]  # E C G D
    riff = 'x.xx.xx.x.xx.x.x'
    leadline = [(0, 71, 1.5), (1.5, 74, .5), (2, 76, 2), (4, 74, 1), (5, 72, 1), (6, 71, 2),
                (8, 67, 1), (9, 71, 1), (10, 74, 1.5), (11.5, 76, .5), (12, 79, 2), (14, 78, 1), (15, 76, 1)]
    for b in range(32):
        c = b % 4
        sec = 'A' if b < 8 else 'B' if b < 16 else 'A2' if b < 24 else 'bridge'
        f = m2f(roots[c])
        if sec == 'bridge':
            t.add('m', power(f, t.bar * 0.98), t.T(b), 0.9)
            t.add('m', pad([f * 4, f * 6, f * 8], t.bar + .2, 1500), t.T(b), 0.5)
            t.kick(t.T(b, 0))
            t.kick(t.T(b, 2.5), 0.8)
            t.add('d', snare(), t.T(b, 2), 0.95)
            for k in range(8):
                t.add('d', hat(), t.T(b, k * .5), 0.25, 0.3)
            if b >= 30:
                for k in range(8 if b == 31 else 4):
                    t.add('d', tom(140 - k * 9), t.T(b, 2 + k * .25 if b == 31 else k), 0.6, -0.3 + k * .08)
            continue
        for k, s in enumerate(riff):
            if s == 'x':
                t.add('m', power(f, t.beat * .24, mute=True), t.T(b, k * .25), 0.95, -0.25)
                t.add('m', power(f * 1.002, t.beat * .24, mute=True), t.T(b, k * .25), 0.75, 0.25)
        t.add('m', power(f * 2, t.beat * 0.9), t.T(b, 3), 0.6)
        for k in range(8):
            t.add('m', bass(f, t.beat * 0.45, 500, 3), t.T(b, k * .5), 0.65)
        for k in range(4):
            t.kick(t.T(b, k))
            if k in (1, 3):
                t.add('d', snare(), t.T(b, k), 1.0)
        t.kick(t.T(b, 1.5), 0.6)
        for k in range(8):
            t.add('d', hat(k == 7), t.T(b, k * .5), 0.3, 0.35)
        if b % 8 == 0:
            t.add('d', crash(), t.T(b), 0.7, -0.3)
        if sec == 'B' and b % 4 == 0:
            for beat, m, d in leadline:
                t.add('m', lead(m2f(m), d * t.beat * 0.95, 'saw', 0.01, 3600), t.T(b, beat), 0.5, 0.15)
                t.add('m', lead(m2f(m - 12), d * t.beat * 0.95, 'saw', 0.01, 2000), t.T(b, beat), 0.3, -0.15)
    return t.mix(duck=0.25, room=0.3, drums=0.85, music=0.85)


# ---- 3. Neon Brawl (battle, neon/space arenas): electro, D minor ----
def neon_brawl():
    t = Track(128, 32)
    chords = [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]]  # Dm Bb F C
    roots = [38, 34, 41, 36]
    stabs = [0.75, 1.5, 2.25, 3.0, 3.5]
    hook = [(0, 74, .5), (.5, 77, .5), (1, 81, 1), (2.5, 79, .5), (3, 77, 1), (4, 74, .5), (4.5, 77, .5), (5, 82, 1),
            (6.5, 81, .5), (7, 79, 1), (8, 77, .5), (8.5, 81, .5), (9, 84, 1.5), (10.5, 82, .5), (11, 81, 1), (12, 79, 1),
            (13, 77, 1), (14, 76, 2)]
    for b in range(32):
        c = b % 4
        sec = 'intro' if b < 4 else 'main' if b < 20 else 'break' if b < 24 else 'main2'
        ch = chord_tones(chords[c])
        t.add('m', pad([f * 2 for f in ch], t.bar + .2, 1100 if sec in ('intro', 'break') else 2200), t.T(b), 0.5)
        for k in range(16):
            m = chords[c][k % 3] + 12 * (1 + (k // 3) % 2)
            t.add('m', pluck(m2f(m), 0.16, 6000), t.T(b, k * .25), 0.2 if sec != 'break' else 0.28, 0.5 if k % 2 else -0.5)
        if sec in ('main', 'main2'):
            for k in range(4):
                t.kick(t.T(b, k))
                if k in (1, 3):
                    t.add('d', clap(), t.T(b, k), 0.8)
            for k in range(16):
                t.add('d', hat(k % 4 == 2), t.T(b, k * .25), 0.28 if k % 4 == 2 else 0.12, 0.3)
            for k in range(4):
                t.add('m', bass(m2f(roots[c] + 12), t.beat * 0.4, 1400, 2.5), t.T(b, k + .5), 0.7)
                t.add('m', subbass(m2f(roots[c]), t.beat * 0.45), t.T(b, k + .5), 0.6)
            for s in stabs:
                t.add('m', stab([f * 2 for f in ch], 0.25, 5000), t.T(b, s), 0.45)
            if (sec == 'main2' or b >= 12) and b % 4 == 0:
                for beat, m, d in hook:
                    t.add('m', lead(m2f(m), d * t.beat * 0.9, 'square', 0.004, 4200), t.T(b, beat), 0.4)
        elif sec == 'break' and b == 23:
            for k in range(16):
                t.add('d', snare(), t.T(b, k * .25), 0.1 + 0.6 * k / 16)
        elif sec == 'intro':
            t.kick(t.T(b), 0.7)
            t.kick(t.T(b, 2), 0.7)
    for b in (4, 24):
        t.add('d', crash(), t.T(b), 0.6)
    return t.mix(duck=0.6, room=0.4)


# ---- 4. Open Road (open world): sunny road trip, D mixolydian ----
def open_road():
    t = Track(116, 32)
    chords = [[50, 54, 57, 62], [48, 52, 55, 60], [43, 47, 50, 55], [50, 54, 57, 62]]  # D C G D
    roots = [38, 36, 43, 38]
    tune = [(0, 78, 1), (1, 76, .5), (1.5, 74, .5), (2, 76, 1.5), (4, 72, 1), (5, 74, .5), (5.5, 76, .5), (6, 79, 2),
            (8, 74, 1), (9, 71, .5), (9.5, 74, .5), (10, 79, 1), (11, 78, 1), (12, 76, 1), (13, 74, 1), (14, 74, 2)]
    for b in range(32):
        c = b % 4
        sec = 'intro' if b < 4 else 'verse' if b < 12 else 'chorus' if b < 20 else 'verse2' if b < 28 else 'out'
        ch = chords[c]
        pat = [0, 2, 3, 2, 1, 2, 3, 2]
        for k in range(8):
            m = ch[pat[k]] + 12
            t.add('m', ks(m2f(m), 0.9, 0.995, 0.4), t.T(b, k * .5), 0.5, -0.45 if k % 2 else -0.15)
        t.add('m', pad([m2f(x + 12) for x in ch[:3]], t.bar + .3, 1200), t.T(b), 0.35)
        if sec == 'intro':
            for k in range(4):
                t.add('d', shaker(), t.T(b, k + .5), 0.7, 0.3)
            continue
        for k in range(8):
            if k in (0, 3, 4, 6):
                t.add('m', bass(m2f(roots[c]), t.beat * 0.45, 900, 1.6), t.T(b, k * .5), 0.75)
        for k in range(4):
            if k in (0, 2) or (sec == 'chorus' and k == 3):
                t.kick(t.T(b, k), 0.9, punch=0.9)
            if k in (1, 3):
                t.add('d', snare(200, 0.1), t.T(b, k), 0.8)
        t.kick(t.T(b, 2.5), 0.5, punch=0.9)
        for k in range(16):
            t.add('d', shaker(), t.T(b, k * .25), 0.6 if k % 2 else 0.35, 0.3)
        if sec == 'chorus':
            for k in range(8):
                m = ch[(k + 1) % 4] + 24
                t.add('m', ks(m2f(m), 0.5, 0.993, 0.8), t.T(b, k * .5 + .25), 0.3, 0.45)
            if b % 4 == 0:
                for beat, m, d in tune:
                    t.add('m', lead(m2f(m), d * t.beat * 0.92, 'whistle', 0.012, 5000), t.T(b, beat), 0.55, 0.1)
        if sec == 'out' and b % 4 == 0:
            for beat, m, d in tune[:8]:
                t.add('m', lead(m2f(m - 12), d * t.beat * 0.92, 'whistle', 0.012, 4000), t.T(b, beat), 0.4)
    for b in (12, 20):
        t.add('d', crash(), t.T(b), 0.5)
    return t.mix(duck=0.3, room=0.5)


TRACKS = {'hangar': hangar, 'scrapmetal': scrap_metal, 'neonbrawl': neon_brawl, 'openroad': open_road}


def encode(wav, out, args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, *args, out], check=True)


if __name__ == '__main__':
    only = sys.argv[1:] or list(TRACKS)
    game = os.path.join(ROOT, 'assets', 'music')
    web = os.path.join(ROOT, 'web', 'media')
    os.makedirs(game, exist_ok=True)
    for name in only:
        mix = TRACKS[name]()
        wav = f'/tmp/sd-{name}.wav'
        wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
        encode(wav, os.path.join(game, name + '.ogg'), ['-c:a', 'libopus', '-b:a', '112k'])
        print(name, f'{len(mix) / SR:.1f}s')
    # the download page plays the hangar theme
    if 'hangar' in only:
        wav = '/tmp/sd-hangar.wav'
        encode(wav, os.path.join(web, 'music.ogg'), ['-c:a', 'libopus', '-b:a', '96k'])
        encode(wav, os.path.join(web, 'music.m4a'), ['-c:a', 'aac', '-b:a', '128k'])
