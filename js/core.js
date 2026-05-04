// ═══════════════════════════════════════════════════════════════
//  CORE.JS — Firebase, SoundFX, helpers, showScreen, PWA, audio
// ═══════════════════════════════════════════════════════════════

// ── Firebase ──────────────────────────────────────────────────
const FC={apiKey:"AIzaSyAN3uy58I9BEmjfcjt9LMSbUR6N81Y8sjs",authDomain:"bible-games-92bd2.firebaseapp.com",projectId:"bible-games-92bd2",storageBucket:"bible-games-92bd2.firebasestorage.app",messagingSenderId:"116456102774",appId:"1:116456102774:web:075284078c3c511eb93857"};
let db=null;
try{firebase.initializeApp(FC);try{firebase.analytics();}catch(e){}db=firebase.firestore();console.log('✅ Firebase OK');}catch(e){console.warn('Firebase:',e.message);}

// ── Fullscreen ────────────────────────────────────────────────
function requestFullscreen(el) {
  const e = el || document.documentElement;
  const fn = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
  if (fn) { try { fn.call(e); } catch(err) {} }
}
function exitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (fn) { try { fn.call(document); } catch(err) {} }
}
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

// ── Firestore helpers ─────────────────────────────────────────
async function fsGetPersonalBest(name,epId){
  if(!db)return null;
  try{
    const snap=await db.collection('bc_scores')
      .where('episodeId','==',epId)
      .where('name','==',name.slice(0,25))
      .orderBy('score','desc').limit(1).get();
    if(snap.empty)return null;
    const doc=snap.docs[0];
    return{id:doc.id,...doc.data()};
  }catch(e){console.error(e);return null;}
}

async function fsSavePersonalBest(name,score,epId,rank,correct,total,speedPts,streak,extraFields){
  if(!db)return{status:'error',msg:'No database connection'};
  try{
    const existing=await fsGetPersonalBest(name,epId);
    if(existing&&existing.score>=score){
      return{status:'not_best',best:existing.score};
    }
    if(existing){
      await db.collection('bc_scores').doc(existing.id).delete();
    }
    await db.collection('bc_scores').add({
      name:name.slice(0,25),score,episodeId:epId,
      episodeTitle:EPS.find(e=>e.id===epId)?.title||epId,
      rank,correct,total,speedPts,streak,
      pct:total>0?Math.round(correct/total*100):0,
      levelReached: extraFields?.levelReached || epId,
      stonesUsed:   extraFields?.stonesUsed   || 0,
      ts:firebase.firestore.FieldValue.serverTimestamp()
    });
    return{status:existing?'new_best':'first',prev:existing?.score||0};
  }catch(e){console.error(e);return{status:'error',msg:e.message};}
}

async function fsGet(epId){
  if(!db)return[];
  try{
    let q=db.collection('bc_scores').orderBy('score','desc').limit(25);
    if(epId!=='all')q=q.where('episodeId','==',epId);
    const s=await q.get();return s.docs.map(d=>({...d.data(),id:d.id}));
  }catch(e){console.error(e);return[];}
}

