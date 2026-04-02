/* ═══════════════════════════════════════════════════════
   storage.js — localStorage layer, save/load, export/import
═══════════════════════════════════════════════════════ */

/* ── DATE HELPERS — safe local-date, no timezone drift ── */
function todayKey(){const n=new Date();return `${n.getFullYear()}-${p2(n.getMonth()+1)}-${p2(n.getDate())}`}
function p2(n){return String(n).padStart(2,'0')}
function buildKey(y,m,d){return `${y}-${p2(m)}-${p2(d)}`}
function parseKey(k){const[y,m,d]=k.split('-').map(Number);return{y,m,d}}
function shiftKey(k,delta){const{y,m,d}=parseKey(k);const dt=new Date(y,m-1,d+delta);return buildKey(dt.getFullYear(),dt.getMonth()+1,dt.getDate())}
function fmtKey(k){const{y,m,d}=parseKey(k);return new Date(y,m-1,d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'2-digit'})}
function daysInMonth(y,m){return new Date(y,m,0).getDate()}

/* ── SLEEP TIME HELPERS ── */
function hhmm2min(s){if(!s)return null;const[h,m]=s.split(':').map(Number);return h*60+m}
function min2hhmm(m){m=((m%1440)+1440)%1440;return`${p2(Math.floor(m/60))}:${p2(m%60)}`}
function min2dur(m){if(m==null||isNaN(m))return'—';const h=Math.floor(m/60);const mn=m%60;return mn===0?`${h}h`:`${h}h ${mn}m`}
function hhmm2disp(s){if(!s)return'—';const m=hhmm2min(s);const h24=Math.floor(m/60);const mn=m%60;const ap=h24>=12?'PM':'AM';return`${h24%12||12}:${p2(mn)} ${ap}`}
function calcSleepDur(sm,wm){if(sm==null||wm==null)return null;let d=wm-sm;if(d<=0)d+=1440;return d}
function circMean(arr){if(!arr.length)return null;let sx=0,sy=0;for(const m of arr){const a=(m/1440)*2*Math.PI;sx+=Math.cos(a);sy+=Math.sin(a)}sx/=arr.length;sy/=arr.length;let a=Math.atan2(sy,sx);if(a<0)a+=2*Math.PI;return Math.round((a/(2*Math.PI))*1440)}

/* ── STORAGE KEYS ── */
const STORAGE_DATA_KEY     = 'op_data_v3';
const STORAGE_SETTINGS_KEY = 'op_settings_v3';
const STORAGE_WEEK_KEY     = 'op_week_v3';
const STORAGE_LISTS_KEY    = 'op_lists_v1';

/* ── GLOBALS ── */
let DATA = {};
let WEEK = {};
let CFG  = {};

// LISTS holds all the small editable lists that were previously stored in separate
// localStorage keys. Centralising them makes cloud sync straightforward.
let LISTS = {
  quickNote:        '',
  baselineItems:    null,  // null → use in-code BL_DEFAULT
  salvageItems:     null,  // null → use in-code SAL_DEFAULT
  softwareOptions:  null,  // null → use in-code SW_DEFAULT
  plannerTodos:     [],
  healthSupplements:[],
};

let saveTimer = null;
let lastSaved = null;
let dirtyData = false;
let dirtySettings = false;

/* ── LOCAL LOAD ── */
function loadAllLocal(){
  try{ DATA = JSON.parse(localStorage.getItem(STORAGE_DATA_KEY)||'{}'); }catch(e){DATA={};}
  try{ WEEK = JSON.parse(localStorage.getItem(STORAGE_WEEK_KEY)||'{}'); }catch(e){WEEK={};}
  try{
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    CFG = raw ? JSON.parse(raw) : buildDefaultCFG();
    migrateSettings();
  }catch(e){ CFG = buildDefaultCFG(); }
  loadListsLocal();
  _migrateLegacyLists(); // one-time: pull old separate keys into LISTS
}

function loadListsLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_LISTS_KEY);
    if(raw) Object.assign(LISTS, JSON.parse(raw));
  }catch(e){}
}

// Pull old standalone localStorage keys into LISTS (runs once; harmless thereafter)
function _migrateLegacyLists(){
  let changed = false;
  const map = {
    baselineItems:'baselineItems', salvageItems:'salvageItems',
    softwareOptions:'softwareOptions', plannerTodos:'plannerTodos',
    healthSupplements:'healthSupplements'
  };
  for(const [lk, sk] of Object.entries(map)){
    if(LISTS[lk] == null || (Array.isArray(LISTS[lk]) && LISTS[lk].length === 0)){
      const raw = localStorage.getItem(sk);
      if(raw){ try{ LISTS[lk] = JSON.parse(raw); changed = true; }catch(e){} }
    }
  }
  if(!LISTS.quickNote){
    const qn = localStorage.getItem('quickNote');
    if(qn){ LISTS.quickNote = qn; changed = true; }
  }
  if(changed) saveListsLocal();
}

/* ── LOCAL SAVE ── */
function saveListsLocal(){
  localStorage.setItem(STORAGE_LISTS_KEY, JSON.stringify(LISTS));
  // Piggyback cloud save (no-op when not logged in; defined in supabase.js)
  if(typeof _scheduleCloudSave === 'function') _scheduleCloudSave();
}

