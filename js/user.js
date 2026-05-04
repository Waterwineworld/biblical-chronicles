// ═══════════════════════════════════════════════════════════════
//  USER.JS — Premium system, payment, daily bonus, ads, ranks
//  Depends on: data.js (EPS, RANK_TIERS), core.js (db, SoundFX, spawn)
// ═══════════════════════════════════════════════════════════════

// ── Level tracker (used by fireMGStone dispatcher in minigame.js) ──
let mgCurrentLevel = 1;

// ── Subscription & progression helpers ───────────────────────
function isLevel1Beaten()  { return localStorage.getItem('bc_level1_beaten') === 'true'; }
function isLevel2Beaten()  { return localStorage.getItem('bc_level2_beaten') === 'true'; }
function isLevel3Beaten()  { return localStorage.getItem('bc_level3_beaten') === 'true'; }

// ── Premium / User system ─────────────────────────────────────
const PAYSTACK_PUBLIC_KEY = 'pk_test_YOUR_PAYSTACK_KEY_HERE'; // ← replace before launch
const PREMIUM_PRICE_KOBO  = 299000; // $2.99 in kobo (Paystack smallest unit)
const DAILY_BONUS_STONES  = 2;

let currentUserEmail = localStorage.getItem('bc_email') || '';

function isPremium()       { return localStorage.getItem('bc_premium') === 'true'; }
function isLevel2Unlocked(){ return isPremium(); }
function getEmail()        { return currentUserEmail.trim().toLowerCase(); }

function unlockPremium() {
  localStorage.setItem('bc_premium', 'true');
  if (db && getEmail()) {
    db.collection('bc_users').doc(btoa(getEmail())).set(
      { isPremium:true, premiumSince:firebase.firestore.FieldValue.serverTimestamp() },
      { merge:true }
    ).catch(()=>{});
  }
}

// ── Email handler ─────────────────────────────────────────────
function onEmailType() {
  const val = document.getElementById('email-inp').value.trim().toLowerCase();
  currentUserEmail = val;
  localStorage.setItem('bc_email', val);
  const greet = document.getElementById('egreet');
  if (!greet) return;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  if (val && valid) {
    greet.style.color = '#5ddb8e';
    greet.textContent = '✅ Email saved — progress syncs across devices';
    // Auto-restore on valid email entry
    restoreUserProfile(val);
  } else if (val) {
    greet.style.color = '#e87070';
    greet.textContent = 'Please enter a valid email address';
  } else { greet.textContent = ''; }
}

// ── Save / restore profile ────────────────────────────────────
async function saveUserProfile() {
  const email = getEmail();
  if (!email || !db) return;
  try {
    await db.collection('bc_users').doc(btoa(email)).set({
      email, username: getUsername(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge:true });
  } catch(e) {}
}

async function restoreUserProfile(email) {
  if (!email || !db) return false;
  try {
    const doc = await db.collection('bc_users').doc(btoa(email)).get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (data.isPremium) localStorage.setItem('bc_premium', 'true');
    if (data.username && !username.trim()) {
      username = data.username;
      const inp = document.getElementById('username-inp');
      if (inp) inp.value = data.username;
      localStorage.setItem('bc_username', data.username);
    }
    const greet = document.getElementById('egreet');
    if (greet && data.isPremium) {
      greet.style.color = '#5ddb8e';
      greet.textContent = '✅ Welcome back! Premium access restored.';
    }
    return true;
  } catch(e) { return false; }
}

async function tryAutoRestore() {
  const savedEmail = localStorage.getItem('bc_email');
  const savedName  = localStorage.getItem('bc_username');
  if (savedEmail) { currentUserEmail = savedEmail; const inp = document.getElementById('email-inp'); if(inp) inp.value = savedEmail; await restoreUserProfile(savedEmail); }
  if (savedName)  { username = savedName; const inp = document.getElementById('username-inp'); if(inp) inp.value = savedName; }
}

// ── Daily bonus ───────────────────────────────────────────────
function getTodayStr()            { return new Date().toISOString().slice(0,10); }
function hasDailyBonusAvailable() { return isPremium() && localStorage.getItem('bc_daily_date') !== getTodayStr(); }
function hasDailyLifeAvailable()  { return isPremium() && localStorage.getItem('bc_daily_date') === getTodayStr() && localStorage.getItem('bc_daily_life_used') !== 'true'; }
function claimDailyBonus()        { localStorage.setItem('bc_daily_date', getTodayStr()); localStorage.setItem('bc_daily_life_used','false'); }
function useDailyLife()           { localStorage.setItem('bc_daily_life_used','true'); }

function checkAndShowDailyBonus() {
  if (!isPremium() || !hasDailyBonusAvailable()) return;
  claimDailyBonus();
  setTimeout(() => {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:max(60px,env(safe-area-inset-top)+50px);left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(139,105,20,0.96),rgba(201,168,76,0.96));border:1px solid rgba(255,215,0,0.6);border-radius:10px;padding:12px 24px;z-index:9990;font-family:"Cinzel",serif;font-size:12px;color:#1a0f00;text-align:center;box-shadow:0 4px 20px rgba(201,168,76,0.4);';
    banner.innerHTML = `<div style="font-weight:bold;font-size:13px;margin-bottom:2px;">🌟 Daily Blessing!</div><div>+${DAILY_BONUS_STONES} stones · 1 free life restore available</div>`;
    document.body.appendChild(banner);
    if (typeof mgStoneCount !== 'undefined') addStones(DAILY_BONUS_STONES);
    setTimeout(()=>{ banner.style.opacity='0';banner.style.transition='opacity 0.5s';setTimeout(()=>banner.remove(),500); }, 3500);
  }, 1500);
}

