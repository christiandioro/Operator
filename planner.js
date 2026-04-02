/* ═══════════════════════════════════════════════════════
   planner.js — Planner rendering, baseline, day status, weekly review
═══════════════════════════════════════════════════════ */

/* ── EDITABLE LISTS ── */
const BL_DEFAULT = [
  {id:'hygiene',      name:'Hygiene',          note:'10 min min.'},
  {id:'coffee',       name:'Coffee',            note:''},
  {id:'housereset',   name:'House reset',       note:'15 min after coffee'},
  {id:'projectblock', name:'Project block',     note:'Protected'},
  {id:'family',       name:'Family time',       note:'30 min floating'},
  {id:'reading',      name:'Reading before bed',note:'10 min min.'},
  {id:'phonecap',     name:'Phone cap met',     note:'≤ 6 hrs'},
];
const SAL_DEFAULT = [
  {id:'hygiene', name:'10 min hygiene'},
  {id:'reset',   name:'5–10 min house reset'},
  {id:'project', name:'30 min project task (minimum)'},
  {id:'family',  name:'10 min family contact'},
  {id:'reading', name:'10 min reading before bed'},
];
const SW_DEFAULT = [
  {id:'AutoCAD',   name:'AutoCAD'},
  {id:'Revit',     name:'Revit'},
  {id:'SketchUp',  name:'SketchUp'},
  {id:'Rhino',     name:'Rhino'},
  {id:'D5',        name:'D5 Render'},
];

function getBaselineItems(){
  return(LISTS.baselineItems&&LISTS.baselineItems.length)?LISTS.baselineItems:BL_DEFAULT.map(x=>({...x}));
}
function saveBaselineItems(arr){LISTS.baselineItems=arr;saveListsLocal();}

function getSalvageItems(){
  return(LISTS.salvageItems&&LISTS.salvageItems.length)?LISTS.salvageItems:SAL_DEFAULT.map(x=>({...x}));
}
function saveSalvageItems(arr){LISTS.salvageItems=arr;saveListsLocal();}

function getSoftwareOptions(){
  return(LISTS.softwareOptions&&LISTS.softwareOptions.length)?LISTS.softwareOptions:SW_DEFAULT.map(x=>({...x}));
}
function saveSoftwareOptions(arr){LISTS.softwareOptions=arr;saveListsLocal();}

/* ── BASELINE ITEM MANAGEMENT ── */
function addBaselineItem(){
  MP.open('Add Baseline Item','Item name:','',name=>{
    name=name.trim();if(!name)return;
    const all=getBaselineItems();
    all.push({id:'bl_'+Date.now(),name,note:''});
    saveBaselineItems(all);
    renderBaselineSection();
    updateDayStatus();
  });
}
function editBaselineItem(id){
  const all=getBaselineItems();
  const item=all.find(x=>x.id===id);if(!item)return;
  MP.open('Rename Item',item.name,item.name,name=>{
    name=name.trim();if(!name)return;
    item.name=name;
    saveBaselineItems(all);
    renderBaselineSection();
    updateDayStatus();
  });
}
function removeBaselineItem(id){
  MC.open('Remove Item','Remove this baseline item?',()=>{
    const all=getBaselineItems().filter(x=>x.id!==id);
    saveBaselineItems(all);
    renderBaselineSection();
    updateDayStatus();
  });
}

/* ── SALVAGE ITEM MANAGEMENT ── */
function addSalvageItem(){
  MP.open('Add Salvage Item','Item name:','',name=>{
    name=name.trim();if(!name)return;
    const all=getSalvageItems();
    all.push({id:'sal_'+Date.now(),name});
    saveSalvageItems(all);
    renderSalvageSection();
  });
}
function editSalvageItem(id){
  const all=getSalvageItems();
  const item=all.find(x=>x.id===id);if(!item)return;
  MP.open('Rename Item',item.name,item.name,name=>{
    name=name.trim();if(!name)return;
    item.name=name;
    saveSalvageItems(all);
    renderSalvageSection();
  });
}
function removeSalvageItem(id){
  MC.open('Remove Item','Remove this salvage item?',()=>{
    const all=getSalvageItems().filter(x=>x.id!==id);
    saveSalvageItems(all);
    renderSalvageSection();
  });
}

