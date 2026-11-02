/**
 * Teacher panel: step picker from home and from path, Save updates progress.
 * Run from /tmp after: npm install playwright@1.49.0
 *   node /workspace/tools/test/teacher-panel.mjs
 */
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8765/index.html';

async function unlockTeacher(page) {
  await page.click('#teacher-header');
  await page.waitForSelector('#tch-pin');
  await page.fill('#tch-pin', '1234');
  await page.click('#tch-ok');
  await page.waitForSelector('.tlist li', { timeout: 8000 });
}

async function saveMidStep(page) {
  const count = await page.locator('.tlist li').count();
  const mid = Math.min(4, count - 1);
  await page.click(`.tlist li[data-i="${mid}"]`);
  await page.waitForSelector('.tlist li.sel');
  await page.click('#tch-save');
  await page.waitForFunction(() => {
    const t = document.querySelector('#tch-terr');
    return t && /Saved/.test(t.textContent);
  });
  return mid;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];

try {
  await page.goto(base);
  await page.waitForFunction(() => window.__studyCourses && window.StudyProgress);
  await page.evaluate(() => {
    MRJSignin.signInStub('jaytest');
  });
  await page.reload();
  await page.waitForFunction(() => window.__studyCourses && window.__studyRedrawPath);

  // From home hash
  await page.goto(`${base}#home`);
  await page.waitForSelector('#teacher-header:not([hidden])');
  await unlockTeacher(page);
  const listFromHome = await page.locator('.tlist li').count();
  if (listFromHome < 2) errors.push('home: expected step list, got ' + listFromHome);
  await page.click('#tch-lock');

  // From path
  const level = await page.evaluate(() => __studyCourses.levels[0].name);
  await page.goto(`${base}#path/${encodeURIComponent(level)}`);
  await page.waitForSelector('.node');
  const before = await page.evaluate(() => document.querySelectorAll('.node.done').length);
  await unlockTeacher(page);
  const hasPickerLabel = await page.locator('.tch-pick-hdr strong').isVisible();
  if (!hasPickerLabel) errors.push('path: missing pick header');
  await saveMidStep(page);
  await page.waitForFunction(
    (b) => document.querySelectorAll('.node.done').length > b,
    before,
    { timeout: 5000 }
  );
  const after = await page.evaluate(() => document.querySelectorAll('.node.done').length);
  if (after <= before) errors.push('path: done nodes did not increase');
} catch (e) {
  errors.push(String(e.message || e));
} finally {
  await browser.close();
}

if (errors.length) {
  console.error('FAIL', errors);
  process.exit(1);
}
console.log('OK teacher-panel tests passed');
process.exit(0);
