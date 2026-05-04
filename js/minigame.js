// ═══════════════════════════════════════════════════════════════
//  MINIGAME.JS — Shared mini-game glue, controls, stone economy
//  Depends on: data.js    (EPS, STONE_CONFIG, LIFE_QUESTIONS)
//              core.js    (SoundFX, setBodyScrollLock, spawn,
//                          requestFullscreen, exitFullscreen,
//                          isFullscreen, fsSavePersonalBest)
//              user.js    (mgCurrentLevel, isPremium, isLevel2Unlocked,
//                          unlockPremium, markLevel1/2/3Beaten,
//                          hasDailyBonusAvailable, claimDailyBonus,
//                          DAILY_BONUS_STONES, showRewardedVideoAd)
//              quiz.js    (username, completedEpisodes, G,
//                          getUsername, startEp, loadLB, showScreen,
//                          shareMiniGameResult)
// ═══════════════════════════════════════════════════════════════

// ── Canvas & viewport ─────────────────────────────────────────
let mgCanvas, mgCtx, mgWidth, mgHeight;
let mgAnimationId   = null;
let mgLastTimestamp = 0;

// ── Level 1 game state (shared globals read by level1.js) ─────
let mgDavid   = { x: 100, y: 200, w: 40, h: 60, speed: 6 };
let mgGoliath = { x: 600, y: 200, w: 70, h: 110, speed: 0.8, walkDir: 1, rage: false, state: 'GUARDING', stateTimer: 5000 };
let mgStone   = { active: false, x: 0, y: 0, vx: 0, vy: 0, charge: 0, trail: [] };
let mgJavelins  = [];
let mgPowerups  = [];
let mgHits = 0, mgLives = 3, mgScore = 0, mgCombo = 0, mgMaxCombo = 0;
let mgPhase        = 'play';
let mgAngle        = 0;
let mgChargeActive = false;
let mgShake        = 0;
let mgFrame        = 0;
let mgBatchSize = 0, mgBatchCooldown = 0;
let mgMoveLeft = false, mgMoveRight = false, mgMoveUp = false, mgMoveDown = false;
let mgJoyVX = 0, mgJoyVY = 0, mgJoyActive = false;

// ── Stone economy ─────────────────────────────────────────────
let mgStoneCount = 7;
let mgStoneMax   = 12;
let _shopPaused  = false; // read by all 4 game loops

// ── Grace timer (post-overlay invincibility) ──────────────────
let mgGraceTimer = 0;
const MG_GRACE_MS = 2200;

// ═══════════════════════════════════════════════════════════════
//  startMiniGame — entry point from episode grid
// ═══════════════════════════════════════════════════════════════
function startMiniGame() {
  // Check username
  if (!username || username.trim() === '') {
    const inp   = document.getElementById('username-inp');
    const greet = document.getElementById('ugreet');
    if (inp) {
      inp.classList.add('error');
      greet.className  = 'ugreet err';
      greet.textContent = 'Please enter your name before battling Goliath!';
      inp.focus();
      setTimeout(() => {
        inp.classList.remove('error');
        greet.className = 'ugreet';
        if (!username.trim()) greet.textContent = '';
      }, 3000);
    }
    showScreen('s-title');
    return;
  }

  // ── Pre-game story prompt ─────────────────────────────────────
  const hasPlayedStory = completedEpisodes.has('david-goliath');
  if (!hasPlayedStory) {
    const ov = document.createElement('div');
    ov.className  = 'mg-full-overlay';
    ov.style.zIndex = '9998';
    ov.innerHTML = `
      <div style="font-size:48px;margin-bottom:4px;">📜</div>
      <h2 style="color:#e8c96a;font-family:'Cinzel',serif;max-width:320px;">Know the Story Before the Battle!</h2>
      <p style="max-width:320px;line-height:1.8;font-size:13px;color:#d4c4a0;">
        The <b>David &amp; Goliath quiz episode</b> tells the full story — and knowing it
        gives you a real advantage in the game.<br><br>
        The stone shop questions come from that story.<br>
        The life restoration questions test that knowledge.<br><br>
        <span style="color:#ffcc88;">We recommend you play the episode first!</span>
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;width:min(300px,90vw);">
        <button id="goToStoryBtn" style="background:linear-gradient(135deg,#7a5800,#e8c96a,#7a5800);color:#1a0f00;font-family:'Cinzel',serif;font-size:13px;font-weight:bold;padding:13px 24px;border:none;border-radius:7px;cursor:pointer;letter-spacing:1px;">
          📖 Play the Episode First (Recommended)
        </button>
        <button id="proceedAnywayBtn" style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.35);color:#b8a880;font-family:'Cinzel',serif;font-size:11px;padding:10px 20px;border-radius:6px;cursor:pointer;letter-spacing:1px;">
          ⚔️ I Know the Story — Take Me to Battle
        </button>
      </div>
    `;
    document.body.appendChild(ov);

    document.getElementById('goToStoryBtn').onclick = () => {
      ov.remove();
      startEp('david-goliath');
    };
    document.getElementById('proceedAnywayBtn').onclick = () => {
      ov.remove();
      _launchMiniGame();
    };
    return;
  }

  _launchMiniGame();
}

