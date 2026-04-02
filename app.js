/* ═══════════════════════════════════════════════════════
   app.js — Bootstrap, init, tab switching, theme, modals
═══════════════════════════════════════════════════════ */

/* ── STATE ── */
let currentDate = todayKey();
let sleepViewYear, sleepViewMonth;
let activeTab = 'planner';
// health view state lives in health.js (healthViewYear/Month/Mode/WeekStart)

/* ── TAB BAR ── */
function renderTabBar(){
  const bar = document.getElementById('tab-bar');
  bar.innerHTML='';
  const visibleTabs = CFG.tabs.filter(t=>!t.hidden);
  visibleTabs.forEach(t=>{
    const btn = document.createElement('button');
    btn.className='tab-btn'+(t.id===activeTab?' active':'');
    btn.id='tabBtn-'+t.id;
    btn.innerHTML=`<span class="tab-dot"></span>${L('tab.'+t.id,t.label)}`;
    btn.onclick=()=>switchTab(t.id);
    bar.appendChild(btn);
  });
}

function switchTab(id){
  saveAll();
  activeTab=id;
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+id));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.id==='tabBtn-'+id));
  const sub = document.getElementById('subheader');
  if(sub) sub.style.display = (CFG.subheaderHiddenTabs||[]).includes(id)?'none':'flex';
  if(id==='sleep'){
    const{y,m}=parseKey(currentDate);
    sleepViewYear=y;sleepViewMonth=m;
    renderSleepEntry();renderSleepMonth();
  }
  if(id==='health'){
    const{y,m}=parseKey(currentDate);
    healthViewYear=y;healthViewMonth=m;
    if(!healthViewWeekStart){
      const n=new Date(),dow=n.getDay(),mon=new Date(n);
      mon.setDate(n.getDate()-((dow+6)%7));
      healthViewWeekStart=buildKey(mon.getFullYear(),mon.getMonth()+1,mon.getDate());
    }
    renderHealth();
  }
  if(id==='admin') renderAdminPanel();
}

/* ── DATE NAVIGATION ── */
function navDay(dir){
  saveAll();
  currentDate=shiftKey(currentDate,dir);
  renderPlanner();
  renderSleepEntry();
  renderHealthEntry();
  if(activeTab==='sleep') renderSleepMonth();
  if(activeTab==='health'){ renderSupplements(); renderHealthMonth(); }
}
function goToday(){
  saveAll();
  currentDate=todayKey();
  renderPlanner();
  renderSleepEntry();
  renderHealthEntry();
  if(activeTab==='health'){ renderSupplements(); renderHealthMonth(); }
}
function updateDateDisplay(){document.getElementById('date-display').textContent=fmtKey(currentDate)}

/* ── THEME ── */
function toggleTheme(){
  document.body.classList.toggle('light-mode');
  const is=document.body.classList.contains('light-mode');
  document.getElementById('theme-btn').textContent=is?'☽':'☀';
  CFG.theme=is?'light':'dark';
  queueSettingsSave();
  setTimeout(()=>{renderDurationChart(getMonthEntries());renderScatterChart(getMonthEntries());renderTimelineChart(getMonthEntries());renderHealthChart();},100);
}

/* ── MODAL HELPERS ── */
const MC={
  _cb:null,
  open(title,body,cb){
    document.getElementById('mc-title').textContent=title;
    document.getElementById('mc-body').textContent=body;
    this._cb=cb;document.getElementById('modal-confirm').classList.add('open');
    document.getElementById('mc-ok').onclick=()=>this.ok();
  },
  ok(){if(this._cb)this._cb();this.cancel();},
  cancel(){document.getElementById('modal-confirm').classList.remove('open');this._cb=null;}
};

const MP={
  _cb:null,
  open(title,body,def,cb){
    document.getElementById('mp-title').textContent=title;
    document.getElementById('mp-body').textContent=body;
    document.getElementById('mp-input').value=def||'';
    this._cb=cb;document.getElementById('modal-prompt').classList.add('open');
    setTimeout(()=>document.getElementById('mp-input').focus(),50);
  },
  ok(){const v=document.getElementById('mp-input').value;if(this._cb)this._cb(v);this.cancel();},
  cancel(){document.getElementById('modal-prompt').classList.remove('open');this._cb=null;}
};