/* ── SOFTWARE OPTION MANAGEMENT ── */
function addSoftwareOption(){
  MP.open('Add Software','Software name:','',name=>{
    name=name.trim();if(!name)return;
    const all=getSoftwareOptions();
    all.push({id:'sw_'+Date.now(),name});
    saveSoftwareOptions(all);
    renderSoftwareSection();
  });
}
function editSoftwareOption(id){
  const all=getSoftwareOptions();
  const item=all.find(x=>x.id===id);if(!item)return;
  MP.open('Rename Software',item.name,item.name,name=>{
    name=name.trim();if(!name)return;
    item.name=name;
    saveSoftwareOptions(all);
    renderSoftwareSection();
  });
}
function removeSoftwareOption(id){
  MC.open('Remove Software','Remove this software option?',()=>{
    const all=getSoftwareOptions().filter(x=>x.id!==id);
    saveSoftwareOptions(all);
    renderSoftwareSection();
  });
}

/* ── RENDER BASELINE SECTION ── */
function renderBaselineSection(){
  const day=getDayData(currentDate);
  const bl=day.baseline||{};
  const items=getBaselineItems();
  // Pill row (always visible)
  const pillRow=document.getElementById('baseline-pill-row');
  if(pillRow){
    pillRow.innerHTML='';
    items.forEach(item=>{
      const pill=document.createElement('span');
      pill.className='flow-pill'+(bl[item.id]?' done':'');
      pill.textContent=item.name;
      pillRow.appendChild(pill);
    });
  }
  // Checklist (visible when expanded)
  const list=document.getElementById('baseline-checklist');
  if(!list)return;
  list.innerHTML='';
  if(!items.length){
    list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:6px 0">No items. Use the + button to add baseline items.</div>';
    return;
  }
  const wrap=document.createElement('div');
  wrap.className='checklist';
  items.forEach(item=>{
    const checked=!!bl[item.id];
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px';
    const lbl=document.createElement('label');
    lbl.className='chk'+(checked?' on':'');
    lbl.style.flex='1';
    lbl.innerHTML=`<input type="checkbox"${checked?' checked':''}><div class="chk-box"><div class="chk-tick"></div></div><span class="chk-lbl">${item.name}</span>${item.note?`<span class="chk-note">${item.note}</span>`:''}`;
    lbl.querySelector('input').addEventListener('change',function(){
      lbl.classList.toggle('on',this.checked);
      const d=getDayData(currentDate);
      if(!d.baseline)d.baseline={};
      d.baseline[item.id]=this.checked;
      queueDataSave();
      updateDayStatus();
      renderBaselineSection();// refresh pill row
    });
    const editBtn=document.createElement('button');
    editBtn.className='btn btn-sm btn-icon';editBtn.title='Rename';editBtn.textContent='✎';
    editBtn.style.cssText='flex-shrink:0;font-size:12px;padding:2px 7px';
    editBtn.addEventListener('click',()=>editBaselineItem(item.id));
    const rmBtn=document.createElement('button');
    rmBtn.className='btn btn-sm btn-icon';rmBtn.title='Remove';rmBtn.textContent='×';
    rmBtn.style.cssText='flex-shrink:0;font-size:14px;line-height:1;padding:2px 7px';
    rmBtn.addEventListener('click',()=>removeBaselineItem(item.id));
    row.appendChild(lbl);row.appendChild(editBtn);row.appendChild(rmBtn);
    wrap.appendChild(row);
  });
  list.appendChild(wrap);
}

/* ── RENDER SALVAGE SECTION ── */
function renderSalvageSection(){
  const day=getDayData(currentDate);
  const sal=day.salvageChecks||{};
  const items=getSalvageItems();
  const list=document.getElementById('salvage-checklist');
  if(!list)return;
  list.innerHTML='';
  if(!items.length){
    list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:6px 0">No items. Use + to add salvage tasks.</div>';
    return;
  }
  const wrap=document.createElement('div');
  wrap.className='checklist';
  items.forEach(item=>{
    const checked=!!sal[item.id];
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px';
    const lbl=document.createElement('label');
    lbl.className='chk'+(checked?' on':'');
    lbl.style.flex='1';
    lbl.innerHTML=`<input type="checkbox"${checked?' checked':''}><div class="chk-box"><div class="chk-tick"></div></div><span class="chk-lbl">${item.name}</span>`;
    lbl.querySelector('input').addEventListener('change',function(){
      lbl.classList.toggle('on',this.checked);
      const d=getDayData(currentDate);
      if(!d.salvageChecks)d.salvageChecks={};
      d.salvageChecks[item.id]=this.checked;
      queueDataSave();
    });
    const editBtn=document.createElement('button');
    editBtn.className='btn btn-sm btn-icon';editBtn.title='Rename';editBtn.textContent='✎';
    editBtn.style.cssText='flex-shrink:0;font-size:12px;padding:2px 7px';
    editBtn.addEventListener('click',()=>editSalvageItem(item.id));
    const rmBtn=document.createElement('button');
    rmBtn.className='btn btn-sm btn-icon';rmBtn.title='Remove';rmBtn.textContent='×';
    rmBtn.style.cssText='flex-shrink:0;font-size:14px;line-height:1;padding:2px 7px';
    rmBtn.addEventListener('click',()=>removeSalvageItem(item.id));
    row.appendChild(lbl);row.appendChild(editBtn);row.appendChild(rmBtn);
    wrap.appendChild(row);
  });
  list.appendChild(wrap);
}

