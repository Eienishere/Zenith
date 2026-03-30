'use strict';

/* ══════════════════════════════════════
   CHAR SETS
══════════════════════════════════════ */
const SETS = {
  lower:    'abcdefghijklmnopqrstuvwxyz',
  upper:    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers:  '0123456789',
  symbols:  '!@#$%^&*',
  spaces:   ' '
};

/* ══════════════════════════════════════
   PRONOUNCEABLE ENGINE
══════════════════════════════════════ */
const CON   = ['b','c','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','x','y','z'];
const VOW   = ['a','e','i','o','u'];
const DIG   = ['ch','sh','th','ph','st','tr','pr','br','cl','fl','gr','pl','sl','sp','sw'];
const CODA  = ['','n','r','s','t','nd','nt','st','ng','nk','ld'];
const SYMS  = '!@#$%^&*';

function ri(max){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%max; }

function syllable(){
  const onset = ri(5)===0 ? DIG[ri(DIG.length)] : CON[ri(CON.length)];
  return onset + VOW[ri(VOW.length)] + (ri(3)>0 ? CODA[ri(CODA.length)] : '');
}

function genPronounceable(len){
  let r='';
  while(r.length < len) r += syllable();
  r = r.slice(0, len).split('');
  r[0] = r[0].toUpperCase();
  if(len >= 10){
    r[2+ri(Math.max(1,Math.floor(len/2)))] = String.fromCharCode(48+ri(10));
    r[Math.min(Math.floor(len*.75)+ri(Math.max(1,Math.ceil(len*.25))), len-1)] = SYMS[ri(SYMS.length)];
  }
  return r.join('');
}

/* ══════════════════════════════════════
   RANDOM ENGINE
══════════════════════════════════════ */
function genRandom(len, pool, activeKeys){
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  const arr = Array.from(bytes, b => pool[b % pool.length]);
  // guarantee one from each set
  activeKeys.forEach((k,i)=>{
    const s=SETS[k]; const b=new Uint32Array(1); crypto.getRandomValues(b);
    arr[i % len] = s[b[0] % s.length];
  });
  // shuffle
  for(let i=arr.length-1;i>0;i--){
    const b=new Uint32Array(1); crypto.getRandomValues(b);
    const j=b[0]%(i+1); [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr.join('');
}

/* ══════════════════════════════════════
   CRACK TIME ESTIMATOR
══════════════════════════════════════ */
function crackTime(pw){
  if(!pw || pw.length===0) return '—';
  let pool=0;
  if(/[a-z]/.test(pw)) pool+=26;
  if(/[A-Z]/.test(pw)) pool+=26;
  if(/[0-9]/.test(pw)) pool+=10;
  if(/[^a-zA-Z0-9\s]/.test(pw)) pool+=32;
  if(/\s/.test(pw)) pool+=1;
  if(pool===0) return '—';
  // 1e10 guesses/s (fast offline attack)
  const combos = Math.pow(pool, pw.length);
  const seconds = combos / 1e10;
  const t = TRANSLATIONS[currentLang].crackTime;

  if(seconds < 1)        return t.instant;
  if(seconds < 60)       return `${Math.round(seconds)} ${t.seconds}`;
  if(seconds < 3600)     return `${Math.round(seconds/60)} ${t.minutes}`;
  if(seconds < 86400)    return `${Math.round(seconds/3600)} ${t.hours}`;
  if(seconds < 2592000)  return `${Math.round(seconds/86400)} ${t.days}`;
  if(seconds < 31536000) return `${Math.round(seconds/2592000)} ${t.months}`;
  const yrs = seconds/31536000;
  if(yrs < 1e3)   return `${Math.round(yrs)} ${t.years}`;
  if(yrs < 1e6)   return `${(yrs/1e3).toFixed(1)}${t.kYears}`;
  if(yrs < 1e9)   return `${(yrs/1e6).toFixed(1)}${t.mYears}`;
  if(yrs < 1e12)  return `${(yrs/1e9).toFixed(1)}${t.bYears}`;
  return t.infinite;
}

/* ══════════════════════════════════════
   STRENGTH
══════════════════════════════════════ */
const STR_COLORS = ['','#f04f5e','#f59e0b','#eab308','#22d98c'];

function calcStrength(pw, sets){
  if(!pw||sets===0) return 0;
  let s=0;
  if(pw.length>=8)  s++;
  if(pw.length>=16) s++;
  if(sets>=3)       s++;
  if(sets>=4&&pw.length>=16) s=4;
  return Math.min(s,4);
}

/* ══════════════════════════════════════
   DOM
══════════════════════════════════════ */
const $=id=>document.getElementById(id);
const html          = document.documentElement;
const pwOut         = $('pwOut');
const lenSlider     = $('lenSlider');
const lenBadge      = $('lenBadge');
const strBars       = $('strBars').querySelectorAll('.str-bar');
const strLbl        = $('strLbl');
const crackVal      = $('crackVal');
const copyBtn       = $('copyBtn');
const eyeBtn        = $('eyeBtn');
const icoEye        = $('icoEye');
const icoEyeOff     = $('icoEyeOff');
const refreshBtn    = $('refreshBtn');
const accordion     = $('accordion');
const accordionTrig = $('accordionTrigger');
const optCount      = $('optCount');
const settingsBtn   = $('settingsBtn');
const settingsPanel = $('settingsPanel');
const themeToggle   = $('themeToggle');
const langSelect    = $('langSelect');
const clearOnPasteTog = $('clearOnPasteToggle');
const manualClear   = $('manualClearRow');
const clearStatus   = $('clearNowStatus');

const cbs = {
  lower:    $('useLower'),
  upper:    $('useUpper'),
  numbers:  $('useNumbers'),
  symbols:  $('useSymbols'),
  spaces:   $('useSpaces'),
  pronounce:$('usePronounce')
};
const lbls = {
  lower:    $('lbl-lower'),
  upper:    $('lbl-upper'),
  numbers:  $('lbl-numbers'),
  symbols:  $('lbl-symbols'),
  spaces:   $('lbl-spaces'),
  pronounce:$('lbl-pronounce')
};

/* ══════════════════════════════════════
   STATE (persisted via localStorage)
══════════════════════════════════════ */
function loadPref(k, def){ try{ const v=localStorage.getItem('pwg_'+k); return v===null?def:JSON.parse(v); }catch{return def;} }
function savePref(k,v){ try{ localStorage.setItem('pwg_'+k, JSON.stringify(v)); }catch{} }

let hidden          = true;
let clearOnPaste    = loadPref('clearOnPaste', true);
let currentTheme    = loadPref('theme','dark');
let currentLang     = loadPref('lang', 'tr');

/* ══════════════════════════════════════
   THEME
══════════════════════════════════════ */
function applyTheme(t){
  currentTheme = t;
  html.setAttribute('data-theme', t);
  savePref('theme', t);
  themeToggle.classList.toggle('on', t==='dark');
}
applyTheme(currentTheme);

themeToggle.addEventListener('click', ()=> applyTheme(currentTheme==='dark'?'light':'dark'));

/* ══════════════════════════════════════
   I18N
══════════════════════════════════════ */
const langSelector    = $('langSelector');
const langSelectBtn   = $('langSelectBtn');
const currentFlag     = $('currentFlag');
const currentLangText = $('currentLangText');
const langOptions     = document.querySelectorAll('.lang-option');

function translateUI(){
  const dict = TRANSLATIONS[currentLang];
  if(!dict) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if(dict[key]) el.title = dict[key];
  });

  // update custom lang selector
  currentFlag.src = `${currentLang}.svg`;
  currentLangText.textContent = currentLang.toUpperCase();
  langOptions.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === currentLang);
  });

  updateOptCount();
  updateStrength(pwOut.textContent, Object.values(cbs).filter(cb => cb.checked).length);
}

