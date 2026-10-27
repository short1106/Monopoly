// Nimmt Aprils Sprüche (js/april-lines.js) einmal mit ElevenLabs auf und legt sie als MP3 in assets/voice/ ab.
// Nur neue oder geänderte Sprüche werden aufgenommen. Danach spielt die Seite sie ohne Token-Verbrauch ab.
// Aufruf: ELEVENLABS_API_KEY=… node tools/april-voice.mjs   (läuft normalerweise als GitHub Action)
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';

const require = createRequire(import.meta.url);
const LINES = require('../js/april-lines.js');
const DIR = new URL('../assets/voice/', import.meta.url);
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.APRIL_VOICE_ID || 'OO0WT3lY2gVNwzZMAjAI';
const hash = (t) => createHash('sha1').update(`${VOICE}|${t}`).digest('hex').slice(0, 12);

const manPath = new URL('manifest.json', DIR);
let manifest = {};
try { manifest = JSON.parse(readFileSync(manPath, 'utf8')); } catch (e) { /* neu */ }
const save = () => writeFileSync(manPath, JSON.stringify(manifest, null, 1) + '\n');

// Entfernte Sprüche aufräumen
const ids = new Set(LINES.map((l) => l.id));
for (const f of readdirSync(DIR)) {
  const id = f.replace(/\.mp3$/, '');
  if (f.endsWith('.mp3') && !ids.has(id)) { unlinkSync(new URL(f, DIR)); delete manifest[id]; console.log('entfernt', id); }
}
for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id];

const todo = LINES.filter((l) => manifest[l.id] !== hash(l.text) || !existsSync(new URL(`${l.id}.mp3`, DIR)));
if (!todo.length) { save(); console.log('Alles schon aufgenommen.'); process.exit(0); }
if (!KEY) {
  save();
  console.log(`${todo.length} Sprüche warten auf die Aufnahme, aber ELEVENLABS_API_KEY fehlt.`);
  console.log('GitHub → Settings → Secrets and variables → Actions → New repository secret: ELEVENLABS_API_KEY');
  process.exit(0);
}
const chars = todo.reduce((s, l) => s + l.text.length, 0);
console.log(`Nehme ${todo.length} Sprüche auf (${chars} Zeichen) …`);
for (const l of todo) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: l.text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.45 } }),
  });
  if (!r.ok) {
    save();
    console.error(`Fehler bei ${l.id}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    console.error('Bisher Aufgenommenes bleibt gespeichert. Schlüssel, Guthaben und Stimmen-ID prüfen, dann den Job neu starten.');
    process.exit(1);
  }
  writeFileSync(new URL(`${l.id}.mp3`, DIR), Buffer.from(await r.arrayBuffer()));
  manifest[l.id] = hash(l.text);
  console.log('aufgenommen', l.id, '–', l.text);
}
save();
console.log('Fertig.');
