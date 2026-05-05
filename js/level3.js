// ═══════════════════════════════════════════════════════════════
//  LEVEL3.JS — The Valley of Elah: Night Battle (Level 3)
//  Functions: resetMG3, updateMG3UI, fireMGStone3, spawnMG3Torch,
//             updateMG3, drawMG3, mgGameLoop3, showMG3Overlay,
//             startLevel3
//  Depends on: minigame.js (shared mg* globals, stone/pause helpers)
//              level2.js   (mg2ShieldBearer, mg2Shields,
//                           mg2BatchSize, mg2BatchCooldown,
//                           mg2SbBatch, mg2SbCooldown,
//                           showSubscriptionGate)
//              core.js     (SoundFX, spawn, spawnConfetti, fsSavePersonalBest)
//              user.js     (mgCurrentLevel, isLevel2Beaten, isLevel2Unlocked,
//                           markLevel3Beaten)
//              quiz.js     (getUsername, G, loadLB, shareMiniGameResult)
// ═══════════════════════════════════════════════════════════════

// ── Level 3 state ─────────────────────────────────────────────
let mg3SlingshotSoldier = null;
let mg3SoldierStones    = [];
let mg3Torches          = [];
let mg3TorchLit         = false;
let mg3TorchTimer       = 0;
let mg3Lives, mg3Score, mg3Hits, mg3Combo, mg3MaxCombo;
let mg3Phase            = 'idle';
let mg3Frame            = 0;
let mg3Shake            = 0;
let mg3BatchSize        = 0, mg3BatchCooldown = 0;
let mg3SbCooldown       = 0;
let mg3SoldierCooldown  = 0;
let mg3TorchSpawnTimer  = 0;
let mg3AnimationId      = null;
let mg3LastTimestamp    = 0;

// ═══════════════════════════════════════════════════════════════
//  resetMG3
// ═══════════════════════════════════════════════════════════════
function resetMG3() {
  mgDavid   = { x: 70, y: mgHeight / 2, w: 40, h: 60, speed: 9 };
  mgGoliath = { x: Math.min(mgWidth - 130, 560), y: mgHeight - 180, w: 70, h: 110,
                speed: 1.5, walkDir: 1, rage: false, state: 'GUARDING', stateTimer: 3500 };
  mgStone   = { active: false, x: 0, y: 0, vx: 0, vy: 0, charge: 0, trail: [] };
  mgJavelins = []; mg2Shields = [];
  mg3SoldierStones = []; mg3Torches = [];

  mg2ShieldBearer = {
    x: mgWidth / 2 - 18, y: mgHeight - 160,
    w: 36, h: 80, speed: 1.6, walkDir: 1,
    state: 'BLOCKING', staggerTimer: 0, hits: 0,
    shieldW: 32, shieldH: 54,
  };

  mg3SlingshotSoldier = {
    x: mgWidth * 0.62, y: mgHeight - 148,
    w: 28, h: 55, speed: 1.8, walkDir: -1,
    state: 'ACTIVE', stunnedTimer: 0, hits: 0, dead: false,
  };

  mg3Lives = 2; mg3Score = 0; mg3Hits = 0; mg3Combo = 0; mg3MaxCombo = 0;
  mg3Phase = 'play'; mg3Frame = 0; mg3Shake = 0;
  mg3BatchSize = 0; mg3BatchCooldown = 0;
  mg3SbCooldown = 0; mg3SoldierCooldown = 3000;
  mg3TorchSpawnTimer = 6000;
  mg3TorchLit = false; mg3TorchTimer = 0;
  mgAngle = 0; mgChargeActive = false;
  mgMoveLeft = false; mgMoveRight = false; mgMoveUp = false; mgMoveDown = false;
  mgJoyVX = 0; mgJoyVY = 0; mgJoyActive = false;
  initStones(3);
  updateMG3UI();
}

function updateMG3UI() {
  document.getElementById('mgLives').innerHTML = '❤️'.repeat(mg3Lives) + '🖤'.repeat(Math.max(0, 2 - mg3Lives));
  document.getElementById('mgScore').innerText  = mg3Score;
  const sb = mg2ShieldBearer, sol = mg3SlingshotSoldier;
  let badge = mgGoliath ? mgGoliath.state : '';
  if (sb  && sb.state  === 'STAGGERED') badge  = '⚡ SHIELD DOWN!';
  if (sol && sol.dead)                  badge += ' | ✓ SOLDIER SLAIN';
  else if (sol && sol.state === 'STUNNED') badge += ' | 💫 STUNNED';
  if (mg3TorchLit) badge = '🔥 TORCH! ' + badge;
  document.getElementById('mgStateBadge').innerText = badge;
  updateStoneUI();
}

function fireMGStone3() {
  if (mgStone.active || mg3Phase !== 'play') return;
  const power = 7 + Math.min(mgStone.charge, 60) * 0.15;
  mgStone.active = true;
  mgStone.x  = mgDavid.x + mgDavid.w - 5;
  mgStone.y  = mgDavid.y + 30;
  mgStone.vx = Math.cos(mgAngle) * power;
  mgStone.vy = Math.sin(mgAngle) * power;
  mgStone.charge = 0;
  SoundFX.play('throw');
}

function spawnMG3Torch() {
  if (mg3Torches.length >= 1) return;
  mg3Torches.push({ x: 130 + Math.random()*(mgWidth-320), y: mgHeight-100-Math.random()*60, pulse: 0, flicker: 0 });
}