/* ── RENDER SOFTWARE SECTION ── */
function renderSoftwareSection(){
  const day=getDayData(currentDate);
  const sw=day.software||{};
  const opts=getSoftwareOptions();
  const container=document.getElementById('sw-chips');
  if(!container)return;
  container.innerHTML='';
  opts.forEach(opt=>{
    const chip=document.createElement('div');
    chip.className='sw-chip'+(sw.selected===opt.id?' on':'');
    chip.dataset.swId=opt.id;
    chip.innerHTML=`<span>${opt.name}</span>`;
    chip.addEventListener('click',()=>{
      const d=getDayData(currentDate);
      if(!d.software)d.software={};
      d.software.selected=(d.software.selected===opt.id)?'':opt.id;
      container.querySelectorAll('.sw-chip').forEach(c=>c.classList.toggle('on',c.dataset.swId===d.software.selected));
      queueDataSave();
    });
    chip.addEventListener('dblclick',e=>{e.stopPropagation();editSoftwareOption(opt.id);});
    container.appendChild(chip);
  });
}

/* ── LABELS / VISIBILITY ── */
function applyLabels(){
  const m={
    'lbl-baseline':L('sec.baseline','Baseline Checklist'),
    'lbl-goal':L('sec.goal','Core Goal Progress'),
    'lbl-software':L('sec.software','Software Mastery Block'),
  };
  Object.entries(m).forEach(([id,t])=>{const el=document.getElementById(id);if(el)el.textContent=t;});
}

function applySectionVisibility(){
  (CFG.sections||[]).forEach(sec=>{
    if(sec.id==='salvage')return;
    // Try sec-{id} first, then card-{id} fallback
    const el=document.getElementById('sec-'+sec.id)||document.getElementById('card-'+sec.id);
    if(el){
      // Don't override display if salvage is hiding card-baseline
      if(sec.id==='baseline'&&getDayData(currentDate).salvage)return;
      el.style.display=sec.visible?'':'none';
    }
  });
}

/* ── SAVE HELPERS ── */
function saveField(path, value){
  const day=getDayData(currentDate);
  const parts=path.split('.');
  let obj=day;
  for(let i=0;i<parts.length-1;i++){if(!obj[parts[i]])obj[parts[i]]={};obj=obj[parts[i]];}
  obj[parts[parts.length-1]]=value;
  queueDataSave();
  updateDayStatus();
}
function saveCheck(path,val){saveField(path,val);}
function saveWeekField(key,val){
  const wk=getWeekKey(currentDate);
  if(!WEEK[wk])WEEK[wk]={};
  WEEK[wk][key]=val;
  queueDataSave();
}
function getWeekKey(k){
  const{y,m,d}=parseKey(k);
  const dt=new Date(y,m-1,d);
  const mon=new Date(y,m-1,d-((dt.getDay()+6)%7));
  return buildKey(mon.getFullYear(),mon.getMonth()+1,mon.getDate());
}

/* ── RENDER ── */
function renderPlanner(){
  updateDateDisplay();
  applyLabels();
  applySectionVisibility();
  const day=getDayData(currentDate);

  // Goal dropdown + fields
  buildGoalDropdown(day.goal?.category||'');
  const g=day.goal||{};
  setVal('goal-task',g.task||'');setVal('goal-target',g.target||'');
  setVal('goal-made',g.made||'');setVal('goal-log',g.log||'');setVal('goal-next',g.next||'');
  updateGoalHelp(g.category);
  // Explicit goal done checkbox
  setChk('goal-done-chk',g.done);

  // Software
  const sw=day.software||{};
  setChk('sw-done',sw.done);
  setVal('sw-notes',sw.notes||'');
  renderSoftwareSection();

  // Salvage
  const isSalvage=!!day.salvage;
  document.getElementById('salvage-track').classList.toggle('on',isSalvage);
  document.getElementById('sec-salvage').style.display=isSalvage?'':'none';
  document.getElementById('card-baseline').style.display=isSalvage?'none':'';
  if(isSalvage) renderSalvageSection();

  // Salvage notes
  setVal('salvage-notes',day.salvageNotes||'');

  // Baseline pills + checklist
  renderBaselineSection();

  // Todos
  renderTodos();

  // Generic sections
  renderGenericSectionsData();

  // Week
  refreshWeek();
  updateDayStatus();
}