// lang selector events
langSelectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  langSelector.classList.toggle('open');
});

langOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    currentLang = opt.dataset.value;
    savePref('lang', currentLang);
    translateUI();
    build();
    langSelector.classList.remove('open');
  });
});

document.addEventListener('click', () => langSelector.classList.remove('open'));

/* ══════════════════════════════════════
   SETTINGS PANEL
══════════════════════════════════════ */
settingsBtn.addEventListener('click', e=>{
  e.stopPropagation();
  settingsPanel.classList.toggle('open');
});
document.addEventListener('click', e=>{
  if(!$('settingsWrap').contains(e.target)) settingsPanel.classList.remove('open');
});

/* auto-clear toggle */
/* clear on paste toggle */
function syncClearOnPasteUI(){
  clearOnPasteTog.classList.toggle('on', clearOnPaste);
}
clearOnPasteTog.addEventListener('click', ()=>{
  clearOnPaste = !clearOnPaste;
  savePref('clearOnPaste', clearOnPaste);
  syncClearOnPasteUI();
});
syncClearOnPasteUI();

/* manual clear */
manualClear.addEventListener('click', ()=> clearClipboard(true));

async function clearClipboard(manual=false){
  // Switch to more reliable offscreen clear via background
  chrome.runtime.sendMessage({ type: 'MANUAL_CLEAR' });
  
  if(manual){
    clearStatus.style.opacity='1';
    setTimeout(()=>clearStatus.style.opacity='0', 2000);
  }
}

async function handlePasswordCopied(){
  // If clearOnPaste is off, do nothing
  if(!clearOnPaste) return;
  
  // Save to chrome storage that a password was copied
  // This will be read by the background script when a paste event is detected
  try {
    await chrome.storage.local.set({ passwordCopied: true, copyTime: Date.now() });
  } catch (e) {
    console.error('Failed to save copy state:', e);
  }
}