// ── Sound system ──────────────────────────────────────────────
const SoundFX={
  ctx:null, enabled:true,
  _musicNodes:[], _musicGain:null, _musicScheduler:null,
  _currentTheme:null, _musicBeat:0, _nextBeatTime:0,

  init(){
    if(!this.ctx&&(window.AudioContext||window.webkitAudioContext))
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();
  },

  _makeReverb(wet=0.22){
    if(!this.ctx) return null;
    try{
      const delay=this.ctx.createDelay(0.5);
      const fb=this.ctx.createGain(); delay.delayTime.value=0.18;
      fb.gain.value=0.25; delay.connect(fb); fb.connect(delay);
      const wetGain=this.ctx.createGain(); wetGain.gain.value=wet;
      delay.connect(wetGain);
      return{input:delay, output:wetGain};
    }catch(e){return null;}
  },

  beep(freq,duration=0.08,vol=0.12){
    if(!this.enabled||!this.ctx)return;
    try{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.connect(g);g.connect(this.ctx.destination);
      o.frequency.value=freq;
      g.gain.setValueAtTime(vol,this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001,this.ctx.currentTime+duration);
      o.start();o.stop(this.ctx.currentTime+duration);
    }catch(e){}
  },

  play(type){
    if(!this.enabled||!this.ctx)return;
    try{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.connect(g);g.connect(this.ctx.destination);
      const t=this.ctx.currentTime;
      switch(type){
        case 'correct': o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+.1);o.frequency.setValueAtTime(784,t+.2);g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);break;
        case 'wrong': o.type='sawtooth';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(110,t+.3);g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.35);break;
        case 'streak': [523,659,784,1047].forEach((f,i)=>{const oo=this.ctx.createOscillator(),gg=this.ctx.createGain();oo.connect(gg);gg.connect(this.ctx.destination);oo.frequency.value=f;gg.gain.setValueAtTime(.18,t+i*.08);gg.gain.exponentialRampToValueAtTime(.001,t+i*.08+.2);oo.start(t+i*.08);oo.stop(t+i*.08+.2);});return;
        case 'throw': o.frequency.value=700;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.25);break;
        case 'hit': o.frequency.setValueAtTime(500,t);o.frequency.exponentialRampToValueAtTime(200,t+.4);g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);break;
        case 'hurt': o.type='sawtooth';o.frequency.setValueAtTime(180,t);g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);break;
        case 'powerup': o.frequency.setValueAtTime(880,t);o.frequency.setValueAtTime(1047,t+.1);o.frequency.setValueAtTime(1319,t+.2);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.4);o.start(t);o.stop(t+.4);break;
        case 'dodge': o.frequency.setValueAtTime(440,t);o.frequency.exponentialRampToValueAtTime(880,t+.15);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.start(t);o.stop(t+.2);break;
        case 'victory': [523,659,784,659,784,1047].forEach((f,i)=>{const oo=this.ctx.createOscillator(),gg=this.ctx.createGain();oo.connect(gg);gg.connect(this.ctx.destination);oo.frequency.value=f;gg.gain.setValueAtTime(.22,t+i*.12);gg.gain.exponentialRampToValueAtTime(.001,t+i*.12+.25);oo.start(t+i*.12);oo.stop(t+i*.12+.3);});return;
        case 'armoured': o.type='square';o.frequency.value=150;g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3);break;
      }
    }catch(e){}
  },

  THEMES:{
    title:{
      bpm:90, steps:16,
      melody:[[392,2,1.0],[440,1,0.8],[494,1,0.8],[523,2,1.0],[440,1,0.7],
              [392,1,0.7],[349,2,1.0],[330,1,0.7],[294,1,0.7],[262,4,1.1]],
      bass:  [131,0,131,0,175,0,175,0,147,0,147,0,131,0,131,0],
      drums: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      melVol:0.15,bassVol:0.12,drumVol:0.16,hihatVol:0.06
    },
    quiz:{
      bpm:100, steps:16,
      melody:[[523,1,1.0],[494,1,0.8],[440,2,0.9],[392,1,1.0],[440,1,0.8],
              [494,2,0.9],[523,2,1.0],[587,1,0.9],[659,1,0.9],[587,2,0.9],[523,2,1.0]],
      bass:  [131,0,131,0,147,0,147,0,175,0,175,0,147,0,147,0],
      drums: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      snare: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      melVol:0.13,bassVol:0.11,drumVol:0.15,snareVol:0.14,hihatVol:0.07
    },
    battle:{
      bpm:148, steps:16,
      melody:[[587,1,1.0],[659,1,1.0],[699,1,1.0],[587,1,0.9],[523,1,1.0],[494,1,0.9],
              [440,2,1.0],[494,1,1.0],[523,1,1.0],[587,1,1.0],[659,1,1.0],[699,2,1.1],
              [587,1,0.9],[523,1,0.9]],
      bass:  [147,0,147,0,175,0,175,0,196,0,196,0,175,0,175,0],
      drums: [1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0],
      snare: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      melVol:0.16,bassVol:0.14,drumVol:0.20,snareVol:0.18,hihatVol:0.08
    },
    night:{
      bpm:130, steps:16,
      melody:[[294,1,1.0],[277,1,0.9],[262,2,1.0],[247,1,0.9],[262,1,0.8],
              [277,1,0.9],[294,1,1.0],[311,2,1.1],[294,1,0.9],[277,1,0.8],
              [262,2,1.0],[247,2,0.9]],
      bass:  [87,0,87,0,93,0,93,0,98,0,98,0,93,0,93,0],
      drums: [1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
      snare: [0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
      hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      melVol:0.14,bassVol:0.13,drumVol:0.18,snareVol:0.16,hihatVol:0.07
    },
    epic:{
      bpm:162, steps:16,
      melody:[[880,1,1.1],[784,1,1.0],[699,1,1.0],[784,1,1.0],[880,1,1.1],[988,1,1.0],
              [1047,2,1.2],[988,1,1.0],[880,1,1.0],[784,1,1.0],[699,1,1.0],
              [659,2,1.1],[699,1,1.0],[784,1,1.0]],
      bass:  [110,0,110,0,124,0,124,0,147,0,147,0,124,0,124,0],
      drums: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      snare: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      melVol:0.18,bassVol:0.16,drumVol:0.22,snareVol:0.20,hihatVol:0.09
    },
    leaderboard:{
      bpm:118, steps:16,
      melody:[[659,1,1.0],[699,1,1.0],[784,2,1.1],[699,1,1.0],[659,1,0.9],
              [587,2,1.0],[659,1,1.0],[784,1,1.0],[880,2,1.2],
              [784,2,1.0],[659,2,1.0]],
      bass:  [165,0,165,0,175,0,175,0,196,0,196,0,175,0,175,0],
      drums: [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
      snare: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      melVol:0.15,bassVol:0.13,drumVol:0.18,snareVol:0.16,hihatVol:0.07
    },
  },

  _note(freq, startTime, duration, vol=0.14, wave='square'){
    if(!this.ctx||!this._musicGain) return;
    try {
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      const f=this.ctx.createBiquadFilter();
      f.type='lowpass'; f.frequency.value=1800;
      o.type=wave; o.frequency.value=freq;
      g.gain.setValueAtTime(0,startTime);
      g.gain.linearRampToValueAtTime(vol,startTime+0.01);
      g.gain.setValueAtTime(vol*0.85,startTime+duration*0.5);
      g.gain.linearRampToValueAtTime(0.001,startTime+duration);
      o.connect(f); f.connect(g); g.connect(this._musicGain);
      o.start(startTime); o.stop(startTime+duration+0.02);
      this._musicNodes.push(o,g,f);
    }catch(e){}
  },

  _kick(t,vol=0.22){
    if(!this.ctx||!this._musicGain) return;
    try{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(40,t+0.12);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
      o.connect(g); g.connect(this._musicGain); o.start(t); o.stop(t+0.25);
      this._musicNodes.push(o,g);
    }catch(e){}
  },

  _snare(t,vol=0.16){
    if(!this.ctx||!this._musicGain) return;
    try{
      const buf=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*0.12),this.ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
      const src=this.ctx.createBufferSource(), g=this.ctx.createGain();
      const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2200; f.Q.value=0.8;
      src.buffer=buf; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
      src.connect(f); f.connect(g); g.connect(this._musicGain); src.start(t); src.stop(t+0.13);
      this._musicNodes.push(src,g,f);
    }catch(e){}
  },

  _hihat(t,vol=0.08){
    if(!this.ctx||!this._musicGain) return;
    try{
      const buf=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*0.04),this.ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
      const src=this.ctx.createBufferSource(), g=this.ctx.createGain();
      const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7000;
      src.buffer=buf; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
      src.connect(f); f.connect(g); g.connect(this._musicGain); src.start(t); src.stop(t+0.05);
      this._musicNodes.push(src,g,f);
    }catch(e){}
  },

  startMusic(themeName){
    if(!this.enabled) return;
    this.init();
    if(!this.ctx) return;
    if(this.ctx.state === 'suspended') this.ctx.resume();
    if(this._currentTheme===themeName){ return; }
    this.stopMusic();
    this._currentTheme=themeName;
    const theme=this.THEMES[themeName];
    if(!theme) return;

    this._musicGain=this.ctx.createGain();
    this._musicGain.gain.setValueAtTime(0,this.ctx.currentTime);
    this._musicGain.gain.linearRampToValueAtTime(0.85,this.ctx.currentTime+1.2);
    this._musicGain.connect(this.ctx.destination);

    const stepDur = (60/theme.bpm)/4;
    let stepIdx=0, melIdx=0, melStepsLeft=0;

    const tick=()=>{
      if(!this.ctx||this._currentTheme!==themeName) return;
      const now=this.ctx.currentTime;
      while(this._nextBeatTime < now+0.25){
        const t=this._nextBeatTime;
        const s=stepIdx % theme.steps;
        if(theme.bass&&theme.bass[s])
          this._note(theme.bass[s],t,stepDur*1.85,theme.bassVol||0.12,'triangle');
        if(theme.drums&&theme.drums[s])
          this._kick(t,theme.drumVol||0.18);
        if(theme.snare&&theme.snare[s])
          this._snare(t,theme.snareVol||0.15);
        if(theme.hihat&&theme.hihat[s])
          this._hihat(t,theme.hihatVol||0.07);
        if(theme.melody&&theme.melody.length>0){
          if(melStepsLeft===0){
            const mel=theme.melody[melIdx%theme.melody.length];
            if(mel&&mel[0]>0){
              const dur=stepDur*(mel[1]||1)*0.88;
              const vol=(theme.melVol||0.14)*(mel[2]||1.0);
              this._note(mel[0],t,dur,vol,'square');
            }
            melStepsLeft=(mel&&mel[1]?mel[1]:1)-1;
            melIdx++;
          } else {
            melStepsLeft--;
          }
        }
        this._nextBeatTime+=stepDur;
        stepIdx++;
        if(stepIdx%96===0){
          this._musicNodes=this._musicNodes.filter(n=>{try{n.disconnect();return false;}catch(e){return false;}});
        }
      }
      this._musicScheduler=setTimeout(tick,55);
    };

    this._nextBeatTime=this.ctx.currentTime+0.05;
    tick();
  },

  stopMusic(){
    if(this._musicScheduler){clearTimeout(this._musicScheduler);this._musicScheduler=null;}
    this._currentTheme=null;
    if(this._musicGain){
      try{
        this._musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime+0.8);
        setTimeout(()=>{try{this._musicGain.disconnect();}catch(e){}this._musicGain=null;},900);
      }catch(e){this._musicGain=null;}
    }
    this._musicNodes.forEach(n=>{try{n.disconnect();}catch(e){}});
    this._musicNodes=[];
  },

  startAmbient(type){
    const map={battle:'battle',daniel:'quiz',moses:'quiz',default:'quiz'};
    this.startMusic(map[type]||'quiz');
  },
  stopAmbient(){ this.stopMusic(); },

  toggle(){
    this.enabled=!this.enabled;
    if(!this.enabled) this.stopMusic();
    else if(this._currentTheme) this.startMusic(this._currentTheme);
    return this.enabled;
  }
};

