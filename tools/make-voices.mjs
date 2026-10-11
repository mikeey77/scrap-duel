// Records every commentator and announcer line as a voice clip with the Kokoro neural voice (offline).
// Reads src/js/data/commentary.js, writes assets/voice/<id>.ogg and assets/voice/index.json.
// Only new or changed lines are recorded; clips for lines that no longer exist are removed.
//
// Needs (not project dependencies, they are big):
//   - sherpa-onnx-node:  npm i sherpa-onnx-node   (in any folder; pass it as SHERPA_DIR)
//   - the Kokoro model folder kokoro-int8-en-v0_19 (model.int8.onnx, voices.bin, tokens.txt, espeak-ng-data)
//   - ffmpeg on the PATH
// Run:  KOKORO_DIR=/path/kokoro-int8-en-v0_19 SHERPA_DIR=/path/with/node_modules node tools/make-voices.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(root, 'assets', 'voice');
const MODEL = process.env.KOKORO_DIR;
if (!MODEL || !process.env.SHERPA_DIR) {
  console.error('Set KOKORO_DIR and SHERPA_DIR (see the top of this file).');
  process.exit(1);
}
const sherpa = createRequire(path.join(process.env.SHERPA_DIR, 'x.js'))('sherpa-onnx-node');

// Voices (Kokoro v0.19 speaker ids): Dash is an excited American, Doc a dry Brit, the announcer a deep Brit in a stadium.
const VOICES = {
  dash: { sid: 6, speed: 1.14, fx: 'booth' }, // am_michael
  doc: { sid: 9, speed: 1.0, fx: 'booth' }, // bm_george
  ann: { sid: 10, speed: 0.86, fx: 'stadium' } // bm_lewis
};
const FX = {
  // a commentary booth: no rumble, a bit of presence, compressed like broadcast audio
  booth:
    'highpass=f=95,equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=-21dB:ratio=3.5:attack=4:release=90:makeup=2,loudnorm=I=-15:TP=-1.5:LRA=6',
  // lower and bigger, with the echo of a stadium PA
  stadium:
    'asetrate=24000*0.84,aresample=24000,atempo=1.1,highpass=f=70,equalizer=f=140:t=q:w=1:g=3,aecho=0.8:0.55:70|140:0.32|0.18,loudnorm=I=-14:TP=-1.5:LRA=7'
};

const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(root, 'src/js/data/commentary.js'), 'utf8') +
    ';this.CALLS=CALLS;this.ANNOUNCE=ANNOUNCE;this.voiceId=voiceId;this.NAMED_CALLS=NAMED_CALLS;this.COMM_NAMES=COMM_NAMES;',
  ctx
);
const lines = new Map();
for (const calls of Object.values(ctx.CALLS))
  for (const call of calls) for (const [who, text] of call) lines.set(ctx.voiceId(who, text), { who, text });
for (const text of ctx.ANNOUNCE) lines.set(ctx.voiceId('ann', text), { who: 'ann', text });
for (const [who, tpl] of Object.values(ctx.NAMED_CALLS))
  for (const n of ctx.COMM_NAMES) {
    const text = tpl.replace('{n}', n);
    lines.set(ctx.voiceId(who, text), { who, text });
  }

// What the voice reads: shouted words in normal case (all caps can get spelled out), sound effects spelled to be said
const spoken = t =>
  t
    .replace(/\b[A-Z][A-Z'-]{1,}\b/g, w => (w === 'I' ? w : w[0] + w.slice(1).toLowerCase()))
    .replace(/Ka-chunk/g, 'Kah-chunk')
    .replace(/\.\.\./g, ',');

fs.mkdirSync(OUT, { recursive: true });
const indexFile = path.join(OUT, 'index.json');
const old = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {};
const index = {};
const todo = [...lines].filter(([id]) => !(old[id] && fs.existsSync(path.join(OUT, id + '.ogg'))));
console.log(`${lines.size} lines, ${todo.length} to record`);

const tts = todo.length
  ? new sherpa.OfflineTts({
      model: {
        kokoro: {
          model: path.join(MODEL, 'model.int8.onnx'),
          voices: path.join(MODEL, 'voices.bin'),
          tokens: path.join(MODEL, 'tokens.txt'),
          dataDir: path.join(MODEL, 'espeak-ng-data')
        },
        numThreads: Math.max(2, os.cpus().length - 1),
        provider: 'cpu'
      },
      maxNumSentences: 1
    })
  : null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-voice-'));
let n = 0;
for (const [id, { who, text }] of todo) {
  const v = VOICES[who],
    audio = tts.generate({ text: spoken(text), sid: v.sid, speed: v.speed }),
    wav = path.join(tmp, id + '.wav');
  sherpa.writeWave(wav, { samples: audio.samples, sampleRate: audio.sampleRate });
  const trim =
    'silenceremove=start_periods=1:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_threshold=-48dB,areverse,';
  execFileSync('ffmpeg', [
    ...['-hide_banner', '-loglevel', 'error', '-y', '-i', wav],
    ...['-af', trim + FX[v.fx] + ',apad=pad_dur=0.12', '-ac', '1', '-ar', '48000'],
    ...['-c:a', 'libopus', '-b:a', '40k', path.join(OUT, id + '.ogg')]
  ]);
  console.log(`${++n}/${todo.length} ${who}: ${text}`);
}
fs.rmSync(tmp, { recursive: true, force: true });

// durations for every clip (the captions stay up exactly as long as the line is spoken)
for (const [id] of lines) {
  if (old[id] && !todo.some(([t]) => t === id)) {
    index[id] = old[id];
    continue;
  }
  const out = execFileSync('ffprobe', [
    ...['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(OUT, id + '.ogg')]
  ]);
  index[id] = Math.round(parseFloat(out) * 100) / 100;
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.ogg') && !index[f.slice(0, -4)]) fs.rmSync(path.join(OUT, f));
fs.writeFileSync(indexFile, JSON.stringify(index, Object.keys(index).sort(), 0) + '\n');
const kb = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024;
console.log(`done: ${Object.keys(index).length} clips, ${kb.toFixed(0)} KB`);
