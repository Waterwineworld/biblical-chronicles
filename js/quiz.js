// ═══════════════════════════════════════════════════════════════
//  QUIZ.JS — Quiz engine, episode rendering, share cards
//  Depends on: data.js  (EPS, RANKS, VVERSES, TDIFF, RANK_TIERS)
//              core.js  (showScreen, flash, spawn, spawnConfetti,
//                        esc, SoundFX, fsSavePersonalBest, fsGet,
//                        isFullscreen, exitFullscreen)
//              user.js  (showInterstitialAd, calculateRank,
//                        showRankBadge, getEmail, isLevel1Beaten,
//                        isLevel2Beaten, isLevel3Beaten)
// ═══════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────
let username = '';
let G = {
  ep: null, scene: 0, phase: 'story', lives: 3, score: 0,
  qIdx: 0, correct: 0, timer: null, timeLeft: 0, timeTotal: 0,
  correctPts: 0, speedPts: 0, answered: false,
  lineIdx: 0, lineTimer: null, pendingSave: null, saved: false,
  streak: 0, bestStreak: 0, hintUsed: false, lastSavedScore: null
};
let completedEpisodes = new Set(JSON.parse(localStorage.getItem('bc_completed') || '[]'));

// ═══════════════════════════════════════════════════════════════
//  USERNAME & EPISODE RENDERING
// ═══════════════════════════════════════════════════════════════
function onNameType() {
  const v = document.getElementById('username-inp').value.trim();
  username = v;
  const greets = ['Faithful servant', 'Seeker of truth', 'Child of the Word', 'Brave soul', 'Beloved pilgrim'];
  const g = document.getElementById('ugreet');
  g.className = 'ugreet';
  if (v.length > 1) {
    const saved = localStorage.getItem('bc_username');
    if (saved && saved.toLowerCase() === v.toLowerCase()) {
      g.textContent = `Welcome back, ${v}! 🙏 Your progress is remembered.`;
    } else {
      g.textContent = `Welcome, ${v}! ${greets[v.length % greets.length]}.`;
    }
  } else {
    g.textContent = '';
  }
  updateLetsGoBtn();
}
function getUsername() { return username.trim() || 'Anonymous'; }
function renderEpisodes() {
  const grid = document.getElementById('ep-grid');
  let html = EPS.map(ep => {
    const dots = [1, 2, 3].map(d => `<span class="ddot ${d <= ep.difficulty ? 'lit' : ''}"></span>`).join('');
    const done = completedEpisodes.has(ep.id);
    return `<div class="ep-card ${done ? 'done-card' : ''}" onclick="startEp('${ep.id}')">${done ? '<div class="ep-done-tag">✓ Done</div>' : ''}<span class="ep-ico">${ep.icon}</span><div class="ep-num">${ep.num}</div><div class="ep-ttl">${ep.title}</div><div class="ep-bk">${ep.book}</div><div class="ep-dsc">${ep.desc}</div><div class="ep-dif">${dots}<span style="color:var(--parch3);font-size:10px;margin-left:5px;">${['', 'Easy', 'Medium', 'Hard'][ep.difficulty]}</span></div></div>`;
  }).join('');
  html += `<div class="ep-card special-card" onclick="startMiniGame()"><span class="ep-ico">⚔️</span><div class="special-badge">Mini-Game</div><div class="ep-ttl">David vs Goliath</div><div class="ep-bk">1 Samuel 17 · Full Control</div><div class="ep-dsc">Move David ANYWHERE, adjust launch ANGLE, charge power! True manual aiming. Stone flies with gravity.</div><div class="ep-dif"><span class="ddot lit"></span><span class="ddot lit"></span><span class="ddot lit"></span><span style="color:var(--ember);font-size:10px;margin-left:5px;">Skill</span></div></div>`;
  grid.innerHTML = html;
}
function checkCompleteBadge() { if (EPS.every(ep => completedEpisodes.has(ep.id))) document.getElementById('complete-badge').classList.add('show'); }