// ═══════════════════════════════════════════════════════════════
//  updateMG3
// ═══════════════════════════════════════════════════════════════
function updateMG3(delta) {
  if (mg3Phase !== 'play') return;
  mg3Frame++;

  if (mg3TorchLit) { mg3TorchTimer -= delta; if (mg3TorchTimer <= 0) { mg3TorchLit = false; updateMG3UI(); } }

  let moveX = mgJoyVX !== 0 ? mgJoyVX : (mgMoveRight ? 1 : mgMoveLeft ? -1 : 0);
  let moveY = mgJoyVY !== 0 ? mgJoyVY : (mgMoveDown  ? 1 : mgMoveUp   ? -1 : 0);
  if (moveX !== 0 && moveY !== 0 && mgJoyVX === 0) { moveX *= 0.707; moveY *= 0.707; }
  const kbMult3 = mgJoyActive ? 1.0 : 1.2;
  mgDavid.x = Math.max(40, Math.min(mgWidth - mgDavid.w - 40, mgDavid.x + moveX * mgDavid.speed * kbMult3));
  mgDavid.y = Math.max(60, Math.min(mgHeight - mgDavid.h - 60, mgDavid.y + moveY * mgDavid.speed * kbMult3));
  if (mgGraceTimer > 0) mgGraceTimer -= delta;

  if (mgChargeActive && !mgStone.active)
    mgStone.charge = Math.min(60, (mgStone.charge || 0) + 1.5);

  // Goliath AI
  if (mgGoliath.stateTimer > 0) mgGoliath.stateTimer -= delta;
  else {
    const r = Math.random();
    mgGoliath.state = mgGoliath.rage
      ? (r < 0.55 ? 'TAUNTING' : r < 0.8 ? 'WINDING_UP' : 'GUARDING')
      : (r < 0.3  ? 'TAUNTING' : r < 0.5 ? 'WINDING_UP' : 'GUARDING');
    mgGoliath.stateTimer = mgGoliath.state === 'TAUNTING' ? 1500 : mgGoliath.state === 'WINDING_UP' ? 1200 : 2800;
    updateMG3UI();
  }
  mgGoliath.x += mgGoliath.walkDir * mgGoliath.speed;
  if (mgGoliath.x < mgWidth - 280) mgGoliath.walkDir =  1;
  if (mgGoliath.x > mgWidth - 85)  mgGoliath.walkDir = -1;
  mgGoliath.y = mgHeight - 180;

  // Shield Bearer
  const sb = mg2ShieldBearer;
  if (sb.state === 'STAGGERED') {
    sb.staggerTimer -= delta;
    if (sb.staggerTimer <= 0) { sb.state = 'BLOCKING'; sb.hits = 0; updateMG3UI(); }
  } else {
    const mid   = (mgDavid.x + mgGoliath.x) / 2;
    const sbMid = sb.x + sb.w / 2;
    if (sbMid < mid - 25) sb.x += sb.speed; else if (sbMid > mid + 25) sb.x -= sb.speed;
    sb.x += Math.sin(mg3Frame * 0.04) * 0.5;
    sb.x  = Math.max(140, Math.min(mgWidth - 200, sb.x));
    sb.y  = mgHeight - 160;
  }

  // Slingshot Soldier
  const sol = mg3SlingshotSoldier;
  if (!sol.dead) {
    if (sol.state === 'STUNNED') {
      sol.stunnedTimer -= delta;
      if (sol.stunnedTimer <= 0) { sol.state = 'ACTIVE'; updateMG3UI(); }
    } else {
      sol.x += sol.walkDir * sol.speed;
      if (sol.x < mgWidth * 0.5) sol.walkDir =  1;
      if (sol.x > mgWidth - 110) sol.walkDir = -1;
      const dist3 = Math.abs(mgDavid.x - sol.x);
      if (dist3 < 120) sol.x += (sol.x > mgDavid.x ? 1.5 : -1.5);
      sol.x = Math.max(mgWidth * 0.38, Math.min(mgWidth - 80, sol.x));
      sol.y = mgHeight - 148;
      mg3SoldierCooldown -= delta;
      if (mg3SoldierCooldown <= 0) {
        const sx3 = sol.x, sy3 = sol.y + 20, tx3 = mgDavid.x + mgDavid.w / 2, ty3 = mgDavid.y + mgDavid.h / 2;
        const d3  = Math.hypot(tx3 - sx3, ty3 - sy3);
        const spd3 = 3.5 + (mgGoliath.rage ? 0.8 : 0);
        mg3SoldierStones.push({ x: sx3, y: sy3, vx: (tx3-sx3)/d3*spd3, vy: (ty3-sy3)/d3*spd3, trail: [] });
        mg3SoldierCooldown = mgGoliath.rage ? 2200 : 3500;
        SoundFX.beep(380, 0.07, 0.08);
      }
    }
  }

  // Torch spawn + collect
  mg3TorchSpawnTimer -= delta;
  if (mg3TorchSpawnTimer <= 0) { spawnMG3Torch(); mg3TorchSpawnTimer = 9000 + Math.random() * 6000; }
  for (let i = mg3Torches.length - 1; i >= 0; i--) {
    const t = mg3Torches[i]; t.pulse += 0.08; t.flicker += 0.18 + Math.random() * 0.05;
    if (Math.hypot(mgDavid.x + mgDavid.w/2 - t.x, mgDavid.y + mgDavid.h/2 - t.y) < 24) {
      mg3Torches.splice(i, 1); mg3TorchLit = true; mg3TorchTimer = 4500;
      if (sb.state !== 'STAGGERED')  { sb.state = 'STAGGERED'; sb.staggerTimer = 2500; }
      if (!sol.dead && sol.state !== 'STUNNED') { sol.state = 'STUNNED'; sol.stunnedTimer = 2500; }
      SoundFX.play('powerup'); spawn('🔥', 4); updateMG3UI();
    }
  }

  // Goliath javelins
  if (mg3BatchCooldown > 0) mg3BatchCooldown -= delta;
  else if (mg3BatchSize <= 0) { mg3BatchSize = mgGoliath.rage ? 5 : Math.floor(Math.random()*3) + 2; mg3BatchCooldown = 140; }
  else {
    const sx4 = mgGoliath.x-10, sy4 = mgGoliath.y+45, tx4 = mgDavid.x+mgDavid.w/2, ty4 = mgDavid.y+mgDavid.h/2;
    const d4  = Math.hypot(tx4-sx4, ty4-sy4), spd4 = 6 + (mgGoliath.rage ? 2 : 0);
    mgJavelins.push({ x: sx4, y: sy4, vx: (tx4-sx4)/d4*spd4, vy: (ty4-sy4)/d4*spd4, angle: Math.atan2(ty4-sy4, tx4-sx4) });
    mg3BatchSize--; mg3BatchCooldown = 180; if (mg3BatchSize === 0) mg3BatchCooldown = 1300;
  }

  // Shield Bearer throws
  if (sb.state !== 'STAGGERED') {
    if (mg3SbCooldown > 0) mg3SbCooldown -= delta;
    else {
      const sx5 = sb.x+sb.w/2, sy5 = sb.y+sb.h/2, tx5 = mgDavid.x+mgDavid.w/2, ty5 = mgDavid.y+mgDavid.h/2;
      const d5  = Math.hypot(tx5-sx5, ty5-sy5);
      mg2Shields.push({ x: sx5, y: sy5, vx: (tx5-sx5)/d5*3.2, vy: (ty5-sy5)/d5*3.2, angle: Math.atan2(ty5-sy5, tx5-sx5), rot: 0, w: 30, h: 20 });
      mg3SbCooldown = mgGoliath.rage ? 1600 : 2800;
    }
  }

  function davidHit3() {
    if (mgGraceTimer > 0) return;
    mg3Lives--; mg3Combo = 0; updateMG3UI(); mg3Shake = 10; SoundFX.play('hurt');
    if (mg3Lives <= 0) {
      if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
      showLifeRedemptionQuestion(
        () => { mg3Lives = 1; updateMG3UI(); mg3Phase = 'play'; mg3LastTimestamp = 0; mg3AnimationId = requestAnimationFrame(mgGameLoop3); },
        () => { mg3Phase = 'gameover'; showMG3Overlay('gameover'); }
      );
    }
  }

  for (let i = mgJavelins.length-1; i >= 0; i--) {
    const j = mgJavelins[i]; j.x += j.vx; j.y += j.vy;
    if (j.x > mgDavid.x && j.x < mgDavid.x+mgDavid.w && j.y > mgDavid.y && j.y < mgDavid.y+mgDavid.h) { mgJavelins.splice(i, 1); davidHit3(); }
    else if (j.x > mgWidth+100 || j.x < -100 || j.y > mgHeight+100 || j.y < -100) mgJavelins.splice(i, 1);
  }
  for (let i = mg2Shields.length-1; i >= 0; i--) {
    const s = mg2Shields[i]; s.x += s.vx; s.y += s.vy; s.rot += 0.14;
    if (s.x > mgDavid.x && s.x < mgDavid.x+mgDavid.w && s.y > mgDavid.y && s.y < mgDavid.y+mgDavid.h) { mg2Shields.splice(i, 1); davidHit3(); }
    else if (s.x > mgWidth+100 || s.x < -100 || s.y > mgHeight+100 || s.y < -100) mg2Shields.splice(i, 1);
  }
  for (let i = mg3SoldierStones.length-1; i >= 0; i--) {
    const ss = mg3SoldierStones[i]; ss.vy += 0.25; ss.x += ss.vx; ss.y += ss.vy;
    ss.trail.unshift({ x: ss.x, y: ss.y }); if (ss.trail.length > 4) ss.trail.pop();
    if (ss.x > mgDavid.x && ss.x < mgDavid.x+mgDavid.w && ss.y > mgDavid.y && ss.y < mgDavid.y+mgDavid.h) { mg3SoldierStones.splice(i, 1); davidHit3(); }
    else if (ss.x > mgWidth+100 || ss.x < -100 || ss.y > mgHeight+100 || ss.y < -100) mg3SoldierStones.splice(i, 1);
  }

  if (mgStone.active) {
    mgStone.x += mgStone.vx; mgStone.vy += 0.3; mgStone.y += mgStone.vy;
    mgStone.trail.unshift({ x: mgStone.x, y: mgStone.y }); if (mgStone.trail.length > 6) mgStone.trail.pop();

    // Hit soldier
    if (!sol.dead && sol.state !== 'STUNNED') {
      if (mgStone.x > sol.x && mgStone.x < sol.x+sol.w && mgStone.y > sol.y && mgStone.y < sol.y+sol.h) {
        sol.hits++; mg3Score += 120; mg3Combo++; if (mg3Combo > mg3MaxCombo) mg3MaxCombo = mg3Combo;
        SoundFX.play('hit'); mg3Shake = 8; mgStone.active = false; mgStone.trail = [];
        if (sol.hits >= 2) { sol.dead = true; mg3Score += 200; spawn('⭐', 3); SoundFX.beep(880, 0.2, 0.15); }
        else { sol.state = 'STUNNED'; sol.stunnedTimer = 2000; SoundFX.beep(660, 0.12); }
        updateMG3UI(); return;
      }
    }
    // Hit shield bearer
    if (sb.state !== 'STAGGERED') {
      const sx6 = sb.x-10, sy6 = sb.y+8, sw6 = sb.shieldW+12, sh6 = sb.shieldH;
      if (mgStone.x > sx6 && mgStone.x < sx6+sw6 && mgStone.y > sy6 && mgStone.y < sy6+sh6) {
        sb.hits++; SoundFX.play('armoured'); mgStone.active = false; mgStone.trail = [];
        mg3Combo = Math.max(0, mg3Combo - 1);
        if (sb.hits >= 2) { sb.state = 'STAGGERED'; sb.staggerTimer = 1800; mg3Score += 60; SoundFX.beep(880, 0.15); updateMG3UI(); }
        return;
      }
    }
    // Hit Goliath forehead
    const fx6 = mgGoliath.x+8, fy6 = mgGoliath.y+2, fw6 = mgGoliath.w-16, fh6 = 22;
    if (mgStone.x > fx6 && mgStone.x < fx6+fw6 && mgStone.y > fy6 && mgStone.y < fy6+fh6) {
      const isSt  = Math.abs(Math.atan2(mgStone.vy, mgStone.vx)) < 0.3;
      const arced = sb.state !== 'STAGGERED' && mgStone.y < sb.y;
      let canHit = false;
      if (mgGoliath.state === 'TAUNTING' || mgGoliath.state === 'WINDING_UP' || mgGoliath.state === 'STUNNED') canHit = true;
      if ((mgGoliath.state === 'GUARDING' || mgGoliath.state === 'RAGE') && !isSt) canHit = true;
      if (canHit) {
        let pts = 250 + Math.floor(mgStone.charge * 6) + (arced ? 100 : 0) + (sol.dead ? 80 : 0);
        mg3Score += pts; mg3Combo++; if (mg3Combo > mg3MaxCombo) mg3MaxCombo = mg3Combo;
        mg3Hits++; SoundFX.play('hit'); mg3Shake = 16;
        mgStone.active = false; mgStone.trail = []; spawn(arced ? '🌟' : '✨', arced ? 6 : 3); updateMG3UI();
        if (mg3Hits >= 3) {
          mg3Phase = 'victory';
          if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
          showMG3Overlay('victory');
        } else { mgGoliath.state = 'STUNNED'; mgGoliath.stateTimer = 1400; mgGoliath.rage = true; }
      } else {
        SoundFX.play('armoured'); mgStone.active = false; mgStone.trail = [];
        mg3Combo = Math.max(0, mg3Combo - 1); updateMG3UI();
      }
      return;
    }
    // Hit Goliath body
    const bx6 = mgGoliath.x+4, by6 = mgGoliath.y+30, bw6 = mgGoliath.w-8, bh6 = mgGoliath.h-50;
    if (mgStone.x > bx6 && mgStone.x < bx6+bw6 && mgStone.y > by6 && mgStone.y < by6+bh6) {
      SoundFX.play('armoured'); mgStone.active = false; mgStone.trail = [];
      mg3Combo = Math.max(0, mg3Combo - 1); updateMG3UI(); return;
    }
    if (mgStone.x > mgWidth+100 || mgStone.x < -100 || mgStone.y > mgHeight+100 || mgStone.y < -100) {
      mgStone.active = false; mgStone.trail = []; mg3Combo = Math.max(0, mg3Combo - 1); updateMG3UI();
    }
  }
  if (mg3Shake > 0.3) mg3Shake *= 0.84;
}

