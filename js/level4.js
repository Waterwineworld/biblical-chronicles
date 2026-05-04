// ═══════════════════════════════════════════════════════════════
//  LEVEL 4 — THE ARMY OF GOD  (Three-Wave Final Battle)
// ═══════════════════════════════════════════════════════════════

// ── Level 4 state ─────────────────────────────────────────────
let mg4AnimationId   = null;
let mg4LastTimestamp = 0;
let mg4Wave          = 1;   // 1 | 2 | 3
let mg4WavePhase     = 'play'; // 'play' | 'intermission' | 'victory' | 'gameover'
let mg4IntTimer      = 0;   // ms countdown between waves
let mg4Lives, mg4Score, mg4Hits, mg4Combo, mg4MaxCombo;
let mg4ScoreMult     = 1;   // increases each wave
let mg4Frame         = 0;
let mg4Shake         = 0;

// Wave-specific enemies (reuse shared vars where safe)
let mg4Champion      = null; // Wave 1: Goliath's Champion
let mg4BlessingScrolls = []; // Between waves: life restore pickups
let mg4Sparks        = [];   // Visual only: screen spark effects on wave clear

// Wave 1 — Champion: big, fast, no Shield Bearer, javelins only
// Wave 2 — Shield Bearer returns with TWO shields, Goliath rage from start
// Wave 3 — Goliath FULL RAGE, max speed, no shield bearer, wall of javelins

// ── Helpers ───────────────────────────────────────────────────
function markLevel3Beaten2(){ markLevel3Beaten(); } // alias already defined above

function resetMG4() {
  mgDavid   = { x: 70, y: mgHeight/2, w:40, h:60, speed:6 };
  mgStone   = { active:false, x:0, y:0, vx:0, vy:0, charge:0, trail:[] };
  mgJavelins= []; mg2Shields=[];

  mg4Lives=3; mg4Score=0; mg4Hits=0; mg4Combo=0; mg4MaxCombo=0;
  mg4Wave=1; mg4WavePhase='play'; mg4IntTimer=0; mg4ScoreMult=1;
  mg4Frame=0; mg4Shake=0;
  mg4BlessingScrolls=[]; mg4Sparks=[];

  mgAngle=0; mgChargeActive=false;
  mgMoveLeft=false; mgMoveRight=false; mgMoveUp=false; mgMoveDown=false;
  mgJoyVX=0; mgJoyVY=0; mgJoyActive=false;

  initMG4Wave(1);
  initStones('4w1');
  updateMG4UI();
}

function initMG4Wave(wave) {
  mgJavelins=[]; mg2Shields=[];
  mg4BlessingScrolls=[];
  mg4Sparks=[];
  mg4ScoreMult = wave;

  if (wave === 1) {
    // Champion: larger fighter, rage from second 0
    mg4Champion = {
      x: Math.min(mgWidth-140, 520), y: mgHeight-185,
      w:75, h:115, speed:2.2, walkDir:1,
      state:'TAUNTING', stateTimer:1200,
      rage:true, hits:0,
      batchSize:0, batchCooldown:0,
      armour: true // needs arc shot to hit
    };
    mgGoliath = null; // not in wave 1
    mg2ShieldBearer = null;
  } else if (wave === 2) {
    mg4Champion = null;
    // Goliath starts RAGE
    mgGoliath = { x:Math.min(mgWidth-140,500), y:mgHeight-180, w:70, h:110, speed:1.8, walkDir:1, rage:true, state:'TAUNTING', stateTimer:800 };
    // Shield Bearer with TWO shields
    mg2ShieldBearer = {
      x: mgWidth/2-18, y:mgHeight-160,
      w:36, h:80, speed:2.0, walkDir:1,
      state:'BLOCKING', staggerTimer:0, hits:0,
      shieldW:32, shieldH:54,
      dualShield: true, // second shield on other arm
      dualHits: 0
    };
  } else if (wave === 3) {
    mg4Champion = null;
    mg2ShieldBearer = null;
    // Goliath — maximum speed, permanent rage, no guard state
    mgGoliath = { x:Math.min(mgWidth-130,480), y:mgHeight-180, w:80, h:120, speed:2.8, walkDir:1, rage:true, state:'TAUNTING', stateTimer:600 };
  }
}

function updateMG4UI() {
  const livesEl = document.getElementById('mgLives');
  const scoreEl = document.getElementById('mgScore');
  const badgeEl = document.getElementById('mgStateBadge');
  if (livesEl) livesEl.innerHTML = '❤️'.repeat(mg4Lives) + '🖤'.repeat(Math.max(0, 3-mg4Lives));
  if (scoreEl) scoreEl.innerText = mg4Score;
  if (badgeEl) {
    let b = `WAVE ${mg4Wave}/3`;
    if (mg4WavePhase === 'intermission') b = `⚡ WAVE ${mg4Wave} CLEAR! Next wave...`;
    else if (mg4Champion && mg4Wave===1) b = `WAVE 1 · CHAMPION · ${mg4Champion.state}`;
    else if (mgGoliath && mg4Wave===2) { const sb=mg2ShieldBearer; b = (sb&&sb.state==='STAGGERED') ? '⚡ SHIELDS DOWN! · WAVE 2' : `WAVE 2 · ${mgGoliath.state}`; }
    else if (mgGoliath && mg4Wave===3) b = `WAVE 3 · FINAL · ${mgGoliath.state}`;
    if (mg4ScoreMult > 1) b += ` · ×${mg4ScoreMult}`;
    badgeEl.innerText = b;
  }
  updateStoneUI();
}

// ── Fire stone Level 4 ────────────────────────────────────────
function fireMGStone4() {
  if (mgStone.active || mg4WavePhase !== 'play') return;
  const power = 7 + Math.min(mgStone.charge,60)*0.15;
  mgStone.active=true;
  mgStone.x=mgDavid.x+mgDavid.w-5;
  mgStone.y=mgDavid.y+30;
  mgStone.vx=Math.cos(mgAngle)*power;
  mgStone.vy=Math.sin(mgAngle)*power;
  mgStone.charge=0;
  SoundFX.play('throw');
}

// ── Blessing scroll spawn between waves ───────────────────────
function spawnBlessingScroll() {
  mg4BlessingScrolls.push({
    x: mgWidth*0.3 + Math.random()*mgWidth*0.4,
    y: mgHeight-120 - Math.random()*60,
    pulse:0
  });
}