// ── Paystack payment ──────────────────────────────────────────
function initiatePayment(onSuccess) {
  const email = getEmail();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showScreen('s-title');
    document.getElementById('email-inp')?.focus();
    const greet = document.getElementById('egreet');
    if (greet) { greet.style.color='#e87070'; greet.textContent='⚠️ Enter your email first to unlock premium'; }
    return;
  }
  if (typeof PaystackPop === 'undefined' || PAYSTACK_PUBLIC_KEY === 'pk_test_YOUR_PAYSTACK_KEY_HERE') { _devBypassPayment(onSuccess); return; }
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY, email,
    amount: PREMIUM_PRICE_KOBO, currency:'USD',
    ref: 'BC_' + Date.now() + '_' + Math.random().toString(36).slice(2,8).toUpperCase(),
    metadata:{ username:getUsername() },
    callback: async (response) => {
      try {
        if (db && getEmail()) await db.collection('bc_users').doc(btoa(getEmail())).set(
          { email, username:getUsername(), isPremium:true, premiumSince:firebase.firestore.FieldValue.serverTimestamp(), premiumTxRef:response.reference },
          { merge:true }
        );
      } catch(e) {}
      unlockPremium();
      if (onSuccess) onSuccess();
    },
    onClose:()=>{}
  });
  handler.openIframe();
}

function _devBypassPayment(onSuccess) {
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:"Cinzel",serif;color:#e8c96a;';
  ov.innerHTML=`<div style="font-size:28px;">🛠️</div><div style="font-size:13px;">DEV MODE: Payment Bypass</div><div style="font-size:11px;color:#888;">Paystack key not set — for testing only</div><button id="devPayY" style="background:linear-gradient(135deg,#7a5800,#e8c96a);color:#1a0f00;border:none;padding:12px 28px;border-radius:6px;font-family:'Cinzel',serif;font-weight:bold;cursor:pointer;">✅ Simulate Payment Success</button><button id="devPayN" style="background:#333;color:#888;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;">✕ Cancel</button>`;
  document.body.appendChild(ov);
  ov.querySelector('#devPayY').onclick=()=>{ ov.remove(); unlockPremium(); if(onSuccess)onSuccess(); };
  ov.querySelector('#devPayN').onclick=()=>ov.remove();
}