// ═══════════════════════════════════════════════════════════════
//  MAIN EPISODE LOGIC
// ═══════════════════════════════════════════════════════════════
function startEp(id) {
  if (!username.trim()) {
    const inp = document.getElementById('username-inp'); const greet = document.getElementById('ugreet');
    inp.classList.add('error'); greet.className = 'ugreet err'; greet.textContent = 'Please enter your name before starting!'; inp.focus();
    setTimeout(() => { inp.classList.remove('error'); greet.className = 'ugreet'; if (!username.trim()) greet.textContent = ''; }, 2000);
    return;
  }
  const ep = EPS.find(e => e.id === id); if (!ep) return;
  SoundFX.init(); SoundFX.startMusic('quiz');
  clearInterval(G.timer); clearTimeout(G.lineTimer);
  G = { ep, scene: 0, phase: 'story', lives: 3, score: 0, qIdx: 0, correct: 0, timer: null, timeLeft: 0, timeTotal: 0, correctPts: 0, speedPts: 0, answered: false, lineIdx: 0, lineTimer: null, pendingSave: null, saved: false, streak: 0, bestStreak: 0, hintUsed: false, lastSavedScore: null };
  document.getElementById('hep').textContent = ep.num; document.getElementById('httl').textContent = ep.title;
  document.getElementById('huser').textContent = '👤 ' + getUsername(); document.getElementById('sdisp').textContent = '0';
  document.getElementById('atm').style.background = ep.atmosphere; document.getElementById('streak-banner').className = 'streak-banner';
  renderLives(); setPhase('story'); showScreen('s-game'); setTimeout(() => renderScene(), 80);
}
function renderLives() { document.getElementById('liveswrap').innerHTML = [1, 2, 3].map(i => `<span class="life ${i > G.lives ? 'lost' : ''}">🕯️</span>`).join(''); }
function setPhase(ph) { G.phase = ph; const idx = ['story', 'challenge', 'verdict'].indexOf(ph); ['ph0', 'ph1', 'ph2'].forEach((id, i) => { const el = document.getElementById(id); if (!el) return; el.className = 'pstep'; if (i < idx) el.classList.add('done'); else if (i === idx) el.classList.add('active'); }); }
function confirmQuit() { const ov = document.createElement('div'); ov.className = 'modal-ov'; ov.innerHTML = `<div class="modal-bx"><div class="mttl">⚠️ Quit Episode?</div><div class="msub2">Your current progress will be lost.</div><div class="mrow"><button class="bgold" onclick="doQuit()">Yes, Quit</button><button class="bghost" onclick="this.closest('.modal-ov').remove()">Keep Playing</button></div></div>`; document.body.appendChild(ov); }
function doQuit() { clearInterval(G.timer); clearTimeout(G.lineTimer); SoundFX.stopMusic(); document.querySelector('.modal-ov')?.remove(); document.getElementById('atm').style.background = 'transparent'; if (isFullscreen()) exitFullscreen(); showScreen('s-title'); }
function renderScene() {
  const area = document.getElementById('game-area');
  if (!area) { setTimeout(() => renderScene(), 80); return; }
  const sc = G.ep.scenes[G.scene];
  clearTimeout(G.lineTimer);
  G.lineIdx = 0;
  const total = G.ep.scenes.length;
  const dots = G.ep.scenes.map((_, i) => `<span class="sdot ${i < G.scene ? 'done' : i === G.scene ? 'active' : ''}"></span>`).join('');
  area.innerHTML = `<div class="spanel"><div class="shdr"><span class="sico">${sc.icon}</span><div><div class="slbl">Scene ${G.scene + 1} of ${total}</div><div class="snm">${sc.name}</div></div></div><div class="sbody" id="sbody" style="cursor:pointer;" title="Tap to reveal all"><div id="stlines"></div>${sc.scripture ? `<div class="screv" id="screv"><div class="sclbl">📖 Scripture</div><div class="sctxt">"${sc.scripture.text}"</div><div class="scref">— ${sc.scripture.ref}</div></div>` : ''}</div><div class="snav"><div class="sdots">${dots}</div><div style="display:flex;align-items:center;gap:12px;"><span class="sklnk" onclick="skipAll()">Skip</span><button class="bcont" id="btnnext" onclick="nextScene()" style="display:none;">${G.scene < total - 1 ? 'Next Scene →' : 'Begin Challenge →'}</button></div></div></div>`;
  // Tap anywhere on the story body to reveal all lines immediately
  document.getElementById('sbody').addEventListener('click', () => {
    if (G.lineIdx < sc.lines.length) skipAll();
  });
  revealLines(sc);
}
function revealLines(sc) { const c = document.getElementById('stlines'); if (!c) return; if (G.lineIdx >= sc.lines.length) { const r = document.getElementById('screv'); if (r) setTimeout(() => r.classList.add('vis'), 400); setTimeout(() => { const b = document.getElementById('btnnext'); if (b) b.style.display = 'inline-flex'; }, r ? 1400 : 500); return; } const l = sc.lines[G.lineIdx]; const d = document.createElement('div'); d.className = `stline ${l.t}`; d.textContent = l.text; c.appendChild(d); requestAnimationFrame(() => setTimeout(() => d.classList.add('vis'), 30)); G.lineIdx++; const delay = l.t === 'dramatic' ? 1200 : l.t === 'whisper' ? 950 : 720; G.lineTimer = setTimeout(() => revealLines(sc), delay); }
function skipAll() {
  clearTimeout(G.lineTimer);
  const c = document.getElementById('stlines');
  if (!c) return;
  const sc = G.ep.scenes[G.scene];
  // Force-show lines already in the DOM (rAF+30ms callback may not have fired yet)
  Array.from(c.children).forEach(el => el.classList.add('vis'));
  // Append any lines not yet added
  while (G.lineIdx < sc.lines.length) {
    if (!c.children[G.lineIdx]) {
      const l = sc.lines[G.lineIdx];
      const d = document.createElement('div');
      d.className = `stline ${l.t} vis`;
      d.textContent = l.text;
      c.appendChild(d);
    }
    G.lineIdx++;
  }
  const r = document.getElementById('screv');
  if (r) r.classList.add('vis');
  const b = document.getElementById('btnnext');
  if (b) b.style.display = 'inline-flex';
}
function nextScene() { clearTimeout(G.lineTimer); G.scene++; if (G.scene >= G.ep.scenes.length) { setPhase('challenge'); G.qIdx = 0; renderChallenge(); } else renderScene(); }

