// Run with: node tests/game.spec.cjs (requires Playwright and Chromium).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
(async () => {
  // Serve only the deployment files, mounted under a Pages project subpath.
  const files = { '': ['index.html', 'text/html'], 'style.css': ['style.css', 'text/css'], 'game.js': ['game.js', 'text/javascript'] };
  const server = http.createServer((req, res) => {
    const file = req.url.startsWith('/space-game/') && files[req.url.slice('/space-game/'.length)];
    if (!file) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': file[1] });
    res.end(fs.readFileSync(path.join(__dirname, '..', file[0])));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/space-game/`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(url);
    await page.getByRole('button', { name: 'Launch ship' }).click();
    assert(await page.locator('#overlay').isHidden());
    await page.keyboard.press('p');
    assert.equal(await page.locator('#overlay-title').textContent(), 'Take a breather.');
    assert(await page.locator('#overlay-hint').isHidden());
    const pausedScore = await page.locator('#score').textContent();
    await page.clock.runFor(3000);
    assert.equal(await page.locator('#score').textContent(), pausedScore);
    await page.getByRole('button', { name: 'Resume flight' }).click();
    await page.keyboard.down('ArrowLeft'); await page.clock.runFor(500); await page.keyboard.up('ArrowLeft');
    await page.clock.runFor(20000);
    assert(Number(await page.locator('#wave').textContent()) >= 2 || await page.locator('#overlay-title').textContent() === 'A good run, pilot.');
    await page.keyboard.press('r');
    assert.equal(await page.locator('#score').textContent(), '00000');
    assert.equal(await page.locator('#wave').textContent(), '01');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('#overlay-title').textContent(), 'Take a breather.');
    await page.getByRole('button', { name: 'Restart run' }).click();
    await page.clock.runFor(90000);
    assert.equal(await page.locator('#overlay-title').textContent(), 'A good run, pilot.');
    const best = Number(await page.locator('#best').textContent());
    assert(best > 0, 'Automatic fire should earn points during an unattended run');
    assert.equal(await page.evaluate(() => Number(localStorage.getItem('void-runner-best'))), best);
    await page.reload();
    assert.equal(Number(await page.locator('#best').textContent()), best);
    await page.screenshot({ path: path.join(os.tmpdir(), 'void-runner-desktop.png') });
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobile.newPage();
    phone.on('pageerror', error => errors.push(error.message));
    await phone.goto(url);
    await phone.getByRole('button', { name: 'Launch ship' }).tap();
    await phone.waitForFunction(() => document.querySelector('#overlay').hidden);
    const field = await phone.locator('canvas').boundingBox();
    const touch = await mobile.newCDPSession(phone);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: field.x + 80, y: field.y + 200 }] });
    await phone.waitForTimeout(100);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: field.x + 140, y: field.y + 250 }] });
    await phone.waitForTimeout(100);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await phone.waitForTimeout(500);
    // Give the native tap a realistic duration; zero-duration injected taps can
    // be suppressed by Chromium's gesture recognizer immediately after a drag.
    const pauseBox = await phone.getByRole('button', { name: 'Pause game' }).boundingBox();
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pauseBox.x + pauseBox.width / 2, y: pauseBox.y + pauseBox.height / 2 }] });
    await phone.waitForTimeout(100);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await phone.waitForFunction(() => document.querySelector('#overlay-title').textContent === 'Take a breather.');
    assert.equal(await phone.locator('#overlay-title').textContent(), 'Take a breather.');
    assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await phone.screenshot({ path: path.join(os.tmpdir(), 'void-runner-mobile.png') });
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } }); });
    const privatePage = await blocked.newPage();
    privatePage.on('pageerror', error => errors.push(error.message));
    await privatePage.goto(url);
    await privatePage.getByRole('button', { name: 'Launch ship' }).click();
    assert(await privatePage.locator('#overlay').isHidden());
    assert.deepEqual(errors, []);
    console.log('PASS: project URL assets, launch, keyboard, pause/resume, waves, restart, game over, persistent best, mobile pointer controls/layout, disabled storage, no browser errors');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
