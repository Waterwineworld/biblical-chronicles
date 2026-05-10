// ═══════════════════════════════════════════════════════════════
//  SCRIPTURE-LOCATOR.JS — Game logic for the Scripture Locator
//  Identifies a verse by Testament → Book → Chapter → Verse
// ═══════════════════════════════════════════════════════════════

let SL_SETUP = { mode: 'learning', diff: 'medium', test: 'all', numQ: 15 };
let SLG = {};
let SLS = {};

// ── Helpers ──────────────────────────────────────────────────
function slRnd(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slGoHome() {
  slUpdateDailyBadge();
  showScreen('sl-welcome');
  SoundFX.startMusic('title');
}

function slPlayAgain() {
  if (SLG.mode === 'daily') { slStartDailyChallenge(); return; }
  slOpenSetup(SLG.mode);
}

function slQuit() {
  // Use a styled modal instead of browser confirm()
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `<div class="modal-bx">
    <div class="mttl">⚠️ Quit Scripture Locator?</div>
    <div class="msub2">Your current progress will be lost.</div>
    <div class="mrow">
      <button class="bgold" id="slQuitYes">Yes, Quit</button>
      <button class="bghost" id="slQuitNo">Keep Playing</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('slQuitYes').addEventListener('click', () => { ov.remove(); slGoHome(); });
  document.getElementById('slQuitNo').addEventListener('click', () => ov.remove());
}

// ── Verse pool + setup ────────────────────────────────────────
function slGetVersePool() {
  let pool = [...SL_VERSES];
  if (SL_SETUP.test === 'old') pool = pool.filter(v => v.testament === 'Old');
  if (SL_SETUP.test === 'new') pool = pool.filter(v => v.testament === 'New');
  if (SL_SETUP.diff === 'easy') pool = pool.filter(v => v.diff <= 1);
  if (SL_SETUP.diff === 'hard') pool = pool.filter(v => v.diff >= 2);
  return pool;
}

function slOpenSetup(mode) {
  SL_SETUP.mode = mode;
  document.getElementById('sl-setup-title').textContent =
    (mode === 'learning' ? 'Learning' : 'Challenge') + ' Mode — Setup';
  slUpdatePoolNote();
  showScreen('sl-setup');
  SoundFX.startMusic('title');
}

function slSetSetup(btn) {
  const g = btn.dataset.g, v = btn.dataset.v;
  SL_SETUP[g] = (g === 'numQ' ? parseInt(v) : v);
  btn.closest('.setup-row').querySelectorAll('.setup-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  slUpdatePoolNote();
}

function slUpdatePoolNote() {
  const pool = slGetVersePool();
  const note = document.getElementById('sl-pool-note');
  const btn  = document.getElementById('sl-start-btn');
  const q    = SL_SETUP.numQ;
  if (pool.length < q) {
    note.textContent = `Only ${pool.length} verses match these filters. Reduce questions or change filters.`;
    note.className = 'pool-note warn';
    btn.disabled = true;
  } else {
    note.textContent = `${pool.length} verses in pool · ${q} will be selected randomly`;
    note.className = 'pool-note';
    btn.disabled = false;
  }
}

function slStartGameWithSettings() {
  const pool = slGetVersePool();
  if (pool.length < SL_SETUP.numQ) return;
  slInitG(SL_SETUP.mode, slRnd(pool).slice(0, SL_SETUP.numQ), SL_SETUP.diff, SL_SETUP.numQ);
  showScreen('sl-quiz');
  SoundFX.startMusic('quiz');
  slRenderQuestion();
}

// ── Game state ────────────────────────────────────────────────
function slInitG(mode, questions, diff, numQ) {
  SLG = {
    mode, questions, diff: diff || 'medium', numQ: numQ || 15,
    qIdx: 0, stage: 0, curAns: {}, allAns: [],
    score: 0, bonusScore: 0,
    stagePts: { testament: 0, book: 0, chapter: 0, verse: 0 },
    streak: 0, maxStreak: 0, hintsLeft: 3, currentOpts: [], revealed: []
  };
}

// ── Option generation ─────────────────────────────────────────
function slNumOpts(correct, max, n = 4) {
  const range = SL_DIFF_RANGE[SLG.diff] || 5;
  const s = new Set([correct]); let t = 0;
  while (s.size < n && t++ < 100) {
    let x = correct + Math.round(Math.random() * range * 2) - range;
    x = Math.max(1, Math.min(max, x));
    if (x !== correct) s.add(x);
  }
  let x = 1; while (s.size < n) { if (!s.has(x)) s.add(x); x++; }
  return slRnd([...s]);
}

function slBookOpts(book, testament) {
  const pool = testament === 'Old' ? SL_OT_BOOKS : SL_NT_BOOKS;
  let opts = [book, ...slRnd(pool.filter(b => b !== book)).slice(0, SLG.diff === 'hard' ? 2 : 3)];
  if (SLG.diff === 'hard' && opts.length < 4) {
    const other = testament === 'Old' ? SL_NT_BOOKS : SL_OT_BOOKS;
    opts.push(slRnd(other)[0]);
  }
  return slRnd(opts.slice(0, 4));
}

function slGetOpts(stage, v) {
  if (stage === 0) return slRnd(['Old Testament', 'New Testament']);
  if (stage === 1) return slBookOpts(v.book, v.testament);
  if (stage === 2) return slNumOpts(v.chapter, v.maxCh);
  return slNumOpts(v.verse, v.maxV);
}

function slGetCorrect(stage, v) {
  if (stage === 0) return v.testament + ' Testament';
  if (stage === 1) return v.book;
  if (stage === 2) return v.chapter;
  return v.verse;
}

// ── Rendering ─────────────────────────────────────────────────
function slRenderQuestion() {
  const v = SLG.questions[SLG.qIdx];
  const total = SLG.questions.length;
  document.getElementById('sl-q-progress').textContent = `Question ${SLG.qIdx + 1} of ${total}`;
  document.getElementById('sl-q-score').textContent = `Score: ${SLG.score}`;
  document.getElementById('sl-q-verse').textContent = v.text;
  document.getElementById('sl-q-pills').innerHTML = '';
  document.getElementById('sl-reveal-banner').style.display = 'none';
  const crb = document.getElementById('sl-ch-reveal-btn');
  crb.style.display = SLG.mode === 'challenge' ? 'inline-flex' : 'none';
  crb.disabled = false; crb.textContent = '📍 Peek at reference';
  slUpdateStreakUI(); slUpdateHintBtn();
  SLG.stage = 0; SLG.curAns = {}; slRenderStage();
}

function slRenderStage() {
  const v = SLG.questions[SLG.qIdx], st = SLG.stage;
  document.querySelectorAll('#sl-quiz .stage-pip').forEach((p, i) => {
    p.className = 'stage-pip' + (i < st ? ' done' : i === st ? ' active' : '');
  });
  document.getElementById('sl-stage-lbl').textContent = SL_STAGE_LBLS[st];
  const opts = slGetOpts(st, v);
  SLG.currentOpts = [...opts];
  slRenderOptsGrid(SLG.currentOpts);
}

function slRenderOptsGrid(opts) {
  const st = SLG.stage;
  const grid = document.getElementById('sl-opts');
  grid.className = 'opts' + (st === 1 ? ' solo' : '');
  grid.innerHTML = '';
  opts.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'opt';
    const txt = document.createElement('span'); txt.textContent = o;
    const kbd = document.createElement('span'); kbd.className = 'opt-kbd'; kbd.textContent = i + 1;
    b.appendChild(txt); b.appendChild(kbd);
    b.onclick = () => slPick(st, o, b);
    grid.appendChild(b);
  });
}

function slPick(stage, choice, btn) {
  document.querySelectorAll('#sl-opts .opt').forEach(b => { b.onclick = null; b.style.cursor = 'default'; });
  btn.classList.add('sel');
  SLG.curAns[SL_STAGE_KEYS[stage]] = choice;
  setTimeout(() => {
    const pill = document.createElement('div'); pill.className = 'ans-pill';
    pill.innerHTML = `<span class="ap-label">${SL_STAGE_KEYS[stage]}:</span><span class="ap-val">${choice}</span>`;
    document.getElementById('sl-q-pills').appendChild(pill);
    SLG.stage++;
    if (SLG.stage < 4) slRenderStage(); else slQDone();
  }, 160);
}

function slQDone() {
  const v = SLG.questions[SLG.qIdx], ans = SLG.curAns;
  const correct = { testament: v.testament + ' Testament', book: v.book, chapter: v.chapter, verse: v.verse };
  let qPts = 0;
  SL_STAGE_KEYS.forEach((k, i) => {
    if (String(ans[k]) === String(correct[k])) { qPts += SL_STAGE_PTS[i]; SLG.stagePts[k]++; }
  });
  SLG.score += qPts;
  if (qPts === 10) {
    SLG.streak++; if (SLG.streak > SLG.maxStreak) SLG.maxStreak = SLG.streak;
    if (SLG.streak % 3 === 0) { SLG.score += 5; SLG.bonusScore += 5; slShowBonusPop(); }
  } else { SLG.streak = 0; }
  SLG.allAns.push({ v, ans, correct, qPts });
  if (SLG.mode === 'learning') slShowQResult();
  else if (SLG.qIdx >= SLG.questions.length - 1) slShowFinal();
  else { SLG.qIdx++; document.getElementById('sl-q-score').textContent = `Score: ${SLG.score}`; slRenderQuestion(); }
}

function slUpdateStreakUI() {
  const tag = document.getElementById('sl-streak-tag');
  if (SLG.streak >= 1) {
    tag.style.display = 'flex';
    document.getElementById('sl-streak-num').textContent = SLG.streak;
    tag.classList.toggle('glow', SLG.streak >= 3);
  } else { tag.style.display = 'none'; }
}

function slShowBonusPop() {
  const p = document.getElementById('sl-bonus-pop');
  p.style.display = 'inline-block';
  setTimeout(() => p.style.display = 'none', 2200);
}

// ── Hints ─────────────────────────────────────────────────────
function slUpdateHintBtn() {
  const btn = document.getElementById('sl-hint-btn');
  btn.disabled = SLG.hintsLeft <= 0;
  btn.textContent = `💡 Use Hint (${SLG.hintsLeft} left)`;
  document.getElementById('sl-hint-count-lbl').textContent = `${SLG.hintsLeft} hint${SLG.hintsLeft === 1 ? '' : 's'} remaining`;
  const badge = document.getElementById('sl-hint-badge');
  if (badge) badge.textContent = '💡 ' + SLG.hintsLeft;
}

function slUseHint() {
  if (SLG.hintsLeft <= 0) return;
  const v = SLG.questions[SLG.qIdx];
  const correct = String(slGetCorrect(SLG.stage, v));
  const wrongs = SLG.currentOpts.filter(o => String(o) !== correct);
  if (!wrongs.length) return;
  const toRemove = wrongs[0 | Math.random() * wrongs.length];
  SLG.currentOpts = SLG.currentOpts.filter(o => o !== toRemove);
  SLG.hintsLeft--; slUpdateHintBtn(); slRenderOptsGrid(SLG.currentOpts);
}

// ── Challenge reveal ──────────────────────────────────────────
function slChallengeReveal() {
  const v = SLG.questions[SLG.qIdx];
  const banner = document.getElementById('sl-reveal-banner');
  banner.textContent = `📍 ${v.book}, Chapter ${v.chapter}, Verse ${v.verse} — ${v.testament} Testament`;
  banner.style.display = 'block';
  const btn = document.getElementById('sl-ch-reveal-btn');
  btn.disabled = true; btn.textContent = 'Reference revealed';
  SLG.revealed[SLG.qIdx] = true;
}

// ── Audio ─────────────────────────────────────────────────────
function slReadVerse() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const txt = document.getElementById('sl-q-verse').textContent;
  const u = new SpeechSynthesisUtterance(txt);
  u.rate = 0.88; u.pitch = 1.05; u.lang = 'en-GB';
  window.speechSynthesis.speak(u);
}

function slReadStudyVerse() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(document.getElementById('sl-s-verse').textContent);
  u.rate = 0.88; u.pitch = 1.05; u.lang = 'en-GB';
  window.speechSynthesis.speak(u);
}

// ── Skip ──────────────────────────────────────────────────────
function slSkipQuestion() {
  SLG.streak = 0;
  const v = SLG.questions[SLG.qIdx];
  const correct = { testament: v.testament + ' Testament', book: v.book, chapter: v.chapter, verse: v.verse };
  SLG.allAns.push({ v, ans: { testament: '—', book: '—', chapter: '—', verse: '—' }, correct, qPts: 0, skipped: true });
  if (SLG.mode === 'learning') {
    document.getElementById('sl-qr-verse').textContent = '"' + v.text + '"';
    const rc = document.getElementById('sl-qr-rc'); rc.innerHTML = '';
    SL_STAGE_KEYS.forEach(k => {
      const row = document.createElement('div'); row.className = 'rr';
      row.innerHTML = '<div class="rr-lbl">' + k.charAt(0).toUpperCase() + k.slice(1) + '</div><div class="rr-vals"><span style="color:#9ca3af">Skipped</span><span style="color:#bbb;margin:0 4px">→</span><span class="cv">' + correct[k] + '</span></div>';
      rc.appendChild(row);
    });
    const pr = document.createElement('div'); pr.className = 'rr';
    pr.innerHTML = '<div class="rr-lbl">Points</div><div style="font-weight:700;color:#3d1f0a">0/10 <span style="font-size:.78rem;color:#9ca3af">(skipped)</span></div>';
    rc.appendChild(pr);
    document.getElementById('sl-qr-expl').textContent = '📘 ' + v.short;
    document.getElementById('sl-qr-meta').textContent = 'Running: ' + SLG.score;
    const nb = document.getElementById('sl-qr-next');
    if (SLG.qIdx >= SLG.questions.length - 1) {
      nb.textContent = 'See Results →'; nb.onclick = slShowFinal;
    } else {
      nb.textContent = 'Next Question →'; nb.onclick = () => { SLG.qIdx++; showScreen('sl-quiz'); slRenderQuestion(); };
    }
    showScreen('sl-qresult');
  } else {
    if (SLG.qIdx >= SLG.questions.length - 1) slShowFinal();
    else { SLG.qIdx++; slRenderQuestion(); }
  }
}

// ── Learning result ───────────────────────────────────────────
function slShowQResult() {
  const { v, ans, correct, qPts } = SLG.allAns[SLG.qIdx];
  document.getElementById('sl-qr-verse').textContent = `"${v.text}"`;
  const rc = document.getElementById('sl-qr-rc'); rc.innerHTML = '';
  SL_STAGE_KEYS.forEach(k => {
    const ok = String(ans[k]) === String(correct[k]);
    const row = document.createElement('div'); row.className = 'rr';
    row.innerHTML = `<div class="rr-lbl">${k.charAt(0).toUpperCase() + k.slice(1)}</div>
    <div class="rr-vals">${ok
      ? `<span class="cv">✅ ${correct[k]}</span>`
      : `<span class="wv">${ans[k]}</span><span style="color:#bbb">→</span><span class="cv">${correct[k]}</span>`
    }</div>`;
    rc.appendChild(row);
  });
  const pr = document.createElement('div'); pr.className = 'rr';
  pr.innerHTML = `<div class="rr-lbl">Points</div><div style="font-weight:700;font-size:1.05rem;color:#3d1f0a">${qPts}/10${qPts === 10 && SLG.streak > 0 ? ` <span style="color:#b45309;font-size:.8rem">🔥${SLG.streak}</span>` : ''}${SLG.streak > 0 && SLG.streak % 3 === 0 ? ' <span style="color:#b45309;font-size:.75rem">(+5!)</span>' : ''}</div>`;
  rc.appendChild(pr);
  document.getElementById('sl-qr-expl').textContent = '📘 ' + v.short;
  document.getElementById('sl-qr-meta').textContent = `Running: ${SLG.score}${SLG.bonusScore > 0 ? ' (incl. +' + SLG.bonusScore + ' bonus)' : ''}`;
  const nb = document.getElementById('sl-qr-next');
  if (SLG.qIdx >= SLG.questions.length - 1) {
    nb.textContent = 'See Results →'; nb.onclick = slShowFinal;
  } else {
    nb.textContent = 'Next Question →';
    nb.onclick = () => { SLG.qIdx++; showScreen('sl-quiz'); SoundFX.startMusic('quiz'); slRenderQuestion(); };
  }
  showScreen('sl-qresult');
}

// ── Final results ─────────────────────────────────────────────
function slShowFinal() {
  const numQ = SLG.questions.length;
  const maxPossible = numQ * 10;
  const baseAcc = Math.round(((SLG.score - SLG.bonusScore) / maxPossible) * 100);
  document.getElementById('sl-res-title').textContent =
    baseAcc >= 90 ? '🏆 Scripture Master!' :
    baseAcc >= 75 ? '🌟 Outstanding!' :
    baseAcc >= 60 ? '📖 Well Done!' : '📚 Keep Studying!';
  document.getElementById('sl-acc-num').textContent = baseAcc + '%';
  document.getElementById('sl-acc-lbl').textContent =
    SLG.mode === 'daily' ? 'Daily Challenge Accuracy' : 'Overall Accuracy';
  const ss = document.getElementById('sl-streak-summary');
  const parts = [];
  if (SLG.maxStreak >= 3) parts.push(`Best streak: 🔥 ${SLG.maxStreak}`);
  if (SLG.bonusScore > 0) parts.push(`Bonus: +${SLG.bonusScore} pts`);
  ss.textContent = parts.join(' · ');

  const sg = document.getElementById('sl-stats-grid'); sg.innerHTML = '';
  [{ n: 'Testament', k: 'testament', p: 1 }, { n: 'Book', k: 'book', p: 2 },
   { n: 'Chapter', k: 'chapter', p: 3 }, { n: 'Verse', k: 'verse', p: 4 }].forEach(s => {
    const ct = SLG.stagePts[s.k]; const pct = Math.round(ct / numQ * 100);
    const b = document.createElement('div'); b.className = 'stat-box';
    b.innerHTML = `<div class="sb-name">${s.n} (${s.p}pt each)</div><div class="sb-num">${ct}/${numQ}</div><div class="sb-pct">${pct}% correct</div>`;
    sg.appendChild(b);
  });
  const tot = document.createElement('div'); tot.className = 'stat-box full-col';
  tot.innerHTML = `<div class="sb-name">Total Score</div><div class="sb-num">${SLG.score}</div><div class="sb-pct">${baseAcc}% accuracy</div>`;
  sg.appendChild(tot);

  const bd = document.getElementById('sl-challenge-bd'); bd.innerHTML = '';
  if (SLG.mode === 'challenge' || SLG.mode === 'daily') {
    const h = document.createElement('div'); h.className = 'bd-head';
    h.textContent = 'Question Breakdown'; bd.appendChild(h);
    SLG.allAns.forEach((e, i) => {
      const c = document.createElement('div'); c.className = 'cq-card';
      let rows = '';
      SL_STAGE_KEYS.forEach(k => {
        const ok = String(e.ans[k]) === String(e.correct[k]);
        const skipped = e.skipped;
        rows += `<div class="cq-row"><span class="cq-stage">${k}:</span>${
          skipped
            ? `<span style="color:#9ca3af">Skipped → <span class="cv">${e.correct[k]}</span></span>`
            : ok
              ? `<span class="cv">✅ ${e.correct[k]}</span>`
              : `<span class="wv">${e.ans[k]}</span> → <span class="cv">${e.correct[k]}</span>`
        }</div>`;
      });
      const peeked = SLG.revealed[i] ? ' <span style="font-size:.7rem;color:#9ca3af">(peeked)</span>' : '';
      c.innerHTML = `<div class="cq-num">Q${i + 1} — ${e.qPts}/10${peeked}</div>
        <div class="cq-verse">"${e.v.text.length > 85 ? e.v.text.slice(0, 85) + '…' : e.v.text}"</div>
        ${rows}<div style="font-size:.78rem;color:#7a5838;margin-top:8px;font-style:italic">${e.v.short}</div>`;
      bd.appendChild(c);
    });
  }

  const pab = document.getElementById('sl-play-again-btn');
  if (SLG.mode === 'daily') {
    slSaveDailyResult(baseAcc);
    pab.textContent = 'Daily Summary →';
    pab.onclick = slOpenDaily;
  } else {
    pab.textContent = 'Play Again';
    pab.onclick = slPlayAgain;
    const st = slPersistGame();
    const newAch = slEarnAchievements(st);
    slRenderNewAch(newAch);
  }

  if (baseAcc >= 90) setTimeout(spawnConfetti, 300);
  showScreen('sl-results');
  SoundFX.startMusic('leaderboard');
}

// ── Daily challenge ───────────────────────────────────────────
function slTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function slSeededRng(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 4294967296; };
}

function slGetDailyVerses() {
  const dateStr = slTodayStr();
  const seed = dateStr.split('-').reduce((a, b) => a * 1000 + parseInt(b), 0);
  const rng = slSeededRng(seed);
  const pool = [...Array(SL_VERSES.length).keys()];
  const picks = [];
  while (picks.length < 5 && pool.length) {
    const i = 0 | rng() * pool.length; picks.push(pool.splice(i, 1)[0]);
  }
  return picks.map(i => SL_VERSES[i]);
}

function slLoadDaily() { try { return JSON.parse(localStorage.getItem('sldaily') || '{}'); } catch(e) { return {}; } }
function slSaveDaily(data) { try { localStorage.setItem('sldaily', JSON.stringify(data)); } catch(e) {} }

function slSaveDailyResult(acc) {
  const data = slLoadDaily();
  const today = slTodayStr();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
  const prevStreak = data.lastDate === yesterdayStr ? (data.streak || 0) : 0;
  const newStreak = prevStreak + 1;
  data.date = today; data.completed = true; data.score = acc;
  data.streak = newStreak; data.bestStreak = Math.max(data.bestStreak || 0, newStreak);
  data.totalDays = (data.totalDays || 0) + 1;
  slSaveDaily(data);
  if (newStreak >= 7) {
    const st = slLoadStats();
    if (!st.achievements.includes('sl_daily7')) { st.achievements.push('sl_daily7'); slSaveStats(st); }
  }
}

function slOpenDaily() {
  const data = slLoadDaily(); const today = slTodayStr();
  document.getElementById('sl-daily-date-lbl').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('sl-d-streak').textContent = data.streak || 0;
  document.getElementById('sl-d-best').textContent = data.bestStreak || 0;
  document.getElementById('sl-d-total').textContent = data.totalDays || 0;
  const doneCard = document.getElementById('sl-daily-done-card');
  const startBtn = document.getElementById('sl-daily-start-btn');
  if (data.date === today && data.completed) {
    doneCard.style.display = 'block';
    document.getElementById('sl-daily-done-score').textContent = data.score + '%';
    startBtn.disabled = true; startBtn.textContent = 'Completed Today ✓';
  } else {
    doneCard.style.display = 'none';
    startBtn.disabled = false; startBtn.textContent = "Begin Today's Challenge →";
  }
  showScreen('sl-daily');
  SoundFX.startMusic('title');
}

function slStartDailyChallenge() {
  const verses = slGetDailyVerses();
  slInitG('daily', verses, 'medium', 5);
  showScreen('sl-quiz'); SoundFX.startMusic('quiz'); slRenderQuestion();
}

function slUpdateDailyBadge() {
  const data = slLoadDaily();
  const el = document.getElementById('sl-w-daily-badge');
  if (el) el.textContent = `🔥 ${data.streak || 0} day streak`;
}

// ── Study mode ────────────────────────────────────────────────
function slStartStudy() {
  SLS = { order: [...Array(SL_VERSES.length).keys()], idx: 0, shuffle: false, reveal: false, learned: new Set() };
  document.getElementById('sl-tog-shuf').textContent = 'Shuffle: OFF';
  document.getElementById('sl-tog-shuf').classList.remove('on');
  document.getElementById('sl-tog-rev').textContent = 'Self-Test: OFF';
  document.getElementById('sl-tog-rev').classList.remove('on');
  showScreen('sl-study'); SoundFX.startMusic('title'); slRenderStudyCard();
}

function slRenderStudyCard() {
  const vi = SLS.order[SLS.idx]; const v = SL_VERSES[vi];
  const diffMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
  document.getElementById('sl-s-prog').textContent = `Verse ${SLS.idx + 1} of ${SLS.order.length} · ${SLS.learned.size} learned`;
  document.getElementById('sl-s-verse').textContent = v.text;
  document.getElementById('sl-s-ref').innerHTML =
    `${v.book}, Chapter ${v.chapter}, Verse ${v.verse}<span class="sc-badge">${v.testament}</span>` +
    `<span class="diff-badge diff-${diffMap[v.diff]}">${diffMap[v.diff]}</span>`;
  document.getElementById('sl-s-ctx').textContent = v.context;
  document.getElementById('sl-s-answer-wrap').className = 'blur-wrap' + (SLS.reveal ? ' blurred' : '');
  document.getElementById('sl-s-reveal-btn').style.display = SLS.reveal ? '' : 'none';
  const lb = document.getElementById('sl-s-learn-btn');
  lb.textContent = SLS.learned.has(vi) ? '✅ Learned!' : '⭐ Mark Learned';
  lb.className = 'learn-btn' + (SLS.learned.has(vi) ? ' done' : '');
  document.getElementById('sl-s-footer').textContent = `${SLS.learned.size} of ${SL_VERSES.length} verses marked as learned`;
}

function slNextStudyVerse() { SLS.idx = (SLS.idx + 1) % SLS.order.length; slRenderStudyCard(); }

function slRevealAnswer() {
  document.getElementById('sl-s-answer-wrap').className = 'blur-wrap';
  document.getElementById('sl-s-reveal-btn').style.display = 'none';
}

function slToggleShuffle() {
  SLS.shuffle = !SLS.shuffle; const b = document.getElementById('sl-tog-shuf');
  if (SLS.shuffle) { SLS.order = slRnd([...Array(SL_VERSES.length).keys()]); SLS.idx = 0; b.textContent = 'Shuffle: ON'; b.classList.add('on'); }
  else { SLS.order = [...Array(SL_VERSES.length).keys()]; SLS.idx = 0; b.textContent = 'Shuffle: OFF'; b.classList.remove('on'); }
  slRenderStudyCard();
}

function slToggleReveal() {
  SLS.reveal = !SLS.reveal; const b = document.getElementById('sl-tog-rev');
  b.textContent = SLS.reveal ? 'Self-Test: ON' : 'Self-Test: OFF';
  b.className = 'tog' + (SLS.reveal ? ' on' : ''); slRenderStudyCard();
}

function slToggleLearned() {
  const vi = SLS.order[SLS.idx];
  SLS.learned.has(vi) ? SLS.learned.delete(vi) : SLS.learned.add(vi);
  if (SLS.learned.size >= 20) {
    const st = slLoadStats();
    if (!st.achievements.includes('sl_dilig')) {
      st.achievements.push('sl_dilig'); slSaveStats(st);
      const n = document.createElement('div');
      n.textContent = '📚 Achievement: Diligent!';
      n.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#3d1f0a;color:white;padding:10px 20px;border-radius:8px;font-size:.85rem;font-weight:700;z-index:9999;animation:popIn .4s ease';
      document.body.appendChild(n); setTimeout(() => n.remove(), 3000);
    }
  }
  slRenderStudyCard();
}

// ── Stats persistence ─────────────────────────────────────────
function slBlankStats() {
  return {
    gamesPlayed: 0, totalBase: 0, totalMax: 0, modeCount: {}, bestStreak: 0,
    hintsUsed: 0, stageTotals: { testament: [0, 0], book: [0, 0], chapter: [0, 0], verse: [0, 0] },
    achievements: [], hardGames: 0
  };
}

function slLoadStats() {
  try { const s = localStorage.getItem('slstats'); if (s) return Object.assign(slBlankStats(), JSON.parse(s)); } catch(e) {}
  return slBlankStats();
}

function slSaveStats(st) { try { localStorage.setItem('slstats', JSON.stringify(st)); } catch(e) {} }

function slPersistGame() {
  const st = slLoadStats();
  const base = SLG.score - SLG.bonusScore;
  const maxPossible = SLG.questions.length * 10;
  st.gamesPlayed++; st.totalBase += base; st.totalMax += maxPossible;
  st.modeCount[SLG.mode] = (st.modeCount[SLG.mode] || 0) + 1;
  if (SLG.maxStreak > st.bestStreak) st.bestStreak = SLG.maxStreak;
  st.hintsUsed += (3 - SLG.hintsLeft);
  SL_STAGE_KEYS.forEach(k => { st.stageTotals[k][0] += SLG.stagePts[k]; st.stageTotals[k][1] += SLG.questions.length; });
  if (SLG.diff === 'hard') st.hardGames = (st.hardGames || 0) + 1;
  slSaveStats(st); return st;
}

function slEarnAchievements(st) {
  const have = new Set(st.achievements); const newOnes = [];
  const add = id => { if (!have.has(id)) { newOnes.push(id); st.achievements.push(id); } };
  if (st.gamesPlayed >= 1) add('sl_first');
  if (SLG.mode === 'challenge') add('sl_chal');
  if (SLG.hintsLeft === 3) add('sl_nohint');
  if (SLG.maxStreak >= 3) add('sl_str3');
  if (SLG.maxStreak >= 5) add('sl_str5');
  if (SLG.stagePts.book === SLG.questions.length) add('sl_books');
  if ((SLG.score - SLG.bonusScore) === SLG.questions.length * 10) add('sl_perf');
  if ((SLG.score - SLG.bonusScore) >= 100) add('sl_cent');
  if (st.gamesPlayed >= 10) add('sl_vet');
  if ((st.hardGames || 0) >= 1) add('sl_hard');
  let otC = 0, otT = 0, ntC = 0, ntT = 0;
  SLG.allAns.forEach(({ v, ans }) => {
    if (v.testament === 'Old') { otT++; if (ans.book === v.book) otC++; }
    else { ntT++; if (ans.book === v.book) ntC++; }
  });
  if (otT >= 3 && otC === otT) add('sl_ot');
  if (ntT >= 3 && ntC === ntT) add('sl_nt');
  slSaveStats(st); return newOnes;
}

function slRenderNewAch(ids) {
  const el = document.getElementById('sl-new-achievements');
  const list = document.getElementById('sl-new-ach-list');
  if (!ids.length) { el.style.display = 'none'; return; }
  el.style.display = 'block'; list.innerHTML = '';
  ids.forEach(id => {
    const a = SL_ACHS.find(x => x.id === id); if (!a) return;
    const c = document.createElement('div'); c.className = 'ach-card new-ach';
    c.innerHTML = `<div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
    list.appendChild(c);
  });
}