// ── Update Level 4 ────────────────────────────────────────────
function updateMG4(delta) {
  mg4Frame++;

  // ── Intermission between waves ───────────────────────────────
  if (mg4WavePhase === 'intermission') {
    mg4IntTimer -= delta;

    // Scroll collection during intermission
    for (let i=mg4BlessingScrolls.length-1; i>=0; i--) {
      const sc=mg4BlessingScrolls[i];
      sc.pulse+=0.1;
      if (Math.hypot(mgDavid.x+mgDavid.w/2-sc.x, mgDavid.y+mgDavid.h/2-sc.y) < 28) {
        mg4BlessingScrolls.splice(i,1);
        if (mg4Lives < 3) { mg4Lives++; updateMG4UI(); SoundFX.play('powerup'); spawn('❤️',3); }
      }
    }

    // David can still move during intermission
    let mx=mgJoyVX!==0?mgJoyVX:(mgMoveRight?1:mgMoveLeft?-1:0);
    let my=mgJoyVY!==0?mgJoyVY:(mgMoveDown?1:mgMoveUp?-1:0);
    if(mx!==0&&my!==0&&mgJoyVX===0){mx*=0.707;my*=0.707;}
    mgDavid.x=Math.max(40,Math.min(mgWidth-mgDavid.w-40,mgDavid.x+mx*mgDavid.speed));
    mgDavid.y=Math.max(60,Math.min(mgHeight-mgDavid.h-60,mgDavid.y+my*mgDavid.speed));

    if (mg4IntTimer <= 0) {
      const nextWave = mg4Wave + 1;
      if (nextWave > 3) {
        mg4WavePhase = 'victory';
        if (mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}
        showMG4Overlay('victory');
      } else {
        mg4Wave = nextWave;
        mg4WavePhase = 'play';
        mg4BlessingScrolls = [];
        initMG4Wave(mg4Wave);
        initStones('4w' + mg4Wave);
        updateMG4UI();
      }
    }
    return;
  }

  if (mg4WavePhase !== 'play') return;

  // David movement
  let moveX=mgJoyVX!==0?mgJoyVX:(mgMoveRight?1:mgMoveLeft?-1:0);
  let moveY=mgJoyVY!==0?mgJoyVY:(mgMoveDown?1:mgMoveUp?-1:0);
  if(moveX!==0&&moveY!==0&&mgJoyVX===0){moveX*=0.707;moveY*=0.707;}
  mgDavid.x=Math.max(40,Math.min(mgWidth-mgDavid.w-40,mgDavid.x+moveX*mgDavid.speed));
  mgDavid.y=Math.max(60,Math.min(mgHeight-mgDavid.h-60,mgDavid.y+moveY*mgDavid.speed));
  if(mgGraceTimer>0) mgGraceTimer-=delta;

  if(mgChargeActive&&!mgStone.active) mgStone.charge=Math.min(60,(mgStone.charge||0)+1.5);

  // ── Wave 1: Champion AI ───────────────────────────────────────
  if (mg4Wave===1 && mg4Champion) {
    const ch=mg4Champion;
    if(ch.stateTimer>0) ch.stateTimer-=delta;
    else {
      const r=Math.random();
      ch.state = r<0.45?'TAUNTING':r<0.75?'WINDING_UP':'GUARDING';
      ch.stateTimer = ch.state==='TAUNTING'?1200:ch.state==='WINDING_UP'?1000:2400;
      updateMG4UI();
    }
    ch.x+=ch.walkDir*ch.speed;
    if(ch.x<mgWidth-300) ch.walkDir=1;
    if(ch.x>mgWidth-80)  ch.walkDir=-1;
    ch.y=mgHeight-185;

    // Fast javelins — no batch cooldown concept, direct fire
    if(ch.batchCooldown>0) ch.batchCooldown-=delta;
    else if(ch.batchSize<=0){ ch.batchSize=3+Math.floor(Math.random()*3); ch.batchCooldown=120; }
    else {
      const sx=ch.x-10,sy=ch.y+50,tx=mgDavid.x+mgDavid.w/2,ty=mgDavid.y+mgDavid.h/2;
      const d=Math.hypot(tx-sx,ty-sy),spd=7;
      mgJavelins.push({x:sx,y:sy,vx:(tx-sx)/d*spd,vy:(ty-sy)/d*spd,angle:Math.atan2(ty-sy,tx-sx)});
      ch.batchSize--; ch.batchCooldown=160;
      if(ch.batchSize===0) ch.batchCooldown=1000;
    }
  }

  // ── Wave 2 & 3: Goliath AI ────────────────────────────────────
  if (mgGoliath && (mg4Wave===2||mg4Wave===3)) {
    const g=mgGoliath;
    if(g.stateTimer>0) g.stateTimer-=delta;
    else {
      if(mg4Wave===3) {
        // Wave 3: never guards — always taunting or winding up
        g.state=Math.random()<0.6?'TAUNTING':'WINDING_UP';
        g.stateTimer=g.state==='TAUNTING'?900:700;
      } else {
        const r=Math.random();
        g.state=r<0.5?'TAUNTING':r<0.8?'WINDING_UP':'GUARDING';
        g.stateTimer=g.state==='TAUNTING'?1200:g.state==='WINDING_UP'?900:2200;
      }
      updateMG4UI();
    }
    g.x+=g.walkDir*g.speed;
    const walkMin=mg4Wave===3?mgWidth-350:mgWidth-280;
    const walkMax=mg4Wave===3?mgWidth-60:mgWidth-80;
    if(g.x<walkMin) g.walkDir=1; if(g.x>walkMax) g.walkDir=-1;
    g.y=mgHeight-180;

    // Javelins — wave 3 fires in bursts of 5
    const batchMax=mg4Wave===3?5:3+Math.floor(Math.random()*3);
    if(!g._batchSize) g._batchSize=0;
    if(!g._batchCD)   g._batchCD=0;
    if(g._batchCD>0) g._batchCD-=delta;
    else if(g._batchSize<=0){ g._batchSize=batchMax; g._batchCD=100; }
    else {
      const sx=g.x-10,sy=g.y+45,tx=mgDavid.x+mgDavid.w/2,ty=mgDavid.y+mgDavid.h/2;
      const d=Math.hypot(tx-sx,ty-sy),spd=mg4Wave===3?8:6.5;
      // Wave 3: fire spread (3 slightly different angles)
      if(mg4Wave===3) {
        [-0.08,0,0.08].forEach(offset=>{
          mgJavelins.push({x:sx,y:sy,vx:(tx-sx)/d*spd+Math.cos(Math.atan2(ty-sy,tx-sx)+offset)*spd,vy:(ty-sy)/d*spd+Math.sin(Math.atan2(ty-sy,tx-sx)+offset)*spd,angle:Math.atan2(ty-sy,tx-sx)+offset});
        });
      } else {
        mgJavelins.push({x:sx,y:sy,vx:(tx-sx)/d*spd,vy:(ty-sy)/d*spd,angle:Math.atan2(ty-sy,tx-sx)});
      }
      g._batchSize--; g._batchCD=mg4Wave===3?140:180;
      if(g._batchSize===0) g._batchCD=mg4Wave===3?800:1100;
    }
  }

  // ── Wave 2: Shield Bearer (dual shields) ─────────────────────
  if (mg4Wave===2 && mg2ShieldBearer) {
    const sb=mg2ShieldBearer;
    if(sb.state==='STAGGERED'){
      sb.staggerTimer-=delta;
      if(sb.staggerTimer<=0){sb.state='BLOCKING';sb.hits=0;sb.dualHits=0;updateMG4UI();}
    } else {
      const mid=(mgDavid.x+mgGoliath.x)/2, sbMid=sb.x+sb.w/2;
      if(sbMid<mid-25) sb.x+=sb.speed; else if(sbMid>mid+25) sb.x-=sb.speed;
      sb.x+=Math.sin(mg4Frame*0.04)*0.5;
      sb.x=Math.max(140,Math.min(mgWidth-200,sb.x));
      sb.y=mgHeight-160;

      // Dual shield throw
      if(!sb._throwCD) sb._throwCD=0;
      if(sb._throwCD>0) sb._throwCD-=delta;
      else {
        const sx=sb.x+sb.w/2,sy=sb.y+sb.h/2,tx=mgDavid.x+mgDavid.w/2,ty=mgDavid.y+mgDavid.h/2;
        const d=Math.hypot(tx-sx,ty-sy);
        // Fire two shields slightly offset
        [-0.1,0.1].forEach(offset=>{
          const ang=Math.atan2(ty-sy,tx-sx)+offset;
          mg2Shields.push({x:sx,y:sy,vx:Math.cos(ang)*3.5,vy:Math.sin(ang)*3.5,angle:ang,rot:0,w:30,h:20});
        });
        sb._throwCD=2200;
      }
    }
  }

  // ── David hit handler ─────────────────────────────────────────
  function davidHit4() {
    if(mgGraceTimer>0) return; // invincible — ignore hit
    mg4Lives--; mg4Combo=0; updateMG4UI(); mg4Shake=12; SoundFX.play('hurt');
    if(mg4Lives<=0){
      if(mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}
      showLifeRedemptionQuestion(
        () => { mg4Lives=1; updateMG4UI(); mg4WavePhase='play'; mg4LastTimestamp=0; mg4AnimationId=requestAnimationFrame(mgGameLoop4); },
        () => { mg4WavePhase='gameover'; showMG4Overlay('gameover'); }
      );
    }
  }

  // Javelins
  for(let i=mgJavelins.length-1;i>=0;i--){
    const j=mgJavelins[i]; j.x+=j.vx; j.y+=j.vy;
    if(j.x>mgDavid.x&&j.x<mgDavid.x+mgDavid.w&&j.y>mgDavid.y&&j.y<mgDavid.y+mgDavid.h){mgJavelins.splice(i,1);davidHit4();}
    else if(j.x>mgWidth+100||j.x<-100||j.y>mgHeight+100||j.y<-100) mgJavelins.splice(i,1);
  }
  // Shields
  for(let i=mg2Shields.length-1;i>=0;i--){
    const s=mg2Shields[i]; s.x+=s.vx; s.y+=s.vy; s.rot+=0.16;
    if(s.x>mgDavid.x&&s.x<mgDavid.x+mgDavid.w&&s.y>mgDavid.y&&s.y<mgDavid.y+mgDavid.h){mg2Shields.splice(i,1);davidHit4();}
    else if(s.x>mgWidth+100||s.x<-100||s.y>mgHeight+100||s.y<-100) mg2Shields.splice(i,1);
  }

  // ── David's stone collisions ──────────────────────────────────
  if(mgStone.active){
    mgStone.x+=mgStone.vx; mgStone.vy+=0.3; mgStone.y+=mgStone.vy;
    mgStone.trail.unshift({x:mgStone.x,y:mgStone.y}); if(mgStone.trail.length>6)mgStone.trail.pop();

    // Wave 1: Hit Champion
    if(mg4Wave===1&&mg4Champion){
      const ch=mg4Champion;
      const fx=ch.x+10,fy=ch.y+2,fw=ch.w-20,fh=24; // forehead
      if(mgStone.x>fx&&mgStone.x<fx+fw&&mgStone.y>fy&&mgStone.y<fy+fh){
        const isStraight=Math.abs(Math.atan2(mgStone.vy,mgStone.vx))<0.3;
        let canHit=false;
        if(ch.state==='TAUNTING'||ch.state==='WINDING_UP'||ch.state==='STUNNED') canHit=true;
        if((ch.state==='GUARDING')&&!isStraight) canHit=true;
        if(canHit){
          const pts=Math.floor((280+mgStone.charge*6)*mg4ScoreMult);
          mg4Score+=pts; mg4Combo++; if(mg4Combo>mg4MaxCombo)mg4MaxCombo=mg4Combo;
          mg4Hits++; SoundFX.play('hit'); mg4Shake=14;
          mgStone.active=false; mgStone.trail=[]; spawn('✨',4); updateMG4UI();
          if(mg4Hits>=3){
            // Wave 1 cleared
            mg4WavePhase='intermission'; mg4IntTimer=3500;
            spawnBlessingScroll(); spawnBlessingScroll();
            mg4Hits=0; mg4Combo=0;
            updateMG4UI(); SoundFX.play('victory');
            spawn('🌟',6);
          } else { ch.state='STUNNED'; ch.stateTimer=1200; }
        } else { SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); }
        return;
      }
      // Champion body
      if(mgStone.x>ch.x+4&&mgStone.x<ch.x+ch.w-4&&mgStone.y>ch.y+30&&mgStone.y<ch.y+ch.h-20){
        SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); return;
      }
    }

    // Wave 2: Shield Bearer (dual) + Goliath
    if(mg4Wave===2){
      const sb=mg2ShieldBearer;
      if(sb&&sb.state!=='STAGGERED'){
        // Primary shield (left arm)
        const sx1=sb.x-14,sy1=sb.y+8,sw1=sb.shieldW+14,sh1=sb.shieldH;
        if(mgStone.x>sx1&&mgStone.x<sx1+sw1&&mgStone.y>sy1&&mgStone.y<sy1+sh1){
          sb.hits++; SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[];
          mg4Combo=Math.max(0,mg4Combo-1);
          if(sb.hits>=3){sb.state='STAGGERED';sb.staggerTimer=1600;mg4Score+=80;SoundFX.beep(880,0.15);updateMG4UI();}
          return;
        }
        // Dual shield (right arm — also blocks)
        const sx2=sb.x+sb.w-2,sy2=sb.y+8,sw2=sb.shieldW,sh2=sb.shieldH;
        if(mgStone.x>sx2&&mgStone.x<sx2+sw2&&mgStone.y>sy2&&mgStone.y<sy2+sh2){
          sb.dualHits++; SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[];
          mg4Combo=Math.max(0,mg4Combo-1);
          if(sb.dualHits>=2){sb.state='STAGGERED';sb.staggerTimer=1600;mg4Score+=80;SoundFX.beep(880,0.15);updateMG4UI();}
          return;
        }
      }
      // Goliath forehead
      if(mgGoliath){
        const g=mgGoliath;
        const fx=g.x+8,fy=g.y+2,fw=g.w-16,fh=22;
        if(mgStone.x>fx&&mgStone.x<fx+fw&&mgStone.y>fy&&mgStone.y<fy+fh){
          const isSt=Math.abs(Math.atan2(mgStone.vy,mgStone.vx))<0.3;
          const arced=sb&&sb.state!=='STAGGERED'&&mgStone.y<sb.y;
          let canHit=false;
          if(g.state==='TAUNTING'||g.state==='WINDING_UP'||g.state==='STUNNED') canHit=true;
          if((g.state==='GUARDING'||g.state==='RAGE')&&!isSt) canHit=true;
          if(canHit){
            const pts=Math.floor((260+mgStone.charge*6+(arced?100:0))*mg4ScoreMult);
            mg4Score+=pts; mg4Combo++; if(mg4Combo>mg4MaxCombo)mg4MaxCombo=mg4Combo;
            mg4Hits++; SoundFX.play('hit'); mg4Shake=15;
            mgStone.active=false; mgStone.trail=[]; spawn(arced?'🌟':'✨',arced?5:3); updateMG4UI();
            if(mg4Hits>=3){
              mg4WavePhase='intermission'; mg4IntTimer=3500;
              spawnBlessingScroll();
              mg4Hits=0; mg4Combo=0; updateMG4UI(); SoundFX.play('victory'); spawn('🌟',6);
            } else { g.state='STUNNED'; g.stateTimer=1100; }
          } else { SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); }
          return;
        }
        if(mgStone.x>g.x+4&&mgStone.x<g.x+g.w-4&&mgStone.y>g.y+30&&mgStone.y<g.y+g.h-40){
          SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); return;
        }
      }
    }

    // Wave 3: Goliath — FINAL
    if(mg4Wave===3&&mgGoliath){
      const g=mgGoliath;
      const fx=g.x+8,fy=g.y+2,fw=g.w-16,fh=22;
      if(mgStone.x>fx&&mgStone.x<fx+fw&&mgStone.y>fy&&mgStone.y<fy+fh){
        const isSt=Math.abs(Math.atan2(mgStone.vy,mgStone.vx))<0.3;
        // Wave 3: can ONLY be hit with arc (no straight shots)
        let canHit = !isSt; // must arc
        if(g.state==='TAUNTING'||g.state==='STUNNED') canHit=true; // brief window
        if(canHit){
          const pts=Math.floor((320+mgStone.charge*8)*mg4ScoreMult);
          mg4Score+=pts; mg4Combo++; if(mg4Combo>mg4MaxCombo)mg4MaxCombo=mg4Combo;
          mg4Hits++; SoundFX.play('hit'); mg4Shake=18;
          mgStone.active=false; mgStone.trail=[]; spawn('🌟',6); updateMG4UI();
          if(mg4Hits>=3){
            // FINAL VICTORY
            mg4WavePhase='victory';
            if(mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}
            showMG4Overlay('victory');
          } else { g.state='STUNNED'; g.stateTimer=900; }
        } else { SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); }
        return;
      }
      if(mgStone.x>g.x+4&&mgStone.x<g.x+g.w-4&&mgStone.y>g.y+30&&mgStone.y<g.y+g.h-40){
        SoundFX.play('armoured'); mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI(); return;
      }
    }

    // Out of bounds
    if(mgStone.x>mgWidth+100||mgStone.x<-100||mgStone.y>mgHeight+100||mgStone.y<-100){
      mgStone.active=false; mgStone.trail=[]; mg4Combo=Math.max(0,mg4Combo-1); updateMG4UI();
    }
  }

  if(mg4Shake>0.3) mg4Shake*=0.82;
}