function _launchMiniGame() {
  saveUserProfile();
  console.log("startMiniGame called");
  showScreen('s-minigame');

  function checkAndInit() {
    if (window.matchMedia("(orientation: portrait)").matches) {
      const warning   = document.getElementById('portraitWarning');
      if (warning)    warning.style.display = 'flex';
      const container = document.querySelector('.minigame-container');
      if (container)  container.style.display = 'none';
      return false;
    } else {
      const warning   = document.getElementById('portraitWarning');
      if (warning)    warning.style.display = 'none';
      const container = document.querySelector('.minigame-container');
      if (container)  container.style.display = 'block';
      return true;
    }
  }

  if (!checkAndInit()) {
    const orientationHandler = () => {
      if (checkAndInit()) {
        initializeMiniGame();
        window.removeEventListener('orientationchange', orientationHandler);
        window.removeEventListener('resize', orientationHandler);
      }
    };
    window.addEventListener('orientationchange', orientationHandler);
    window.addEventListener('resize', orientationHandler);
    return;
  }

  initializeMiniGame();
}

// ═══════════════════════════════════════════════════════════════
//  initializeMiniGame
// ═══════════════════════════════════════════════════════════════
function initializeMiniGame() {
  setBodyScrollLock(true);

  mgCanvas = document.getElementById('mgCanvas');
  if (!mgCanvas) { console.error("Canvas not found!"); return; }

  mgCtx = mgCanvas.getContext('2d');
  if (!mgCtx) { console.error("Cannot get 2D context!"); return; }

  // roundRect polyfill for older Android WebViews
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.moveTo(x+r, y);
      this.lineTo(x+w-r, y);
      this.quadraticCurveTo(x+w, y, x+w, y+r);
      this.lineTo(x+w, y+h-r);
      this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      this.lineTo(x+r, y+h);
      this.quadraticCurveTo(x, y+h, x, y+h-r);
      this.lineTo(x, y+r);
      this.quadraticCurveTo(x, y, x+r, y);
      return this;
    };
  }

  resizeMGCanvas();
  resetMG();
  bindMGButtons();

  function onFullscreenChange() {
    resizeMGCanvas();
    if (mgCurrentLevel === 2 && mg2Phase === 'play') updateMG2UI();
  }
  document.addEventListener('fullscreenchange',       onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  document.addEventListener('mozfullscreenchange',    onFullscreenChange);
  document.addEventListener('MSFullscreenChange',     onFullscreenChange);

  requestFullscreen();

  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }

  setTimeout(() => { showMGOverlay('start'); }, 120);

  window.addEventListener('resize', () => { resizeMGCanvas(); });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => { resizeMGCanvas(); }, 100);
  });
}

// ═══════════════════════════════════════════════════════════════
//  resizeMGCanvas
// ═══════════════════════════════════════════════════════════════
function resizeMGCanvas() {
  if (window.matchMedia("(orientation: portrait)").matches) {
    // Still resize but warning will be shown
  }

  mgWidth  = window.innerWidth;
  mgHeight = window.innerHeight;

  if (mgWidth  < 100) mgWidth  = 800;
  if (mgHeight < 100) mgHeight = 500;

  mgCanvas.width  = mgWidth;
  mgCanvas.height = mgHeight;

  if (mgDavid) {
    mgDavid.x = Math.min(Math.max(mgDavid.x, 40), mgWidth  - mgDavid.w - 40);
    mgDavid.y = Math.min(Math.max(mgDavid.y, 60), mgHeight - mgDavid.h - 60);
  }
  if (mgGoliath) {
    mgGoliath.x = Math.min(mgWidth - 100, Math.max(100, mgGoliath.x));
    mgGoliath.y = mgHeight - 180;
  }
}

// ═══════════════════════════════════════════════════════════════
//  exitMiniGame
// ═══════════════════════════════════════════════════════════════
function exitMiniGame() {
  if (mgAnimationId) cancelAnimationFrame(mgAnimationId);
  mgAnimationId = null;
  if (isFullscreen()) exitFullscreen();
  setBodyScrollLock(false);
  SoundFX.stopMusic();
  showScreen('s-title');
}

// ── DEV SHORTCUT — jumps directly to any level for testing ────
function devJump(level) {
  if (mgAnimationId)  { cancelAnimationFrame(mgAnimationId);  mgAnimationId  = null; }
  if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
  if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
  if (mg4AnimationId) { cancelAnimationFrame(mg4AnimationId); mg4AnimationId = null; }
  unlockPremium();
  markLevel1Beaten();
  markLevel2Beaten();
  markLevel3Beaten();
  mgCurrentLevel = level;
  if      (level === 1) showMGOverlay('start');
  else if (level === 2) showMG2Overlay('start');
  else if (level === 3) showMG3Overlay('start');
  else if (level === 4) showMG4Overlay('start');
}

// ═══════════════════════════════════════════════════════════════
//  fireMGStone — dispatcher (routes to current level)
// ═══════════════════════════════════════════════════════════════
function fireMGStone() {
  if (mgStoneCount <= 0) { showStoneShop(); return; }
  if (mgCurrentLevel === 2) { consumeStone(); fireMGStone2(); return; }
  if (mgCurrentLevel === 3) { consumeStone(); fireMGStone3(); return; }
  if (mgCurrentLevel === 4) { consumeStone(); fireMGStone4(); return; }
  if (mgStone.active || mgPhase !== 'play') return;
  consumeStone();
  let power = 7 + Math.min(mgStone.charge, 60) * 0.15;
  mgStone.active = true;
  mgStone.x  = mgDavid.x + mgDavid.w - 5;
  mgStone.y  = mgDavid.y + 30;
  mgStone.vx = Math.cos(mgAngle) * power;
  mgStone.vy = Math.sin(mgAngle) * power;
  mgStone.charge = 0;
  SoundFX.play('throw');
}