// ═══════════════════════════════════════════════════════════════
//  CHALLENGE ENGINE
// ═══════════════════════════════════════════════════════════════
function renderChallenge() { G.answered = false; G.hintUsed = false; const qs = G.ep.questions; if (G.qIdx >= qs.length) { showVerdict(); return; } const q = qs[G.qIdx]; const area = document.getElementById('game-area'); const t = TDIFF[q.diff] || 25; G.timeTotal = t; G.timeLeft = t; const dl = ['', '⚔️ Easy', '🔥 Medium', '💀 Hard'][q.diff]; const streakTxt = G.streak >= 2 ? `🔥 ${G.streak} streak` : ''; area.innerHTML = `<div class="qctr"><span>Question ${G.qIdx + 1} of ${qs.length} · ${getUsername()}</span><span class="qstreak">${streakTxt}</span></div><div class="cpanel"><div class="chdr"><div class="ctype">${dl} · ${q.type === 'fill' ? 'Complete the Verse' : 'Choose the Correct Answer'}</div><div class="cq">${q.q}</div>${q.hint ? ('<button class="chint-btn" onclick="revealHint(this)">💡 Show Hint</button><div class="chint-txt" id="chint-txt">' + q.hint + '</div>') : ''}</div><div class="twrap"><div class="ttrack"><div class="tfill" id="tfill" style="width:100%"></div></div><div class="tnum" id="tnum">${t}s</div></div>${q.type === 'mcq' ? mkMCQ(q) : mkFill()}<div class="afb" id="afb"></div></div>`; startTimer(q, t); if (q.type === 'fill') setTimeout(() => { const i = document.getElementById('finp'); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') doFill(); }); }, 100); }
function revealHint(btn) { if (G.hintUsed) return; G.hintUsed = true; G.speedPts = Math.max(0, G.speedPts - 10); G.score = G.correctPts + G.speedPts; document.getElementById('sdisp').textContent = G.score; const txt = document.getElementById('chint-txt'); if (txt) txt.classList.add('show'); btn.textContent = '💡 Hint (-10 speed pts)'; btn.disabled = true; }
function mkMCQ(q) { return '<div class="owrap">' + q.opts.map((o, i) => '<button class="obtn" onclick="doMCQ(' + i + ')"><span class="olet">' + 'ABCD'[i] + '</span><span>' + o + '</span></button>').join('') + '</div>'; }
function mkFill() { return `<div class="fwrap"><input class="finp" id="finp" placeholder="Type your answer..." autocomplete="off" spellcheck="false"><button class="bgold" onclick="doFill()">Submit</button></div>`; }
function startTimer(q, sec) { clearInterval(G.timer); G.timeLeft = sec; G.timer = setInterval(() => { G.timeLeft--; const pct = Math.max(0, G.timeLeft / G.timeTotal * 100); const f = document.getElementById('tfill'), n = document.getElementById('tnum'); if (f) { f.style.width = pct + '%'; if (pct < 30) f.classList.add('urg'); } if (n) n.textContent = G.timeLeft + 's'; if (G.timeLeft <= 0) { clearInterval(G.timer); timeUp(q); } }, 1000); }
function timeUp(q) { if (G.answered) return; G.answered = true; clearInterval(G.timer); G.streak = 0; loseLife(); disableAll(q); showFB(false, q, '⏰ Time\'s up!'); }
function doMCQ(idx) { if (G.answered) return; G.answered = true; clearInterval(G.timer); const q = G.ep.questions[G.qIdx]; const ok = idx === q.correct; const bs = document.querySelectorAll('.obtn'); bs.forEach(b => b.disabled = true); bs[idx].classList.add(ok ? 'correct' : 'wrong'); if (!ok && bs[q.correct]) bs[q.correct].classList.add('correct'); handle(ok, q); }
function doFill() { if (G.answered) return; const i = document.getElementById('finp'); if (!i) return; const v = i.value.trim().toLowerCase(); if (!v) return; G.answered = true; clearInterval(G.timer); const q = G.ep.questions[G.qIdx]; const ok = q.acceptedAnswers.some(a => v.includes(a) || a.includes(v)); i.disabled = true; i.classList.add(ok ? 'correct' : 'wrong'); handle(ok, q); }
function handle(ok, q) { if (ok) { SoundFX.play('correct'); const cp = 100, sp = Math.max(0, G.timeLeft * 5); G.correctPts += cp; G.speedPts += sp; G.correct++; G.streak++; if (G.streak > G.bestStreak) G.bestStreak = G.streak; let streakBonus = 0; if (G.streak % 3 === 0) { streakBonus = 50; G.speedPts += streakBonus; SoundFX.play('streak'); const sb = document.getElementById('streak-banner'); sb.className = 'streak-banner show'; sb.textContent = `🔥 ${G.streak}-Answer Streak! +${streakBonus} Bonus Points!`; setTimeout(() => sb.className = 'streak-banner', 3000); spawn('🌟', 5); } G.score = G.correctPts + G.speedPts; document.getElementById('sdisp').textContent = G.score; flash(true); spawn('✨', 3); showFB(true, q, `+${cp} correct · +${sp} speed${streakBonus ? ` · +${streakBonus} streak bonus!` : ''}`); } else { SoundFX.play('wrong'); G.streak = 0; loseLife(); flash(false); showFB(false, q, 'Not quite right.'); } }
function showFB(ok, q, extra) { const fb = document.getElementById('afb'); if (!fb) return; fb.className = `afb show ${ok ? 'cfb' : 'wfb'}`; const last = G.qIdx + 1 >= G.ep.questions.length; fb.innerHTML = `<div class="fbtl ${ok ? 'c' : 'w'}">${ok ? '✅ Correct!' : '❌ Wrong'} — ${extra}</div><div class="fbtxt">${q.explanation}</div><div class="fbsc">${q.scripture}</div><br><button class="bcont" onclick="nextQ()" style="margin-top:6px;">${last ? 'See Verdict →' : 'Next Question →'}</button>`; fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function disableAll(q) { document.querySelectorAll('.obtn,.finp').forEach(e => e.disabled = true); const bs = document.querySelectorAll('.obtn'); if (bs.length && q) bs[q.correct]?.classList.add('correct'); }
function loseLife() { G.lives = Math.max(0, G.lives - 1); renderLives(); }
function nextQ() { G.qIdx++; G.answered = false; if (G.lives <= 0) { showVerdict(); return; } renderChallenge(); }

// ═══════════════════════════════════════════════════════════════
//  VERDICT
// ═══════════════════════════════════════════════════════════════
function showVerdict() {
  clearInterval(G.timer);
  SoundFX.startMusic('leaderboard');
  showInterstitialAd(() => { setPhase('verdict'); });
}
function _verdictDirect() { const tot = G.ep.questions.length; const pct = tot > 0 ? Math.round(G.correct / tot * 100) : 0; const rank = RANKS.slice().reverse().find(r => pct >= r.min) || RANKS[0]; const v = VVERSES[Math.floor(Math.random() * VVERSES.length)]; G.pendingSave = { score: G.score, epId: G.ep.id, rank: rank.name, correct: G.correct, total: tot, speedPts: G.speedPts, streak: G.bestStreak }; document.getElementById('vcrown').textContent = rank.crown; document.getElementById('vplayer').textContent = '👤 ' + getUsername(); document.getElementById('vrank').textContent = rank.name; document.getElementById('vrank').className = `vrank ${rank.cls}`; document.getElementById('vsub').textContent = rank.sub; document.getElementById('vscore').textContent = G.score; document.getElementById('vcor').textContent = G.correct + '/' + tot; document.getElementById('vtot').textContent = pct + '%'; document.getElementById('vspd').textContent = G.speedPts; document.getElementById('vstr').textContent = G.bestStreak; document.getElementById('vverse').innerHTML = `"${v.text}"<cite>— ${v.ref}</cite>`; completedEpisodes.add(G.ep.id); localStorage.setItem('bc_completed', JSON.stringify([...completedEpisodes])); if (pct >= 90) { spawn('✨', 8); spawnConfetti(); } else if (pct >= 70) spawn('🌟', 5); showScreen('s-verdict');
  // Show battle button only for David & Goliath episode
  const battleWrap = document.getElementById('battle-btn-wrap');
  if (battleWrap) battleWrap.style.display = G.ep.id === 'david-goliath' ? 'block' : 'none';
}
async function autoSaveScore(btn) {
  if (G.saved) { btn.textContent = '✅ Already Saved'; return; }
  if (!G.pendingSave) return;
  btn.textContent = '💾 Saving...'; btn.disabled = true;
  const s = G.pendingSave;
  const result = await fsSavePersonalBest(
    getUsername(), s.score, s.epId, s.rank, s.correct, s.total, s.speedPts, s.streak,
    { levelReached: s.epId }
  );
  if (result.status === 'error') {
    btn.textContent = '❌ Save Failed — tap to retry'; btn.disabled = false; return;
  }
  G.saved = true;
  G.lastSavedScore = { name: getUsername(), score: s.score };
  localStorage.setItem('bc_username', getUsername());
  if (result.status === 'new_best') {
    btn.textContent = '🏆 New Personal Best! Redirecting...';
    spawn('🌟', 6); spawnConfetti();
    const sub = document.getElementById('vsub');
    if (sub) sub.textContent = `🎉 New personal best! You beat your previous score of ${result.prev}!`;
  } else if (result.status === 'first') {
    btn.textContent = '✅ Score Saved! Redirecting...';
    spawn('✨', 4);
  } else {
    btn.textContent = `📊 Your best is still ${result.best} 💪 Redirecting...`;
    const sub = document.getElementById('vsub');
    if (sub) sub.textContent = `Your personal best is ${result.best}. Keep going — you can beat it!`;
  }
  setTimeout(() => { showScreen('s-leaderboard'); loadLB('all'); }, 2000);
}
function replay() { if (G.ep) startEp(G.ep.id); }

// ═══════════════════════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════════════════════
function setTab(el) { document.querySelectorAll('.lbtab').forEach(t => t.classList.remove('act')); el.classList.add('act'); }
function formatTs(ts) { if (!ts || !ts.seconds) return ''; const d = new Date(ts.seconds * 1000), now = new Date(); const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24)); if (diffDays === 0) return 'Today'; if (diffDays === 1) return 'Yesterday'; if (diffDays < 7) return `${diffDays}d ago`; return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
async function loadLB(epId) { const list = document.getElementById('lblist'); if (!list) return; list.innerHTML = '<div class="lbload">📜 Loading Hall of Prophets...</div>'; if (!db) { list.innerHTML = '<div class="lbload">Firebase not connected.</div>'; return; } const scores = await fsGet(epId); if (!scores.length) { list.innerHTML = '<div class="lbload">No scores yet — be the first!</div>'; return; } const medals = ['🥇', '🥈', '🥉']; const myName = getUsername().toLowerCase(); const myScore = G.lastSavedScore?.score || null; list.innerHTML = scores.map((s, i) => { const isMe = s.name?.toLowerCase() === myName && (myScore === null || s.score === myScore); const rn = i < 3 ? `<span class="lbrn t${i + 1}">${medals[i]}</span>` : `<span class="lbrn">${i + 1}</span>`; return `<div class="lbrow ${isMe ? 'my-score' : ''}">${rn}<div class="lbinfo"><div class="lbname">${esc(s.name)}${isMe ? ' ⭐ You' : ''}</div><div class="lbep">${esc(s.episodeTitle || s.episodeId)}</div></div><div><div class="lbsc">⭐ ${s.score}</div><div class="lbbd">${esc(s.rank)} · ${s.correct}/${s.total}</div><div class="lbts">${formatTs(s.ts)}</div></div></div>`; }).join(''); }

// ═══════════════════════════════════════════════════════════════
//  SHARE CARD SYSTEM
// ═══════════════════════════════════════════════════════════════
function shareQuizResult() {
  const name    = getUsername();
  const score   = G?.score || 0;
  const correct = G?.correct || 0;
  const total   = G?.ep?.questions?.length || 0;
  const pct     = total > 0 ? Math.round(correct / total * 100) : 0;
  const streak  = G?.bestStreak || 0;
  const epTitle = G?.ep?.title || 'Biblical Chronicles';
  const rank    = calculateRank();

  generateShareCard({
    name, score, pct, streak,
    rankIcon: rank.icon, rankTitle: rank.title,
    subtitle: epTitle,
    levelLine: `📖 ${correct}/${total} Correct · ${pct}% Accuracy`,
    verse: '"The righteous may fall seven times, but they rise again." — Proverbs 24:16',
    bgColor1: '#1a0e28', bgColor2: '#2a1840',
    accentColor: '#c9a84c',
  });
}

function shareMiniGameResult(level, score, maxCombo, hits) {
  const name = getUsername();
  const rank = calculateRank();
  const levelNames = { 1: 'Level 1 · Goliath', 2: 'Level 2 · Shield Bearer', 3: 'Level 3 · Night Battle', 4: 'Level 4 · Army of God' };
  generateShareCard({
    name, score,
    pct: null,
    streak: maxCombo,
    rankIcon: rank.icon, rankTitle: rank.title,
    subtitle: 'David vs Goliath — Mini-Game',
    levelLine: `⚔️ ${levelNames[level] || 'Level ' + level} · ${hits}/3 Hits · Combo ×${maxCombo}`,
    verse: '"I come against you in the name of the Lord Almighty." — 1 Samuel 17:45',
    bgColor1: '#1a0808', bgColor2: '#2e0808',
    accentColor: '#c0392b',
  });
}

function generateShareCard(opts) {
  const W = 540, H = 300;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, opts.bgColor1);
  bg.addColorStop(1, opts.bgColor2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Gold border
  ctx.strokeStyle = opts.accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  // Inner border
  ctx.strokeStyle = `${opts.accentColor}44`;
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // Header bar
  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, `${opts.accentColor}33`);
  hg.addColorStop(0.5, `${opts.accentColor}18`);
  hg.addColorStop(1, `${opts.accentColor}33`);
  ctx.fillStyle = hg; ctx.fillRect(6, 6, W - 12, 44);

  // App name
  ctx.fillStyle = opts.accentColor;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('📜  THE BIBLICAL CHRONICLES  📜', W / 2, 33);

  // Rank icon + title
  ctx.font = '36px serif';
  ctx.fillText(opts.rankIcon, 60, 105);
  ctx.fillStyle = '#e8c96a';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(opts.name, 100, 86);
  ctx.fillStyle = opts.accentColor;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(opts.rankTitle, 100, 108);

  // Divider
  ctx.strokeStyle = `${opts.accentColor}55`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 122); ctx.lineTo(W - 24, 122); ctx.stroke();

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.score.toLocaleString(), W / 2, 178);
  ctx.fillStyle = `${opts.accentColor}cc`;
  ctx.font = '11px Georgia, serif';
  ctx.fillText('SCORE', W / 2, 194);

  // Stats row
  const stats = [
    opts.levelLine,
    `🔥 Best Streak: ${opts.streak}`,
  ];
  ctx.fillStyle = '#d4c4a0';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  stats.forEach((s, i) => ctx.fillText(s, W / 2, 216 + i * 18));

  // Verse
  ctx.fillStyle = `${opts.accentColor}bb`;
  ctx.font = 'italic 10px Georgia, serif';
  ctx.textAlign = 'center';
  // Word wrap verse
  const vWords = opts.verse.split(' ');
  let vLine = '', vY = 258;
  vWords.forEach(w => {
    const test = vLine + w + ' ';
    if (ctx.measureText(test).width > W - 80 && vLine) {
      ctx.fillText(vLine.trim(), W / 2, vY); vY += 14; vLine = w + ' ';
    } else vLine = test;
  });
  if (vLine) ctx.fillText(vLine.trim(), W / 2, vY);

  // Website
  ctx.fillStyle = `${opts.accentColor}88`;
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('biblicalchronicles.com', W - 20, H - 14);

  // Show preview + share options
  displayShareCard(canvas);
}

