'use strict';
(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 600, H = 720, keys = new Set();
  const storageKey = 'void-runner-best';
  let best = 0;
  try { const saved = Number(localStorage.getItem(storageKey)); if (Number.isFinite(saved) && saved > 0) best = Math.floor(saved); } catch { /* Storage can be disabled. */ }
  let state = 'ready', score = 0, wave = 1, lives = 3, elapsed = 0;
  let bullets = [], enemies = [], particles = [], fireClock = 0, spawnClock = 0, invincible = 0;
  let player = { x: W / 2, y: H - 85 }, pointer = null, last = 0;
  const stars = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() }));
  function hud() {
    $('score').textContent = String(score).padStart(5, '0');
    $('best').textContent = String(best).padStart(5, '0');
    $('wave').textContent = String(wave).padStart(2, '0');
    $('shields').textContent = '◆'.repeat(lives) + '◇'.repeat(3 - lives);
    $('shields').setAttribute('aria-label', `${lives} shields`);
  }
  function clearInput() { keys.clear(); pointer = null; }
  function showOverlay(label, title, copy, button) {
    $('overlay-label').textContent = label; $('overlay-title').textContent = title;
    $('overlay-copy').textContent = copy; $('start').textContent = button;
    $('overlay').hidden = false; $('overlay-hint').hidden = state !== 'ready';
    $('restart').hidden = state !== 'paused'; $('final-score').hidden = state !== 'over';
    $('pause').disabled = state === 'ready' || state === 'over';
  }
  function start() {
    score = 0; wave = 1; lives = 3; elapsed = 0; bullets = []; enemies = []; particles = [];
    player = { x: W / 2, y: H - 85 }; fireClock = 0; spawnClock = .5; invincible = 1.5;
    clearInput(); state = 'playing'; $('overlay').hidden = true; $('pause').disabled = false;
    $('pause').textContent = 'II'; $('pause').setAttribute('aria-label', 'Pause game');
    $('status').textContent = 'Flight in progress'; hud();
  }
  function pause() {
    if (state !== 'playing' && state !== 'paused') return;
    clearInput();
    if (state === 'playing') {
      state = 'paused'; showOverlay('FLIGHT ON HOLD', 'Take a breather.', 'Your ship is safe. The void can wait.', 'Resume flight');
      $('pause').textContent = '>'; $('pause').setAttribute('aria-label', 'Resume game'); $('status').textContent = 'Paused';
      $('start').focus({ preventScroll: true });
    } else {
      state = 'playing'; $('overlay').hidden = true; $('pause').textContent = 'II'; $('pause').setAttribute('aria-label', 'Pause game'); $('status').textContent = 'Flight in progress';
    }
  }
  function gameOver() {
    state = 'over'; clearInput();
    if (score > best) { best = score; try { localStorage.setItem(storageKey, String(best)); } catch { /* Play still works without storage. */ } }
    hud(); showOverlay('SIGNAL LOST', 'A good run, pilot.', 'The stars are still out there. Ready for another shot?', 'Fly again ↗');
    $('final-score').textContent = `SCORE ${score}  /  BEST ${best}`; $('status').textContent = `Game over. Score ${score}. Best ${best}.`;
    $('start').focus({ preventScroll: true });
  }
  function burst(x, y, color) { for (let i = 0; i < 14; i++) particles.push({ x, y, vx: (Math.random() - .5) * 220, vy: (Math.random() - .5) * 220, life: .55, color }); }
  function hit() { if (invincible > 0) return; lives--; invincible = 1.5; burst(player.x, player.y, '#8affdf'); hud(); if (!lives) gameOver(); }
  function update(dt) {
    elapsed += dt; wave = 1 + Math.floor(elapsed / 18); invincible = Math.max(0, invincible - dt);
    let dx = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
    let dy = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
    const length = Math.hypot(dx, dy) || 1;
    player.x = Math.max(20, Math.min(W - 20, player.x + dx / length * 330 * dt));
    player.y = Math.max(25, Math.min(H - 26, player.y + dy / length * 330 * dt));
    fireClock -= dt; spawnClock -= dt;
    if (fireClock <= 0) { bullets.push({ x: player.x - 8, y: player.y - 22 }, { x: player.x + 8, y: player.y - 22 }); fireClock = .17; }
    if (spawnClock <= 0) {
      enemies.push({ x: 24 + Math.random() * (W - 48), y: -30, r: 16 + Math.random() * 8, speed: 85 + Math.min(wave, 30) * 16 + Math.random() * 45, phase: Math.random() * 7 });
      spawnClock = Math.max(.16, .9 - (wave - 1) * .065);
    }
    for (const b of bullets) b.y -= 620 * dt;
    for (const e of enemies) {
      e.y += e.speed * dt; e.x = Math.max(e.r, Math.min(W - e.r, e.x + Math.sin(elapsed * 2 + e.phase) * 30 * dt));
      for (const b of bullets) {
        if (!e.dead && !b.dead && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) { e.dead = true; b.dead = true; score += 10; burst(e.x, e.y, '#ffb68a'); }
      }
      if (!e.dead && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 14) { e.dead = true; hit(); }
      if (!e.dead && e.y > H + e.r) { e.dead = true; hit(); }
      if (state !== 'playing') break;
    }
    bullets = bullets.filter(b => b.y > -20 && !b.dead); enemies = enemies.filter(e => !e.dead);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0); hud();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(300, 240, 0, 300, 240, 450); glow.addColorStop(0, '#132344'); glow.addColorStop(1, '#080e20'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    for (const s of stars) { ctx.globalAlpha = .3 + s.z * .4; ctx.fillStyle = '#b6d4ff'; ctx.fillRect(s.x, s.y, s.z * 1.5, s.z * 1.5); } ctx.globalAlpha = 1;
    ctx.strokeStyle = '#23375444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(300, 330, 215, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#95ffec'; ctx.shadowColor = '#56ffdb'; ctx.shadowBlur = 12;
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 9, 4, 18); ctx.shadowBlur = 0;
    for (const e of enemies) {
      ctx.save(); ctx.translate(e.x, e.y); ctx.strokeStyle = '#ff947c'; ctx.fillStyle = '#3e243c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, e.r); ctx.lineTo(-e.r, -e.r * .6); ctx.lineTo(-6, -e.r * .3); ctx.lineTo(0, -e.r); ctx.lineTo(6, -e.r * .3); ctx.lineTo(e.r, -e.r * .6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffcb9c'; ctx.fillRect(-3, -4, 6, 8); ctx.restore();
    }
    if (state !== 'over') {
      ctx.save(); ctx.translate(player.x, player.y); ctx.globalAlpha = invincible > 0 && Math.floor(invincible * 12) % 2 ? .35 : 1;
      ctx.fillStyle = '#70f5df'; ctx.shadowColor = '#64f9e5'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(-7, 19); ctx.lineTo(0, 32 + Math.random() * 9); ctx.lineTo(7, 19); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#c5e9f7'; ctx.strokeStyle = '#66e5e0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(20, 20); ctx.lineTo(0, 12); ctx.lineTo(-20, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c5272'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 7); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    for (const p of particles) { ctx.globalAlpha = p.life / .55; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); } ctx.globalAlpha = 1;
  }
  function frame(time) {
    const dt = Math.min((time - last) / 1000 || 0, .04); last = time;
    if (state === 'playing') { for (const s of stars) s.y = (s.y + (20 + s.z * 50) * dt) % H; update(dt); }
    draw(); requestAnimationFrame(frame);
  }
  $('start').addEventListener('click', () => state === 'paused' ? pause() : start());
  $('restart').addEventListener('click', start); $('pause').addEventListener('click', pause);
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
    if (e.repeat) return;
    if (key === 'p' || key === 'escape') pause();
    else if (key === 'r') start();
    else if (key === 'enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') { if (state === 'paused') pause(); else if (state !== 'playing') start(); }
    keys.add(key);
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { clearInput(); if (state === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
  function movePointer(e) {
    const rect = canvas.getBoundingClientRect();
    player.x = Math.max(20, Math.min(W - 20, (e.clientX - rect.left) * W / rect.width));
    player.y = Math.max(25, Math.min(H - 26, (e.clientY - rect.top) * H / rect.height - 45));
  }
  canvas.addEventListener('pointerdown', e => { if (state !== 'playing' || pointer !== null) return; pointer = e.pointerId; canvas.setPointerCapture(pointer); movePointer(e); });
  canvas.addEventListener('pointermove', e => { if (state === 'playing' && pointer === e.pointerId) movePointer(e); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => { if (pointer === e.pointerId) pointer = null; });
  hud(); requestAnimationFrame(frame);
})();