// ═══════════════════════════════════════════════════════════════
//  bindMGButtons — joystick + vertical aim bar + keyboard
// ═══════════════════════════════════════════════════════════════
function bindMGButtons() {
  console.log("bindMGButtons: joystick + vertical aim bar");

  // ─── LEFT JOYSTICK ────────────────────────────────────────────
  const JOYSTICK_RADIUS = 40;
  let joyTouchId = null, joyBaseX = 0, joyBaseY = 0;

  const joystickArea = document.getElementById('mgJoystickArea');
  const joystickBase = document.getElementById('mgJoystickBase');
  const joystickKnob = document.getElementById('mgJoystickKnob');

  function joyStart(clientX, clientY) {
    const rect   = joystickArea.getBoundingClientRect();
    const margin = JOYSTICK_RADIUS + 5;
    joyBaseX = Math.max(margin, Math.min(rect.width  - margin, clientX - rect.left));
    joyBaseY = Math.max(margin, Math.min(rect.height - margin, clientY - rect.top));
    joystickBase.style.left = joyBaseX + 'px';
    joystickBase.style.top  = joyBaseY + 'px';
    joystickBase.classList.add('visible');
    joystickKnob.style.left = '50%';
    joystickKnob.style.top  = '50%';
    mgJoyVX = 0; mgJoyVY = 0; mgJoyActive = true;
  }

  function joyMove(clientX, clientY) {
    if (!mgJoyActive) return;
    const rect   = joystickArea.getBoundingClientRect();
    const dx     = (clientX - rect.left) - joyBaseX;
    const dy     = (clientY - rect.top)  - joyBaseY;
    const dist   = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const ang    = Math.atan2(dy, dx);
    const kx     = Math.cos(ang) * clamped;
    const ky     = Math.sin(ang) * clamped;
    joystickKnob.style.left = (50 + (kx / JOYSTICK_RADIUS) * 44) + '%';
    joystickKnob.style.top  = (50 + (ky / JOYSTICK_RADIUS) * 44) + '%';
    const norm = dist > 5 ? Math.min(1, (clamped / JOYSTICK_RADIUS) * 1.2) : 0;
    mgJoyVX = Math.cos(ang) * norm;
    mgJoyVY = Math.sin(ang) * norm;
  }

  function joyEnd() {
    joyTouchId = null;
    mgJoyVX = 0; mgJoyVY = 0; mgJoyActive = false;
    joystickBase.classList.remove('visible');
    joystickKnob.style.left = '50%';
    joystickKnob.style.top  = '50%';
  }

  joystickArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    joyStart(t.clientX, t.clientY);
  }, { passive: false });

  joystickArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) { joyMove(t.clientX, t.clientY); break; }
    }
  }, { passive: false });

  joystickArea.addEventListener('touchend',    (e) => { e.preventDefault(); joyEnd(); }, { passive: false });
  joystickArea.addEventListener('touchcancel', (e) => { e.preventDefault(); joyEnd(); }, { passive: false });

  // Mouse support
  let mouseJoy = false;
  joystickArea.addEventListener('mousedown', (e) => { mouseJoy = true; joyStart(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => { if (mouseJoy) joyMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup',   ()  => { if (mouseJoy) { mouseJoy = false; joyEnd(); } });

  // ─── VERTICAL AIM BAR (right side) ───────────────────────────
  const aimBarZone = document.getElementById('mgAimBarZone');
  const aimBar     = document.getElementById('mgAimBar');
  const aimCursor  = document.getElementById('mgAimCursor');

  const AIM_ANGLE_TOP     = -0.85;
  const AIM_ANGLE_BOTTOM  =  0.45;

  let aimTouchId = null;
  let aimActive  = false;

  function getBarRect() { return aimBar.getBoundingClientRect(); }

  function yToAngle(clientY) {
    const rect = getBarRect();
    const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const t    = relY / rect.height;
    return AIM_ANGLE_TOP + t * (AIM_ANGLE_BOTTOM - AIM_ANGLE_TOP);
  }

  function updateCursor(clientY) {
    const rect = getBarRect();
    const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    aimCursor.style.top = (relY / rect.height * 100) + '%';
  }

  function aimStart(clientY) {
    aimActive       = true;
    mgChargeActive  = true;
    mgStone.charge  = 0;
    aimBar.classList.add('active');
    mgAngle = yToAngle(clientY);
    updateCursor(clientY);
  }

  function aimMove(clientY) {
    if (!aimActive) return;
    mgAngle = yToAngle(clientY);
    updateCursor(clientY);
  }

  function aimEnd() {
    if (!aimActive) return;
    aimActive  = false;
    aimTouchId = null;
    aimBar.classList.remove('active');
    aimCursor.style.top = '50%';
    if (mgChargeActive && !mgStone.active) fireMGStone();
    mgChargeActive = false;
  }

  aimBarZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (aimTouchId !== null) return;
    const t = e.changedTouches[0];
    aimTouchId = t.identifier;
    aimStart(t.clientY);
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (aimTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === aimTouchId) { aimMove(t.clientY); break; }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (aimTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === aimTouchId) { aimEnd(); break; }
    }
  });

  document.addEventListener('touchcancel', (e) => {
    if (aimTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === aimTouchId) { aimEnd(); break; }
    }
  });

  // Mouse support for aim bar (desktop)
  let mouseAim = false;
  aimBarZone.addEventListener('mousedown', (e) => { mouseAim = true; aimStart(e.clientY); });
  document.addEventListener('mousemove',   (e) => { if (mouseAim) aimMove(e.clientY); });
  document.addEventListener('mouseup',     ()  => { if (mouseAim) { mouseAim = false; aimEnd(); } });

  // ─── Quit button ──────────────────────────────────────────────
  const quitBtn = document.getElementById('mgQuitBtn');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      if (mgAnimationId)  { cancelAnimationFrame(mgAnimationId);  mgAnimationId  = null; }
      if (mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
      if (mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
      if (mg4AnimationId) { cancelAnimationFrame(mg4AnimationId); mg4AnimationId = null; }
      mgCurrentLevel = 1;
      exitMiniGame();
    });
  }

  // ─── Keyboard (desktop) ───────────────────────────────────────
  let keyUp = false, keyDown = false, keyLeft = false, keyRight = false;
  let spacePressed = false;

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) e.preventDefault();
    if (key === 'ArrowUp')    { keyUp    = true; }
    if (key === 'ArrowDown')  { keyDown  = true; }
    if (key === 'ArrowLeft')  { keyLeft  = true; }
    if (key === 'ArrowRight') { keyRight = true; }
    mgMoveUp = keyUp; mgMoveDown = keyDown; mgMoveLeft = keyLeft; mgMoveRight = keyRight;
    if (key === 'w' || key === 'W') mgAngle = Math.max(-0.85, mgAngle - 0.06);
    if (key === 's' || key === 'S') mgAngle = Math.min( 0.45, mgAngle + 0.06);
    if (key === ' ' && !spacePressed) { spacePressed = true; mgChargeActive = true; mgStone.charge = 0; }
    if (key === 'Escape') { if (mgAnimationId) cancelAnimationFrame(mgAnimationId); exitMiniGame(); }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key;
    if (key === 'ArrowUp')    { keyUp    = false; }
    if (key === 'ArrowDown')  { keyDown  = false; }
    if (key === 'ArrowLeft')  { keyLeft  = false; }
    if (key === 'ArrowRight') { keyRight = false; }
    mgMoveUp = keyUp; mgMoveDown = keyDown; mgMoveLeft = keyLeft; mgMoveRight = keyRight;
    if (key === ' ') {
      if (spacePressed) { spacePressed = false; if (mgChargeActive && !mgStone.active) fireMGStone(); mgChargeActive = false; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  STONE ECONOMY
// ═══════════════════════════════════════════════════════════════

function initStones(levelKey) {
  const cfg    = STONE_CONFIG[levelKey] || { start: 5, max: 10 };
  mgStoneCount = cfg.start;
  mgStoneMax   = cfg.max;
  updateStoneUI();
}

function consumeStone() {
  mgStoneCount = Math.max(0, mgStoneCount - 1);
  updateStoneUI();
}

function addStones(n) {
  mgStoneCount = Math.min(mgStoneMax, mgStoneCount + n);
  updateStoneUI();
  const el = document.getElementById('mgStoneCount');
  if (el) {
    el.style.boxShadow  = '0 0 18px rgba(255,215,0,0.9)';
    el.style.borderColor = 'rgba(255,215,0,0.9)';
    setTimeout(() => { if (el) { el.style.boxShadow = ''; el.style.borderColor = ''; } }, 800);
  }
}

function updateStoneUI() {
  const numEl = document.getElementById('mgStoneNum');
  const cntEl = document.getElementById('mgStoneCount');
  const btnEl = document.getElementById('mgGetStonesBtn');
  if (!numEl || !cntEl || !btnEl) return;
  numEl.innerText = mgStoneCount;
  const low = mgStoneCount <= 2;
  cntEl.classList.toggle('low', low);
  btnEl.classList.toggle('visible', mgStoneCount <= 2);
}

// ═══════════════════════════════════════════════════════════════
//  PAUSE / RESUME HELPERS
// ═══════════════════════════════════════════════════════════════

function pauseGameForOverlay() {
  _shopPaused = true;
  if (SoundFX._musicScheduler) {
    clearTimeout(SoundFX._musicScheduler);
    SoundFX._musicScheduler = null;
  }
  if (SoundFX._musicGain && SoundFX.ctx) {
    try {
      SoundFX._musicGain.gain.cancelScheduledValues(SoundFX.ctx.currentTime);
      SoundFX._musicGain.gain.linearRampToValueAtTime(0, SoundFX.ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

function resumeGameFromOverlay() {
  _shopPaused  = false;
  mgGraceTimer = MG_GRACE_MS;

  // Clear all in-flight projectiles
  mgJavelins = [];
  if (typeof mg2Shields      !== 'undefined') mg2Shields      = [];
  if (typeof mg3SoldierStones !== 'undefined') mg3SoldierStones = [];

  // Restart music
  if (SoundFX.enabled && SoundFX._currentTheme && SoundFX.ctx) {
    const theme = SoundFX._currentTheme;
    if (SoundFX._musicGain) {
      try {
        SoundFX._musicGain.gain.cancelScheduledValues(SoundFX.ctx.currentTime);
        SoundFX._musicGain.gain.linearRampToValueAtTime(0.85, SoundFX.ctx.currentTime + 0.4);
      } catch (e) {}
    }
    if (!SoundFX._musicScheduler) {
      SoundFX._currentTheme = null;
      SoundFX.startMusic(theme);
    }
  }

  // Freeze enemy firing for full grace period
  const FIRE_DELAY = MG_GRACE_MS + 500;

  // Level 1
  mgBatchSize = 0; mgBatchCooldown = FIRE_DELAY;

  // Level 2
  mg2BatchSize = 0; mg2BatchCooldown = FIRE_DELAY;
  mg2SbBatch   = 0; mg2SbCooldown   = FIRE_DELAY;

  // Level 3
  mg3BatchSize       = 0; mg3BatchCooldown  = FIRE_DELAY;
  mg3SbCooldown      = FIRE_DELAY;
  mg3SoldierCooldown = FIRE_DELAY;

  // Level 4
  if (typeof mg4Champion !== 'undefined' && mg4Champion)
    mg4Champion.batchCooldown = FIRE_DELAY;
  if (typeof mgGoliath !== 'undefined' && mgGoliath) {
    mgGoliath._batchSize = 0;
    mgGoliath._batchCD   = FIRE_DELAY;
  }
  if (typeof mg2ShieldBearer !== 'undefined' && mg2ShieldBearer)
    mg2ShieldBearer._throwCD = FIRE_DELAY;
}

function removeShopOverlay() {
  document.getElementById('mgShopOverlay')?.remove();
  resumeGameFromOverlay();
  updateStoneUI();
}

// ── Voluntary overlays (player-initiated during play) ─────────
function voluntaryStones() {
  const activePhase = mgCurrentLevel === 1 ? mgPhase
    : mgCurrentLevel === 2 ? mg2Phase
    : mgCurrentLevel === 3 ? mg3Phase
    : mg4WavePhase;
  if (activePhase !== 'play') return;
  if (_shopPaused) return;
  showStoneShop();
}

function voluntaryLife() {
  const activePhase = mgCurrentLevel === 1 ? mgPhase
    : mgCurrentLevel === 2 ? mg2Phase
    : mgCurrentLevel === 3 ? mg3Phase
    : mg4WavePhase;
  if (activePhase !== 'play') return;
  if (_shopPaused) return;

  const currentLives = mgCurrentLevel === 1 ? mgLives
    : mgCurrentLevel === 2 ? mg2Lives
    : mgCurrentLevel === 3 ? mg3Lives
    : mg4Lives;
  const maxLives = mgCurrentLevel === 3 ? 2 : 3;

  if (currentLives >= maxLives) {
    SoundFX.beep(660, 0.06);
    showStoneShop();
    return;
  }

  const onRestored = () => {
    if      (mgCurrentLevel === 1) { mgLives  = Math.min(3, mgLives  + 1); updateMGUI();  mgLastTimestamp  = 0; mgAnimationId  = requestAnimationFrame(mgGameLoop); }
    else if (mgCurrentLevel === 2) { mg2Lives = Math.min(3, mg2Lives + 1); updateMG2UI(); mg2LastTimestamp = 0; mg2AnimationId = requestAnimationFrame(mgGameLoop2); }
    else if (mgCurrentLevel === 3) { mg3Lives = Math.min(2, mg3Lives + 1); updateMG3UI(); mg3LastTimestamp = 0; mg3AnimationId = requestAnimationFrame(mgGameLoop3); }
    else                           { mg4Lives = Math.min(3, mg4Lives + 1); updateMG4UI(); mg4LastTimestamp = 0; mg4AnimationId = requestAnimationFrame(mgGameLoop4); }
  };
  const onFail = () => { resumeGameFromOverlay(); };

  if      (mgCurrentLevel === 1 && mgAnimationId)  { cancelAnimationFrame(mgAnimationId);  mgAnimationId  = null; }
  else if (mgCurrentLevel === 2 && mg2AnimationId) { cancelAnimationFrame(mg2AnimationId); mg2AnimationId = null; }
  else if (mgCurrentLevel === 3 && mg3AnimationId) { cancelAnimationFrame(mg3AnimationId); mg3AnimationId = null; }
  else if (mgCurrentLevel === 4 && mg4AnimationId) { cancelAnimationFrame(mg4AnimationId); mg4AnimationId = null; }

  showLifeRedemptionQuestion(onRestored, onFail);
}

// ═══════════════════════════════════════════════════════════════
//  QUESTION BANKS
// ═══════════════════════════════════════════════════════════════

function getStoneQuestions() {
  const ep = EPS.find(e => e.id === 'david-goliath');
  if (!ep) return { easy: [], medium: [], hard: [] };
  return {
    easy:   ep.questions.filter(q => q.diff === 1),
    medium: ep.questions.filter(q => q.diff === 2),
    hard:   ep.questions.filter(q => q.diff === 3),
  };
}

let _usedStoneQs = [];
function pickStoneQuestion(pool) {
  if (!pool.length) return null;
  const unused = pool.filter((_, i) => !_usedStoneQs.includes(i));
  const arr    = unused.length > 0 ? unused : pool;
  const q      = arr[Math.floor(Math.random() * arr.length)];
  const idx    = pool.indexOf(q);
  _usedStoneQs.push(idx);
  if (_usedStoneQs.length >= pool.length) _usedStoneQs = [];
  return q;
}

let _usedLifeQs = [];
function pickLifeQuestion() {
  const unused = LIFE_QUESTIONS.filter((_, i) => !_usedLifeQs.includes(i));
  const arr    = unused.length > 0 ? unused : LIFE_QUESTIONS;
  const q      = arr[Math.floor(Math.random() * arr.length)];
  const idx    = LIFE_QUESTIONS.indexOf(q);
  _usedLifeQs.push(idx);
  if (_usedLifeQs.length >= LIFE_QUESTIONS.length) _usedLifeQs = [];
  return q;
}

// ═══════════════════════════════════════════════════════════════
//  STONE SHOP
// ═══════════════════════════════════════════════════════════════

function showStoneShop() {
  document.getElementById('mgShopOverlay')?.remove();
  pauseGameForOverlay();
  SoundFX.beep(440, 0.06);

  const userIsPremium = isLevel2Unlocked();
  const { easy, medium, hard } = getStoneQuestions();

  const ov = document.createElement('div');
  ov.id        = 'mgShopOverlay';
  ov.className = 'mg-stone-shop';
  ov.innerHTML =
    '<h3>🪨 Reload Your Sling</h3>' +
    '<p class="shop-sub">Choose a difficulty to answer a Bible question and earn more stones.<br>' +
    'You have <b id="shopStoneNum">' + mgStoneCount + '</b> stone' + (mgStoneCount !== 1 ? 's' : '') + ' left.</p>' +
    (easy.length   ? '<div class="stone-diff-card easy"   id="sdEasy"  ><div><div class="diff-label">📖 Easy</div><div class="diff-desc">Simple question from the story</div></div><div class="diff-reward">+1 🪨</div></div>' : '') +
    (medium.length ? '<div class="stone-diff-card medium" id="sdMedium"><div><div class="diff-label">🔥 Medium</div><div class="diff-desc">Needs some thought</div></div><div class="diff-reward">+2 🪨</div></div>' : '') +
    (userIsPremium && hard.length ? '<div class="stone-diff-card hard" id="sdHard"><div><div class="diff-label">💀 Hard</div><div class="diff-desc">Scripture-specific · Premium</div></div><div class="diff-reward">+3 🪨</div></div>' : '') +
    '<button class="shop-continue-btn" id="sdContinue">⚔️ Continue with ' + mgStoneCount + ' stone' + (mgStoneCount !== 1 ? 's' : '') + '</button>' +
    (!userIsPremium ? '<div class="stone-diff-card" id="sdVideo" style="border-left:3px solid #4488cc;margin-top:4px;"><div><div class="diff-label" style="color:#88ccff;">🎬 Watch Video</div><div class="diff-desc">30-second ad</div></div><div class="diff-reward" style="color:#88ccff;">+3 🪨</div></div>' : '') +
    (userIsPremium && hasDailyBonusAvailable() ? '<div class="stone-diff-card" id="sdDailyBonus" style="border-left:3px solid #5ddb8e;margin-top:4px;"><div><div class="diff-label" style="color:#5ddb8e;">🌟 Daily Blessing</div><div class="diff-desc">Premium — once per day</div></div><div class="diff-reward" style="color:#5ddb8e;">+2 🪨</div></div>' : '');
  document.body.appendChild(ov);

  ov.querySelector('#sdContinue')?.addEventListener('click', removeShopOverlay);

  function pickAndShow(pool, reward) {
    const q = pickStoneQuestion(pool);
    if (!q) return;
    showStoneQuestionOverlay(q, reward, () => { removeShopOverlay(); });
  }

  if (easy.length)                        ov.querySelector('#sdEasy')  ?.addEventListener('click', () => pickAndShow(easy, 1));
  if (medium.length)                      ov.querySelector('#sdMedium')?.addEventListener('click', () => pickAndShow(medium, 2));
  if (userIsPremium && hard.length)       ov.querySelector('#sdHard')  ?.addEventListener('click', () => pickAndShow(hard, 3));
  if (!userIsPremium) {
    ov.querySelector('#sdVideo')?.addEventListener('click', () => {
      ov.remove(); _shopPaused = true;
      showRewardedVideoAd((stones) => { if (stones > 0) addStones(stones); removeShopOverlay(); });
    });
  }
  if (userIsPremium && hasDailyBonusAvailable()) {
    ov.querySelector('#sdDailyBonus')?.addEventListener('click', () => {
      claimDailyBonus(); addStones(DAILY_BONUS_STONES); spawn('🌟', 3); SoundFX.play('powerup'); removeShopOverlay();
    });
  }
}

// ── Stone question overlay ────────────────────────────────────
function showStoneQuestionOverlay(q, reward, onDone) {
  document.getElementById('mgQOverlay')?.remove();
  pauseGameForOverlay();

  const ov = document.createElement('div');
  ov.id = 'mgQOverlay';
  ov.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.92)',
    'backdrop-filter:blur(12px)', 'z-index:10001',
    'display:flex', 'flex-direction:column', 'align-items:center',
    'justify-content:center', 'padding:20px', 'gap:12px',
    'font-family:"Cinzel",serif', 'text-align:center',
  ].join(';');

  const optsHtml = q.type === 'mcq'
    ? '<div class="stone-q-opts">' + q.opts.map((o, i) =>
        '<button class="stone-q-opt" data-idx="' + i + '">' +
        '<span style="min-width:20px;font-weight:bold">' + 'ABCD'[i] + '</span>' + o +
        '</button>').join('') + '</div>'
    : '<input class="stone-q-fill" id="sqFill" placeholder="Type your answer..." autocomplete="off" spellcheck="false">' +
      '<button class="shop-continue-btn" id="sqSubmit" style="width:100%;margin-top:4px;">✓ Submit Answer</button>';

  ov.innerHTML = `
    <div style="color:#e8c96a;font-size:11px;letter-spacing:2px;margin-bottom:4px;">
      🪨 ANSWER CORRECTLY TO EARN +${reward} STONE${reward > 1 ? 'S' : ''}
    </div>
    <div class="stone-q-panel" style="max-height:80vh;overflow-y:auto;">
      <div class="stone-q-text">${q.q}</div>
      ${optsHtml}
      <div id="sqFeedback" style="margin-top:12px;font-size:13px;min-height:20px;line-height:1.6;"></div>
    </div>
  `;
  document.body.appendChild(ov);

  let answered = false;

  function handleAnswer(correct) {
    if (answered) return;
    answered = true;
    const fb = document.getElementById('sqFeedback');
    ov.querySelectorAll('.stone-q-opt,.stone-q-fill,#sqSubmit').forEach(el => el.disabled = true);

    if (correct) {
      SoundFX.play('correct');
      addStones(reward);
      if (fb) {
        fb.style.color = '#5ddb8e';
        fb.innerHTML = `✅ <b>Correct!</b> +${reward} stone${reward > 1 ? 's' : ''} added!<br>
          <span style="font-size:11px;color:#b8a880;font-style:italic;">${q.scripture}</span>`;
      }
      spawn('🪨', reward);
    } else {
      SoundFX.play('wrong');
      if (fb) {
        fb.style.color = '#e87070';
        fb.innerHTML = `❌ <b>Not quite.</b> ${q.explanation}<br>
          <span style="font-size:11px;color:#b8a880;font-style:italic;">${q.scripture}</span>`;
      }
    }
    const continueBtn = document.createElement('button');
    continueBtn.className   = 'shop-continue-btn';
    continueBtn.style.marginTop = '14px';
    continueBtn.style.width = '100%';
    continueBtn.textContent = correct ? '⚔️ Back to Battle!' : '⚔️ Continue Fighting';
    continueBtn.addEventListener('click', () => { ov.remove(); onDone(); });
    document.querySelector('.stone-q-panel')?.appendChild(continueBtn);
  }

  if (q.type === 'mcq') {
    ov.querySelectorAll('.stone-q-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const idx = parseInt(btn.dataset.idx);
        ov.querySelectorAll('.stone-q-opt').forEach(b => b.disabled = true);
        btn.classList.add(idx === q.correct ? 'correct' : 'wrong');
        if (idx !== q.correct) ov.querySelectorAll('.stone-q-opt')[q.correct]?.classList.add('correct');
        handleAnswer(idx === q.correct);
      });
    });
  } else {
    const inp = ov.querySelector('#sqFill');
    const sub = ov.querySelector('#sqSubmit');
    function doSubmit() {
      if (answered || !inp) return;
      const v  = inp.value.trim().toLowerCase();
      if (!v) return;
      const ok = q.acceptedAnswers.some(a => v.includes(a) || a.includes(v));
      inp.classList.add(ok ? 'correct' : 'wrong');
      handleAnswer(ok);
    }
    sub?.addEventListener('click', doSubmit);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
    setTimeout(() => inp?.focus(), 100);
  }
}

// ═══════════════════════════════════════════════════════════════
//  LIFE REDEMPTION QUESTION
// ═══════════════════════════════════════════════════════════════

function showLifeRedemptionQuestion(onRestored, onGameOver) {
  _pendingLifeRestore = { onRestored, onGameOver };
  document.getElementById('mgShopOverlay')?.remove();
  document.getElementById('mgQOverlay')?.remove();
  pauseGameForOverlay();

  const q  = pickLifeQuestion();
  const ov = document.createElement('div');
  ov.id = 'mgLifeQOverlay';
  ov.style.cssText = [
    'position:fixed', 'inset:0',
    'background:linear-gradient(160deg,rgba(8,4,16,0.97),rgba(16,6,8,0.98))',
    'backdrop-filter:blur(14px)', 'z-index:10002',
    'display:flex', 'flex-direction:column', 'align-items:center',
    'justify-content:center', 'padding:20px', 'gap:10px',
    'font-family:"Cinzel",serif', 'text-align:center', 'color:#e8c96a',
  ].join(';');

  const optsHtml = q.type === 'mcq'
    ? '<div class="stone-q-opts">' + q.opts.map((o, i) =>
        '<button class="stone-q-opt" data-idx="' + i + '">' +
        '<span style="min-width:20px;font-weight:bold">' + 'ABCD'[i] + '</span>' + o +
        '</button>').join('') + '</div>'
    : '<input class="stone-q-fill" id="sqLifeFill" placeholder="Type your answer..." autocomplete="off" spellcheck="false">' +
      '<button class="shop-continue-btn" id="sqLifeSubmit" style="width:100%;margin-top:4px;">✓ Submit Answer</button>';

  ov.innerHTML = `
    <div style="font-size:36px;margin-bottom:2px;">✝️</div>
    <div style="font-size:clamp(16px,4vw,20px);color:#e8c96a;font-weight:bold;">One More Chance!</div>
    <div style="font-size:12px;color:#d4c4a0;font-style:italic;max-width:340px;line-height:1.7;">
      "The righteous may fall seven times, but they rise again."<br>
      <span style="font-size:10px;color:#b8a880;">— Proverbs 24:16</span>
    </div>
    <div style="font-size:11px;color:#ffcc88;margin-top:2px;">
      Answer correctly to restore ❤️ and continue the battle!
    </div>
    ${!isPremium() ? '<div class="stone-diff-card" onclick="handleWatchVideoForLife()" style="border-left:3px solid #4488cc;width:min(300px,88vw);margin:0 auto;"><div><div class="diff-label" style="color:#88ccff;font-size:12px;">🎬 Watch Video Instead</div><div class="diff-desc" style="font-size:11px;">Skip the question</div></div><div class="diff-reward" style="color:#88ccff;font-size:14px;">❤️ +1</div></div>' : ''}
    ${isPremium() && hasDailyLifeAvailable() ? '<div class="stone-diff-card" onclick="handleDailyLifeClaim()" style="border-left:3px solid #5ddb8e;width:min(300px,88vw);margin:0 auto;"><div><div class="diff-label" style="color:#5ddb8e;font-size:12px;">🌟 Daily Free Life</div><div class="diff-desc" style="font-size:11px;">Premium — once per day</div></div><div class="diff-reward" style="color:#5ddb8e;font-size:14px;">❤️ +1</div></div>' : ''}
    <div class="stone-q-panel" style="max-height:60vh;overflow-y:auto;margin-top:6px;">
      <div class="stone-q-text">${q.q}</div>
      ${optsHtml}
      <div id="sqLifeFeedback" style="margin-top:12px;font-size:13px;min-height:20px;line-height:1.6;"></div>
    </div>
  `;
  document.body.appendChild(ov);

  let answered = false;

  function handleLifeAnswer(correct) {
    if (answered) return;
    answered = true;
    const fb = document.getElementById('sqLifeFeedback');
    ov.querySelectorAll('.stone-q-opt,.stone-q-fill,#sqLifeSubmit').forEach(el => el.disabled = true);

    const continueBtn = document.createElement('button');
    continueBtn.className    = 'shop-continue-btn';
    continueBtn.style.cssText = 'margin-top:14px;width:100%;font-size:13px;';

    if (correct) {
      SoundFX.play('correct');
      spawn('❤️', 3);
      if (fb) {
        fb.style.color = '#5ddb8e';
        fb.innerHTML = `✅ <b>Well done!</b> Your life is restored!<br>
          <span style="font-size:11px;color:#b8a880;font-style:italic;">${q.scripture}</span>`;
      }
      continueBtn.textContent       = '⚔️ Rise Again, David!';
      continueBtn.style.background  = 'linear-gradient(135deg,#1a4a1a,#2a7a2a)';
      continueBtn.style.borderColor = '#44aa44';
      continueBtn.style.color       = '#88ee88';
      continueBtn.addEventListener('click', () => {
        ov.remove();
        resumeGameFromOverlay();
        onRestored();
      });
    } else {
      SoundFX.play('wrong');
      if (fb) {
        fb.style.color = '#e87070';
        fb.innerHTML = `❌ <b>The battle is paused.</b><br>${q.explanation}<br>
          <span style="font-size:11px;color:#b8a880;font-style:italic;">${q.scripture}</span><br>
          <span style="font-size:11px;color:#ffcc88;margin-top:4px;display:block;">
          But David always wins — study and try again!</span>`;
      }
      continueBtn.textContent = '🪨 Try Again from Start';
      continueBtn.addEventListener('click', () => {
        ov.remove();
        resumeGameFromOverlay();
        onGameOver();
      });
    }
    document.querySelector('#mgLifeQOverlay .stone-q-panel')?.appendChild(continueBtn);
  }

  if (q.type === 'mcq') {
    ov.querySelectorAll('.stone-q-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const idx = parseInt(btn.dataset.idx);
        ov.querySelectorAll('.stone-q-opt').forEach(b => b.disabled = true);
        btn.classList.add(idx === q.correct ? 'correct' : 'wrong');
        if (idx !== q.correct) ov.querySelectorAll('.stone-q-opt')[q.correct]?.classList.add('correct');
        handleLifeAnswer(idx === q.correct);
      });
    });
  } else {
    const inp = ov.querySelector('#sqLifeFill');
    const sub = ov.querySelector('#sqLifeSubmit');
    function doLifeSubmit() {
      if (answered || !inp) return;
      const v  = inp.value.trim().toLowerCase();
      if (!v) return;
      const ok = q.acceptedAnswers?.some(a => v.includes(a) || a.includes(v)) || false;
      inp.classList.add(ok ? 'correct' : 'wrong');
      handleLifeAnswer(ok);
    }
    sub?.addEventListener('click', doLifeSubmit);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') doLifeSubmit(); });
    setTimeout(() => inp?.focus(), 100);
  }
}
