// ═══════════════════════════════════════════════════════════════
//  LEVEL2.JS — Shield Bearer (Level 2)
//  Functions: resetMG2, updateMG2UI, fireMGStone2, spawnMG2PowerUp,
//             updateMG2, drawMG2, mgGameLoop2, showMG2Overlay,
//             showSubscriptionGate, startLevel2
//  Depends on: minigame.js (shared mg* globals, stone/pause helpers)
//              core.js     (SoundFX, spawn, spawnConfetti, fsSavePersonalBest)
//              user.js     (mgCurrentLevel, isPremium, isLevel2Unlocked,
//                           isLevel1Beaten, markLevel2Beaten, unlockPremium)
//              quiz.js     (getUsername, G, loadLB, shareMiniGameResult)
// ═══════════════════════════════════════════════════════════════

// ── Level 2 state ─────────────────────────────────────────────
let mg2ShieldBearer = null;
let mg2Shields      = [];   // thrown shield projectiles
let mg2PowerUps     = [];   // Angel's Breath orbs
let mg2Lives, mg2Score, mg2Hits, mg2Combo, mg2MaxCombo;
let mg2Phase        = 'idle';
let mg2Frame        = 0;
let mg2Shake        = 0;
let mg2BatchSize    = 0, mg2BatchCooldown = 0;
let mg2SbBatch      = 0, mg2SbCooldown   = 0;
let mg2PowerUpTimer = 0;
let mg2AnimationId  = null;
let mg2LastTimestamp = 0;

// ═══════════════════════════════════════════════════════════════
//  resetMG2
// ═══════════════════════════════════════════════════════════════
function resetMG2() {
  mgDavid   = { x: 80, y: mgHeight / 2, w: 40, h: 60, speed: 9 };
  mgGoliath = { x: Math.min(mgWidth - 130, 580), y: mgHeight - 180, w: 70, h: 110,
                speed: 1.2, walkDir: 1, rage: false, state: 'GUARDING', stateTimer: 4000 };
  mgStone   = { active: false, x: 0, y: 0, vx: 0, vy: 0, charge: 0, trail: [] };
  mgJavelins  = [];
  mg2Shields  = [];
  mg2PowerUps = [];

  mg2ShieldBearer = {
    x: mgWidth / 2 - 18, y: mgHeight - 160,
    w: 36, h: 80,
    speed: 1.5, walkDir: 1,
    state: 'BLOCKING',
    staggerTimer: 0,
    hits: 0,
    shieldW: 32, shieldH: 54,
  };

  mg2Lives = 3; mg2Score = 0; mg2Hits = 0; mg2Combo = 0; mg2MaxCombo = 0;
  mg2Phase  = 'play';
  mg2Frame  = 0; mg2Shake = 0;
  mg2BatchSize = 0; mg2BatchCooldown = 0;
  mg2SbBatch   = 0; mg2SbCooldown   = 0;
  mg2PowerUpTimer = 5000;
  mgAngle = 0; mgChargeActive = false;
  mgMoveLeft = false; mgMoveRight = false; mgMoveUp = false; mgMoveDown = false;
  mgJoyVX = 0; mgJoyVY = 0; mgJoyActive = false;
  initStones(2);
  updateMG2UI();
}

function updateMG2UI() {
  document.getElementById('mgLives').innerHTML = '❤️'.repeat(mg2Lives) + '🖤'.repeat(3 - mg2Lives);
  document.getElementById('mgScore').innerText  = mg2Score;
  const sb = mg2ShieldBearer;
  document.getElementById('mgStateBadge').innerText =
    sb && sb.state === 'STAGGERED' ? '⚡ SHIELD DOWN!' : (mgGoliath ? mgGoliath.state : '');
  updateStoneUI();
}

// ── Fire stone (Level 2) ──────────────────────────────────────
function fireMGStone2() {
  if (mgStone.active || mg2Phase !== 'play') return;
  const power = 7 + Math.min(mgStone.charge, 60) * 0.15;
  mgStone.active = true;
  mgStone.x  = mgDavid.x + mgDavid.w - 5;
  mgStone.y  = mgDavid.y + 30;
  mgStone.vx = Math.cos(mgAngle) * power;
  mgStone.vy = Math.sin(mgAngle) * power;
  mgStone.charge = 0;
  SoundFX.play('throw');
}

// ── Power-up spawn ────────────────────────────────────────────
function spawnMG2PowerUp() {
  if (mg2PowerUps.length >= 2) return;
  mg2PowerUps.push({
    x: 120 + Math.random() * (mgWidth - 300),
    y: mgHeight - 95 - Math.random() * 70,
    r: 13, pulse: 0
  });
}