function saveAllLocal(){
  localStorage.setItem(STORAGE_DATA_KEY,     JSON.stringify(DATA));
  localStorage.setItem(STORAGE_WEEK_KEY,     JSON.stringify(WEEK));
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(CFG));
  localStorage.setItem(STORAGE_LISTS_KEY,    JSON.stringify(LISTS));
}

/* ── LABEL HELPER ── */
function L(key,fallback){return(CFG.labels&&CFG.labels[key]!==undefined&&CFG.labels[key]!=='')?CFG.labels[key]:(fallback||key);}

/* ── DAY DATA ── */
function getDayData(k){
  if(!DATA[k]) DATA[k]=emptyDay();
  return DATA[k];
}

/* ── SAVE ── */
function saveDataNow(){
  localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(DATA));
  localStorage.setItem(STORAGE_WEEK_KEY, JSON.stringify(WEEK));
  dirtyData = false;
  touchSaveIndicator();
  if(typeof _scheduleCloudSave === 'function') _scheduleCloudSave();
}

function saveSettingsNow(){
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(CFG));
  dirtySettings = false;
  touchSaveIndicator();
  if(typeof _scheduleCloudSave === 'function') _scheduleCloudSave();
}

function saveAll(){
  saveDataNow();
  saveSettingsNow();
}

function touchSaveIndicator(){
  lastSaved = new Date();
  const dot = document.getElementById('save-dot');
  const lbl = document.getElementById('save-label');
  if(dot){ dot.className='save-dot saved'; dot.style.background=''; }
  if(lbl) lbl.textContent = 'Saved ' + lastSaved.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{ if(dot){ dot.className='save-dot'; dot.style.background=''; } },5000);
}

function queueDataSave(){
  dirtyData=true;
  const dot=document.getElementById('save-dot');
  if(dot) dot.className='save-dot saving';
  clearTimeout(window._qsTimer);
  window._qsTimer=setTimeout(saveAll,800);
}

function queueSettingsSave(){
  dirtySettings=true;
  clearTimeout(window._qsTimer2);
  window._qsTimer2=setTimeout(saveSettingsNow,500);
}

// Periodic autosave every 60s
setInterval(()=>{if(dirtyData||dirtySettings)saveAll();},60000);

// Save on beforeunload (local only — async cloud saves may not finish in time)
window.addEventListener('beforeunload',()=>{if(dirtyData||dirtySettings)saveAllLocal();});

/* ── EXPORT / IMPORT ── */
function exportData(){dlJSON({data:DATA,week:WEEK},'operator-data-'+todayKey()+'.json');}
function exportSettings(){dlJSON(CFG,'operator-settings-'+todayKey()+'.json');}
function exportFull(){dlJSON({data:DATA,week:WEEK,settings:CFG,lists:LISTS},'operator-full-'+todayKey()+'.json');}
function dlJSON(obj,name){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();}

function triggerImport(mode){
  const fi=document.getElementById('import-file');
  fi.dataset.mode=mode;fi.click();
}
function handleImport(e){
  const file=e.target.files[0];if(!file)return;
  const mode=e.target.dataset.mode||'full';
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const p=JSON.parse(ev.target.result);
      if(mode==='data'){if(p.data)Object.assign(DATA,p.data);if(p.week)Object.assign(WEEK,p.week);}
      else if(mode==='settings'){if(p.goals||p.tabs)Object.assign(CFG,p);else if(typeof p==='object')Object.assign(CFG,p);}
      else{
        if(p.data)Object.assign(DATA,p.data);
        if(p.week)Object.assign(WEEK,p.week);
        if(p.settings)Object.assign(CFG,p.settings);
        if(p.lists)Object.assign(LISTS,p.lists);
      }
      saveAll();saveListsLocal();init();alert('Import successful.');
    }catch(err){alert('Import failed: '+err.message);}
  };
  reader.readAsText(file);e.target.value='';
}

function showBackupMenu(){
  MC.open('Backup Options',
    '→ Use the Admin tab → Backup for full import/export options.\n\nQuick export full backup?',
    exportFull
  );
}

function resetToday(){DATA[currentDate]=emptyDay();saveAll();renderPlanner();renderHealthEntry();renderSupplements();if(activeTab==='health'){renderMood();renderHealthMonth();}if(activeTab==='sleep')renderSleepEntry();}
function resetAll(){DATA={};WEEK={};saveAll();renderPlanner();renderHealthEntry();renderSupplements();if(activeTab==='sleep'){renderSleepEntry();renderSleepMonth();}if(activeTab==='health')renderHealthMonth();}

/* ── GENERIC HELPERS ── */
function setElText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function setChk(id,val){
  const el=document.getElementById(id);if(!el)return;
  const inp=el.querySelector('input');if(inp)inp.checked=!!val;
  el.classList.toggle('on',!!val);
}
function setVal(id,val){const el=document.getElementById(id);if(el)el.value=val;}
function hexToRgb(h){h=h.trim();if(h.startsWith('#')){let r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);if(!isNaN(r))return`${r},${g},${b}`;}return'200,169,110';}