function updateSoundBtn(){const btns=document.querySelectorAll('[onclick*="SoundFX.toggle"]');btns.forEach(b=>b.textContent=SoundFX.enabled?'🔊 Sound':'🔇 Sound');}

// ── Screen switcher ───────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el)el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  SoundFX.init();
  switch(id){
    case 's-title':       SoundFX.startMusic('title');       break;
    case 's-game':        SoundFX.startMusic('quiz');        break;
    case 's-verdict':     SoundFX.startMusic('leaderboard'); break;
    case 's-leaderboard': SoundFX.startMusic('leaderboard'); break;
    case 's-minigame':    /* mini-game controls its own music */ break;
    case 's-loading':     SoundFX.stopMusic();               break;
  }
}

// ── Utilities ─────────────────────────────────────────────────
function flash(ok){const e=document.getElementById('ff');e.className=`ff ${ok?'cfl':'wfl'} show`;setTimeout(()=>e.classList.remove('show'),300);}
function spawn(em,n){for(let i=0;i<n;i++)setTimeout(()=>{const p=document.createElement('div');p.className='particle';p.textContent=em;p.style.left=Math.random()*80+10+'%';p.style.top=Math.random()*50+20+'%';document.body.appendChild(p);setTimeout(()=>p.remove(),2000);},i*200);}
function spawnConfetti(){const cols=['#ffd700','#c9a84c','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7'];for(let i=0;i<80;i++){setTimeout(()=>{const p=document.createElement('div');p.className='confetti-piece';p.style.left=Math.random()*100+'%';p.style.top='-10px';p.style.background=cols[Math.floor(Math.random()*cols.length)];p.style.transform=`rotate(${Math.random()*360}deg)`;p.style.animationDuration=(2+Math.random()*3)+'s';p.style.animationDelay=(Math.random()*1)+'s';document.body.appendChild(p);setTimeout(()=>p.remove(),5000);},i*30);}}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setBodyScrollLock(lock) {
  if (lock) { document.body.classList.add('mg-active'); }
  else { document.body.classList.remove('mg-active'); }
}