// ═══════════════════════════════════════════════════════════════
//  updateMG2
// ═══════════════════════════════════════════════════════════════
function updateMG2(delta) {
  if (mg2Phase !== 'play') return;
  mg2Frame++;

  let moveX = mgJoyVX !== 0 ? mgJoyVX : (mgMoveRight ? 1 : mgMoveLeft ? -1 : 0);
  let moveY = mgJoyVY !== 0 ? mgJoyVY : (mgMoveDown  ? 1 : mgMoveUp   ? -1 : 0);
  if (moveX !== 0 && moveY !== 0 && mgJoyVX === 0) { moveX *= 0.707; moveY *= 0.707; }
  const kbMult2 = mgJoyActive ? 1.0 : 1.2;
  mgDavid.x = Math.max(40, Math.min(mgWidth  - mgDavid.w - 40, mgDavid.x + moveX * mgDavid.speed * kbMult2));
  mgDavid.y = Math.max(60, Math.min(mgHeight - mgDavid.h - 60, mgDavid.y + moveY * mgDavid.speed * kbMult2));
  if (mgGraceTimer > 0) mgGraceTimer -= delta;

  if (mgChargeActive && !mgStone.active)
    mgStone.charge = Math.min(60, (mgStone.charge || 0) + 1.5);

  // Goliath state machine
  if (mgGoliath.stateTimer > 0) mgGoliath.stateTimer -= delta;
  else {
    const r = Math.random();
    mgGoliath.state = mgGoliath.rage
      ? (r < 0.45 ? 'TAUNTING' : r < 0.75 ? 'WINDING_UP' : 'GUARDING')
      : (r < 0.25 ? 'TAUNTING' : r < 0.45 ? 'WINDING_UP' : 'GUARDING');
    mgGoliath.stateTimer = mgGoliath.state === 'TAUNTING' ? 1800
                         : mgGoliath.state === 'WINDING_UP' ? 1400 : 3200;
    updateMG2UI();
  }

  mgGoliath.x += mgGoliath.walkDir * mgGoliath.speed;
  if (mgGoliath.x < mgWidth - 270) mgGoliath.walkDir =  1;
  if (mgGoliath.x > mgWidth - 90)  mgGoliath.walkDir = -1;
  mgGoliath.y = mgHeight - 180;

  // Shield Bearer movement
  const sb = mg2ShieldBearer;
  if (sb.state === 'STAGGERED') {
    sb.staggerTimer -= delta;
    if (sb.staggerTimer <= 0) { sb.state = 'BLOCKING'; sb.hits = 0; updateMG2UI(); }
  } else {
    const mid   = (mgDavid.x + mgGoliath.x) / 2;
    const sbMid = sb.x + sb.w / 2;
    if (sbMid < mid - 25) sb.x += sb.speed;
    else if (sbMid > mid + 25) sb.x -= sb.speed;
    sb.x += Math.sin(mg2Frame * 0.045) * 0.6;
    sb.x  = Math.max(140, Math.min(mgWidth - 190, sb.x));
    sb.y  = mgHeight - 160;
  }

  // Power-up timer
  mg2PowerUpTimer -= delta;
  if (mg2PowerUpTimer <= 0) { spawnMG2PowerUp(); mg2PowerUpTimer = 7000 + Math.random() * 5000; }

  // Power-up collection
  for (let i = mg2PowerUps.length - 1; i >= 0; i--) {
    const pu = mg2PowerUps[i];
    pu.pulse += 0.09;
    const dx = mgDavid.x + mgDavid.w / 2 - pu.x;
    const dy = mgDavid.y + mgDavid.h / 2 - pu.y;
    if (Math.hypot(dx, dy) < pu.r + 20) {
      sb.state = 'STAGGERED'; sb.staggerTimer = 3200;
      mg2PowerUps.splice(i, 1);
      SoundFX.play('powerup'); spawn('✨', 4); updateMG2UI();
    }
  }

  // Goliath javelins
  if (mg2BatchCooldown > 0) mg2BatchCooldown -= delta;
  else if (mg2BatchSize <= 0) {
    mg2BatchSize     = mgGoliath.rage ? 5 : Math.floor(Math.random() * 3) + 2;
    mg2BatchCooldown = 160;
  } else {
    const sx  = mgGoliath.x - 10, sy = mgGoliath.y + 45;
    const tx  = mgDavid.x + mgDavid.w / 2, ty = mgDavid.y + mgDavid.h / 2;
    const d   = Math.hypot(tx - sx, ty - sy);
    const spd = 5.5 + (mgGoliath.rage ? 1.5 : 0);
    mgJavelins.push({ x: sx, y: sy, vx: (tx-sx)/d*spd, vy: (ty-sy)/d*spd, angle: Math.atan2(ty-sy, tx-sx) });
    mg2BatchSize--; mg2BatchCooldown = 200;
    if (mg2BatchSize === 0) mg2BatchCooldown = 1500;
  }

  // Shield Bearer throws
  if (sb.state !== 'STAGGERED') {
    if (mg2SbCooldown > 0) mg2SbCooldown -= delta;
    else {
      const sx = sb.x + sb.w/2, sy = sb.y + sb.h/2;
      const tx = mgDavid.x + mgDavid.w/2, ty = mgDavid.y + mgDavid.h/2;
      const d  = Math.hypot(tx-sx, ty-sy);
      mg2Shields.push({ x: sx, y: sy, vx: (tx-sx)/d*3, vy: (ty-sy)/d*3,
                        angle: Math.atan2(ty-sy, tx-sx), rot: 0, w: 30, h: 20 });
      mg2SbCooldown = mgGoliath.rage ? 1800 : 3200;
    }
  }

  // Move javelins + hit detection
  for (let i = mgJavelins.length - 1; i >= 0; i--) {
    const j = mgJavelins[i];
    j.x += j.vx; j.y += j.vy;
    if (j.x > mgDavid.x && j.x < mgDavid.x + mgDavid.w &&
        j.y > mgDavid.y && j.y < mgDavid.y + mgDavid.h) {
      if (mgGraceTimer > 0) { mgJavelins.splice(i, 1); } else {
        mg2Lives--; mg2Combo = 0; updateMG2UI(); mg2Shake = 10; SoundFX.play('hurt');
        mgJavelins.splice(i, 1);
        if (mg2Lives <= 0) {
          updateMG2UI();
          if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
          showLifeRedemptionQuestion(
            () => { mg2Lives = 1; updateMG2UI(); mg2Phase = 'play'; mg2LastTimestamp = 0; mg2AnimationId = requestAnimationFrame(mgGameLoop2); },
            () => { mg2Phase = 'gameover'; showMG2Overlay('gameover'); }
          );
        }
      }
    } else if (j.x > mgWidth+100 || j.x < -100 || j.y > mgHeight+100 || j.y < -100) {
      mgJavelins.splice(i, 1);
    }
  }

  // Move shield projectiles + hit detection
  for (let i = mg2Shields.length - 1; i >= 0; i--) {
    const s = mg2Shields[i];
    s.x += s.vx; s.y += s.vy; s.rot += 0.14;
    if (s.x > mgDavid.x && s.x < mgDavid.x + mgDavid.w &&
        s.y > mgDavid.y && s.y < mgDavid.y + mgDavid.h) {
      if (mgGraceTimer > 0) { mg2Shields.splice(i, 1); } else {
        mg2Lives--; mg2Combo = 0; updateMG2UI(); mg2Shake = 8; SoundFX.play('hurt');
        mg2Shields.splice(i, 1);
        if (mg2Lives <= 0) {
          updateMG2UI();
          if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
          showLifeRedemptionQuestion(
            () => { mg2Lives = 1; updateMG2UI(); mg2Phase = 'play'; mg2LastTimestamp = 0; mg2AnimationId = requestAnimationFrame(mgGameLoop2); },
            () => { mg2Phase = 'gameover'; showMG2Overlay('gameover'); }
          );
        }
      }
    } else if (s.x > mgWidth+100 || s.x < -100 || s.y > mgHeight+100 || s.y < -100) {
      mg2Shields.splice(i, 1);
    }
  }

  // Stone physics + collision
  if (mgStone.active) {
    mgStone.x  += mgStone.vx;
    mgStone.vy += 0.3;
    mgStone.y  += mgStone.vy;
    mgStone.trail.unshift({ x: mgStone.x, y: mgStone.y });
    if (mgStone.trail.length > 6) mgStone.trail.pop();

    // ① Shield Bearer block
    if (sb.state !== 'STAGGERED') {
      const sx = sb.x - 10, sy = sb.y + 8, sw = sb.shieldW + 12, sh = sb.shieldH;
      if (mgStone.x > sx && mgStone.x < sx+sw && mgStone.y > sy && mgStone.y < sy+sh) {
        sb.hits++;
        SoundFX.play('armoured');
        mgStone.active = false; mgStone.trail = [];
        mg2Combo = Math.max(0, mg2Combo - 1);
        if (sb.hits >= 2) {
          sb.state = 'STAGGERED'; sb.staggerTimer = 1800;
          mg2Score += 60; SoundFX.beep(880, 0.15);
          updateMG2UI();
        }
        return;
      }
    }

    // ② Goliath forehead
    const fx = mgGoliath.x+8, fy = mgGoliath.y+2, fw = mgGoliath.w-16, fh = 22;
    if (mgStone.x > fx && mgStone.x < fx+fw && mgStone.y > fy && mgStone.y < fy+fh) {
      const isStraight = Math.abs(Math.atan2(mgStone.vy, mgStone.vx)) < 0.3;
      const arced      = sb.state !== 'STAGGERED' && mgStone.y < sb.y;
      let canHit = false;
      if (mgGoliath.state === 'TAUNTING' || mgGoliath.state === 'WINDING_UP' || mgGoliath.state === 'STUNNED') canHit = true;
      if ((mgGoliath.state === 'GUARDING' || mgGoliath.state === 'RAGE') && !isStraight) canHit = true;
      if (canHit) {
        let pts = 200 + Math.floor(mgStone.charge * 5);
        if (arced) pts += 80;
        mg2Score += pts; mg2Combo++; if (mg2Combo > mg2MaxCombo) mg2MaxCombo = mg2Combo;
        mg2Hits++; SoundFX.play('hit'); mg2Shake = 14;
        mgStone.active = false; mgStone.trail = [];
        updateMG2UI();
        spawn(arced ? '🌟' : '✨', arced ? 5 : 3);
        if (mg2Hits >= 3) {
          mg2Phase = 'victory';
          if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
          showMG2Overlay('victory');
        } else {
          mgGoliath.state = 'STUNNED'; mgGoliath.stateTimer = 1500;
          if (mg2Hits >= 1) mgGoliath.rage = true;
        }
      } else {
        SoundFX.play('armoured'); mgStone.active = false; mgStone.trail = [];
        mg2Combo = Math.max(0, mg2Combo - 1); updateMG2UI();
      }
      return;
    }

    // ③ Goliath body
    const bx = mgGoliath.x+4, by = mgGoliath.y+30, bw = mgGoliath.w-8, bh = mgGoliath.h-50;
    if (mgStone.x > bx && mgStone.x < bx+bw && mgStone.y > by && mgStone.y < by+bh) {
      SoundFX.play('armoured'); mgStone.active = false; mgStone.trail = [];
      mg2Combo = Math.max(0, mg2Combo - 1); updateMG2UI(); return;
    }

    if (mgStone.x > mgWidth+100 || mgStone.x < -100 || mgStone.y > mgHeight+100 || mgStone.y < -100) {
      mgStone.active = false; mgStone.trail = [];
      mg2Combo = Math.max(0, mg2Combo - 1); updateMG2UI();
    }
  }

  if (mg2Shake > 0.3) mg2Shake *= 0.84;
}

