// ═══════════════════════════════════════════════════════════════
//  LEVEL1.JS — David vs Goliath (Level 1)
//  Functions: resetMG, updateMGUI, showMGOverlay, updateMG,
//             drawMG, mgGameLoop
//  Depends on: minigame.js (all mg* globals, stone economy,
//              pauseGameForOverlay, resumeGameFromOverlay,
//              showLifeRedemptionQuestion, showStoneShop)
//              core.js (SoundFX, fsSavePersonalBest)
//              user.js (markLevel1Beaten, mgCurrentLevel)
//              quiz.js (getUsername, G, loadLB, shareMiniGameResult)
// ═══════════════════════════════════════════════════════════════

function resetMG() {
  mgDavid   = { x: 100, y: mgHeight / 2, w: 40, h: 60, speed: 6 };
  mgGoliath = { x: Math.min(mgWidth - 120, 600), y: mgHeight - 180, w: 70, h: 110, speed: 0.8, walkDir: 1, rage: false, state: 'GUARDING', stateTimer: 5000 };
  mgStone   = { active: false, x: 0, y: 0, vx: 0, vy: 0, charge: 0, trail: [] };
  mgJavelins  = [];
  mgPowerups  = [];
  mgHits = 0; mgLives = 3; mgScore = 0; mgCombo = 0; mgMaxCombo = 0;
  mgPhase        = 'play';
  mgAngle        = 0;
  mgChargeActive = false;
  mgShake        = 0;
  mgFrame        = 0;
  mgBatchSize = 0; mgBatchCooldown = 0;
  mgMoveLeft = false; mgMoveRight = false; mgMoveUp = false; mgMoveDown = false;
  mgJoyVX = 0; mgJoyVY = 0; mgJoyActive = false;
  initStones(1);
  updateMGUI();
}

function updateMGUI() {
  document.getElementById('mgLives').innerHTML = '❤️'.repeat(mgLives) + '🖤'.repeat(3 - mgLives);
  document.getElementById('mgScore').innerText  = mgScore;
  document.getElementById('mgStateBadge').innerText = mgGoliath.state;
  updateStoneUI();
}