// ── Ad functions ──────────────────────────────────────────────
function showInterstitialAd(onComplete) {
  if (isPremium()) { onComplete(); return; }
  const ov = document.createElement('div');
  ov.id = 'adInterstitial';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99990;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Cinzel",serif;';
  let cd=5;
  ov.innerHTML=`<div style="color:#888;font-size:11px;margin-bottom:8px;letter-spacing:2px;">ADVERTISEMENT</div><div style="width:min(320px,88vw);height:180px;background:linear-gradient(135deg,#1a1a2a,#2a2a3a);border:1px solid #333;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#555;font-size:12px;"><div style="text-align:center;"><div style="font-size:28px;margin-bottom:8px;">📖</div><div style="color:#c9a84c;font-size:13px;">The Biblical Chronicles</div><div style="color:#888;font-size:10px;margin-top:4px;">Ad space — connect AdSense here</div></div></div><div style="margin-top:14px;display:flex;align-items:center;gap:12px;"><span style="color:#888;font-size:12px;" id="adCD">Skip in ${cd}s</span><button id="adSkip" disabled style="background:#333;color:#666;border:none;padding:7px 18px;border-radius:4px;font-family:'Cinzel',serif;font-size:11px;">Skip ▶</button></div><div style="margin-top:10px;color:#555;font-size:10px;">Remove ads — <span onclick="showUpgradePrompt()" style="color:#c9a84c;cursor:pointer;text-decoration:underline;">Upgrade to Premium</span></div>`;
  document.body.appendChild(ov);
  const iv=setInterval(()=>{ cd--; const c=document.getElementById('adCD'),s=document.getElementById('adSkip'); if(c)c.textContent=cd>0?`Skip in ${cd}s`:'You can skip now'; if(s&&cd<=0){s.disabled=false;s.style.cssText='background:linear-gradient(135deg,#7a5800,#e8c96a);color:#1a0f00;border:none;padding:7px 18px;border-radius:4px;font-family:"Cinzel",serif;cursor:pointer;';clearInterval(iv);} },1000);
  ov.querySelector('#adSkip').addEventListener('click',()=>{ if(cd>0)return; ov.remove(); onComplete(); });
  setTimeout(()=>{ clearInterval(iv); ov.remove(); onComplete(); },15000);
}