// ═══════════════════════════════════════════════════════════════
//  drawMG2
// ═══════════════════════════════════════════════════════════════
function drawMG2() {
  mgCtx.clearRect(0, 0, mgWidth, mgHeight);
  mgCtx.save();
  if (mg2Shake > 0.5)
    mgCtx.translate((Math.random()-0.5)*mg2Shake, (Math.random()-0.5)*mg2Shake);

  // Sky
  const sky = mgCtx.createLinearGradient(0, 0, 0, mgHeight);
  sky.addColorStop(0,   mgGoliath.rage ? '#3a0000' : '#0c1828');
  sky.addColorStop(0.6, mgGoliath.rage ? '#4d1500' : '#182438');
  sky.addColorStop(1,   '#2a1204');
  mgCtx.fillStyle = sky;
  mgCtx.fillRect(0, 0, mgWidth, mgHeight);

  // Storm clouds
  mgCtx.fillStyle = 'rgba(30,20,12,0.45)';
  for (let i = 0; i < 5; i++) {
    mgCtx.beginPath();
    mgCtx.ellipse(60 + i*170, 35 + Math.sin(mg2Frame*0.006+i*1.2)*10, 85+i*8, 28, 0, 0, Math.PI*2);
    mgCtx.fill();
  }

  // Ground
  const grd = mgCtx.createLinearGradient(0, mgHeight-80, 0, mgHeight);
  grd.addColorStop(0, '#3e2808'); grd.addColorStop(1, '#1e0e00');
  mgCtx.fillStyle = grd;
  mgCtx.fillRect(0, mgHeight-80, mgWidth, 80);

  // Hills
  mgCtx.fillStyle = 'rgba(50,30,8,0.5)';
  mgCtx.beginPath(); mgCtx.ellipse(110, mgHeight-88, 160, 48, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(mgWidth-145, mgHeight-92, 200, 52, 0, 0, Math.PI*2); mgCtx.fill();

  // Angel's Breath power-ups
  for (const pu of mg2PowerUps) {
    mgCtx.save();
    const glow = mgCtx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, pu.r*2.8);
    glow.addColorStop(0,   'rgba(160,210,255,0.9)');
    glow.addColorStop(0.4, 'rgba(80,140,255,0.45)');
    glow.addColorStop(1,   'rgba(40,80,255,0)');
    mgCtx.fillStyle = glow;
    mgCtx.beginPath(); mgCtx.arc(pu.x, pu.y, pu.r*2.8, 0, Math.PI*2); mgCtx.fill();
    mgCtx.globalAlpha = 0.82 + Math.sin(pu.pulse)*0.18;
    mgCtx.fillStyle = '#b8daff';
    mgCtx.beginPath(); mgCtx.arc(pu.x, pu.y, pu.r*(0.88+Math.sin(pu.pulse)*0.12), 0, Math.PI*2); mgCtx.fill();
    mgCtx.globalAlpha = 1;
    mgCtx.fillStyle = 'rgba(160,210,255,0.85)';
    mgCtx.font = 'bold 9px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText("👼 ANGEL'S BREATH", pu.x, pu.y - pu.r - 5);
    mgCtx.restore();
  }

  // ── David ────────────────────────────────────────────────────
  const d = mgDavid;
  mgCtx.fillStyle = 'rgba(0,0,0,0.3)';
  mgCtx.beginPath(); mgCtx.ellipse(d.x+d.w/2, d.y+d.h+4, 20, 6, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#8b6914';
  mgCtx.beginPath(); mgCtx.roundRect(d.x+5, d.y+22, d.w-10, d.h-22, 4); mgCtx.fill();
  mgCtx.fillStyle = '#a07820';
  mgCtx.fillRect(d.x+5, d.y+22, d.w-10, 8);
  mgCtx.fillStyle = '#c8a060';
  mgCtx.fillRect(d.x-5, d.y+24, 10, 20);
  mgCtx.fillRect(d.x+d.w-5, d.y+24, 10, 20);
  mgCtx.fillStyle = '#c8a060';
  mgCtx.beginPath(); mgCtx.arc(d.x+d.w/2, d.y+12, 14, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#5a3010';
  mgCtx.beginPath(); mgCtx.arc(d.x+d.w/2, d.y+6, 14, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillStyle = '#2a1800';
  mgCtx.fillRect(d.x+d.w/2-6, d.y+11, 4, 3);
  mgCtx.fillRect(d.x+d.w/2+2, d.y+11, 4, 3);
  mgCtx.strokeStyle = mgChargeActive ? '#ffaa00' : '#8b6914';
  mgCtx.lineWidth = 2;
  mgCtx.beginPath(); mgCtx.moveTo(d.x+d.w-5, d.y+30); mgCtx.lineTo(d.x+d.w+15, d.y+24); mgCtx.stroke();
  mgCtx.fillStyle = mgChargeActive ? '#ffaa00' : '#a07820';
  mgCtx.fillRect(d.x+d.w+10, d.y+21, 8, 6);
  mgCtx.fillStyle = 'rgba(255,220,100,0.9)';
  mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'center';
  mgCtx.fillText('DAVID', d.x+d.w/2, d.y-8);
  // Grace period flicker
  if (mgGraceTimer > 0 && Math.sin(mg2Frame * 0.5) > 0) {
    mgCtx.save();
    mgCtx.globalAlpha = 0.35 + 0.25 * Math.sin(mg2Frame * 0.4);
    mgCtx.strokeStyle = '#ffe066'; mgCtx.lineWidth = 3;
    mgCtx.beginPath();
    mgCtx.ellipse(d.x+d.w/2, d.y+d.h/2, d.w/2+10, d.h/2+10, 0, 0, Math.PI*2);
    mgCtx.stroke(); mgCtx.restore();
  }

  // ── Shield Bearer ────────────────────────────────────────────
  const sb   = mg2ShieldBearer;
  const stag = sb.state === 'STAGGERED';
  if (stag && Math.sin(mg2Frame*0.4) > 0) mgCtx.globalAlpha = 0.45;

  mgCtx.fillStyle = 'rgba(0,0,0,0.28)';
  mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2, sb.y+sb.h+4, 18, 5, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = stag ? '#6a3a18' : '#4e3e1e';
  mgCtx.beginPath(); mgCtx.roundRect(sb.x+4, sb.y+20, sb.w-8, sb.h-20, 3); mgCtx.fill();
  mgCtx.fillStyle = stag ? '#8a5838' : '#6a5020';
  mgCtx.beginPath(); mgCtx.arc(sb.x+sb.w/2, sb.y+12, 12, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#4a3010';
  mgCtx.beginPath(); mgCtx.arc(sb.x+sb.w/2, sb.y+7, 12, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillStyle = stag ? '#777' : '#cc1800';
  mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2-5, sb.y+12, 3, 2.5, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2+5, sb.y+12, 3, 2.5, 0, 0, Math.PI*2); mgCtx.fill();

  if (!stag) {
    const shX = sb.x - 12, shY = sb.y + 8;
    const sg  = mgCtx.createLinearGradient(shX, shY, shX+sb.shieldW, shY);
    sg.addColorStop(0, '#7a6030'); sg.addColorStop(0.5, '#c0a040'); sg.addColorStop(1, '#7a6030');
    mgCtx.fillStyle = sg;
    mgCtx.beginPath(); mgCtx.roundRect(shX, shY, sb.shieldW, sb.shieldH, 5); mgCtx.fill();
    mgCtx.strokeStyle = '#e0c050'; mgCtx.lineWidth = 2; mgCtx.stroke();
    mgCtx.beginPath();
    mgCtx.moveTo(shX+sb.shieldW/2, shY+7); mgCtx.lineTo(shX+sb.shieldW/2, shY+sb.shieldH-7);
    mgCtx.moveTo(shX+5, shY+sb.shieldH/2); mgCtx.lineTo(shX+sb.shieldW-5, shY+sb.shieldH/2);
    mgCtx.stroke();
    mgCtx.fillStyle = 'rgba(255,200,60,0.8)';
    mgCtx.font = 'bold 9px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText('⛨ SHIELDED', sb.x+sb.w/2, sb.y-7);
  } else {
    mgCtx.font = '13px serif'; mgCtx.textAlign = 'center';
    mgCtx.fillText('⭐⭐', sb.x+sb.w/2, sb.y-8);
    mgCtx.fillStyle = 'rgba(120,210,255,0.9)';
    mgCtx.font = 'bold 9px "Cinzel",monospace';
    mgCtx.fillText('STAGGERED!', sb.x+sb.w/2, sb.y-22);
    const pct = sb.staggerTimer / 1800;
    mgCtx.fillStyle = 'rgba(100,200,255,0.5)';
    mgCtx.fillRect(sb.x-4, sb.y-35, pct*44, 5);
    mgCtx.strokeStyle = 'rgba(100,200,255,0.35)'; mgCtx.lineWidth = 1;
    mgCtx.strokeRect(sb.x-4, sb.y-35, 44, 5);
  }
  for (let h = 0; h < sb.hits; h++) {
    mgCtx.fillStyle = '#cc1800';
    mgCtx.beginPath(); mgCtx.arc(sb.x+6+h*10, sb.y+3, 4, 0, Math.PI*2); mgCtx.fill();
  }
  mgCtx.globalAlpha = 1;

  // ── Goliath ──────────────────────────────────────────────────
  const g = mgGoliath;
  mgCtx.fillStyle = 'rgba(0,0,0,0.4)';
  mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2, g.y+g.h+6, 32, 10, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#4a3010';
  mgCtx.fillRect(g.x+8, g.y+g.h-20, 20, 20);
  mgCtx.fillRect(g.x+g.w-28, g.y+g.h-20, 20, 20);
  const bg = mgCtx.createLinearGradient(g.x, g.y+25, g.x+g.w, g.y+25);
  bg.addColorStop(0, '#8a7040'); bg.addColorStop(0.5, g.rage ? '#d06020' : '#c0a050'); bg.addColorStop(1, '#8a7040');
  mgCtx.fillStyle = bg;
  mgCtx.beginPath(); mgCtx.roundRect(g.x+4, g.y+30, g.w-8, g.h-50, 6); mgCtx.fill();
  mgCtx.strokeStyle = 'rgba(100,80,20,0.4)'; mgCtx.lineWidth = 1;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    mgCtx.beginPath(); mgCtx.arc(g.x+12+col*14, g.y+42+row*14, 6, 0, Math.PI); mgCtx.stroke();
  }
  mgCtx.fillStyle = '#b09040';
  mgCtx.fillRect(g.x-8, g.y+30, 14, 36); mgCtx.fillRect(g.x+g.w-6, g.y+30, 14, 36);
  const hg = mgCtx.createLinearGradient(g.x, g.y, g.x+g.w, g.y);
  hg.addColorStop(0, '#8a7040'); hg.addColorStop(0.5, '#d0b060'); hg.addColorStop(1, '#8a7040');
  mgCtx.fillStyle = hg;
  mgCtx.beginPath(); mgCtx.arc(g.x+g.w/2, g.y+16, g.w/2-6, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillRect(g.x+4, g.y+16, g.w-8, 18);
  mgCtx.fillStyle = '#c09060'; mgCtx.fillRect(g.x+12, g.y+16, g.w-24, 22);
  const er = g.rage ? 255 : g.state === 'TAUNTING' ? 200 : g.state === 'WINDING_UP' ? 150 : g.state === 'STUNNED' ? 100 : 80;
  mgCtx.fillStyle = `rgb(${er},20,0)`;
  mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2-10, g.y+24, 5, 4, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2+10, g.y+24, 5, 4, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.strokeStyle = `rgba(255,100,0,${0.3+Math.sin(mg2Frame*0.1)*0.2})`;
  mgCtx.lineWidth = 2; mgCtx.setLineDash([4,4]);
  mgCtx.strokeRect(g.x+10, g.y+2, g.w-20, 22); mgCtx.setLineDash([]);
  for (let h = 0; h < mg2Hits; h++) {
    mgCtx.fillStyle = '#cc2200';
    mgCtx.beginPath(); mgCtx.arc(g.x+g.w/2+(h-1)*12, g.y+12, 5, 0, Math.PI*2); mgCtx.fill();
  }
  mgCtx.fillStyle = '#8b6914'; mgCtx.fillRect(g.x-12, g.y+25, 6, 80);
  mgCtx.fillStyle = '#c0c0c0';
  mgCtx.beginPath(); mgCtx.moveTo(g.x-12,g.y+25); mgCtx.lineTo(g.x-6,g.y+25); mgCtx.lineTo(g.x-9,g.y+5); mgCtx.closePath(); mgCtx.fill();
  mgCtx.fillStyle = g.rage ? 'rgba(255,80,80,0.9)' : 'rgba(255,100,80,0.9)';
  mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'center';
  mgCtx.fillText(g.rage ? '⚡ GOLIATH ⚡' : 'GOLIATH', g.x+g.w/2, g.y-10);
  mgCtx.fillStyle = 'rgba(255,200,100,0.7)'; mgCtx.font = '13px "Cinzel",monospace';
  mgCtx.fillText('▲ AIM HERE', g.x+g.w/2, g.y+1);

  // ── Javelins ─────────────────────────────────────────────────
  for (const j of mgJavelins) {
    mgCtx.save(); mgCtx.translate(j.x, j.y); mgCtx.rotate(j.angle);
    mgCtx.fillStyle = '#8b6914'; mgCtx.fillRect(0, -2, 28, 4);
    mgCtx.fillStyle = '#c0c0c0';
    mgCtx.beginPath(); mgCtx.moveTo(28,-5); mgCtx.lineTo(38,0); mgCtx.lineTo(28,5); mgCtx.closePath(); mgCtx.fill();
    mgCtx.restore();
  }

  // ── Shield projectiles ───────────────────────────────────────
  for (const s of mg2Shields) {
    mgCtx.save(); mgCtx.translate(s.x, s.y); mgCtx.rotate(s.rot);
    mgCtx.fillStyle = '#8a7040'; mgCtx.strokeStyle = '#c0a040'; mgCtx.lineWidth = 2;
    mgCtx.beginPath(); mgCtx.roundRect(-s.w/2, -s.h/2, s.w, s.h, 4); mgCtx.fill(); mgCtx.stroke();
    mgCtx.fillStyle = '#e0c060';
    mgCtx.beginPath(); mgCtx.arc(0, 0, 5, 0, Math.PI*2); mgCtx.fill();
    mgCtx.restore();
  }

  // ── Stone + trail ────────────────────────────────────────────
  if (mgStone.active) {
    for (let i = 0; i < mgStone.trail.length; i++) {
      mgCtx.globalAlpha = 0.6 - i*0.1;
      mgCtx.fillStyle = '#ffaa44';
      mgCtx.beginPath(); mgCtx.arc(mgStone.trail[i].x, mgStone.trail[i].y, 6-i, 0, Math.PI*2); mgCtx.fill();
    }
    mgCtx.globalAlpha = 1;
    mgCtx.fillStyle = '#c8a060';
    mgCtx.beginPath(); mgCtx.arc(mgStone.x, mgStone.y, 8, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = '#aa8844';
    mgCtx.beginPath(); mgCtx.arc(mgStone.x-1, mgStone.y-1, 3, 0, Math.PI*2); mgCtx.fill();
  }

  // ── Trajectory preview ───────────────────────────────────────
  if (mgChargeActive && !mgStone.active && mg2Phase === 'play') {
    const power = 7 + Math.min(mgStone.charge, 60) * 0.15;
    const fx = g.x+8, fy = g.y+2, fw = g.w-16, fh = 22;
    let svx = Math.cos(mgAngle)*power, svy = Math.sin(mgAngle)*power;
    let sx = mgDavid.x+mgDavid.w-5, sy = mgDavid.y+30;
    let willHit = false, hitVy = svy;
    for (let i = 0; i < 80; i++) {
      svy += 0.3; sx += svx; sy += svy;
      if (sx>fx && sx<fx+fw && sy>fy && sy<fy+fh) { willHit=true; hitVy=svy; break; }
      if (sx>mgWidth+60 || sy>mgHeight+60 || sy<-60) break;
    }
    const isStraight = Math.abs(Math.atan2(hitVy, Math.cos(mgAngle)*power)) < 0.3;
    const st     = g.state;
    const canHit = willHit && (
      (st==='TAUNTING'||st==='WINDING_UP'||st==='STUNNED') ||
      ((st==='GUARDING'||st==='RAGE') && !isStraight)
    );
    const dc = willHit ? (canHit ? '#44ff88' : '#ff4444') : '#ffdd88';
    let vx = Math.cos(mgAngle)*power, vy = Math.sin(mgAngle)*power;
    let x  = mgDavid.x+mgDavid.w-5, y  = mgDavid.y+30;
    mgCtx.save();
    for (let i = 0; i < 70; i++) {
      vy+=0.3; x+=vx; y+=vy;
      if (i%2===0) {
        mgCtx.globalAlpha = Math.max(0.08, 0.75-i*0.012);
        mgCtx.fillStyle = dc;
        mgCtx.beginPath(); mgCtx.arc(x, y, Math.max(1.5, 4.5-i*0.055), 0, Math.PI*2); mgCtx.fill();
      }
      if (x>mgWidth+60||y>mgHeight+60||y<-60) break;
    }
    mgCtx.globalAlpha = 0.45; mgCtx.strokeStyle = dc; mgCtx.lineWidth = 1.5;
    mgCtx.setLineDash([3,3]);
    mgCtx.beginPath(); mgCtx.arc(x, y, 9, 0, Math.PI*2); mgCtx.stroke();
    mgCtx.setLineDash([]); mgCtx.globalAlpha = 1; mgCtx.restore();
  }

  // ── Charge bar ───────────────────────────────────────────────
  if (mgChargeActive && !mgStone.active) {
    const pct = (mgStone.charge||0) / 60;
    mgCtx.fillStyle = `rgba(255,${200-Math.round(pct*200)},0,0.9)`;
    mgCtx.fillRect(mgDavid.x-5, mgDavid.y-20, pct*60, 8);
    mgCtx.strokeStyle = 'rgba(255,200,0,0.6)'; mgCtx.lineWidth = 1;
    mgCtx.strokeRect(mgDavid.x-5, mgDavid.y-20, 60, 8);
    mgCtx.fillStyle = 'rgba(255,200,100,0.9)';
    mgCtx.font = 'bold 10px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText(`⚡ ${Math.round(pct*100)}%`, mgDavid.x+25, mgDavid.y-25);
  }

  // Level badge
  mgCtx.fillStyle = 'rgba(255,140,40,0.75)';
  mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'left';
  mgCtx.fillText('⚔️ LEVEL 2 — SHIELD BEARER', 12, mgHeight-12);

  mgCtx.globalAlpha = 1;
  mgCtx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  mgGameLoop2
// ═══════════════════════════════════════════════════════════════
function mgGameLoop2(now) {
  if (!mgCanvas || !document.getElementById('s-minigame').classList.contains('active')) {
    if (mg2AnimationId) cancelAnimationFrame(mg2AnimationId);
    mg2AnimationId = null;
    return;
  }
  mg2AnimationId = requestAnimationFrame(mgGameLoop2);
  if (_shopPaused) return;
  let delta = Math.min(32, now - mg2LastTimestamp);
  if (delta < 10) delta = 16;
  mg2LastTimestamp = now;
  updateMG2(delta);
  drawMG2();
}

// ═══════════════════════════════════════════════════════════════
//  showMG2Overlay
// ═══════════════════════════════════════════════════════════════
function showMG2Overlay(type) {
  let ov = document.querySelector('.mg-full-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'mg-full-overlay';

  if (type === 'start') {
    ov.innerHTML = `
      <h2>⚔️ Level 2: The Shield Bearer</h2>
      <p style="max-width:300px;line-height:1.8;">
        🛡️ A Shield Bearer now guards Goliath<br>
        🪨 <b>Arc your stone OVER the shield</b> to hit Goliath<br>
        💥 Hit the shield <b>twice</b> to stagger him briefly<br>
        👼 Collect <b>Angel's Breath</b> orbs to freeze him<br>
        ⚡ Javelins are <b>faster</b> — keep moving!
      </p>
      <button id="mg2StartBtn">⚔️ BEGIN BATTLE</button>
      <button id="mg2ExitBtn" style="background:#3a3a3a;color:#aaa;">✕ Back to Menu</button>
    `;
    document.body.appendChild(ov);
    document.getElementById('mg2StartBtn').onclick = () => {
      ov.remove();
      resetMG2(); mg2Phase = 'play'; updateMG2UI();
      SoundFX.startMusic('battle');
      if (mg2AnimationId) cancelAnimationFrame(mg2AnimationId);
      mg2LastTimestamp = 0;
      mg2AnimationId = requestAnimationFrame(mgGameLoop2);
    };
    document.getElementById('mg2ExitBtn').onclick = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };

  } else if (type === 'victory') {
    markLevel2Beaten();
    SoundFX.play('victory');
    spawn('🌟', 8); spawnConfetti();
    ov.innerHTML = `
      <h2 style="color:#e8c96a;">🏆 LEVEL 2 COMPLETE!</h2>
      <p>Score: <b>${mg2Score}</b> · Max Combo: ${mg2MaxCombo}x<br>
      <span style="color:#44ff88;font-size:12px;">The Shield Bearer is vanquished! With God, no obstacle stands!</span></p>
      <button id="mg2SaveBtn">💾 Save Score</button>
      <button id="mg2RestartBtn">Play Again</button>
      <button id="mg2Level3Btn" style="background:linear-gradient(135deg,#0a1a2a,#1a3a5a,#0a1a2a);color:#88ccff;border:1px solid #4488aa;">🌙 Try Level 3</button>
      <button id="mg2ShareBtn" style="background:linear-gradient(135deg,#1a3a5a,#2a5a8a);border:1px solid #4488bb;color:#88ccff;">📤 Share</button>
      <button id="mg2MenuBtn">Back to Menu</button>
    `;
    document.body.appendChild(ov);
    document.getElementById('mg2SaveBtn').onclick = async () => {
      const btn = document.getElementById('mg2SaveBtn');
      btn.textContent = '💾 Saving...'; btn.disabled = true;
      const result = await fsSavePersonalBest(
        getUsername(), mg2Score, 'minigame-l2',
        mg2Score >= 1500 ? 'Champion of Faith' : 'Warrior',
        mg2Hits, 3, mg2MaxCombo, mg2MaxCombo,
        { levelReached: 'minigame-l2' }
      );
      localStorage.setItem('bc_username', getUsername());
      G.lastSavedScore = { name: getUsername(), score: mg2Score };
      if      (result.status === 'new_best')  { btn.textContent = '🏆 New Personal Best! Redirecting...'; const p=ov.querySelector('p'); if(p)p.innerHTML+=`<br>🎉 Beat your prev best of ${result.prev}!`; }
      else if (result.status === 'first')     { btn.textContent = '✅ Score Saved! Redirecting...'; }
      else if (result.status === 'not_best')  { btn.textContent = `📊 Best is still ${result.best} 💪`; }
      else { btn.textContent = '❌ Save Failed — tap to retry'; btn.disabled = false; return; }
      setTimeout(() => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); showScreen('s-leaderboard'); loadLB('minigame-l2'); }, 2000);
    };
    document.getElementById('mg2RestartBtn').onclick = () => { ov.remove(); if(mg2AnimationId){cancelAnimationFrame(mg2AnimationId);mg2AnimationId=null;} showMG2Overlay('start'); };
    document.getElementById('mg2Level3Btn').onclick  = () => { ov.remove(); startLevel3(); };
    document.getElementById('mg2ShareBtn')?.addEventListener('click', () => shareMiniGameResult(2, mg2Score, mg2MaxCombo, mg2Hits));
    document.getElementById('mg2MenuBtn').onclick    = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };

  } else if (type === 'gameover') {
    ov.innerHTML = `
      <h2 style="color:#e8c96a;">🪨 God's Champion Rises!</h2>
      <p style="font-style:italic;color:#d4c4a0;">"The righteous may fall seven times, but they rise again."<br><span style="font-size:11px;color:#b8a880;">— Proverbs 24:16</span></p>
      <p>Score: ${mg2Score}<br><span style="color:#ffcc88;font-size:12px;">The shield is strong — but David's God is stronger. Try again!</span></p>
      <button id="mg2RestartBtn">⚔️ Rise Again</button>
      <button id="mg2MenuBtn">Back to Menu</button>
    `;
    document.body.appendChild(ov);
    document.getElementById('mg2RestartBtn').onclick = () => { ov.remove(); if(mg2AnimationId){cancelAnimationFrame(mg2AnimationId);mg2AnimationId=null;} showMG2Overlay('start'); };
    document.getElementById('mg2MenuBtn').onclick    = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };
  }
}

// ═══════════════════════════════════════════════════════════════
//  showSubscriptionGate
// ═══════════════════════════════════════════════════════════════
function showSubscriptionGate() {
  let ov = document.querySelector('.mg-full-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'mg-full-overlay';
  ov.innerHTML = `
    <div style="font-size:52px;margin-bottom:4px;">🔒</div>
    <h2 style="color:#e8c96a;margin-bottom:6px;">Level 2 Locked</h2>
    <p style="max-width:280px;font-size:13px;line-height:1.7;margin-bottom:12px;">
      You've defeated Goliath! Now face his Shield Bearer.<br>
      Unlock all premium levels with a one-time purchase.
    </p>
    <div class="sub-gate-price">
      <div class="sub-gate-amount">$2.99</div>
      <div class="sub-gate-label">One-Time · All Levels · Ad-Free</div>
    </div>
    <button class="sub-pay-btn" id="subPayBtn">🙏 Unlock Now — $2.99</button>
    <button id="subDevBtn" style="background:rgba(80,80,80,0.4);color:#666;font-size:10px;padding:5px 14px;border:none;border-radius:4px;cursor:pointer;margin-top:2px;">
      [Dev Mode] Unlock Free
    </button>
    <button id="subCancelBtn" style="background:#2a2a2a;color:#888;margin-top:4px;">✕ Not Now</button>
  `;
  document.body.appendChild(ov);

  document.getElementById('subPayBtn').onclick = () => {
    alert('Payment coming soon! Use [Dev Mode] to test Level 2 for now.');
  };
  document.getElementById('subDevBtn').onclick    = () => { unlockPremium(); ov.remove(); startLevel2(); };
  document.getElementById('subCancelBtn').onclick = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };
}

// ═══════════════════════════════════════════════════════════════
//  startLevel2 — entry point
// ═══════════════════════════════════════════════════════════════
function startLevel2() {
  if (!isLevel1Beaten()) {
    let ov = document.querySelector('.mg-full-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.className = 'mg-full-overlay';
    ov.innerHTML = `
      <div style="font-size:48px;">🏆</div>
      <h2>Beat Level 1 First!</h2>
      <p>Defeat Goliath in Level 1 to unlock Level 2.</p>
      <button id="goL1Btn">Play Level 1</button>
      <button id="cancelL2Btn" style="background:#333;color:#aaa;">✕ Cancel</button>
    `;
    document.body.appendChild(ov);
    document.getElementById('goL1Btn').onclick    = () => { ov.remove(); showMGOverlay('start'); };
    document.getElementById('cancelL2Btn').onclick = () => { ov.remove(); exitMiniGame(); };
    return;
  }

  if (!isLevel2Unlocked()) { showSubscriptionGate(); return; }

  mgCurrentLevel = 2;
  if (mgAnimationId)  { cancelAnimationFrame(mgAnimationId);  mgAnimationId  = null; }
  if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
  showMG2Overlay('start');
}