// ── Star canvas ───────────────────────────────────────────────
(function(){
  const c=document.getElementById('bg-canvas'),ctx=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
  resize();window.addEventListener('resize',resize);
  for(let i=0;i<90;i++)pts.push({x:Math.random(),y:Math.random(),r:Math.random()*1.5+.3,spd:Math.random()*.0003+.00008,op:Math.random()*.4+.1,ph:Math.random()*6.28});
  function draw(){ctx.clearRect(0,0,W,H);const g=ctx.createRadialGradient(W/2,H*.7,0,W/2,H*.7,H*.8);g.addColorStop(0,'rgba(25,10,5,0.25)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);pts.forEach(p=>{p.ph+=p.spd*60;ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.r,0,6.28);ctx.fillStyle=`rgba(255,245,220,${p.op*(0.6+0.4*Math.sin(p.ph))})`;ctx.fill();});requestAnimationFrame(draw);}
  draw();
})();

// ── PWA ───────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && SoundFX.ctx) {
    if (SoundFX.ctx.state === 'suspended') SoundFX.ctx.resume();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  setTimeout(() => {
    const el = document.getElementById('s-title');
    if (!el || !el.classList.contains('active')) return;
    if (document.getElementById('pwaInstallBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.style.cssText = 'background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.08));border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:10px 18px;margin:8px auto;max-width:400px;display:flex;justify-content:space-between;align-items:center;gap:10px;font-family:"Cinzel",serif;';
    banner.innerHTML = `
      <span style="font-size:12px;color:#c9a84c;">📱 Install for offline play</span>
      <button onclick="installPWA()" style="background:linear-gradient(135deg,#a07828,#e8c96a);color:#1a0f00;border:none;border-radius:4px;padding:6px 14px;font-family:'Cinzel',serif;font-size:11px;font-weight:bold;cursor:pointer;">Install App</button>
      <button onclick="document.getElementById('pwaInstallBanner').remove()" style="background:none;border:none;color:#6b5a28;font-size:16px;cursor:pointer;">✕</button>
    `;
    const epGrid = document.getElementById('ep-grid');
    if (epGrid) epGrid.parentNode.insertBefore(banner, epGrid);
  }, 8000);
});