// ═══════════════════════════════════════════════════════════════
//  showMGOverlay — start / victory / gameover screens
// ═══════════════════════════════════════════════════════════════
function showMGOverlay(type) {
  let ov = document.querySelector('.mg-full-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'mg-full-overlay';

  if (type === 'start') {
    ov.innerHTML = `<h2>⚔️ David vs Goliath</h2>
      <p>🕹️ <b>Left stick</b> — move David anywhere<br>📏 <b>Right bar</b> — slide up/down to aim, release to throw<br>Hold longer = more power!<br>Hit Goliath's forehead <b>3 times!</b></p>
      <button id="mgStartBtn">⚔️ BEGIN BATTLE</button>
      <button id="mgExitBtn" style="background:#444;color:#fff;">✕ Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mgStartBtn').onclick = () => {
      ov.remove();
      resetMG();
      mgPhase = 'play';
      updateMGUI();
      SoundFX.startMusic('battle');
      if (mgAnimationId) cancelAnimationFrame(mgAnimationId);
      mgLastTimestamp = 0;
      mgAnimationId   = requestAnimationFrame(mgGameLoop);
    };
    document.getElementById('mgExitBtn').onclick = () => { ov.remove(); exitMiniGame(); };

  } else if (type === 'victory') {
    markLevel1Beaten();
    ov.innerHTML = `<h2>🏆 VICTORY!</h2><p>Score: ${mgScore}<br>Max Combo: ${mgMaxCombo}x<br><span style="color:#44ff88;font-size:12px;">⚔️ Level 2 is now available!</span></p><button id="mgSaveBtn">💾 Save Score</button><button id="mgRestartBtn">Play Again</button><button id="mgLevel2Btn" style="background:linear-gradient(135deg,#8b1a1a,#c0392b,#8b1a1a);color:#fff;border:1px solid #ff6644;">⚔️ Try Level 2</button><button id="mgShareBtn" style="background:linear-gradient(135deg,#1a3a5a,#2a5a8a);border:1px solid #4488bb;color:#88ccff;">📤 Share</button><button id="mgMenuBtn">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mgSaveBtn').onclick = async () => {
      const btn = document.getElementById('mgSaveBtn');
      btn.textContent = '💾 Saving...'; btn.disabled = true;
      const result = await fsSavePersonalBest(
        getUsername(), mgScore, 'minigame',
        mgScore >= 1000 ? 'Champion' : 'Warrior',
        mgHits, 3, mgMaxCombo, mgMaxCombo,
        { levelReached: 'minigame-l1' }
      );
      localStorage.setItem('bc_username', getUsername());
      G.lastSavedScore = { name: getUsername(), score: mgScore };
      if (result.status === 'new_best') {
        btn.textContent = '🏆 New Personal Best! Redirecting...';
        const p = ov.querySelector('p'); if (p) p.innerHTML += `<br>🎉 You beat your previous best of ${result.prev}!`;
      } else if (result.status === 'first') {
        btn.textContent = '✅ Score Saved! Redirecting...';
      } else if (result.status === 'not_best') {
        btn.textContent = `📊 Best is still ${result.best} 💪`;
        const p = ov.querySelector('p'); if (p) p.innerHTML += `<br>Your personal best is ${result.best}. Keep going!`;
      } else {
        btn.textContent = '❌ Save Failed — tap to retry'; btn.disabled = false; return;
      }
      setTimeout(() => { ov.remove(); exitMiniGame(); showScreen('s-leaderboard'); loadLB('minigame'); }, 2000);
    };
    document.getElementById('mgRestartBtn').onclick = () => {
      ov.remove();
      if (mgAnimationId) { cancelAnimationFrame(mgAnimationId); mgAnimationId = null; }
      resetMG(); showMGOverlay('start');
    };
    document.getElementById('mgLevel2Btn').onclick = () => { ov.remove(); startLevel2(); };
    document.getElementById('mgMenuBtn').onclick   = () => { ov.remove(); exitMiniGame(); };
    document.getElementById('mgShareBtn')?.addEventListener('click', () => shareMiniGameResult(1, mgScore, mgMaxCombo, mgHits));

  } else if (type === 'gameover') {
    ov.innerHTML = `<h2 style="color:#e8c96a;">🪨 Rise Again, David!</h2><p style="font-style:italic;color:#d4c4a0;">"The righteous may fall seven times, but they rise again."<br><span style="font-size:11px;color:#b8a880;">— Proverbs 24:16</span></p><p>Score: ${mgScore}</p><button id="mgRestartBtn">⚔️ Rise Again</button><button id="mgMenuBtn">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mgRestartBtn').onclick = () => {
      ov.remove();
      if (mgAnimationId) { cancelAnimationFrame(mgAnimationId); mgAnimationId = null; }
      resetMG(); showMGOverlay('start');
    };
    document.getElementById('mgMenuBtn').onclick = () => { ov.remove(); exitMiniGame(); };
  }
}

// ═══════════════════════════════════════════════════════════════
//  updateMG — physics & AI for Level 1
// ═══════════════════════════════════════════════════════════════
function updateMG(delta) {
  if (mgPhase !== 'play') return;

  // Movement: joystick takes priority over D-pad booleans
  let moveX = mgJoyVX !== 0 ? mgJoyVX : (mgMoveRight ? 1 : mgMoveLeft ? -1 : 0);
  let moveY = mgJoyVY !== 0 ? mgJoyVY : (mgMoveDown ? 1 : mgMoveUp ? -1 : 0);
  // Normalize diagonal keyboard movement
  if (moveX !== 0 && moveY !== 0 && mgJoyVX === 0) { moveX *= 0.707; moveY *= 0.707; }
  mgDavid.x = Math.max(40, Math.min(mgWidth  - mgDavid.w - 40, mgDavid.x + moveX * mgDavid.speed));
  mgDavid.y = Math.max(60, Math.min(mgHeight - mgDavid.h - 60, mgDavid.y + moveY * mgDavid.speed));

  // Grace timer tick
  if (mgGraceTimer > 0) mgGraceTimer -= delta;

  if (mgChargeActive && !mgStone.active) {
    mgStone.charge = Math.min(60, (mgStone.charge || 0) + 1.5);
  }

  if (mgGoliath.stateTimer > 0) mgGoliath.stateTimer -= delta;
  else {
    let rand = Math.random();
    if (mgGoliath.rage) mgGoliath.state = rand < 0.4 ? 'TAUNTING' : rand < 0.7 ? 'WINDING_UP' : 'GUARDING';
    else                mgGoliath.state = rand < 0.25 ? 'TAUNTING' : rand < 0.45 ? 'WINDING_UP' : 'GUARDING';
    mgGoliath.stateTimer = (mgGoliath.state === 'TAUNTING' ? 2500 : mgGoliath.state === 'WINDING_UP' ? 1800 : 4000);
    updateMGUI();
  }

  mgGoliath.x += mgGoliath.walkDir * mgGoliath.speed;
  if (mgGoliath.x < mgWidth - 250) mgGoliath.walkDir =  1;
  if (mgGoliath.x > mgWidth - 100) mgGoliath.walkDir = -1;
  mgGoliath.y = mgHeight - 180;

  if (mgBatchCooldown > 0) mgBatchCooldown -= delta;
  else if (mgBatchSize <= 0) {
    mgBatchSize     = mgGoliath.rage ? 4 : Math.floor(Math.random() * 3) + 2;
    mgBatchCooldown = 200;
  } else if (mgBatchCooldown <= 0) {
    let startX = mgGoliath.x - 10, startY = mgGoliath.y + 45;
    let targetX = mgDavid.x + mgDavid.w / 2, targetY = mgDavid.y + mgDavid.h / 2;
    let dx = targetX - startX, dy = targetY - startY, dist = Math.hypot(dx, dy);
    let spd = 4 + (mgGoliath.rage ? 1 : 0);
    mgJavelins.push({ x: startX, y: startY, vx: (dx / dist) * spd, vy: (dy / dist) * spd, angle: Math.atan2(dy, dx) });
    mgBatchSize--;
    mgBatchCooldown = 250;
    if (mgBatchSize === 0) mgBatchCooldown = 1800;
  }

  for (let i = 0; i < mgJavelins.length; i++) {
    let j = mgJavelins[i];
    j.x += j.vx;
    j.y += j.vy;
    if (j.x > mgDavid.x && j.x < mgDavid.x + mgDavid.w && j.y > mgDavid.y && j.y < mgDavid.y + mgDavid.h) {
      if (mgGraceTimer > 0) { mgJavelins.splice(i, 1); i--; continue; }
      mgLives--;
      mgCombo = 0;
      updateMGUI();
      mgShake = 10;
      SoundFX.play('hurt');
      mgJavelins.splice(i, 1);
      i--;
      if (mgLives <= 0) {
        updateMGUI();
        if (mgAnimationId) { cancelAnimationFrame(mgAnimationId); mgAnimationId = null; }
        showLifeRedemptionQuestion(
          () => { mgLives = 1; updateMGUI(); mgPhase = 'play'; mgLastTimestamp = 0; mgAnimationId = requestAnimationFrame(mgGameLoop); },
          () => { mgPhase = 'gameover'; showMGOverlay('gameover'); }
        );
      }
    } else if (j.x > mgWidth + 100 || j.x < -100 || j.y > mgHeight + 100 || j.y < -100) {
      mgJavelins.splice(i, 1); i--;
    }
  }

  if (mgStone.active) {
    mgStone.x  += mgStone.vx;
    mgStone.vy += 0.3;
    mgStone.y  += mgStone.vy;
    mgStone.trail.unshift({ x: mgStone.x, y: mgStone.y });
    if (mgStone.trail.length > 6) mgStone.trail.pop();

    let fx = mgGoliath.x + 8, fy = mgGoliath.y + 2, fw = mgGoliath.w - 16, fh = 22;
    if (mgStone.x > fx && mgStone.x < fx + fw && mgStone.y > fy && mgStone.y < fy + fh) {
      let canHit     = false;
      let isStraight = Math.abs(Math.atan2(mgStone.vy, mgStone.vx)) < 0.3;
      if (mgGoliath.state === 'TAUNTING' || mgGoliath.state === 'WINDING_UP' || mgGoliath.state === 'STUNNED') canHit = true;
      if (mgGoliath.state === 'GUARDING' && !isStraight) canHit = true;
      if (mgGoliath.state === 'RAGE'     && !isStraight) canHit = true;
      if (canHit) {
        let pts = 150 + Math.floor(mgStone.charge * 5);
        mgScore += pts;
        mgCombo++;
        if (mgCombo > mgMaxCombo) mgMaxCombo = mgCombo;
        mgHits++;
        SoundFX.play('hit');
        mgShake = 12;
        mgStone.active = false;
        mgStone.trail  = [];
        updateMGUI();
        if (mgHits >= 3) {
          mgPhase = 'victory';
          if (mgAnimationId) { cancelAnimationFrame(mgAnimationId); mgAnimationId = null; }
          showMGOverlay('victory');
        } else {
          mgGoliath.state      = 'STUNNED';
          mgGoliath.stateTimer = 1500;
          if (mgHits === 2) mgGoliath.rage = true;
        }
      } else {
        SoundFX.play('armoured');
        mgStone.active = false;
        mgStone.trail  = [];
        mgCombo = Math.max(0, mgCombo - 1);
        updateMGUI();
      }
      return;
    }

    let bx = mgGoliath.x + 4, by = mgGoliath.y + 30, bw = mgGoliath.w - 8, bh = mgGoliath.h - 50;
    if (mgStone.x > bx && mgStone.x < bx + bw && mgStone.y > by && mgStone.y < by + bh) {
      SoundFX.play('armoured');
      mgStone.active = false;
      mgStone.trail  = [];
      mgCombo = Math.max(0, mgCombo - 1);
      updateMGUI();
      return;
    }

    if (mgStone.x > mgWidth + 100 || mgStone.x < -100 || mgStone.y > mgHeight + 100 || mgStone.y < -100) {
      mgStone.active = false;
      mgStone.trail  = [];
      mgCombo = Math.max(0, mgCombo - 1);
      updateMGUI();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  drawMG — renderer for Level 1
// ═══════════════════════════════════════════════════════════════
function drawMG() {
  mgCtx.clearRect(0, 0, mgWidth, mgHeight);
  if (mgShake > 0) {
    mgCtx.translate((Math.random() - 0.5) * mgShake, (Math.random() - 0.5) * mgShake);
    mgShake *= 0.9;
  }

  // Sky
  const skyGrad = mgCtx.createLinearGradient(0, 0, 0, mgHeight);
  skyGrad.addColorStop(0,   mgGoliath.rage ? '#2a0000' : '#1a2a1a');
  skyGrad.addColorStop(0.6, mgGoliath.rage ? '#3d1500' : '#2a3a1a');
  skyGrad.addColorStop(1,   '#4a2a0a');
  mgCtx.fillStyle = skyGrad;
  mgCtx.fillRect(0, 0, mgWidth, mgHeight);

  // Sun
  const sunGrad = mgCtx.createRadialGradient(mgWidth - 60, 60, 0, mgWidth - 60, 60, 80);
  sunGrad.addColorStop(0, '#ffdd88');
  sunGrad.addColorStop(0.5, '#ffaa44');
  sunGrad.addColorStop(1, 'rgba(255,100,0,0)');
  mgCtx.fillStyle = sunGrad;
  mgCtx.fillRect(0, 0, mgWidth, mgHeight);

  // Ground
  const groundGrad = mgCtx.createLinearGradient(0, mgHeight - 80, 0, mgHeight);
  groundGrad.addColorStop(0, '#5a3a1a');
  groundGrad.addColorStop(1, '#3a1a00');
  mgCtx.fillStyle = groundGrad;
  mgCtx.fillRect(0, mgHeight - 80, mgWidth, 80);

  mgCtx.fillStyle = 'rgba(70,50,20,0.5)';
  mgCtx.beginPath();
  mgCtx.ellipse(120, mgHeight - 85, 150, 40, 0, 0, Math.PI * 2);
  mgCtx.fill();
  mgCtx.beginPath();
  mgCtx.ellipse(550, mgHeight - 90, 200, 45, 0, 0, Math.PI * 2);
  mgCtx.fill();

  // ── David ────────────────────────────────────────────────────
  const d = mgDavid;

  mgCtx.fillStyle = 'rgba(0,0,0,0.3)';
  mgCtx.beginPath();
  mgCtx.ellipse(d.x + d.w / 2, d.y + d.h + 4, 20, 6, 0, 0, Math.PI * 2);
  mgCtx.fill();

  mgCtx.fillStyle = '#8b6914';
  mgCtx.beginPath();
  mgCtx.roundRect(d.x + 5, d.y + 22, d.w - 10, d.h - 22, 4);
  mgCtx.fill();

  mgCtx.fillStyle = '#a07820';
  mgCtx.fillRect(d.x + 5, d.y + 22, d.w - 10, 8);

  mgCtx.fillStyle = '#c8a060';
  mgCtx.fillRect(d.x - 5,       d.y + 24, 10, 20);
  mgCtx.fillRect(d.x + d.w - 5, d.y + 24, 10, 20);

  mgCtx.fillStyle = '#c8a060';
  mgCtx.beginPath();
  mgCtx.arc(d.x + d.w / 2, d.y + 12, 14, 0, Math.PI * 2);
  mgCtx.fill();

  mgCtx.fillStyle = '#5a3010';
  mgCtx.beginPath();
  mgCtx.arc(d.x + d.w / 2, d.y + 6, 14, Math.PI, 2 * Math.PI);
  mgCtx.fill();

  mgCtx.fillStyle = '#2a1800';
  mgCtx.fillRect(d.x + d.w / 2 - 6, d.y + 11, 4, 3);
  mgCtx.fillRect(d.x + d.w / 2 + 2, d.y + 11, 4, 3);

  mgCtx.strokeStyle = mgChargeActive ? '#ffaa00' : '#8b6914';
  mgCtx.lineWidth   = 2;
  mgCtx.beginPath();
  mgCtx.moveTo(d.x + d.w - 5, d.y + 30);
  mgCtx.lineTo(d.x + d.w + 15, d.y + 24);
  mgCtx.stroke();
  mgCtx.fillStyle = mgChargeActive ? '#ffaa00' : '#a07820';
  mgCtx.fillRect(d.x + d.w + 10, d.y + 21, 8, 6);

  mgCtx.fillStyle  = 'rgba(255,220,100,0.9)';
  mgCtx.font       = 'bold 11px "Cinzel", monospace';
  mgCtx.textAlign  = 'center';
  mgCtx.fillText('DAVID', d.x + d.w / 2, d.y - 8);

  // ── Goliath ──────────────────────────────────────────────────
  const g = mgGoliath;

  mgCtx.fillStyle = 'rgba(0,0,0,0.4)';
  mgCtx.beginPath();
  mgCtx.ellipse(g.x + g.w / 2, g.y + g.h + 6, 32, 10, 0, 0, Math.PI * 2);
  mgCtx.fill();

  mgCtx.fillStyle = '#4a3010';
  mgCtx.fillRect(g.x + 8,          g.y + g.h - 20, 20, 20);
  mgCtx.fillRect(g.x + g.w - 28,   g.y + g.h - 20, 20, 20);

  const bodyGrad = mgCtx.createLinearGradient(g.x, g.y + 25, g.x + g.w, g.y + 25);
  bodyGrad.addColorStop(0,   '#8a7040');
  bodyGrad.addColorStop(0.5, g.rage ? '#d06020' : '#c0a050');
  bodyGrad.addColorStop(1,   '#8a7040');
  mgCtx.fillStyle = bodyGrad;
  mgCtx.beginPath();
  mgCtx.roundRect(g.x + 4, g.y + 30, g.w - 8, g.h - 50, 6);
  mgCtx.fill();

  mgCtx.strokeStyle = 'rgba(100,80,20,0.4)';
  mgCtx.lineWidth   = 1;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      mgCtx.beginPath();
      mgCtx.arc(g.x + 12 + col * 14, g.y + 42 + row * 14, 6, 0, Math.PI);
      mgCtx.stroke();
    }
  }

  mgCtx.fillStyle = '#b09040';
  mgCtx.fillRect(g.x - 8,          g.y + 30, 14, 36);
  mgCtx.fillRect(g.x + g.w - 6,    g.y + 30, 14, 36);

  const helmGrad = mgCtx.createLinearGradient(g.x, g.y, g.x + g.w, g.y);
  helmGrad.addColorStop(0,   '#8a7040');
  helmGrad.addColorStop(0.5, '#d0b060');
  helmGrad.addColorStop(1,   '#8a7040');
  mgCtx.fillStyle = helmGrad;
  mgCtx.beginPath();
  mgCtx.arc(g.x + g.w / 2, g.y + 16, g.w / 2 - 6, Math.PI, 2 * Math.PI);
  mgCtx.fill();
  mgCtx.fillRect(g.x + 4, g.y + 16, g.w - 8, 18);

  mgCtx.fillStyle = '#c09060';
  mgCtx.fillRect(g.x + 12, g.y + 16, g.w - 24, 22);

  let eyeRed;
  if      (g.rage)                      eyeRed = 255;
  else if (g.state === 'TAUNTING')      eyeRed = 200;
  else if (g.state === 'WINDING_UP')    eyeRed = 150;
  else if (g.state === 'STUNNED')       eyeRed = 100;
  else                                   eyeRed =  80;
  mgCtx.fillStyle = `rgb(${eyeRed}, 20, 0)`;
  mgCtx.beginPath();
  mgCtx.ellipse(g.x + g.w / 2 - 10, g.y + 24, 5, 4, 0, 0, Math.PI * 2);
  mgCtx.fill();
  mgCtx.beginPath();
  mgCtx.ellipse(g.x + g.w / 2 + 10, g.y + 24, 5, 4, 0, 0, Math.PI * 2);
  mgCtx.fill();

  mgCtx.strokeStyle = `rgba(255, 100, 0, ${0.3 + Math.sin(mgFrame * 0.1) * 0.2})`;
  mgCtx.lineWidth   = 2;
  mgCtx.setLineDash([4, 4]);
  mgCtx.strokeRect(g.x + 10, g.y + 2, g.w - 20, 22);
  mgCtx.setLineDash([]);

  for (let h = 0; h < mgHits; h++) {
    mgCtx.fillStyle = '#cc2200';
    mgCtx.beginPath();
    mgCtx.arc(g.x + g.w / 2 + (h - 1) * 12, g.y + 12, 5, 0, Math.PI * 2);
    mgCtx.fill();
  }

  // Goliath spear
  mgCtx.fillStyle = '#8b6914';
  mgCtx.fillRect(g.x - 12, g.y + 25, 6, 80);
  mgCtx.fillStyle = '#c0c0c0';
  mgCtx.beginPath();
  mgCtx.moveTo(g.x - 12, g.y + 25);
  mgCtx.lineTo(g.x - 6,  g.y + 25);
  mgCtx.lineTo(g.x - 9,  g.y + 5);
  mgCtx.closePath();
  mgCtx.fill();

  mgCtx.fillStyle  = g.rage ? 'rgba(255,80,80,0.9)' : 'rgba(255,100,80,0.9)';
  mgCtx.font       = 'bold 11px "Cinzel", monospace';
  mgCtx.textAlign  = 'center';
  mgCtx.fillText(g.rage ? '⚡ GOLIATH ⚡' : 'GOLIATH', g.x + g.w / 2, g.y - 10);

  mgCtx.fillStyle = 'rgba(255,200,100,0.7)';
  mgCtx.font      = '13px "Cinzel", monospace';
  mgCtx.fillText('▲ AIM HERE', g.x + g.w / 2, g.y + 1);

  // ── Javelins ─────────────────────────────────────────────────
  for (let j of mgJavelins) {
    mgCtx.save();
    mgCtx.translate(j.x, j.y);
    mgCtx.rotate(j.angle);
    mgCtx.fillStyle = '#8b6914';
    mgCtx.fillRect(0, -2, 28, 4);
    mgCtx.fillStyle = '#c0c0c0';
    mgCtx.beginPath();
    mgCtx.moveTo(28, -5);
    mgCtx.lineTo(38,  0);
    mgCtx.lineTo(28,  5);
    mgCtx.closePath();
    mgCtx.fill();
    mgCtx.restore();
  }

  // ── Stone & trail ────────────────────────────────────────────
  if (mgStone.active) {
    for (let i = 0; i < mgStone.trail.length; i++) {
      mgCtx.globalAlpha = 0.6 - i * 0.1;
      mgCtx.fillStyle   = '#ffaa44';
      mgCtx.beginPath();
      mgCtx.arc(mgStone.trail[i].x, mgStone.trail[i].y, 6 - i, 0, Math.PI * 2);
      mgCtx.fill();
    }
    mgCtx.globalAlpha = 1;
    mgCtx.fillStyle   = '#c8a060';
    mgCtx.beginPath();
    mgCtx.arc(mgStone.x, mgStone.y, 8, 0, Math.PI * 2);
    mgCtx.fill();
    mgCtx.fillStyle = '#aa8844';
    mgCtx.beginPath();
    mgCtx.arc(mgStone.x - 1, mgStone.y - 1, 3, 0, Math.PI * 2);
    mgCtx.fill();
  }

  // ── Trajectory preview ───────────────────────────────────────
  if (mgChargeActive && !mgStone.active && mgPhase === 'play') {
    const g2    = mgGoliath;
    const power = 7 + Math.min(mgStone.charge, 60) * 0.15;
    const fx = g2.x + 8, fy = g2.y + 2, fw = g2.w - 16, fh = 22;

    let svx = Math.cos(mgAngle) * power, svy = Math.sin(mgAngle) * power;
    let sx = mgDavid.x + mgDavid.w - 5, sy = mgDavid.y + 30;
    let willHit = false, hitVy = svy;
    for (let i = 0; i < 80; i++) {
      svy += 0.3; sx += svx; sy += svy;
      if (sx > fx && sx < fx + fw && sy > fy && sy < fy + fh) { willHit = true; hitVy = svy; break; }
      if (sx > mgWidth + 60 || sy > mgHeight + 60 || sy < -60) break;
    }

    const isStraight = Math.abs(Math.atan2(hitVy, Math.cos(mgAngle) * power)) < 0.3;
    const st     = g2.state;
    const canHit = willHit && (
      (st === 'TAUNTING' || st === 'WINDING_UP' || st === 'STUNNED') ||
      ((st === 'GUARDING' || st === 'RAGE') && !isStraight)
    );
    const dotColor = willHit ? (canHit ? '#44ff88' : '#ff4444') : '#ffdd88';

    let vx = Math.cos(mgAngle) * power, vy = Math.sin(mgAngle) * power;
    let x  = mgDavid.x + mgDavid.w - 5, y  = mgDavid.y + 30;
    mgCtx.save();
    for (let i = 0; i < 70; i++) {
      vy += 0.3; x += vx; y += vy;
      if (i % 2 === 0) {
        mgCtx.globalAlpha = Math.max(0.08, 0.75 - i * 0.012);
        mgCtx.fillStyle   = dotColor;
        mgCtx.beginPath();
        mgCtx.arc(x, y, Math.max(1.5, 4.5 - i * 0.055), 0, Math.PI * 2);
        mgCtx.fill();
      }
      if (x > mgWidth + 60 || y > mgHeight + 60 || y < -60) break;
    }
    mgCtx.globalAlpha  = 0.45;
    mgCtx.strokeStyle  = dotColor;
    mgCtx.lineWidth    = 1.5;
    mgCtx.setLineDash([3, 3]);
    mgCtx.beginPath(); mgCtx.arc(x, y, 9, 0, Math.PI * 2); mgCtx.stroke();
    mgCtx.setLineDash([]);
    mgCtx.globalAlpha  = 1;
    mgCtx.restore();
  }

  // ── Charge bar ───────────────────────────────────────────────
  if (mgChargeActive && !mgStone.active) {
    let pct = (mgStone.charge || 0) / 60;
    mgCtx.fillStyle   = `rgba(255, ${200 - Math.round(pct * 200)}, 0, 0.9)`;
    mgCtx.fillRect(mgDavid.x - 5, mgDavid.y - 20, pct * 60, 8);
    mgCtx.strokeStyle = 'rgba(255,200,0,0.6)';
    mgCtx.strokeRect(mgDavid.x - 5, mgDavid.y - 20, 60, 8);
    mgCtx.fillStyle   = 'rgba(255,200,100,0.9)';
    mgCtx.font        = 'bold 10px "Cinzel", monospace';
    mgCtx.textAlign   = 'center';
    mgCtx.fillText(`⚡ ${Math.round(pct * 100)}%`, mgDavid.x + 25, mgDavid.y - 25);
  }

  mgCtx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════
//  mgGameLoop — rAF loop for Level 1
// ═══════════════════════════════════════════════════════════════
function mgGameLoop(now) {
  if (!mgCanvas || !document.getElementById('s-minigame').classList.contains('active')) {
    if (mgAnimationId) cancelAnimationFrame(mgAnimationId);
    mgAnimationId = null;
    return;
  }
  mgAnimationId = requestAnimationFrame(mgGameLoop);
  if (_shopPaused) return;
  let delta = Math.min(32, now - mgLastTimestamp);
  if (delta < 10) delta = 16;
  mgLastTimestamp = now;
  updateMG(delta);
  drawMG();
}