// ═══════════════════════════════════════════════════════════════
//  drawMG3
// ═══════════════════════════════════════════════════════════════
function drawMG3() {
  mgCtx.clearRect(0, 0, mgWidth, mgHeight);
  mgCtx.save();
  if (mg3Shake > 0.5) mgCtx.translate((Math.random()-0.5)*mg3Shake, (Math.random()-0.5)*mg3Shake);

  // Night sky
  const nightSky = mgCtx.createLinearGradient(0, 0, 0, mgHeight);
  nightSky.addColorStop(0,   mgGoliath.rage ? '#1a0000' : '#020510');
  nightSky.addColorStop(0.6, mgGoliath.rage ? '#280800' : '#050c1a');
  nightSky.addColorStop(1,   '#0a0804');
  mgCtx.fillStyle = nightSky; mgCtx.fillRect(0, 0, mgWidth, mgHeight);

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx7 = ((42*(i+1)*137 + i*91) % mgWidth);
    const sy7 = ((42*(i+1)*53  + i*71) % (mgHeight * 0.55));
    mgCtx.globalAlpha = (0.4 + 0.6 * Math.sin(mg3Frame * 0.03 + i)) * 0.8;
    mgCtx.fillStyle   = 'rgba(255,255,240,0.8)';
    mgCtx.beginPath(); mgCtx.arc(sx7, sy7, i % 3 === 0 ? 1.5 : 1, 0, Math.PI*2); mgCtx.fill();
  }
  mgCtx.globalAlpha = 1;

  // Moon
  mgCtx.fillStyle = '#fffde0';
  mgCtx.beginPath(); mgCtx.arc(mgWidth-70, 55, 28, 0, Math.PI*2); mgCtx.fill();

  // Torch glow on David
  if (mg3TorchLit) {
    const pct7 = mg3TorchTimer / 4500;
    const tg7  = mgCtx.createRadialGradient(mgDavid.x+mgDavid.w/2, mgDavid.y+mgDavid.h/2, 0, mgDavid.x+mgDavid.w/2, mgDavid.y+mgDavid.h/2, mgWidth*0.7);
    tg7.addColorStop(0,   `rgba(255,160,40,${0.18*pct7})`);
    tg7.addColorStop(0.4, `rgba(255,100,10,${0.09*pct7})`);
    tg7.addColorStop(1,   'rgba(0,0,0,0)');
    mgCtx.fillStyle = tg7; mgCtx.fillRect(0, 0, mgWidth, mgHeight);
  }

  // Ground
  const grd7 = mgCtx.createLinearGradient(0, mgHeight-80, 0, mgHeight);
  grd7.addColorStop(0, '#1c1008'); grd7.addColorStop(1, '#0a0600');
  mgCtx.fillStyle = grd7; mgCtx.fillRect(0, mgHeight-80, mgWidth, 80);
  mgCtx.fillStyle = 'rgba(15,8,3,0.9)';
  mgCtx.beginPath(); mgCtx.ellipse(100, mgHeight-90, 170, 55, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(mgWidth-130, mgHeight-95, 210, 58, 0, 0, Math.PI*2); mgCtx.fill();

  // Ambient firelights
  [[120, mgHeight-75], [mgWidth-160, mgHeight-78], [mgWidth*0.5, mgHeight-72]].forEach(([fx7, fy7]) => {
    const flk7 = 0.8 + Math.sin(mg3Frame * 0.12 + fx7) * 0.2;
    const fg7  = mgCtx.createRadialGradient(fx7, fy7, 0, fx7, fy7, 40*flk7);
    fg7.addColorStop(0, 'rgba(255,140,20,0.55)'); fg7.addColorStop(0.5, 'rgba(255,80,0,0.2)'); fg7.addColorStop(1, 'rgba(0,0,0,0)');
    mgCtx.fillStyle = fg7; mgCtx.beginPath(); mgCtx.arc(fx7, fy7, 40*flk7, 0, Math.PI*2); mgCtx.fill();
  });

  // Collectible torches
  for (const t of mg3Torches) {
    const flk8 = 0.85 + Math.sin(t.flicker) * 0.15;
    mgCtx.fillStyle = '#5a3a10'; mgCtx.fillRect(t.x-3, t.y, 6, 22);
    const tg8 = mgCtx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 30*flk8);
    tg8.addColorStop(0, 'rgba(255,200,60,0.95)'); tg8.addColorStop(0.3, 'rgba(255,100,10,0.7)'); tg8.addColorStop(1, 'rgba(255,60,0,0)');
    mgCtx.fillStyle = tg8; mgCtx.beginPath(); mgCtx.arc(t.x, t.y, 30*flk8, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = 'rgba(255,220,100,0.95)'; mgCtx.beginPath(); mgCtx.arc(t.x, t.y, 6*flk8, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = 'rgba(255,200,60,0.85)'; mgCtx.font = '13px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText('🔥 TORCH', t.x, t.y-35);
  }

  // ── Slingshot Soldier ────────────────────────────────────────
  const sol7 = mg3SlingshotSoldier;
  if (!sol7.dead) {
    const stunned7 = sol7.state === 'STUNNED';
    if (stunned7 && Math.sin(mg3Frame * 0.5) > 0) mgCtx.globalAlpha = 0.4;
    mgCtx.fillStyle = 'rgba(0,0,0,0.3)'; mgCtx.beginPath(); mgCtx.ellipse(sol7.x+sol7.w/2, sol7.y+sol7.h+3, 14, 4, 0, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = stunned7 ? '#3a2808' : '#2a1e0e'; mgCtx.beginPath(); mgCtx.roundRect(sol7.x+3, sol7.y+18, sol7.w-6, sol7.h-18, 3); mgCtx.fill();
    mgCtx.fillStyle = stunned7 ? '#6a4020' : '#4a3010'; mgCtx.beginPath(); mgCtx.arc(sol7.x+sol7.w/2, sol7.y+10, 10, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = '#2a1808'; mgCtx.beginPath(); mgCtx.arc(sol7.x+sol7.w/2, sol7.y+6, 10, Math.PI, 2*Math.PI); mgCtx.fill();
    mgCtx.fillStyle = stunned7 ? '#555' : '#ff6600';
    mgCtx.beginPath(); mgCtx.ellipse(sol7.x+sol7.w/2-4, sol7.y+10, 2.5, 2, 0, 0, Math.PI*2); mgCtx.fill();
    mgCtx.beginPath(); mgCtx.ellipse(sol7.x+sol7.w/2+4, sol7.y+10, 2.5, 2, 0, 0, Math.PI*2); mgCtx.fill();
    mgCtx.strokeStyle = stunned7 ? '#555' : '#8a6020'; mgCtx.lineWidth = 1.5;
    mgCtx.beginPath(); mgCtx.moveTo(sol7.x-2, sol7.y+22); mgCtx.lineTo(sol7.x-12, sol7.y+10); mgCtx.stroke();
    mgCtx.globalAlpha = 1;
    mgCtx.fillStyle = stunned7 ? 'rgba(100,180,255,0.8)' : 'rgba(255,120,40,0.8)';
    mgCtx.font = 'bold 8px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText(stunned7 ? '💫 STUNNED' : '🗡️ SOLDIER', sol7.x+sol7.w/2, sol7.y-6);
    for (let h = 0; h < sol7.hits; h++) { mgCtx.fillStyle = '#cc1800'; mgCtx.beginPath(); mgCtx.arc(sol7.x+8+h*9, sol7.y+2, 3, 0, Math.PI*2); mgCtx.fill(); }
    mgCtx.globalAlpha = 1;
  }

  // ── Shield Bearer ────────────────────────────────────────────
  const sb7 = mg2ShieldBearer, stag7 = sb7.state === 'STAGGERED';
  if (stag7 && Math.sin(mg3Frame * 0.4) > 0) mgCtx.globalAlpha = 0.4;
  mgCtx.fillStyle = 'rgba(0,0,0,0.25)'; mgCtx.beginPath(); mgCtx.ellipse(sb7.x+sb7.w/2, sb7.y+sb7.h+4, 18, 5, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = stag7 ? '#6a3a18' : '#3e2e10'; mgCtx.beginPath(); mgCtx.roundRect(sb7.x+4, sb7.y+20, sb7.w-8, sb7.h-20, 3); mgCtx.fill();
  mgCtx.fillStyle = stag7 ? '#8a5838' : '#5a4018'; mgCtx.beginPath(); mgCtx.arc(sb7.x+sb7.w/2, sb7.y+12, 12, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#3a2010'; mgCtx.beginPath(); mgCtx.arc(sb7.x+sb7.w/2, sb7.y+7, 12, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillStyle = stag7 ? '#777' : '#cc1800';
  mgCtx.beginPath(); mgCtx.ellipse(sb7.x+sb7.w/2-5, sb7.y+12, 3, 2.5, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(sb7.x+sb7.w/2+5, sb7.y+12, 3, 2.5, 0, 0, Math.PI*2); mgCtx.fill();
  if (!stag7) {
    const shX7 = sb7.x-12, shY7 = sb7.y+8;
    const ssg7 = mgCtx.createLinearGradient(shX7, shY7, shX7+sb7.shieldW, shY7);
    ssg7.addColorStop(0, '#5a4020'); ssg7.addColorStop(0.5, '#a08030'); ssg7.addColorStop(1, '#5a4020');
    mgCtx.fillStyle = ssg7; mgCtx.beginPath(); mgCtx.roundRect(shX7, shY7, sb7.shieldW, sb7.shieldH, 5); mgCtx.fill();
    mgCtx.strokeStyle = '#c09040'; mgCtx.lineWidth = 2; mgCtx.stroke();
    mgCtx.beginPath(); mgCtx.moveTo(shX7+sb7.shieldW/2, shY7+7); mgCtx.lineTo(shX7+sb7.shieldW/2, shY7+sb7.shieldH-7);
    mgCtx.moveTo(shX7+5, shY7+sb7.shieldH/2); mgCtx.lineTo(shX7+sb7.shieldW-5, shY7+sb7.shieldH/2); mgCtx.stroke();
    mgCtx.fillStyle = 'rgba(220,180,50,0.75)'; mgCtx.font = 'bold 9px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText('⛨ SHIELDED', sb7.x+sb7.w/2, sb7.y-7);
  } else {
    mgCtx.font = '13px serif'; mgCtx.textAlign = 'center'; mgCtx.fillText('⭐⭐', sb7.x+sb7.w/2, sb7.y-8);
    mgCtx.fillStyle = 'rgba(120,210,255,0.9)'; mgCtx.font = 'bold 9px "Cinzel",monospace';
    mgCtx.fillText('STAGGERED!', sb7.x+sb7.w/2, sb7.y-22);
  }
  for (let h = 0; h < sb7.hits; h++) { mgCtx.fillStyle = '#cc1800'; mgCtx.beginPath(); mgCtx.arc(sb7.x+6+h*10, sb7.y+3, 4, 0, Math.PI*2); mgCtx.fill(); }
  mgCtx.globalAlpha = 1;

  // ── David ────────────────────────────────────────────────────
  const d7 = mgDavid;
  mgCtx.fillStyle = 'rgba(0,0,0,0.3)'; mgCtx.beginPath(); mgCtx.ellipse(d7.x+d7.w/2, d7.y+d7.h+4, 20, 6, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#8b6914'; mgCtx.beginPath(); mgCtx.roundRect(d7.x+5, d7.y+22, d7.w-10, d7.h-22, 4); mgCtx.fill();
  mgCtx.fillStyle = '#a07820'; mgCtx.fillRect(d7.x+5, d7.y+22, d7.w-10, 8);
  mgCtx.fillStyle = '#c8a060';
  mgCtx.fillRect(d7.x-5, d7.y+24, 10, 20); mgCtx.fillRect(d7.x+d7.w-5, d7.y+24, 10, 20);
  mgCtx.beginPath(); mgCtx.arc(d7.x+d7.w/2, d7.y+12, 14, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#5a3010'; mgCtx.beginPath(); mgCtx.arc(d7.x+d7.w/2, d7.y+6, 14, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillStyle = '#2a1800';
  mgCtx.fillRect(d7.x+d7.w/2-6, d7.y+11, 4, 3); mgCtx.fillRect(d7.x+d7.w/2+2, d7.y+11, 4, 3);
  mgCtx.strokeStyle = mgChargeActive ? '#ffaa00' : '#8b6914'; mgCtx.lineWidth = 2;
  mgCtx.beginPath(); mgCtx.moveTo(d7.x+d7.w-5, d7.y+30); mgCtx.lineTo(d7.x+d7.w+15, d7.y+24); mgCtx.stroke();
  mgCtx.fillStyle = mgChargeActive ? '#ffaa00' : '#a07820';
  mgCtx.fillRect(d7.x+d7.w+10, d7.y+21, 8, 6);
  if (mg3TorchLit) {
    const dg7 = mgCtx.createRadialGradient(d7.x+d7.w/2, d7.y+d7.h/2, 0, d7.x+d7.w/2, d7.y+d7.h/2, 38);
    dg7.addColorStop(0, 'rgba(255,160,40,0.28)'); dg7.addColorStop(1, 'rgba(0,0,0,0)');
    mgCtx.fillStyle = dg7; mgCtx.beginPath(); mgCtx.arc(d7.x+d7.w/2, d7.y+d7.h/2, 38, 0, Math.PI*2); mgCtx.fill();
  }
  mgCtx.fillStyle = 'rgba(255,220,100,0.9)'; mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'center';
  mgCtx.fillText('DAVID', d7.x+d7.w/2, d7.y-8);
  if (mgGraceTimer > 0 && Math.sin(mg3Frame * 0.5) > 0) {
    mgCtx.save();
    mgCtx.globalAlpha = 0.35 + 0.25 * Math.sin(mg3Frame * 0.4);
    mgCtx.strokeStyle = '#ffe066'; mgCtx.lineWidth = 3;
    mgCtx.beginPath(); mgCtx.ellipse(d7.x+d7.w/2, d7.y+d7.h/2, d7.w/2+10, d7.h/2+10, 0, 0, Math.PI*2);
    mgCtx.stroke(); mgCtx.restore();
  }

  // ── Goliath ──────────────────────────────────────────────────
  const g7 = mgGoliath;
  mgCtx.fillStyle = 'rgba(0,0,0,0.4)'; mgCtx.beginPath(); mgCtx.ellipse(g7.x+g7.w/2, g7.y+g7.h+6, 32, 10, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle = '#4a3010';
  mgCtx.fillRect(g7.x+8, g7.y+g7.h-20, 20, 20); mgCtx.fillRect(g7.x+g7.w-28, g7.y+g7.h-20, 20, 20);
  const bg7 = mgCtx.createLinearGradient(g7.x, g7.y+25, g7.x+g7.w, g7.y+25);
  bg7.addColorStop(0, '#6a5030'); bg7.addColorStop(0.5, g7.rage ? '#c05010' : '#9a7840'); bg7.addColorStop(1, '#6a5030');
  mgCtx.fillStyle = bg7; mgCtx.beginPath(); mgCtx.roundRect(g7.x+4, g7.y+30, g7.w-8, g7.h-50, 6); mgCtx.fill();
  mgCtx.strokeStyle = 'rgba(80,60,20,0.4)'; mgCtx.lineWidth = 1;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) { mgCtx.beginPath(); mgCtx.arc(g7.x+12+col*14, g7.y+42+row*14, 6, 0, Math.PI); mgCtx.stroke(); }
  mgCtx.fillStyle = '#907030';
  mgCtx.fillRect(g7.x-8, g7.y+30, 14, 36); mgCtx.fillRect(g7.x+g7.w-6, g7.y+30, 14, 36);
  const hg7 = mgCtx.createLinearGradient(g7.x, g7.y, g7.x+g7.w, g7.y);
  hg7.addColorStop(0, '#6a5030'); hg7.addColorStop(0.5, '#b09050'); hg7.addColorStop(1, '#6a5030');
  mgCtx.fillStyle = hg7; mgCtx.beginPath(); mgCtx.arc(g7.x+g7.w/2, g7.y+16, g7.w/2-6, Math.PI, 2*Math.PI); mgCtx.fill();
  mgCtx.fillRect(g7.x+4, g7.y+16, g7.w-8, 18);
  mgCtx.fillStyle = '#a07050'; mgCtx.fillRect(g7.x+12, g7.y+16, g7.w-24, 22);
  const er7 = g7.rage ? 255 : g7.state === 'TAUNTING' ? 220 : g7.state === 'WINDING_UP' ? 160 : 90;
  mgCtx.fillStyle = `rgb(${er7},15,0)`;
  mgCtx.beginPath(); mgCtx.ellipse(g7.x+g7.w/2-10, g7.y+24, 5, 4, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.beginPath(); mgCtx.ellipse(g7.x+g7.w/2+10, g7.y+24, 5, 4, 0, 0, Math.PI*2); mgCtx.fill();
  mgCtx.strokeStyle = `rgba(255,80,0,${0.35 + Math.sin(mg3Frame * 0.12) * 0.2})`; mgCtx.lineWidth = 2; mgCtx.setLineDash([4, 4]);
  mgCtx.strokeRect(g7.x+10, g7.y+2, g7.w-20, 22); mgCtx.setLineDash([]);
  for (let h = 0; h < mg3Hits; h++) { mgCtx.fillStyle = '#cc2200'; mgCtx.beginPath(); mgCtx.arc(g7.x+g7.w/2+(h-1)*12, g7.y+12, 5, 0, Math.PI*2); mgCtx.fill(); }
  mgCtx.fillStyle = '#8b6914'; mgCtx.fillRect(g7.x-12, g7.y+25, 6, 80);
  mgCtx.fillStyle = '#c0c0c0';
  mgCtx.beginPath(); mgCtx.moveTo(g7.x-12, g7.y+25); mgCtx.lineTo(g7.x-6, g7.y+25); mgCtx.lineTo(g7.x-9, g7.y+5); mgCtx.closePath(); mgCtx.fill();
  mgCtx.fillStyle = g7.rage ? 'rgba(255,60,60,0.95)' : 'rgba(255,80,60,0.85)';
  mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'center';
  mgCtx.fillText(g7.rage ? '⚡ GOLIATH ⚡' : 'GOLIATH', g7.x+g7.w/2, g7.y-10);
  mgCtx.fillStyle = 'rgba(255,200,100,0.7)'; mgCtx.font = '13px "Cinzel",monospace';
  mgCtx.fillText('▲ AIM HERE', g7.x+g7.w/2, g7.y+1);

  // ── Projectiles ──────────────────────────────────────────────
  for (const j of mgJavelins) {
    mgCtx.save(); mgCtx.translate(j.x, j.y); mgCtx.rotate(j.angle);
    mgCtx.fillStyle = '#6b5010'; mgCtx.fillRect(0, -2, 28, 4);
    mgCtx.fillStyle = '#a0a0a0';
    mgCtx.beginPath(); mgCtx.moveTo(28, -5); mgCtx.lineTo(38, 0); mgCtx.lineTo(28, 5); mgCtx.closePath(); mgCtx.fill();
    mgCtx.restore();
  }
  for (const s of mg2Shields) {
    mgCtx.save(); mgCtx.translate(s.x, s.y); mgCtx.rotate(s.rot);
    mgCtx.fillStyle = '#6a5020'; mgCtx.strokeStyle = '#a08030'; mgCtx.lineWidth = 2;
    mgCtx.beginPath(); mgCtx.roundRect(-s.w/2, -s.h/2, s.w, s.h, 4); mgCtx.fill(); mgCtx.stroke();
    mgCtx.fillStyle = '#c09040'; mgCtx.beginPath(); mgCtx.arc(0, 0, 5, 0, Math.PI*2); mgCtx.fill();
    mgCtx.restore();
  }
  for (const ss of mg3SoldierStones) {
    for (let i = 0; i < ss.trail.length; i++) { mgCtx.globalAlpha = 0.4 - i*0.1; mgCtx.fillStyle = '#cc8833'; mgCtx.beginPath(); mgCtx.arc(ss.trail[i].x, ss.trail[i].y, 4-i, 0, Math.PI*2); mgCtx.fill(); }
    mgCtx.globalAlpha = 1; mgCtx.fillStyle = '#886622'; mgCtx.beginPath(); mgCtx.arc(ss.x, ss.y, 6, 0, Math.PI*2); mgCtx.fill();
  }
  if (mgStone.active) {
    for (let i = 0; i < mgStone.trail.length; i++) { mgCtx.globalAlpha = 0.6 - i*0.1; mgCtx.fillStyle = '#ffaa44'; mgCtx.beginPath(); mgCtx.arc(mgStone.trail[i].x, mgStone.trail[i].y, 6-i, 0, Math.PI*2); mgCtx.fill(); }
    mgCtx.globalAlpha = 1; mgCtx.fillStyle = '#c8a060'; mgCtx.beginPath(); mgCtx.arc(mgStone.x, mgStone.y, 8, 0, Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle = '#aa8844'; mgCtx.beginPath(); mgCtx.arc(mgStone.x-1, mgStone.y-1, 3, 0, Math.PI*2); mgCtx.fill();
  }

  // ── Trajectory preview ───────────────────────────────────────
  if (mgChargeActive && !mgStone.active && mg3Phase === 'play') {
    const pw8 = 7 + Math.min(mgStone.charge, 60) * 0.15;
    const fx8 = g7.x+8, fy8 = g7.y+2, fw8 = g7.w-16, fh8 = 22;
    let svx8 = Math.cos(mgAngle)*pw8, svy8 = Math.sin(mgAngle)*pw8, sx8 = mgDavid.x+mgDavid.w-5, sy8 = mgDavid.y+30, willHit8 = false, hitVy8 = svy8;
    for (let i = 0; i < 80; i++) { svy8 += 0.3; sx8 += svx8; sy8 += svy8; if (sx8>fx8&&sx8<fx8+fw8&&sy8>fy8&&sy8<fy8+fh8) { willHit8=true; hitVy8=svy8; break; } if (sx8>mgWidth+60||sy8>mgHeight+60||sy8<-60) break; }
    const isSt8  = Math.abs(Math.atan2(hitVy8, Math.cos(mgAngle)*pw8)) < 0.3;
    const st8    = g7.state;
    const canHit8 = willHit8 && ((st8==='TAUNTING'||st8==='WINDING_UP'||st8==='STUNNED')||((st8==='GUARDING'||st8==='RAGE')&&!isSt8));
    const dc8    = willHit8 ? (canHit8 ? '#44ff88' : '#ff4444') : '#ffdd88';
    let vx8 = Math.cos(mgAngle)*pw8, vy8 = Math.sin(mgAngle)*pw8, x8 = mgDavid.x+mgDavid.w-5, y8 = mgDavid.y+30;
    mgCtx.save();
    for (let i = 0; i < 70; i++) { vy8+=0.3; x8+=vx8; y8+=vy8; if (i%2===0) { mgCtx.globalAlpha=Math.max(0.08,0.75-i*0.012); mgCtx.fillStyle=dc8; mgCtx.beginPath(); mgCtx.arc(x8, y8, Math.max(1.5,4.5-i*0.055), 0, Math.PI*2); mgCtx.fill(); } if (x8>mgWidth+60||y8>mgHeight+60||y8<-60) break; }
    mgCtx.globalAlpha=0.45; mgCtx.strokeStyle=dc8; mgCtx.lineWidth=1.5; mgCtx.setLineDash([3,3]);
    mgCtx.beginPath(); mgCtx.arc(x8, y8, 9, 0, Math.PI*2); mgCtx.stroke(); mgCtx.setLineDash([]); mgCtx.globalAlpha=1; mgCtx.restore();
  }

  // ── Charge bar ───────────────────────────────────────────────
  if (mgChargeActive && !mgStone.active) {
    const pct8 = (mgStone.charge||0) / 60;
    mgCtx.fillStyle = `rgba(255,${200-Math.round(pct8*200)},0,0.9)`; mgCtx.fillRect(mgDavid.x-5, mgDavid.y-20, pct8*60, 8);
    mgCtx.strokeStyle = 'rgba(255,200,0,0.6)'; mgCtx.lineWidth = 1; mgCtx.strokeRect(mgDavid.x-5, mgDavid.y-20, 60, 8);
    mgCtx.fillStyle = 'rgba(255,200,100,0.9)'; mgCtx.font = 'bold 10px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText(`⚡ ${Math.round(pct8*100)}%`, mgDavid.x+25, mgDavid.y-25);
  }

  // Torch timer bar
  if (mg3TorchLit) {
    const pct9 = mg3TorchTimer / 4500;
    mgCtx.fillStyle = 'rgba(255,160,40,0.7)'; mgCtx.fillRect(mgWidth/2-60, 14, pct9*120, 6);
    mgCtx.strokeStyle = 'rgba(255,160,40,0.4)'; mgCtx.lineWidth = 1; mgCtx.strokeRect(mgWidth/2-60, 14, 120, 6);
    mgCtx.fillStyle = 'rgba(255,200,100,0.9)'; mgCtx.font = 'bold 9px "Cinzel",monospace'; mgCtx.textAlign = 'center';
    mgCtx.fillText('🔥 TORCH ACTIVE', mgWidth/2, 10);
  }

  mgCtx.fillStyle = 'rgba(100,160,255,0.7)'; mgCtx.font = 'bold 11px "Cinzel",monospace'; mgCtx.textAlign = 'left';
  mgCtx.fillText('🌙 LEVEL 3 — NIGHT BATTLE', 12, mgHeight-12);
  mgCtx.globalAlpha = 1; mgCtx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  mgGameLoop3
// ═══════════════════════════════════════════════════════════════
function mgGameLoop3(now) {
  if (!mgCanvas || !document.getElementById('s-minigame').classList.contains('active')) {
    if (mg3AnimationId) cancelAnimationFrame(mg3AnimationId);
    mg3AnimationId = null; return;
  }
  mg3AnimationId = requestAnimationFrame(mgGameLoop3);
  if (_shopPaused) return;
  let delta = Math.min(32, now - mg3LastTimestamp); if (delta < 10) delta = 16;
  mg3LastTimestamp = now; updateMG3(delta); drawMG3();
}

// ═══════════════════════════════════════════════════════════════
//  showMG3Overlay
// ═══════════════════════════════════════════════════════════════
function showMG3Overlay(type) {
  let ov = document.querySelector('.mg-full-overlay'); if (ov) ov.remove();
  ov = document.createElement('div'); ov.className = 'mg-full-overlay';

  if (type === 'start') {
    ov.innerHTML = `<h2 style="color:#88ccff;">🌙 Level 3: Night Battle</h2>
      <p style="max-width:300px;line-height:1.8;">
        🌙 The valley is <b>dark</b> — aim by moonlight<br>
        🗡️ A <b>Slingshot Soldier</b> fires stones back at you<br>
        🛡️ Shield Bearer returns — <b>faster and angrier</b><br>
        🔥 Collect <b>Torches</b> to stun all enemies at once<br>
        ❤️ Only <b>2 lives</b> — be precise!</p>
      <button id="mg3StartBtn" style="background:linear-gradient(135deg,#0a1830,#1a3a6a,#0a1830);border:1px solid #4488cc;color:#88ccff;">🌙 BEGIN NIGHT BATTLE</button>
      <button id="mg3ExitBtn" style="background:#2a2a2a;color:#888;">✕ Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg3StartBtn').onclick = () => {
      ov.remove(); resetMG3(); mg3Phase = 'play'; updateMG3UI();
      SoundFX.startMusic('night');
      if (mg3AnimationId) cancelAnimationFrame(mg3AnimationId);
      mg3LastTimestamp = 0; mg3AnimationId = requestAnimationFrame(mgGameLoop3);
    };
    document.getElementById('mg3ExitBtn').onclick = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };

  } else if (type === 'victory') {
    markLevel3Beaten();
    SoundFX.play('victory'); spawn('🌟', 10); spawnConfetti();
    ov.innerHTML = `<h2 style="color:#88ccff;">🌙🏆 NIGHT BATTLE WON!</h2>
      <p>Score: <b>${mg3Score}</b> · Max Combo: ${mg3MaxCombo}x<br>
      <span style="color:#44ff88;font-size:12px;">Goliath falls beneath the moonlit sky!</span></p>
      <button id="mg3SaveBtn">💾 Save Score</button>
      <button id="mg3RestartBtn">Play Again</button>
      <button id="mg3Level4Btn" style="background:linear-gradient(135deg,#1a0a2a,#3a1a5a,#1a0a2a);color:#cc88ff;border:1px solid #8844cc;">👑 Try Level 4</button>
      <button id="mg3ShareBtn" style="background:linear-gradient(135deg,#1a3a5a,#2a5a8a);border:1px solid #4488bb;color:#88ccff;">📤 Share</button>
      <button id="mg3MenuBtn">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg3SaveBtn').onclick = async () => {
      const btn = document.getElementById('mg3SaveBtn');
      btn.textContent = '💾 Saving...'; btn.disabled = true;
      const result = await fsSavePersonalBest(getUsername(), mg3Score, 'minigame-l3', mg3Score >= 2000 ? 'Champion of Faith' : 'Night Warrior', mg3Hits, 3, mg3MaxCombo, mg3MaxCombo, { levelReached: 'minigame-l3' });
      localStorage.setItem('bc_username', getUsername()); G.lastSavedScore = { name: getUsername(), score: mg3Score };
      if      (result.status === 'new_best')  btn.textContent = '🏆 New Personal Best! Redirecting...';
      else if (result.status === 'first')     btn.textContent = '✅ Score Saved! Redirecting...';
      else if (result.status === 'not_best')  btn.textContent = `📊 Best is still ${result.best} 💪`;
      else { btn.textContent = '❌ Save Failed — tap to retry'; btn.disabled = false; return; }
      setTimeout(() => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); showScreen('s-leaderboard'); loadLB('minigame-l3'); }, 2000);
    };
    document.getElementById('mg3RestartBtn').onclick = () => { ov.remove(); if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; } showMG3Overlay('start'); };
    document.getElementById('mg3Level4Btn').onclick  = () => { ov.remove(); startLevel4(); };
    document.getElementById('mg3ShareBtn')?.addEventListener('click', () => shareMiniGameResult(3, mg3Score, mg3MaxCombo, mg3Hits));
    document.getElementById('mg3MenuBtn').onclick = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };

  } else if (type === 'gameover') {
    ov.innerHTML = `<h2 style="color:#88ccff;">🌙 The Night Is Not Over!</h2>
      <p style="font-style:italic;color:#d4c4a0;">"The righteous may fall seven times, but they rise again."<br><span style="font-size:11px;color:#b8a880;">— Proverbs 24:16</span></p>
      <p>Score: ${mg3Score}<br><span style="color:#88ccff;font-size:12px;">God's light breaks through every darkness. Rise and fight!</span></p>
      <button id="mg3RestartBtn" style="background:linear-gradient(135deg,#0a1830,#1a3a6a);border:1px solid #4488cc;color:#88ccff;">🌙 Rise Again</button>
      <button id="mg3MenuBtn" style="background:#2a2a2a;color:#888;">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg3RestartBtn').onclick = () => { ov.remove(); if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; } showMG3Overlay('start'); };
    document.getElementById('mg3MenuBtn').onclick = () => { ov.remove(); mgCurrentLevel = 1; exitMiniGame(); };
  }
}

// ═══════════════════════════════════════════════════════════════
//  startLevel3 — entry point
// ═══════════════════════════════════════════════════════════════
function startLevel3() {
  if (!isLevel2Beaten()) {
    let ov = document.querySelector('.mg-full-overlay'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'mg-full-overlay';
    ov.innerHTML = `<div style="font-size:48px;">🌙</div><h2>Beat Level 2 First!</h2>
      <p>Defeat the Shield Bearer in Level 2 to unlock the Night Battle.</p>
      <button id="goL2Btn" style="background:linear-gradient(135deg,#1a2a3a,#2a4a6a);border:1px solid #4488aa;color:#88ccff;">⚔️ Play Level 2</button>
      <button id="cancelL3Btn" style="background:#333;color:#aaa;">✕ Cancel</button>`;
    document.body.appendChild(ov);
    document.getElementById('goL2Btn').onclick    = () => { ov.remove(); startLevel2(); };
    document.getElementById('cancelL3Btn').onclick = () => { ov.remove(); exitMiniGame(); };
    return;
  }
  if (!isLevel2Unlocked()) { showSubscriptionGate(); return; }
  mgCurrentLevel = 3;
  if (mgAnimationId)  { cancelAnimationFrame(mgAnimationId);  mgAnimationId  = null; }
  if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
  if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
  showMG3Overlay('start');
}