function installPWA() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      document.getElementById('pwaInstallBanner')?.remove();
      console.log('PWA installed');
    }
    _deferredInstallPrompt = null;
  });
}

// ── Audio file loader ─────────────────────────────────────────
const AUDIO_FILES = {
  sling_charge:       'audio/sling_charge.mp3',
  stone_throw:        'audio/stone_throw.mp3',
  stone_hit_forehead: 'audio/stone_hit_forehead.mp3',
  stone_hit_armour:   'audio/stone_hit_armour.mp3',
  stone_miss:         'audio/stone_miss.mp3',
  stone_bounce:       'audio/stone_bounce.mp3',
  javelin_incoming:   'audio/javelin_incoming.mp3',
  shield_block:       'audio/shield_block.mp3',
  david_hurt:         'audio/david_hurt.mp3',
  powerup_collect:    'audio/powerup_collect.mp3',
  goliath_stunned:    'audio/goliath_stunned.mp3',
  goliath_rage:       'audio/goliath_rage.mp3',
  wave_clear:         'audio/wave_clear.mp3',
  victory_fanfare:    'audio/victory_fanfare.mp3',
  correct_answer:     'audio/correct_answer.mp3',
  wrong_answer:       'audio/wrong_answer.mp3',
  life_restored:      'audio/life_restored.mp3',
  ui_tap:             'audio/ui_tap.mp3',
  grace_shield:       'audio/grace_shield.mp3',
  crowd_cheer:        'audio/crowd_cheer.mp3',
  countdown_tick:     'audio/countdown_tick.mp3',
  night_ambience:     'audio/night_ambience.mp3',
  title_theme:        'audio/title_theme.mp3',
  quiz_theme:         'audio/quiz_theme.mp3',
  battle_theme:       'audio/battle_theme.mp3',
  night_theme:        'audio/night_theme.mp3',
  epic_theme:         'audio/epic_theme.mp3',
  victory_theme:      'audio/victory_theme.mp3',
};