// ── Stats screen ──────────────────────────────────────────────
function slOpenStats() {
  const st = slLoadStats();
  const ov = document.getElementById('sl-ov-stats'); ov.innerHTML = '';
  const pct = st.totalMax > 0 ? Math.round(st.totalBase / st.totalMax * 100) : 0;
  const daily = slLoadDaily();
  [{ n: 'Games Played', v: st.gamesPlayed }, { n: 'Overall Accuracy', v: pct + '%' },
   { n: 'Best Streak', v: '🔥 ' + st.bestStreak }, { n: 'Daily Streak', v: '📅 ' + (daily.streak || 0) }
  ].forEach(s => {
    const b = document.createElement('div'); b.className = 'stat-box';
    b.innerHTML = `<div class="sb-name">${s.n}</div><div class="sb-num">${s.v}</div>`;
    ov.appendChild(b);
  });
  const bars = document.getElementById('sl-stage-bars');
  bars.innerHTML = '<div class="bd-head" style="margin-top:4px">Stage Accuracy (All Time)</div>';
  SL_STAGE_KEYS.forEach(k => {
    const [c, t] = st.stageTotals[k]; const p = t > 0 ? Math.round(c / t * 100) : 0;
    bars.innerHTML += `<div class="stage-row"><div class="stage-row-head"><span class="stage-row-name">${k}</span><span class="stage-row-pct">${p}% (${c}/${t})</span></div><div class="acc-bar-wrap"><div class="acc-bar" style="width:${p}%"></div></div></div>`;
  });
  const sec = document.getElementById('sl-ach-section');
  sec.innerHTML = `<div class="bd-head">Achievements <span class="ach-count">${st.achievements.length}/${SL_ACHS.length} unlocked</span></div>`;
  const grid = document.createElement('div'); grid.className = 'ach-grid';
  SL_ACHS.forEach(a => {
    const ok = st.achievements.includes(a.id);
    const c = document.createElement('div'); c.className = 'ach-card' + (ok ? '' : ' locked');
    c.innerHTML = `<div class="ach-icon">${ok ? a.icon : '🔒'}</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
    grid.appendChild(c);
  });
  sec.appendChild(grid);
  showScreen('sl-stats');
  SoundFX.startMusic('title');
}

function slResetStats() {
  if (!confirm('Reset all Scripture Locator statistics and achievements? This cannot be undone.')) return;
  try { localStorage.removeItem('slstats'); localStorage.removeItem('sldaily'); } catch(e) {}
  slOpenStats();
}

// ── Keyboard (only active on sl-quiz screen) ──────────────────
document.addEventListener('keydown', e => {
  if (!document.getElementById('sl-quiz')?.classList.contains('active')) return;
  if (!['1', '2', '3', '4'].includes(e.key)) return;
  const btns = [...document.querySelectorAll('#sl-opts .opt')].filter(b => !b.classList.contains('sel'));
  if (btns[parseInt(e.key) - 1]) btns[parseInt(e.key) - 1].click();
});

// ── Boot ──────────────────────────────────────────────────────
slUpdateDailyBadge();
