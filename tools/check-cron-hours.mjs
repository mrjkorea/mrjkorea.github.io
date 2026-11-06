// Fail when a scheduled workflow can fire while students are on the site.
// Jay: students use the site 15:00-20:00 KST on weekdays. The news job used to
// commit news.json at 15:15, 17:15 and 19:15 KST (2026-11-06).
// Usage: node tools/check-cron-hours.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.github/workflows';
const START = 15 * 60; // 15:00 KST
const END = 20 * 60;   // 20:00 KST

// Cron is UTC. KST = UTC+9.
function kstMinutes(minute, hour) {
  return ((hour * 60 + minute) + 9 * 60) % 1440;
}


// Expand one cron field ("*", "*/2", "0,2,4", "9-17", "9-17/2") into numbers.
function expand(field, lo, hi) {
  const out = new Set();
  for (const part of String(field).split(',')) {
    const m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (!m) return [];
    const step = m[2] ? Number(m[2]) : 1;
    let start = lo;
    let end = hi;
    if (m[1] !== '*') {
      const r = m[1].split('-').map(Number);
      start = r[0];
      end = r.length > 1 ? r[1] : (m[2] ? hi : r[0]);
    }
    if (step < 1) return [];
    for (let v = start; v <= end && v <= hi; v += step) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

let bad = 0;
let files = [];
try { files = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)); } catch (e) { console.log('no workflows'); process.exit(0); }

for (const file of files) {
  const text = readFileSync(join(DIR, file), 'utf8');
  const crons = [...text.matchAll(/cron:\s*["']?([^"'\n]+)["']?/g)].map((m) => m[1].trim());
  for (const cron of crons) {
    const parts = cron.split(/\s+/);
    if (parts.length < 5) continue;
    const [min, hour] = parts;
    const mins = expand(min, 0, 59);
    const hours = expand(hour, 0, 23);
    if (!mins.length || !hours.length) {
      console.log(`${file}: "${cron}" could not be expanded; check by hand`);
      continue;
    }
    for (const h of hours) {
      for (const m of mins) {
        const t = kstMinutes(m, h);
        if (t >= START && t < END) {
          const hh = String(Math.floor(t / 60)).padStart(2, '0');
          const mm = String(t % 60).padStart(2, '0');
          console.error(`FAIL: ${file} cron "${cron}" fires at ${hh}:${mm} KST (class hours)`);
          bad++;
        }
      }
    }
  }
}
if (bad) { console.error(`${bad} scheduled run(s) inside 15:00-20:00 KST`); process.exit(1); }
console.log('cron hours OK: no scheduled run between 15:00 and 20:00 KST');