const AudioPool = {};
let audioFilesAttempted = false;

function loadAudioFiles() {
  if (audioFilesAttempted) return;
  audioFilesAttempted = true;
  Object.entries(AUDIO_FILES).forEach(([key, path]) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = path;
    audio.addEventListener('canplaythrough', () => {
      AudioPool[key] = audio;
    }, { once: true });
    audio.addEventListener('error', () => {}, { once: true });
  });
}

function playFX(name) {
  if (!SoundFX.enabled) return;
  const audio = AudioPool[name];
  if (audio) {
    const clone = audio.cloneNode();
    clone.volume = 0.8;
    clone.play().catch(() => {});
    return;
  }
  switch(name) {
    case 'stone_throw':        SoundFX.play('throw');    break;
    case 'stone_hit_forehead': SoundFX.play('hit');      break;
    case 'stone_hit_armour':   SoundFX.play('armoured'); break;
    case 'david_hurt':         SoundFX.play('hurt');     break;
    case 'powerup_collect':    SoundFX.play('powerup');  break;
    case 'victory_fanfare':    SoundFX.play('victory');  break;
    case 'correct_answer':     SoundFX.play('correct');  break;
    case 'wrong_answer':       SoundFX.play('wrong');    break;
    case 'ui_tap':             SoundFX.beep(660, 0.05, 0.08); break;
    case 'sling_charge':       SoundFX.beep(440 + Math.min(mgStoneCount||0, 60)*5, 0.05, 0.06); break;
    case 'grace_shield':       SoundFX.beep(880, 0.15, 0.14); break;
    case 'goliath_rage':       SoundFX.beep(120, 0.4, 0.18);  break;
    case 'goliath_stunned':    SoundFX.beep(660, 0.3, 0.14);  break;
    case 'wave_clear':         SoundFX.play('victory');  break;
    case 'life_restored':      [523,659,784].forEach((f,i)=>setTimeout(()=>SoundFX.beep(f,0.2,0.16),i*100)); break;
    default: break;
  }
}

['click','touchstart','keydown'].forEach(ev => {
  document.addEventListener(ev, () => { loadAudioFiles(); SoundFX.init(); if(SoundFX.ctx&&SoundFX.ctx.state==='suspended')SoundFX.ctx.resume(); }, { once: true });
});

// ── Loading screen → title (2.2 s) ───────────────────────────
setTimeout(async ()=>{
  showScreen('s-title');renderEpisodes();checkCompleteBadge();
  await tryAutoRestore();
  checkAndShowDailyBonus();
  const saved=localStorage.getItem('bc_username');
  const inp=document.getElementById('username-inp');
  if(saved&&saved.trim()){
    inp.value=saved;username=saved;
    const g=document.getElementById('ugreet');
    g.className='ugreet';
    g.textContent=`Welcome back, ${saved}! 🙏 Your progress is remembered.`;
  }else{
    inp.focus();
  }
},2200);