function buildGoalDropdown(selectedVal){
  const sel=document.getElementById('goal-category');
  if(!sel)return;
  sel.innerHTML='<option value="">— select goal</option>';
  const groups=(CFG.goalGroups||[]).filter(g=>g.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  const goals=(CFG.goals||[]).filter(g=>g.active!==false&&g.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  groups.forEach(group=>{
    const gg=goals.filter(g=>g.groupId===group.id);
    if(!gg.length)return;
    const og=document.createElement('optgroup');og.label=group.title;
    gg.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.title;if(g.id===selectedVal)o.selected=true;og.appendChild(o);});
    sel.appendChild(og);
  });
  goals.filter(g=>!groups.find(gr=>gr.id===g.groupId)).forEach(g=>{
    const o=document.createElement('option');o.value=g.id;o.textContent=g.title;if(g.id===selectedVal)o.selected=true;sel.appendChild(o);
  });
}

function updateGoalHelp(catId){
  const goal=(CFG.goals||[]).find(g=>g.id===catId);
  const el=document.getElementById('goal-help');
  if(el) el.textContent=goal?.description||'';
}

/* ── DAY STATUS ── */
function computeStatus(day){
  if(!day)return'miss';
  if(day.salvage)return'salvage';
  const items=getBaselineItems();
  const bl=day.baseline||{};
  const baseComplete=items.length>0&&items.every(item=>!!bl[item.id]);
  if(!baseComplete)return'miss';
  const goalDone=!!(day.goal||{}).done;
  const swDone=!!(day.software||{}).done;
  if(swDone&&goalDone)return'win';
  if(goalDone)return'ideal';
  return'solid';
}

function updateDayStatus(){
  const day=getDayData(currentDate);
  const st=computeStatus(day);
  // win=top(gold), ideal=middle(green), solid=blue, miss=red, salvage=yellow
  const statusMap={
    miss:    {cls:'s-miss',    lbl:'— miss'},
    solid:   {cls:'s-solid',   lbl:'✓ solid day'},
    ideal:   {cls:'s-win',     lbl:'▲ ideal day'},
    win:     {cls:'s-ideal',   lbl:'★ win'},
    salvage: {cls:'s-salvage', lbl:'⚡ salvage'},
  };
  const s=statusMap[st];
  [document.getElementById('day-status-badge'),document.getElementById('sr-badge')].forEach(el=>{
    if(!el)return;
    el.className=s.cls;
    el.textContent=s.lbl;
    Object.assign(el.style,{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:'4px',fontFamily:'var(--font-mono)',fontSize:'10px',letterSpacing:'.1em',textTransform:'uppercase',fontWeight:'500',border:'1px solid'});
    const cs=getComputedStyle(document.documentElement);
    // class→css var map
    const colorMap={s_miss:'--red',s_solid:'--blue',s_win:'--green',s_ideal:'--accent',s_salvage:'--yellow'};
    const cvar=colorMap[s.cls.replace('-','_')];
    if(cvar){const c=cs.getPropertyValue(cvar).trim();el.style.color=c;el.style.borderColor=c;el.style.background=`rgba(${hexToRgb(c)},.12)`;}
  });
  const det=document.getElementById('sr-detail');if(det)det.textContent=L('status.'+st,st);
  // BL dots — dynamic
  const items=getBaselineItems();
  const bl=day.baseline||{};
  const count=items.filter(item=>!!bl[item.id]).length;
  const dots=document.getElementById('bl-dots');
  if(dots){
    dots.innerHTML='';
    items.forEach(item=>{
      const d=document.createElement('div');
      d.className='bl-dot'+(bl[item.id]?' on':'');
      dots.appendChild(d);
    });
  }
  const cntEl=document.getElementById('bl-count');
  if(cntEl)cntEl.textContent=count+'/'+items.length;
}