/* ══════════════════════════════════════
   EYE TOGGLE
══════════════════════════════════════ */
eyeBtn.addEventListener('click', ()=>{
  hidden = !hidden;
  syncEyeUI();
});

function syncEyeUI(){
  pwOut.classList.toggle('hidden', hidden);
  icoEye.style.display    = hidden ? 'none' : '';
  icoEyeOff.style.display = hidden ? ''     : 'none';
  eyeBtn.classList.toggle('active', hidden);
}

/* ══════════════════════════════════════
   ACCORDION
══════════════════════════════════════ */
accordionTrig.addEventListener('click', ()=> accordion.classList.toggle('open'));
// closed by default
// accordion.classList.add('open');

function updateOptCount(){
  const n = Object.entries(cbs)
    .filter(([k,cb])=> k!=='pronounce' && cb.checked).length +
    (cbs.pronounce.checked ? 1 : 0);
  optCount.textContent = `${n} ${TRANSLATIONS[currentLang].selected}`;
}

/* ══════════════════════════════════════
   PRONOUNCE MODE
══════════════════════════════════════ */
function syncPronounce(){
  const on = cbs.pronounce.checked;
  ['lower','upper','numbers','symbols','spaces'].forEach(k=>{
    cbs[k].disabled = on;
    lbls[k].style.opacity = on ? '.35' : '1';
    lbls[k].style.pointerEvents = on ? 'none' : '';
  });
}

/* ══════════════════════════════════════
   STRENGTH + CRACK UI
══════════════════════════════════════ */
function updateStrength(pw, sets){
  const s = calcStrength(pw, sets);
  const dict = TRANSLATIONS[currentLang];
  strBars.forEach((b,i)=> b.style.background = i<s ? STR_COLORS[s] : '');
  strLbl.textContent = dict.strength[s];
  strLbl.style.color = STR_COLORS[s] || 'var(--t2)';
  crackVal.textContent = crackTime(pw);
}

/* ══════════════════════════════════════
   SLIDER
══════════════════════════════════════ */
function updateSlider(){
  const min=+lenSlider.min, max=+lenSlider.max, val=+lenSlider.value;
  const pct = ((val-min)/(max-min))*100;
  lenSlider.style.background =
    `linear-gradient(to right, var(--accent) ${pct}%, var(--t3) ${pct}%)`;
  lenBadge.textContent = val;
}
lenSlider.addEventListener('input', ()=>{ updateSlider(); build(); });

/* ══════════════════════════════════════
   BUILD PASSWORD
══════════════════════════════════════ */
function build(){
  const len = parseInt(lenSlider.value, 10);

  if(cbs.pronounce.checked){
    const pw = genPronounceable(len);
    pwOut.classList.remove('err');
    pwOut.textContent = pw;
    flash();
    updateStrength(pw, 3);
    updateOptCount();
    return;
  }

  const activeKeys = ['lower','upper','numbers','symbols','spaces'].filter(k=>cbs[k].checked);
  const pool = activeKeys.map(k=>SETS[k]).join('');

  if(!pool){
    pwOut.textContent = TRANSLATIONS[currentLang].errNoPool;
    pwOut.classList.add('err');
    updateStrength('',0);
    crackVal.textContent='—';
    updateOptCount();
    return;
  }

  pwOut.classList.remove('err');
  const pw = genRandom(len, pool, activeKeys);
  pwOut.textContent = pw;
  flash();
  updateStrength(pw, activeKeys.length);
  updateOptCount();
}

function flash(){
  pwOut.classList.remove('flash');
  void pwOut.offsetWidth;
  pwOut.classList.add('flash');
}

/* ══════════════════════════════════════
   COPY
══════════════════════════════════════ */
copyBtn.addEventListener('click', async ()=>{
  const txt = pwOut.textContent;
  if(!txt || pwOut.classList.contains('err')) return;
  try{ await navigator.clipboard.writeText(txt); }
  catch{
    const ta=Object.assign(document.createElement('textarea'),{value:txt});
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  // visual feedback
  copyBtn.classList.add('ok');
  setTimeout(()=> copyBtn.classList.remove('ok'), 2200);
  // handle clear-on-paste logic
  handlePasswordCopied();
});

/* ══════════════════════════════════════
   REFRESH (header quick btn)
══════════════════════════════════════ */
refreshBtn.addEventListener('click', ()=>{
  refreshBtn.classList.add('spin');
  setTimeout(()=> refreshBtn.classList.remove('spin'), 420);
  build();
});

/* ══════════════════════════════════════
   CHECKBOX LISTENERS
══════════════════════════════════════ */
Object.entries(cbs).forEach(([k,cb])=>{
  cb.addEventListener('change', ()=>{
    lbls[k].classList.toggle('on', cb.checked);
    if(k==='pronounce') syncPronounce();
    build();
  });
});

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
updateSlider();
syncPronounce();
syncEyeUI();
translateUI();
build();