// ── Draw Level 4 ──────────────────────────────────────────────
function drawMG4() {
  mgCtx.clearRect(0,0,mgWidth,mgHeight);
  mgCtx.save();
  if(mg4Shake>0.5) mgCtx.translate((Math.random()-0.5)*mg4Shake,(Math.random()-0.5)*mg4Shake);

  // Sky — epic purple/crimson
  const wavePalettes=[
    ['#1a0820','#2a0c30','#140818'], // W1 purple
    ['#1a0000','#2e0800','#100000'], // W2 dark red
    ['#0a0020','#000000','#000000'], // W3 black void
  ];
  const pal=wavePalettes[mg4Wave-1]||wavePalettes[0];
  const sky4=mgCtx.createLinearGradient(0,0,0,mgHeight);
  sky4.addColorStop(0,pal[0]); sky4.addColorStop(0.6,pal[1]); sky4.addColorStop(1,pal[2]);
  mgCtx.fillStyle=sky4; mgCtx.fillRect(0,0,mgWidth,mgHeight);

  // Lightning (wave 3)
  if(mg4Wave===3&&mg4Frame%90<3){
    mgCtx.strokeStyle='rgba(255,255,200,0.6)'; mgCtx.lineWidth=2;
    mgCtx.beginPath();
    let lx=mgWidth*0.3+Math.random()*mgWidth*0.4, ly=0;
    mgCtx.moveTo(lx,ly);
    for(let i=0;i<6;i++){lx+=(Math.random()-0.5)*60;ly+=mgHeight/6;mgCtx.lineTo(lx,ly);}
    mgCtx.stroke();
  }

  // Ground
  const waveGrounds=['#2a1040','#1a0808','#050510'];
  const wg4=mgCtx.createLinearGradient(0,mgHeight-80,0,mgHeight);
  wg4.addColorStop(0,waveGrounds[mg4Wave-1]||'#1a0820'); wg4.addColorStop(1,'#000000');
  mgCtx.fillStyle=wg4; mgCtx.fillRect(0,mgHeight-80,mgWidth,80);

  // Glowing ground cracks (wave 3)
  if(mg4Wave===3){
    mgCtx.strokeStyle=`rgba(255,50,0,${0.3+Math.sin(mg4Frame*0.08)*0.15})`; mgCtx.lineWidth=2;
    [[100,mgHeight-60,280,mgHeight-45],[mgWidth-300,mgHeight-55,mgWidth-80,mgHeight-65]].forEach(([x1,y1,x2,y2])=>{
      mgCtx.beginPath(); mgCtx.moveTo(x1,y1); mgCtx.lineTo(x2,y2); mgCtx.stroke();
    });
  }

  // Intermission overlay
  if(mg4WavePhase==='intermission'){
    const progress=1-(mg4IntTimer/3500);
    mgCtx.fillStyle=`rgba(0,0,0,${0.3*Math.sin(progress*Math.PI)})`;
    mgCtx.fillRect(0,0,mgWidth,mgHeight);
    mgCtx.fillStyle='rgba(255,215,0,0.9)'; mgCtx.font='bold 20px "Cinzel",monospace'; mgCtx.textAlign='center';
    mgCtx.fillText(`⚡ WAVE ${mg4Wave} CLEARED! ⚡`,mgWidth/2,mgHeight/2-20);
    mgCtx.fillStyle='rgba(200,200,200,0.8)'; mgCtx.font='13px "Cinzel",monospace';
    mgCtx.fillText('Collect ✝️ Blessing Scrolls for extra lives!',mgWidth/2,mgHeight/2+10);
    const pct=1-(mg4IntTimer/3500);
    mgCtx.fillStyle='rgba(255,215,0,0.4)'; mgCtx.fillRect(mgWidth/2-80,mgHeight/2+28,pct*160,6);
    mgCtx.strokeStyle='rgba(255,215,0,0.3)'; mgCtx.lineWidth=1; mgCtx.strokeRect(mgWidth/2-80,mgHeight/2+28,160,6);
  }

  // Blessing scrolls
  for(const sc of mg4BlessingScrolls){
    sc.pulse+=0.08;
    const sg4=mgCtx.createRadialGradient(sc.x,sc.y,0,sc.x,sc.y,30+Math.sin(sc.pulse)*5);
    sg4.addColorStop(0,'rgba(255,215,0,0.9)'); sg4.addColorStop(0.4,'rgba(200,160,20,0.4)'); sg4.addColorStop(1,'rgba(0,0,0,0)');
    mgCtx.fillStyle=sg4; mgCtx.beginPath(); mgCtx.arc(sc.x,sc.y,30+Math.sin(sc.pulse)*5,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle='rgba(255,230,100,0.95)'; mgCtx.font='bold 20px serif'; mgCtx.textAlign='center';
    mgCtx.fillText('✝️',sc.x,sc.y+7);
    mgCtx.fillStyle='rgba(255,230,100,0.8)'; mgCtx.font='13px "Cinzel",monospace';
    mgCtx.fillText('BLESSING',sc.x,sc.y+24);
  }

  // ── Wave 1: Champion ─────────────────────────────────────────
  if(mg4Wave===1&&mg4Champion){
    const ch=mg4Champion;
    mgCtx.fillStyle='rgba(0,0,0,0.4)'; mgCtx.beginPath(); mgCtx.ellipse(ch.x+ch.w/2,ch.y+ch.h+6,34,11,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle='#4a3010'; mgCtx.fillRect(ch.x+8,ch.y+ch.h-20,22,20); mgCtx.fillRect(ch.x+ch.w-30,ch.y+ch.h-20,22,20);
    // Body — purple-bronze armour
    const cbg=mgCtx.createLinearGradient(ch.x,ch.y+25,ch.x+ch.w,ch.y+25);
    cbg.addColorStop(0,'#4a3060'); cbg.addColorStop(0.5,ch.state==='STUNNED'?'#666':'#9060c0'); cbg.addColorStop(1,'#4a3060');
    mgCtx.fillStyle=cbg; mgCtx.beginPath(); mgCtx.roundRect(ch.x+4,ch.y+30,ch.w-8,ch.h-50,6); mgCtx.fill();
    // Armour plates
    mgCtx.strokeStyle='rgba(150,100,200,0.4)'; mgCtx.lineWidth=1;
    for(let row=0;row<4;row++) for(let col=0;col<4;col++){ mgCtx.beginPath(); mgCtx.arc(ch.x+14+col*15,ch.y+42+row*15,7,0,Math.PI); mgCtx.stroke(); }
    // Arms
    mgCtx.fillStyle='#806090'; mgCtx.fillRect(ch.x-10,ch.y+30,16,38); mgCtx.fillRect(ch.x+ch.w-6,ch.y+30,16,38);
    // Helmet
    const chg=mgCtx.createLinearGradient(ch.x,ch.y,ch.x+ch.w,ch.y);
    chg.addColorStop(0,'#503070'); chg.addColorStop(0.5,'#c090e0'); chg.addColorStop(1,'#503070');
    mgCtx.fillStyle=chg; mgCtx.beginPath(); mgCtx.arc(ch.x+ch.w/2,ch.y+16,ch.w/2-6,Math.PI,2*Math.PI); mgCtx.fill();
    mgCtx.fillRect(ch.x+4,ch.y+16,ch.w-8,20); mgCtx.fillStyle='#c0a0d0'; mgCtx.fillRect(ch.x+14,ch.y+16,ch.w-28,24);
    // Eyes
    const cer=ch.state==='STUNNED'?80:255;
    mgCtx.fillStyle=`rgb(${cer},0,${cer})`; mgCtx.beginPath(); mgCtx.ellipse(ch.x+ch.w/2-11,ch.y+25,5,4,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.beginPath(); mgCtx.ellipse(ch.x+ch.w/2+11,ch.y+25,5,4,0,0,Math.PI*2); mgCtx.fill();
    // Forehead target
    mgCtx.strokeStyle=`rgba(255,100,255,${0.35+Math.sin(mg4Frame*0.12)*0.2})`; mgCtx.lineWidth=2; mgCtx.setLineDash([4,4]);
    mgCtx.strokeRect(ch.x+10,ch.y+2,ch.w-20,24); mgCtx.setLineDash([]);
    // Hit marks
    for(let h=0;h<mg4Hits&&mg4Wave===1;h++){ mgCtx.fillStyle='#aa00aa'; mgCtx.beginPath(); mgCtx.arc(ch.x+ch.w/2+(h-1)*14,ch.y+12,5,0,Math.PI*2); mgCtx.fill(); }
    // Label
    mgCtx.fillStyle='rgba(200,150,255,0.9)'; mgCtx.font='bold 11px "Cinzel",monospace'; mgCtx.textAlign='center';
    mgCtx.fillText(ch.state==='STUNNED'?'💫 CHAMPION 💫':'⚔️ CHAMPION',ch.x+ch.w/2,ch.y-10);
    mgCtx.fillStyle='rgba(255,200,100,0.7)'; mgCtx.font='13px "Cinzel",monospace';
    mgCtx.fillText('▲ AIM HERE',ch.x+ch.w/2,ch.y+1);
    // Heavy spear weapon
    mgCtx.strokeStyle='#c090e0'; mgCtx.lineWidth=3;
    mgCtx.beginPath(); mgCtx.moveTo(ch.x-10,ch.y+25); mgCtx.lineTo(ch.x-30,ch.y-10); mgCtx.stroke();
    mgCtx.fillStyle='#e0c0ff'; mgCtx.beginPath(); mgCtx.moveTo(ch.x-30,ch.y-10); mgCtx.lineTo(ch.x-22,ch.y-22); mgCtx.lineTo(ch.x-38,ch.y-20); mgCtx.closePath(); mgCtx.fill();
  }

  // ── Wave 2: Shield Bearer (dual) ─────────────────────────────
  if(mg4Wave===2&&mg2ShieldBearer){
    const sb=mg2ShieldBearer, stag=sb.state==='STAGGERED';
    if(stag&&Math.sin(mg4Frame*0.4)>0) mgCtx.globalAlpha=0.4;
    mgCtx.fillStyle='rgba(0,0,0,0.3)'; mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2,sb.y+sb.h+4,18,5,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle=stag?'#6a3a18':'#3e2e10'; mgCtx.beginPath(); mgCtx.roundRect(sb.x+4,sb.y+20,sb.w-8,sb.h-20,3); mgCtx.fill();
    mgCtx.fillStyle=stag?'#8a5838':'#5a4018'; mgCtx.beginPath(); mgCtx.arc(sb.x+sb.w/2,sb.y+12,12,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle='#3a2010'; mgCtx.beginPath(); mgCtx.arc(sb.x+sb.w/2,sb.y+7,12,Math.PI,2*Math.PI); mgCtx.fill();
    mgCtx.fillStyle=stag?'#777':'#cc1800';
    mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2-5,sb.y+12,3,2.5,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.beginPath(); mgCtx.ellipse(sb.x+sb.w/2+5,sb.y+12,3,2.5,0,0,Math.PI*2); mgCtx.fill();
    if(!stag){
      // LEFT shield
      const sg1=mgCtx.createLinearGradient(sb.x-14,sb.y+8,sb.x-14+sb.shieldW,sb.y+8);
      sg1.addColorStop(0,'#5a4020'); sg1.addColorStop(0.5,'#a08030'); sg1.addColorStop(1,'#5a4020');
      mgCtx.fillStyle=sg1; mgCtx.beginPath(); mgCtx.roundRect(sb.x-14,sb.y+8,sb.shieldW,sb.shieldH,5); mgCtx.fill();
      mgCtx.strokeStyle='#c09040'; mgCtx.lineWidth=2; mgCtx.stroke();
      // RIGHT shield (dual)
      const sg2=mgCtx.createLinearGradient(sb.x+sb.w-2,sb.y+8,sb.x+sb.w-2+sb.shieldW,sb.y+8);
      sg2.addColorStop(0,'#604020'); sg2.addColorStop(0.5,'#b09040'); sg2.addColorStop(1,'#604020');
      mgCtx.fillStyle=sg2; mgCtx.beginPath(); mgCtx.roundRect(sb.x+sb.w-2,sb.y+8,sb.shieldW,sb.shieldH,5); mgCtx.fill();
      mgCtx.strokeStyle='#d0a050'; mgCtx.lineWidth=2; mgCtx.stroke();
      mgCtx.fillStyle='rgba(255,200,60,0.8)'; mgCtx.font='bold 9px "Cinzel",monospace'; mgCtx.textAlign='center';
      mgCtx.fillText('⛨⛨ DUAL SHIELDS',sb.x+sb.w/2,sb.y-7);
    } else {
      mgCtx.font='13px serif'; mgCtx.textAlign='center'; mgCtx.fillText('⭐⭐',sb.x+sb.w/2,sb.y-8);
      mgCtx.fillStyle='rgba(120,210,255,0.9)'; mgCtx.font='bold 9px "Cinzel",monospace'; mgCtx.fillText('STAGGERED!',sb.x+sb.w/2,sb.y-22);
    }
    mgCtx.globalAlpha=1;
  }

  // ── Wave 2 & 3: Goliath ───────────────────────────────────────
  if(mgGoliath&&(mg4Wave===2||mg4Wave===3)){
    const g=mgGoliath;
    mgCtx.fillStyle='rgba(0,0,0,0.45)'; mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2,g.y+g.h+6,36,12,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle='#3a2008'; mgCtx.fillRect(g.x+8,g.y+g.h-20,20,20); mgCtx.fillRect(g.x+g.w-28,g.y+g.h-20,20,20);
    const waveBodyColor=mg4Wave===3?'#c03000':'#c0a050';
    const gbg=mgCtx.createLinearGradient(g.x,g.y+25,g.x+g.w,g.y+25);
    gbg.addColorStop(0,'#6a5030'); gbg.addColorStop(0.5,waveBodyColor); gbg.addColorStop(1,'#6a5030');
    mgCtx.fillStyle=gbg; mgCtx.beginPath(); mgCtx.roundRect(g.x+4,g.y+30,g.w-8,g.h-50,6); mgCtx.fill();
    mgCtx.strokeStyle='rgba(100,60,20,0.4)'; mgCtx.lineWidth=1;
    for(let row=0;row<4;row++) for(let col=0;col<4;col++){ mgCtx.beginPath(); mgCtx.arc(g.x+12+col*14,g.y+42+row*14,6,0,Math.PI); mgCtx.stroke(); }
    mgCtx.fillStyle='#907030'; mgCtx.fillRect(g.x-8,g.y+30,14,36); mgCtx.fillRect(g.x+g.w-6,g.y+30,14,36);
    const ghg=mgCtx.createLinearGradient(g.x,g.y,g.x+g.w,g.y);
    ghg.addColorStop(0,'#6a5030'); ghg.addColorStop(0.5,mg4Wave===3?'#d04000':'#c0a060'); ghg.addColorStop(1,'#6a5030');
    mgCtx.fillStyle=ghg; mgCtx.beginPath(); mgCtx.arc(g.x+g.w/2,g.y+16,g.w/2-6,Math.PI,2*Math.PI); mgCtx.fill();
    mgCtx.fillRect(g.x+4,g.y+16,g.w-8,18); mgCtx.fillStyle=mg4Wave===3?'#c06040':'#b09060'; mgCtx.fillRect(g.x+12,g.y+16,g.w-24,22);
    mgCtx.fillStyle='rgb(255,10,0)';
    mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2-10,g.y+24,5,4,0,0,Math.PI*2); mgCtx.fill();
    mgCtx.beginPath(); mgCtx.ellipse(g.x+g.w/2+10,g.y+24,5,4,0,0,Math.PI*2); mgCtx.fill();
    const glowCol=mg4Wave===3?`rgba(255,50,0,${0.5+Math.sin(mg4Frame*0.15)*0.3})`:`rgba(255,100,0,${0.35+Math.sin(mg4Frame*0.1)*0.2})`;
    mgCtx.strokeStyle=glowCol; mgCtx.lineWidth=mg4Wave===3?3:2; mgCtx.setLineDash([4,4]);
    mgCtx.strokeRect(g.x+10,g.y+2,g.w-20,22); mgCtx.setLineDash([]);
    for(let h=0;h<mg4Hits;h++){ mgCtx.fillStyle='#cc2200'; mgCtx.beginPath(); mgCtx.arc(g.x+g.w/2+(h-1)*12,g.y+12,5,0,Math.PI*2); mgCtx.fill(); }
    mgCtx.fillStyle='#8b6914'; mgCtx.fillRect(g.x-12,g.y+25,6,80);
    mgCtx.fillStyle='#c0c0c0'; mgCtx.beginPath(); mgCtx.moveTo(g.x-12,g.y+25); mgCtx.lineTo(g.x-6,g.y+25); mgCtx.lineTo(g.x-9,g.y+5); mgCtx.closePath(); mgCtx.fill();
    mgCtx.fillStyle=mg4Wave===3?'rgba(255,40,40,0.95)':'rgba(255,80,60,0.9)';
    mgCtx.font='bold 11px "Cinzel",monospace'; mgCtx.textAlign='center';
    mgCtx.fillText(mg4Wave===3?'⚡⚡ GOLIATH ⚡⚡':'⚡ GOLIATH ⚡',g.x+g.w/2,g.y-10);
    mgCtx.fillStyle='rgba(255,200,100,0.7)'; mgCtx.font='13px "Cinzel",monospace';
    mgCtx.fillText('▲ AIM HERE',g.x+g.w/2,g.y+1);
  }

  // ── David ─────────────────────────────────────────────────────
  const d=mgDavid;
  mgCtx.fillStyle='rgba(0,0,0,0.3)'; mgCtx.beginPath(); mgCtx.ellipse(d.x+d.w/2,d.y+d.h+4,20,6,0,0,Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle='#8b6914'; mgCtx.beginPath(); mgCtx.roundRect(d.x+5,d.y+22,d.w-10,d.h-22,4); mgCtx.fill();
  mgCtx.fillStyle='#a07820'; mgCtx.fillRect(d.x+5,d.y+22,d.w-10,8);
  mgCtx.fillStyle='#c8a060'; mgCtx.fillRect(d.x-5,d.y+24,10,20); mgCtx.fillRect(d.x+d.w-5,d.y+24,10,20);
  mgCtx.beginPath(); mgCtx.arc(d.x+d.w/2,d.y+12,14,0,Math.PI*2); mgCtx.fill();
  mgCtx.fillStyle='#5a3010'; mgCtx.beginPath(); mgCtx.arc(d.x+d.w/2,d.y+6,14,Math.PI,2*Math.PI); mgCtx.fill();
  mgCtx.fillStyle='#2a1800'; mgCtx.fillRect(d.x+d.w/2-6,d.y+11,4,3); mgCtx.fillRect(d.x+d.w/2+2,d.y+11,4,3);
  mgCtx.strokeStyle=mgChargeActive?'#ffaa00':'#8b6914'; mgCtx.lineWidth=2;
  mgCtx.beginPath(); mgCtx.moveTo(d.x+d.w-5,d.y+30); mgCtx.lineTo(d.x+d.w+15,d.y+24); mgCtx.stroke();
  mgCtx.fillStyle=mgChargeActive?'#ffaa00':'#a07820'; mgCtx.fillRect(d.x+d.w+10,d.y+21,8,6);
  mgCtx.fillStyle='rgba(255,220,100,0.9)'; mgCtx.font='bold 11px "Cinzel",monospace'; mgCtx.textAlign='center';
  mgCtx.fillText('DAVID',d.x+d.w/2,d.y-8);
  if (mgGraceTimer > 0 && Math.sin(mg4Frame * 0.5) > 0) {
    mgCtx.save();
    mgCtx.globalAlpha = 0.35 + 0.25 * Math.sin(mg4Frame * 0.4);
    mgCtx.strokeStyle = '#ffe066'; mgCtx.lineWidth = 3;
    mgCtx.beginPath();
    mgCtx.ellipse(d.x+d.w/2, d.y+d.h/2, d.w/2+10, d.h/2+10, 0, 0, Math.PI*2);
    mgCtx.stroke(); mgCtx.restore();
  }

  // ── Javelins ─────────────────────────────────────────────────
  for(const j of mgJavelins){
    mgCtx.save(); mgCtx.translate(j.x,j.y); mgCtx.rotate(j.angle);
    mgCtx.fillStyle='#6b5010'; mgCtx.fillRect(0,-2,28,4);
    mgCtx.fillStyle=mg4Wave===3?'#ff4400':'#c0c0c0';
    mgCtx.beginPath(); mgCtx.moveTo(28,-5); mgCtx.lineTo(38,0); mgCtx.lineTo(28,5); mgCtx.closePath(); mgCtx.fill();
    mgCtx.restore();
  }
  // Shields
  for(const s of mg2Shields){
    mgCtx.save(); mgCtx.translate(s.x,s.y); mgCtx.rotate(s.rot);
    mgCtx.fillStyle='#6a5020'; mgCtx.strokeStyle='#a08030'; mgCtx.lineWidth=2;
    mgCtx.beginPath(); mgCtx.roundRect(-s.w/2,-s.h/2,s.w,s.h,4); mgCtx.fill(); mgCtx.stroke();
    mgCtx.fillStyle='#c09040'; mgCtx.beginPath(); mgCtx.arc(0,0,5,0,Math.PI*2); mgCtx.fill();
    mgCtx.restore();
  }

  // ── Stone + trail ─────────────────────────────────────────────
  if(mgStone.active){
    for(let i=0;i<mgStone.trail.length;i++){ mgCtx.globalAlpha=0.6-i*0.1; mgCtx.fillStyle='#ffaa44'; mgCtx.beginPath(); mgCtx.arc(mgStone.trail[i].x,mgStone.trail[i].y,6-i,0,Math.PI*2); mgCtx.fill(); }
    mgCtx.globalAlpha=1; mgCtx.fillStyle='#c8a060'; mgCtx.beginPath(); mgCtx.arc(mgStone.x,mgStone.y,8,0,Math.PI*2); mgCtx.fill();
    mgCtx.fillStyle='#aa8844'; mgCtx.beginPath(); mgCtx.arc(mgStone.x-1,mgStone.y-1,3,0,Math.PI*2); mgCtx.fill();
  }

  // ── Trajectory preview ───────────────────────────────────────
  const activeEnemy=mg4Wave===1?mg4Champion:mgGoliath;
  if(mgChargeActive&&!mgStone.active&&mg4WavePhase==='play'&&activeEnemy){
    const power=7+Math.min(mgStone.charge,60)*0.15;
    const fx=activeEnemy.x+8,fy=activeEnemy.y+2,fw=activeEnemy.w-16,fh=24;
    let svx=Math.cos(mgAngle)*power,svy=Math.sin(mgAngle)*power,sx=mgDavid.x+mgDavid.w-5,sy=mgDavid.y+30,willHit=false,hitVy=svy;
    for(let i=0;i<80;i++){svy+=0.3;sx+=svx;sy+=svy;if(sx>fx&&sx<fx+fw&&sy>fy&&sy<fy+fh){willHit=true;hitVy=svy;break;}if(sx>mgWidth+60||sy>mgHeight+60||sy<-60)break;}
    const isSt=Math.abs(Math.atan2(hitVy,Math.cos(mgAngle)*power))<0.3;
    const st=activeEnemy.state;
    const canHit=willHit&&((st==='TAUNTING'||st==='WINDING_UP'||st==='STUNNED')||((st==='GUARDING'||st==='RAGE')&&!isSt));
    const dc=willHit?(canHit?'#44ff88':'#ff4444'):'#ffdd88';
    let vx=Math.cos(mgAngle)*power,vy=Math.sin(mgAngle)*power,x=mgDavid.x+mgDavid.w-5,y=mgDavid.y+30;
    mgCtx.save();
    for(let i=0;i<70;i++){vy+=0.3;x+=vx;y+=vy;if(i%2===0){mgCtx.globalAlpha=Math.max(0.08,0.75-i*0.012);mgCtx.fillStyle=dc;mgCtx.beginPath();mgCtx.arc(x,y,Math.max(1.5,4.5-i*0.055),0,Math.PI*2);mgCtx.fill();}if(x>mgWidth+60||y>mgHeight+60||y<-60)break;}
    mgCtx.globalAlpha=0.45;mgCtx.strokeStyle=dc;mgCtx.lineWidth=1.5;mgCtx.setLineDash([3,3]);
    mgCtx.beginPath();mgCtx.arc(x,y,9,0,Math.PI*2);mgCtx.stroke();mgCtx.setLineDash([]);mgCtx.globalAlpha=1;mgCtx.restore();
  }

  // Charge bar
  if(mgChargeActive&&!mgStone.active){
    const pct=(mgStone.charge||0)/60;
    mgCtx.fillStyle=`rgba(255,${200-Math.round(pct*200)},0,0.9)`;mgCtx.fillRect(mgDavid.x-5,mgDavid.y-20,pct*60,8);
    mgCtx.strokeStyle='rgba(255,200,0,0.6)';mgCtx.lineWidth=1;mgCtx.strokeRect(mgDavid.x-5,mgDavid.y-20,60,8);
    mgCtx.fillStyle='rgba(255,200,100,0.9)';mgCtx.font='bold 10px "Cinzel",monospace';mgCtx.textAlign='center';
    mgCtx.fillText(`⚡ ${Math.round(pct*100)}%`,mgDavid.x+25,mgDavid.y-25);
  }

  // Wave badge (bottom)
  const waveColors=['rgba(200,150,255,0.75)','rgba(255,100,80,0.75)','rgba(255,50,50,0.9)'];
  const waveLabels=['👑 LEVEL 4 — WAVE 1: THE CHAMPION','👑 LEVEL 4 — WAVE 2: DUAL SHIELDS','👑 LEVEL 4 — WAVE 3: FINAL BATTLE'];
  mgCtx.fillStyle=waveColors[mg4Wave-1]||waveColors[0];
  mgCtx.font='bold 11px "Cinzel",monospace'; mgCtx.textAlign='left';
  mgCtx.fillText(waveLabels[mg4Wave-1]||'',12,mgHeight-12);

  // Score multiplier badge
  if(mg4ScoreMult>1){
    mgCtx.fillStyle=`rgba(255,215,0,0.9)`; mgCtx.textAlign='right';
    mgCtx.fillText(`×${mg4ScoreMult} MULTIPLIER`,mgWidth-12,mgHeight-12);
  }

  mgCtx.globalAlpha=1; mgCtx.restore();
}

// ── Game loop Level 4 ─────────────────────────────────────────
function mgGameLoop4(now) {
  if(!mgCanvas||!document.getElementById('s-minigame').classList.contains('active')){
    if(mg4AnimationId) cancelAnimationFrame(mg4AnimationId);
    mg4AnimationId=null; return;
  }
  mg4AnimationId=requestAnimationFrame(mgGameLoop4);
  if (_shopPaused) return;
  let delta=Math.min(32,now-mg4LastTimestamp); if(delta<10)delta=16;
  mg4LastTimestamp=now; updateMG4(delta); drawMG4();
}

// ── Level 4 overlays ──────────────────────────────────────────
function showMG4Overlay(type) {
  let ov=document.querySelector('.mg-full-overlay'); if(ov)ov.remove();
  ov=document.createElement('div'); ov.className='mg-full-overlay';

  if(type==='start'){
    ov.innerHTML=`
      <h2 style="color:#cc88ff;">👑 Level 4: The Army of God</h2>
      <p style="max-width:320px;line-height:1.9;font-size:13px;">
        Three waves stand between you and eternal glory:<br>
        ⚔️ <b>Wave 1</b> — Goliath's Champion (armoured, fast)<br>
        🛡️ <b>Wave 2</b> — Dual Shield Bearer + Rage Goliath<br>
        💀 <b>Wave 3</b> — Goliath FULL RAGE, javelin walls<br><br>
        ✝️ Collect <b>Blessing Scrolls</b> between waves to restore lives<br>
        📈 Score <b>multiplier increases</b> each wave<br>
        🪨 Wave 3 requires an <b>arc shot</b> — aim high!
      </p>
      <button id="mg4StartBtn" style="background:linear-gradient(135deg,#1a0a2a,#4a1a7a,#1a0a2a);border:2px solid #8844cc;color:#cc88ff;font-size:14px;padding:14px 32px;">👑 BEGIN THE ARMY OF GOD</button>
      <button id="mg4ExitBtn" style="background:#1a1a1a;color:#666;">✕ Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg4StartBtn').onclick=()=>{
      ov.remove(); resetMG4(); mg4WavePhase='play'; updateMG4UI();
      SoundFX.startMusic('epic');
      if(mg4AnimationId) cancelAnimationFrame(mg4AnimationId);
      mg4LastTimestamp=0; mg4AnimationId=requestAnimationFrame(mgGameLoop4);
    };
    document.getElementById('mg4ExitBtn').onclick=()=>{ov.remove();mgCurrentLevel=1;exitMiniGame();};

  } else if(type==='victory'){
    markLevel3Beaten();
    SoundFX.play('victory'); spawn('🌟',12); spawnConfetti();
    ov.innerHTML=`
      <h2 style="color:#ffd700;font-size:22px;">👑 CHAMPION OF FAITH! 👑</h2>
      <p style="max-width:300px;">Score: <b>${mg4Score}</b> · Max Combo: ${mg4MaxCombo}x<br>
      <span style="color:#ffd700;font-size:12px;">All three waves conquered! You are a true Champion of God's Army!</span><br>
      <span style="color:#cc88ff;font-size:11px;">🏆 Champion of Faith badge unlocked on leaderboard</span></p>
      <button id="mg4SaveBtn" style="background:linear-gradient(135deg,#7a5800,#e8c96a,#7a5800);color:#1a0f00;font-weight:bold;">👑 Save to Hall of Champions</button>
      <button id="mg4RestartBtn">Play Again</button>
      <button id="mg4ShareBtn" style="background:linear-gradient(135deg,#1a3a5a,#2a5a8a);border:1px solid #4488bb;color:#88ccff;">📤 Share Victory</button>
      <button id="mg4MenuBtn" style="background:#1a1a1a;color:#888;">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg4SaveBtn').onclick=async()=>{
      const btn=document.getElementById('mg4SaveBtn');
      btn.textContent='💾 Saving...'; btn.disabled=true;
      const result=await fsSavePersonalBest(getUsername(),mg4Score,'minigame-l4','Champion of Faith',mg4Hits*3,9,mg4MaxCombo,mg4MaxCombo,{levelReached:'minigame-l4'});
      localStorage.setItem('bc_username',getUsername()); G.lastSavedScore={name:getUsername(),score:mg4Score};
      if(result.status==='new_best') btn.textContent='👑 New Champion Record! Redirecting...';
      else if(result.status==='first') btn.textContent='✅ Saved to Hall of Champions! Redirecting...';
      else if(result.status==='not_best') btn.textContent=`📊 Champion record: ${result.best} 💪`;
      else{btn.textContent='❌ Save Failed — tap to retry';btn.disabled=false;return;}
      setTimeout(()=>{ov.remove();mgCurrentLevel=1;exitMiniGame();showScreen('s-leaderboard');loadLB('minigame-l4');},2000);
    };
    document.getElementById('mg4RestartBtn').onclick=()=>{ov.remove();if(mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}showMG4Overlay('start');};
    document.getElementById('mg4ShareBtn')?.addEventListener('click', ()=>shareMiniGameResult(4, mg4Score, mg4MaxCombo, mg4Hits*3));
    document.getElementById('mg4MenuBtn').onclick=()=>{ov.remove();mgCurrentLevel=1;exitMiniGame();};

  } else if(type==='gameover'){
    ov.innerHTML=`
      <h2 style="color:#e8c96a;">👑 God's Army Never Loses!</h2>
      <p style="font-style:italic;color:#d4c4a0;">"The righteous may fall seven times, but they rise again."<br><span style="font-size:11px;color:#b8a880;">— Proverbs 24:16</span></p>
      <p>Wave ${mg4Wave} · Score: ${mg4Score}<br>
      <span style="color:#cc88ff;font-size:12px;">History records David's victory. Your battle continues — rise, Champion!</span></p>
      <button id="mg4RestartBtn" style="background:linear-gradient(135deg,#1a0a2a,#4a1a7a);border:1px solid #8844cc;color:#cc88ff;">👑 Rise Again</button>
      <button id="mg4MenuBtn" style="background:#1a1a1a;color:#666;">Back to Menu</button>`;
    document.body.appendChild(ov);
    document.getElementById('mg4RestartBtn').onclick=()=>{ov.remove();if(mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}showMG4Overlay('start');};
    document.getElementById('mg4MenuBtn').onclick=()=>{ov.remove();mgCurrentLevel=1;exitMiniGame();};
  }
}

// ── Entry point for Level 4 ───────────────────────────────────
function startLevel4() {
  if(!isLevel3Beaten()){
    let ov=document.querySelector('.mg-full-overlay');if(ov)ov.remove();
    ov=document.createElement('div');ov.className='mg-full-overlay';
    ov.innerHTML=`<div style="font-size:48px;">👑</div><h2>Beat Level 3 First!</h2>
      <p>Survive the Night Battle in Level 3 to unlock the Army of God.</p>
      <button id="goL3Btn" style="background:linear-gradient(135deg,#0a1830,#1a3a6a);border:1px solid #4488cc;color:#88ccff;">🌙 Play Level 3</button>
      <button id="cancelL4Btn" style="background:#333;color:#aaa;">✕ Cancel</button>`;
    document.body.appendChild(ov);
    document.getElementById('goL3Btn').onclick=()=>{ov.remove();startLevel3();};
    document.getElementById('cancelL4Btn').onclick=()=>{ov.remove();exitMiniGame();};
    return;
  }
  if(!isLevel2Unlocked()){showSubscriptionGate();return;}
  mgCurrentLevel=4;
  if(mgAnimationId){cancelAnimationFrame(mgAnimationId);mgAnimationId=null;}
  if(mg2AnimationId){cancelAnimationFrame(mg2AnimationId);mg2AnimationId=null;}
  if(mg3AnimationId){cancelAnimationFrame(mg3AnimationId);mg3AnimationId=null;}
  if(mg4AnimationId){cancelAnimationFrame(mg4AnimationId);mg4AnimationId=null;}
  showMG4Overlay('start');
}