/* ── SALVAGE TOGGLE ── */
function toggleSalvage(){
  const day=getDayData(currentDate);
  day.salvage=!day.salvage;
  document.getElementById('salvage-track').classList.toggle('on',day.salvage);
  document.getElementById('sec-salvage').style.display=day.salvage?'':'none';
  document.getElementById('card-baseline').style.display=day.salvage?'none':'';
  if(day.salvage)renderSalvageSection();
  queueDataSave();updateDayStatus();
}

/* ── CARD COLLAPSE ── */
function toggleCard(id){
  const body=document.getElementById('body-'+id);
  const car=document.getElementById('caret-'+id);
  if(!body)return;
  const col=body.classList.contains('collapsed');
  body.classList.toggle('collapsed',!col);
  if(car)car.classList.toggle('open',!col);
  // Re-render sleep charts when their sections are expanded (need visible parent for canvas sizing)
  if(col){
    setTimeout(()=>{
      if(id==='sl-duration'&&typeof renderDurationChart==='function')renderDurationChart(getMonthEntries());
      else if(id==='sl-timeline'&&typeof renderTimelineChart==='function')renderTimelineChart(getMonthEntries());
      else if(id==='sl-scatter'&&typeof renderScatterChart==='function')renderScatterChart(getMonthEntries());
    },20);
  }
}

/* ── TIMERS ── */
let _goalTimerInterval=null;
let _goalTimerEnd=null;
let _swTimerInterval=null;
let _swTimerEnd=null;

function _requestNotifPermission(){
  if('Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission();
  }
}
function _fireNotif(title,body){
  if('Notification' in window&&Notification.permission==='granted'){
    new Notification(title,{body});
  }
}

function toggleGoalTimer(){
  if(_goalTimerInterval||_goalTimerEnd) _stopGoalTimer();
  else _startGoalTimer();
}
function _startGoalTimer(){
  _requestNotifPermission();
  const inp=document.getElementById('goal-timer-duration');
  const mins=parseInt(inp?.value)||60;
  _goalTimerEnd=Date.now()+mins*60*1000;
  const btn=document.getElementById('goal-timer-btn');
  if(btn)btn.textContent='Stop';
  function tick(){
    const rem=_goalTimerEnd-Date.now();
    const disp=document.getElementById('goal-timer-display');
    if(rem<=0){
      clearInterval(_goalTimerInterval);_goalTimerInterval=null;_goalTimerEnd=null;
      if(disp)disp.textContent='Done!';
      if(btn)btn.textContent='Start';
      _fireNotif('Core Goal Session Complete','Your work session has finished.');
      return;
    }
    const m=Math.floor(rem/60000),s=Math.floor((rem%60000)/1000);
    if(disp)disp.textContent=m+':'+String(s).padStart(2,'0');
  }
  tick();
  _goalTimerInterval=setInterval(tick,1000);
}
function _stopGoalTimer(){
  if(_goalTimerInterval){clearInterval(_goalTimerInterval);_goalTimerInterval=null;}
  _goalTimerEnd=null;
  const disp=document.getElementById('goal-timer-display');
  if(disp)disp.textContent='—';
  const btn=document.getElementById('goal-timer-btn');
  if(btn)btn.textContent='Start';
}

function toggleSwTimer(){
  if(_swTimerInterval||_swTimerEnd) _stopSwTimer();
  else _startSwTimer();
}
function _startSwTimer(){
  _requestNotifPermission();
  const inp=document.getElementById('sw-timer-duration');
  const mins=parseInt(inp?.value)||60;
  _swTimerEnd=Date.now()+mins*60*1000;
  const btn=document.getElementById('sw-timer-btn');
  if(btn)btn.textContent='Stop';
  function tick(){
    const rem=_swTimerEnd-Date.now();
    const disp=document.getElementById('sw-timer-display');
    if(rem<=0){
      clearInterval(_swTimerInterval);_swTimerInterval=null;_swTimerEnd=null;
      if(disp)disp.textContent='Done!';
      if(btn)btn.textContent='Start';
      _fireNotif('Software Mastery Session Complete','Your software session has finished.');
      return;
    }
    const m=Math.floor(rem/60000),s=Math.floor((rem%60000)/1000);
    if(disp)disp.textContent=m+':'+String(s).padStart(2,'0');
  }
  tick();
  _swTimerInterval=setInterval(tick,1000);
}
function _stopSwTimer(){
  if(_swTimerInterval){clearInterval(_swTimerInterval);_swTimerInterval=null;}
  _swTimerEnd=null;
  const disp=document.getElementById('sw-timer-display');
  if(disp)disp.textContent='—';
  const btn=document.getElementById('sw-timer-btn');
  if(btn)btn.textContent='Start';
}