function displayShareCard(canvas) {
  // Remove any existing preview
  document.getElementById('mgSharePreview')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mgSharePreview';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(8px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;';

  const img = canvas.toDataURL('image/png');

  overlay.innerHTML = `
    <div style="font-family:'Cinzel',serif;color:#e8c96a;font-size:14px;letter-spacing:2px;">📤 YOUR RESULT CARD</div>
    <img src="${img}" style="max-width:min(540px,92vw);border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button id="shareDownload" style="background:linear-gradient(135deg,#1a3a1a,#2a6a2a);border:1px solid #44aa44;color:#88ee88;font-family:'Cinzel',serif;font-size:11px;letter-spacing:1px;padding:10px 20px;border-radius:6px;cursor:pointer;">⬇️ Download Image</button>
      <button id="shareNative"   style="background:linear-gradient(135deg,#1a3a5a,#2a5a8a);border:1px solid #4488bb;color:#88ccff;font-family:'Cinzel',serif;font-size:11px;letter-spacing:1px;padding:10px 20px;border-radius:6px;cursor:pointer;">📤 Share</button>
      <button id="shareCopyLink" style="background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);color:#e8c96a;font-family:'Cinzel',serif;font-size:11px;letter-spacing:1px;padding:10px 20px;border-radius:6px;cursor:pointer;">🔗 Copy Link</button>
      <button id="shareClose"    style="background:#1a1a1a;border:1px solid #444;color:#888;font-family:'Cinzel',serif;font-size:11px;padding:10px 20px;border-radius:6px;cursor:pointer;">✕ Close</button>
    </div>
    <p style="font-size:10px;color:#666;font-family:monospace;">Press and hold the image on mobile to save it</p>
  `;

  document.body.appendChild(overlay);

  // Download
  document.getElementById('shareDownload').onclick = () => {
    const a = document.createElement('a');
    a.href = img;
    a.download = `biblical-chronicles-${getUsername().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  // Native share (Web Share API)
  document.getElementById('shareNative').onclick = async () => {
    if (navigator.share) {
      try {
        // Convert to blob for sharing
        canvas.toBlob(async blob => {
          const file = new File([blob], 'biblical-chronicles.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'The Biblical Chronicles',
              text: `I just scored ${document.querySelector('#mgSharePreview img') ? 'big' : ''} on The Biblical Chronicles! Test your Bible knowledge at biblicalchronicles.com`,
              files: [file],
            });
          } else {
            await navigator.share({
              title: 'The Biblical Chronicles',
              text: 'Test your Bible knowledge! Play The Biblical Chronicles',
              url: 'https://biblicalchronicles.com',
            });
          }
        });
      } catch (e) { /* user cancelled */ }
    } else {
      // Fallback: copy link
      copyGameLink();
    }
  };

  // Copy link
  document.getElementById('shareCopyLink').onclick = copyGameLink;

  // Close
  document.getElementById('shareClose').onclick = () => overlay.remove();
}

function copyGameLink() {
  const url = window.location.href.split('?')[0];
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById('shareCopyLink');
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2000); }
  }).catch(() => {
    prompt('Copy this link:', window.location.href);
  });
}

// ── Hook rank badge into showVerdict ──────────────────────────
// showRankBadge is defined in user.js (loads before quiz.js)
const _origShowVerdict = showVerdict;
showVerdict = function () {
  _origShowVerdict.apply(this, arguments);
  // showRankBadge runs after screen transition
  setTimeout(showRankBadge, 300);
};