function showRewardedVideoAd(rewardCallback) {
  if (isPremium()) { rewardCallback(3); return; }
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.96);z-index:99991;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Cinzel",serif;gap:12px;';
  ov.innerHTML=`<div style="color:#888;font-size:11px;letter-spacing:2px;">REWARDED VIDEO</div><div style="width:min(320px,88vw);height:200px;background:linear-gradient(135deg,#1a1a2a,#2a2a3a);border:1px solid #333;border-radius:8px;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;color:#555;"><div style="font-size:36px;margin-bottom:8px;">🎬</div><div style="font-size:12px;color:#c9a84c;">Video Ad Placeholder</div><div style="font-size:10px;color:#666;margin-top:4px;">Connect AdMob / AdSense for Games here</div></div></div><div style="color:#c9a84c;font-size:12px;">Watch to earn +3 🪨 stones</div><div style="display:flex;gap:10px;"><button id="rvSim" style="background:linear-gradient(135deg,#7a5800,#e8c96a);color:#1a0f00;border:none;padding:10px 22px;border-radius:6px;font-family:'Cinzel',serif;font-size:12px;font-weight:bold;cursor:pointer;">▶ Watch (Dev)</button><button id="rvNo" style="background:#2a2a2a;color:#888;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;font-size:12px;">✕ No thanks</button></div><div style="color:#555;font-size:10px;">No ads with <span onclick="showUpgradePrompt()" style="color:#c9a84c;cursor:pointer;text-decoration:underline;">Premium</span></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#rvSim').onclick=()=>{ ov.remove(); rewardCallback(3); };
  ov.querySelector('#rvNo').onclick =()=>{ ov.remove(); rewardCallback(0); };
}

// ── Upgrade prompt ────────────────────────────────────────────
function showUpgradePrompt(fromLevel) {
  let ov=document.querySelector('.mg-full-overlay'); if(ov)ov.remove();
  ov=document.createElement('div'); ov.className='mg-full-overlay';
  ov.innerHTML=`<div style="font-size:48px;margin-bottom:4px;">✨</div><h2 style="color:#e8c96a;margin-bottom:6px;">Unlock Premium</h2><div style="max-width:300px;font-size:13px;line-height:1.9;color:#d4c4a0;margin-bottom:14px;"><div>✅ Level 3 + Level 4 unlocked</div><div>✅ Zero ads — ever</div><div>✅ +2 free stones every day</div><div>✅ 1 free life restore per day</div><div>✅ Hard Bible questions (+3 stones)</div><div>✅ Access from any device with email</div></div><div class="sub-gate-price"><div class="sub-gate-amount">$2.99</div><div class="sub-gate-label">One-Time · Yours Forever</div></div><button class="sub-pay-btn" id="upgPayBtn">🙏 Unlock Now — $2.99</button><div style="margin-top:10px;font-size:11px;color:#888;">Already premium? <span onclick="showRestoreAccess()" style="color:#c9a84c;cursor:pointer;text-decoration:underline;">Restore access</span></div><button onclick="document.querySelector('.mg-full-overlay')?.remove();resumeGameFromOverlay&&resumeGameFromOverlay();" style="margin-top:8px;background:#2a2a2a;color:#888;border:none;padding:8px 20px;border-radius:5px;cursor:pointer;font-size:11px;">✕ Maybe later</button>`;
  document.body.appendChild(ov);
  ov.querySelector('#upgPayBtn').onclick=()=>{
    initiatePayment(()=>{
      ov.remove();
      const banner=document.createElement('div');
      banner.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:"Cinzel",serif;';
      banner.innerHTML=`<div style="font-size:48px;">🎉</div><h2 style="color:#e8c96a;">Welcome to Premium!</h2><p style="color:#d4c4a0;max-width:280px;text-align:center;font-size:13px;">All levels unlocked. No ads. Daily blessings active.<br>Saved to <b>${getEmail()}</b></p><button onclick="this.closest('div').remove();${fromLevel ? 'startLevel'+fromLevel+'();' : ''}" style="background:linear-gradient(135deg,#7a5800,#e8c96a);color:#1a0f00;border:none;padding:14px 32px;border-radius:7px;font-family:'Cinzel',serif;font-weight:bold;cursor:pointer;font-size:14px;">${fromLevel ? '⚔️ Play Level '+fromLevel+'!' : "✨ Let's Go!"}</button>`;
      document.body.appendChild(banner);
      checkAndShowDailyBonus();
    });
  };
}

// ── Helpers for life overlay video/daily buttons ─────────────
let _pendingLifeRestore = { onRestored: null, onGameOver: null };

function handleWatchVideoForLife() {
  document.getElementById('mgLifeQOverlay')?.remove();
  showRewardedVideoAd((earned) => {
    if (earned > 0) {
      SoundFX.play('correct'); spawn('❤️', 3);
      resumeGameFromOverlay();
      if (_pendingLifeRestore.onRestored) _pendingLifeRestore.onRestored();
    } else {
      resumeGameFromOverlay();
      if (_pendingLifeRestore.onGameOver) _pendingLifeRestore.onGameOver();
    }
    _pendingLifeRestore = { onRestored: null, onGameOver: null };
  });
}

function handleDailyLifeClaim() {
  document.getElementById('mgLifeQOverlay')?.remove();
  useDailyLife();
  SoundFX.play('powerup'); spawn('❤️', 3);
  resumeGameFromOverlay();
  if (_pendingLifeRestore.onRestored) _pendingLifeRestore.onRestored();
  _pendingLifeRestore = { onRestored: null, onGameOver: null };
}

function showRestoreAccess() {
  document.querySelector('.mg-full-overlay')?.remove();
  const ov=document.createElement('div'); ov.className='mg-full-overlay';
  ov.innerHTML=`<div style="font-size:40px;margin-bottom:4px;">🔑</div><h2 style="color:#e8c96a;">Restore Premium Access</h2><p style="color:#d4c4a0;font-size:13px;max-width:280px;line-height:1.7;">Enter the email you used when you purchased. Your access will be restored instantly.</p><input id="restoreInp" type="email" placeholder="your@email.com" style="width:min(280px,85vw);background:rgba(14,10,20,.95);border:1px solid rgba(201,168,76,.4);border-radius:7px;padding:12px 16px;color:#e8c96a;font-family:'Playfair Display',serif;font-size:14px;outline:none;text-align:center;"><button id="restoreBtn" style="background:linear-gradient(135deg,#7a5800,#e8c96a);color:#1a0f00;border:none;padding:12px 28px;border-radius:6px;font-family:'Cinzel',serif;font-weight:bold;cursor:pointer;">🔍 Find My Account</button><div id="restoreFb" style="font-size:12px;min-height:18px;color:#b8a880;"></div><button onclick="this.closest('.mg-full-overlay').remove()" style="background:#2a2a2a;color:#888;border:none;padding:8px 20px;border-radius:5px;cursor:pointer;font-size:11px;">✕ Cancel</button>`;
  document.body.appendChild(ov);
  ov.querySelector('#restoreBtn').onclick=async()=>{
    const email=ov.querySelector('#restoreInp').value.trim().toLowerCase();
    const fb=ov.querySelector('#restoreFb');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){fb.style.color='#e87070';fb.textContent='Please enter a valid email';return;}
    fb.style.color='#c9a84c';fb.textContent='Searching...';
    currentUserEmail=email; localStorage.setItem('bc_email',email);
    const found=await restoreUserProfile(email);
    if(found&&isPremium()){fb.style.color='#5ddb8e';fb.textContent='✅ Premium restored!';setTimeout(()=>{ov.remove();checkAndShowDailyBonus();},1500);}
    else if(found){fb.style.color='#ffcc88';fb.textContent='Account found but no premium purchase.';}
    else{fb.style.color='#e87070';fb.textContent='No account found with that email.';}
  };
}

function showSupportDonation() {
  const email=getEmail()||'anonymous@bc.com';
  if(typeof PaystackPop!=='undefined'){
    const h=PaystackPop.setup({key:PAYSTACK_PUBLIC_KEY,email,amount:0,currency:'USD',
      ref:'DONATE_'+Date.now(),metadata:{type:'donation'},
      callback:()=>{SoundFX.play('correct');spawn('🙏',5);const m=document.createElement('div');m.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.92);border:1px solid rgba(201,168,76,0.5);border-radius:10px;padding:24px 32px;z-index:99999;font-family:"Cinzel",serif;text-align:center;color:#e8c96a;';m.innerHTML='<div style="font-size:36px;margin-bottom:8px;">🙏</div><div style="font-size:14px;font-weight:bold;">God bless you!</div><div style="font-size:12px;color:#b8a880;margin-top:4px;">Thank you for supporting this ministry.</div>';document.body.appendChild(m);setTimeout(()=>m.remove(),3500);},
      onClose:()=>{}});h.openIframe();
  } else { alert('Support donation — coming soon! Check back after launch.'); }
}

function markLevel1Beaten(){ localStorage.setItem('bc_level1_beaten', 'true'); }
function markLevel2Beaten(){ localStorage.setItem('bc_level2_beaten', 'true'); }
function markLevel3Beaten(){ localStorage.setItem('bc_level3_beaten', 'true'); }

// ═══════════════════════════════════════════════════════════════
//  RANKING SYSTEM
// ═══════════════════════════════════════════════════════════════
// RANK_TIERS is defined in data.js

function calculateRank() {
  const episodesDone = completedEpisodes ? completedEpisodes.size : 0;
  const stats = {
    level1beaten:   isLevel1Beaten(),
    level2beaten:   isLevel2Beaten(),
    level3beaten:   isLevel3Beaten(),
    level4beaten:   isLevel3Beaten() && isLevel2Unlocked(), // L4 beaten stored via L3+premium
    episodesDone,
    allEpisodesDone: episodesDone >= EPS.length,
    avgAccuracy: G?.pendingSave ? Math.round((G.pendingSave.correct / Math.max(1, G.pendingSave.total)) * 100) : 0,
  };
  return RANK_TIERS.find(r => r.check(stats)) || RANK_TIERS[RANK_TIERS.length - 1];
}

function getRankFromScore(epId, correct, total, levelReached) {
  // Simplified rank for leaderboard display
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const l4 = isLevel3Beaten() && isLevel2Unlocked();
  if (l4 && pct >= 90 && completedEpisodes?.size >= EPS.length) return RANK_TIERS[0];
  if (l4 && completedEpisodes?.size >= EPS.length) return RANK_TIERS[1];
  if (pct >= 80 && isLevel3Beaten()) return RANK_TIERS[2];
  if (isLevel3Beaten() && completedEpisodes?.size >= 2) return RANK_TIERS[3];
  if (isLevel2Beaten() && completedEpisodes?.size >= 1) return RANK_TIERS[4];
  if (isLevel1Beaten()) return RANK_TIERS[5];
  return { icon: '📖', title: 'Seeker', sub: 'Keep exploring' };
}

// ── Inject rank badge into verdict screen ─────────────────────
function showRankBadge() {
  const rank = calculateRank();
  // Find or create badge slot after vsub
  let badge = document.getElementById('vRankBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'vRankBadge';
    badge.style.textAlign = 'center';
    const vsub = document.getElementById('vsub');
    vsub?.parentNode?.insertBefore(badge, vsub.nextSibling);
  }
  badge.innerHTML = `
    <div class="rank-badge">
      <span class="rank-icon">${rank.icon}</span>
      <div>
        <div class="rank-title">${rank.title}</div>
        <div class="rank-sub">${rank.sub}</div>
      </div>
    </div>
  `;
}