const MAF={
  _tabId:null,_secId:null,
  open(tabId,secId){
    this._tabId=tabId;this._secId=secId;
    document.getElementById('maf-title').textContent='Add Field to Section';
    document.getElementById('maf-label').value='';
    document.getElementById('maf-type').value='text';
    document.getElementById('maf-placeholder').value='';
    document.getElementById('maf-options').value='';
    document.getElementById('maf-options-wrap').style.display='none';
    document.getElementById('modal-admin-field').classList.add('open');
    document.getElementById('maf-type').onchange=function(){document.getElementById('maf-options-wrap').style.display=this.value==='select'?'':'none';};
    setTimeout(()=>document.getElementById('maf-label').focus(),50);
  },
  ok(){
    const label=document.getElementById('maf-label').value.trim();if(!label)return;
    const type=document.getElementById('maf-type').value;
    const ph=document.getElementById('maf-placeholder').value.trim();
    const opts=document.getElementById('maf-options').value;
    const field={id:'f_'+Date.now(),label,type,placeholder:ph};
    if(type==='select')field.options=opts.split(',').map(s=>s.trim()).filter(Boolean);
    const sec=CFG.genericModules?.[this._tabId]?.sections.find(s=>s.id===this._secId);
    if(sec){if(!sec.fields)sec.fields=[];sec.fields.push(field);}
    queueSettingsSave();buildGenericPanels();renderAdminSectionsList(this._tabId);this.cancel();
  },
  cancel(){document.getElementById('modal-admin-field').classList.remove('open');this._tabId=null;this._secId=null;}
};

/* ── EVENT WIRING (called once DOM is ready) ── */
function wireModalEvents(){
  document.getElementById('modal-confirm').addEventListener('click',function(e){if(e.target===this)MC.cancel();});
  document.getElementById('modal-prompt').addEventListener('click',function(e){if(e.target===this)MP.cancel();});
  document.getElementById('mp-input').addEventListener('keydown',function(e){if(e.key==='Enter')MP.ok();if(e.key==='Escape')MP.cancel();});
  document.getElementById('modal-admin-field').addEventListener('click',function(e){if(e.target===this)MAF.cancel();});
  document.getElementById('modal-nap').addEventListener('click',function(e){if(e.target===this)MN.cancel();});
  document.getElementById('mn-start').addEventListener('keydown',function(e){if(e.key==='Escape')MN.cancel();});
  document.getElementById('mn-end').addEventListener('keydown',function(e){if(e.key==='Enter')saveNap();if(e.key==='Escape')MN.cancel();});
}

function wireChecklistSync(){
  document.querySelectorAll('.chk input[type=checkbox]').forEach(inp=>{
    inp.addEventListener('change',function(){this.closest('.chk').classList.toggle('on',this.checked);});
  });
}

function wireSalvageEvents(){
  // Salvage checklist is now dynamically rendered with inline handlers — no static wiring needed.
}

function wireResizeHandler(){
  let _rTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(_rTimer);
    _rTimer=setTimeout(()=>{
      if(activeTab==='sleep')renderSleepMonth();
      if(activeTab==='health')renderHealthChart();
    },220);
  });
}

/* ── INIT ── */
function init(){
  loadAll();
  seedSleep();

  // Apply theme
  if(CFG.theme==='light'){document.body.classList.add('light-mode');document.getElementById('theme-btn').textContent='\u263d';}

  // Apply appearance
  const app=CFG.appearance||{};
  if(app.density==='compact')document.body.classList.add('density-compact');
  if(app.fontScale==='small')document.body.classList.add('font-small');
  if(app.fontScale==='large')document.body.classList.add('font-large');
  if(app.accent&&app.accent!=='#c8a96e'){
    document.documentElement.style.setProperty('--accent',app.accent);
    const r=parseInt(app.accent.slice(1,3),16),g=parseInt(app.accent.slice(3,5),16),b=parseInt(app.accent.slice(5,7),16);
    document.documentElement.style.setProperty('--accent-dim',`rgba(${r},${g},${b},.14)`);
    document.documentElement.style.setProperty('--accent-dim2',`rgba(${r},${g},${b},.06)`);
  }

  // App title
  const wm=document.getElementById('app-wordmark-text');
  if(wm)wm.textContent=CFG.appTitle||'Operator';
  document.title=CFG.appTitle||'Operator';

  // Build dynamic parts
  renderTabBar();
  buildGenericPanels();

  // Set initial sleep month view
  const{y,m}=parseKey(currentDate);
  sleepViewYear=y;sleepViewMonth=m;

  // Set initial health view
  healthViewYear=y;healthViewMonth=m;
  const _hn=new Date(),_hdow=_hn.getDay(),_hmon=new Date(_hn);
  _hmon.setDate(_hn.getDate()-((_hdow+6)%7));
  healthViewWeekStart=buildKey(_hmon.getFullYear(),_hmon.getMonth()+1,_hmon.getDate());

  // Activate planner panel on first load
  document.getElementById('panel-planner').classList.add('active');

  // Render active panel
  renderPlanner();

  // Quick Note
  const qn=document.getElementById('quick-note');
  if(qn)qn.value=localStorage.getItem('quickNote')||'';

  // Check for overdue todos and request notification permission
  checkOverdueTodos();

  // Subheader visibility
  const sub=document.getElementById('subheader');
  if(sub)sub.style.display=(CFG.subheaderHiddenTabs||[]).includes(activeTab)?'none':'flex';

  touchSaveIndicator();
}

/* ── BOOT ── */
wireModalEvents();
wireChecklistSync();
wireSalvageEvents();
wireResizeHandler();
initSleepTooltips();
initHealthTooltips();
init();