/* ── TO-DO LIST ── */
function getTodos(){return LISTS.plannerTodos||[];}
function saveTodos(arr){LISTS.plannerTodos=arr;saveListsLocal();}

function checkOverdueTodos(){
  const todos=getTodos();
  const today=todayKey();
  let changed=false;
  todos.forEach(t=>{
    if(!t.done&&!t.notified&&t.date<today){
      t.notified=true;changed=true;
      _fireNotif('Uncompleted To-Do','"'+t.text+'" from '+t.date+' was not completed.');
    }
  });
  if(changed)saveTodos(todos);
}

function renderTodos(){
  const container=document.getElementById('todo-list');
  if(!container)return;
  const all=getTodos();
  const items=all.filter(t=>t.date===currentDate);
  container.innerHTML='';
  if(!items.length){
    container.innerHTML='<div style="color:var(--text3);font-size:12px;padding:4px 0">No to-dos for this day. Use + to add.</div>';
    return;
  }
  const wrap=document.createElement('div');
  wrap.className='checklist';
  items.forEach(t=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px';
    const lbl=document.createElement('label');
    lbl.className='chk'+(t.done?' on':'');
    lbl.style.flex='1';
    lbl.innerHTML=`<input type="checkbox"${t.done?' checked':''}><div class="chk-box"><div class="chk-tick"></div></div><span class="chk-lbl">${t.text}</span>`;
    lbl.querySelector('input').addEventListener('change',function(){
      lbl.classList.toggle('on',this.checked);
      const all2=getTodos();
      const item=all2.find(x=>x.id===t.id);
      if(item)item.done=this.checked;
      saveTodos(all2);
    });
    const rm=document.createElement('button');
    rm.className='btn btn-sm btn-icon';rm.textContent='×';rm.title='Remove';
    rm.style.cssText='flex-shrink:0;font-size:14px;line-height:1;padding:2px 7px';
    rm.addEventListener('click',()=>{
      const all2=getTodos().filter(x=>x.id!==t.id);
      saveTodos(all2);renderTodos();
    });
    row.appendChild(lbl);row.appendChild(rm);
    wrap.appendChild(row);
  });
  container.appendChild(wrap);
}

function addTodo(){
  MP.open('Add To-Do','Task:','',text=>{
    text=text.trim();if(!text)return;
    const all=getTodos();
    all.push({id:'td_'+Date.now(),text,date:currentDate,done:false,notified:false});
    saveTodos(all);
    renderTodos();
  });
}

/* ── WEEKLY REVIEW ── */
function refreshWeek(){
  const wk=getWeekKey(currentDate);
  const{y,m,d}=parseKey(wk);
  const today=todayKey();
  const days=[];
  for(let i=0;i<7;i++){const dt=new Date(y,m-1,d+i);days.push(buildKey(dt.getFullYear(),dt.getMonth()+1,dt.getDate()));}
  let counts={miss:0,solid:0,win:0,ideal:0,salvage:0};
  let goalCnt={};
  const pipRow=document.getElementById('pip-row');if(pipRow)pipRow.innerHTML='';
  days.forEach(dk=>{
    const dd=DATA[dk];const st=computeStatus(dd);
    if(dk<=today)counts[st]++;
    if(pipRow){
      const p=document.createElement('div');
      p.className='pip';
      if(dd&&dk<=today)p.classList.add(st);
      p.title=fmtKey(dk)+': '+st;
      pipRow.appendChild(p);
    }
    if(dd){
      const gc=(dd.goal||{}).category;if(gc){goalCnt[gc]=(goalCnt[gc]||0)+1;}
    }
  });
  ['miss','solid','win','ideal','salvage'].forEach(s=>{const el=document.getElementById('w-'+s);if(el)el.textContent=counts[s];});
  const gnames={};(CFG.goals||[]).forEach(g=>gnames[g.id]=g.title||g.label);
  const topGoal=Object.entries(goalCnt).sort((a,b)=>b[1]-a[1])[0];
  const tgEl=document.getElementById('w-goal');if(tgEl)tgEl.textContent=(topGoal&&topGoal[1]>0)?gnames[topGoal[0]]||topGoal[0]:'—';
  const wr=WEEK[wk]||{};
  setVal('wr-block',wr.block||'');setVal('wr-helped',wr.helped||'');setVal('wr-focus',wr.focus||'');
}
