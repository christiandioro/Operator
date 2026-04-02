/* ═══════════════════════════════════════════════════════
   health.js — Weight tracker, supplements checklist
═══════════════════════════════════════════════════════ */

let healthViewYear, healthViewMonth;
let healthViewMode = 'month';
let healthViewWeekStart; // YYYY-MM-DD Monday of current week

/* ── SUPPLEMENTS — persisted in localStorage ── */
function getSupplements(){
  try{return JSON.parse(localStorage.getItem('healthSupplements')||'[]');}catch(e){return[];}
}
function saveSupplements(arr){localStorage.setItem('healthSupplements',JSON.stringify(arr));}

/* ── WEIGHT ENTRY ── */
let _hwTimer = null;
function onWeightChange(){
  clearTimeout(_hwTimer);
  _hwTimer = setTimeout(()=>{
    const w = document.getElementById('hw-weight').value;
    const n = document.getElementById('hw-notes').value;
    const day = getDayData(currentDate);
    if(!day.health) day.health = {};
    day.health.weight = w;
    day.health.notes  = n;
    queueDataSave();
    const st = document.getElementById('hw-entry-status');
    if(st) st.textContent = w ? 'Saved.' : 'No entry yet.';
    renderHealthMonth();
  }, 600);
}

function renderHealthEntry(){
  const lbl = document.getElementById('hw-entry-date-lbl');
  if(lbl) lbl.textContent = 'Entry — ' + fmtKey(currentDate);
  const day = getDayData(currentDate);
  const h   = day.health || {};
  setVal('hw-weight', h.weight || '');
  setVal('hw-notes',  h.notes  || '');
  const st = document.getElementById('hw-entry-status');
  if(st) st.textContent = h.weight ? 'Entry loaded.' : 'No entry yet.';
}

/* ── NAVIGATION ── */
function navHealthPeriod(dir){
  if(healthViewMode === 'month'){
    healthViewMonth += dir;
    if(healthViewMonth > 12){ healthViewMonth = 1; healthViewYear++; }
    if(healthViewMonth < 1){ healthViewMonth = 12; healthViewYear--; }
  } else if(healthViewMode === 'year'){
    healthViewYear += dir;
  } else {
    const{y,m,d} = parseKey(healthViewWeekStart);
    const dt = new Date(y, m-1, d + dir*7);
    healthViewWeekStart = buildKey(dt.getFullYear(), dt.getMonth()+1, dt.getDate());
  }
  renderHealthMonth();
}

function goHealthNow(){
  const n = new Date();
  healthViewYear  = n.getFullYear();
  healthViewMonth = n.getMonth()+1;
  const dow = n.getDay();
  const mon = new Date(n);
  mon.setDate(n.getDate() - ((dow+6)%7));
  healthViewWeekStart = buildKey(mon.getFullYear(), mon.getMonth()+1, mon.getDate());
  renderHealthMonth();
}

function setHealthViewMode(mode){
  healthViewMode = mode;
  ['week','month','year'].forEach(m=>{
    const el = document.getElementById('btn-hv-'+m);
    if(el) el.classList.toggle('btn-accent', m===mode);
  });
  renderHealthMonth();
}

/* ── DATA FETCHING ── */
function getHealthEntries(){
  const entries = [];
  if(healthViewMode === 'month'){
    const dim = daysInMonth(healthViewYear, healthViewMonth);
    for(let d=1; d<=dim; d++){
      const k = buildKey(healthViewYear, healthViewMonth, d);
      const day = DATA[k];
      if(!day?.health?.weight) continue;
      const w = parseFloat(day.health.weight);
      if(isNaN(w)) continue;
      entries.push({date:k, day:d, weight:w, notes:day.health.notes||''});
    }
  } else if(healthViewMode === 'week'){
    if(!healthViewWeekStart) return entries;
    const{y,m,d} = parseKey(healthViewWeekStart);
    for(let i=0; i<7; i++){
      const dt = new Date(y, m-1, d+i);
      const k  = buildKey(dt.getFullYear(), dt.getMonth()+1, dt.getDate());
      const day = DATA[k];
      if(!day?.health?.weight) continue;
      const w = parseFloat(day.health.weight);
      if(isNaN(w)) continue;
      entries.push({date:k, day:i+1, weight:w, notes:day.health.notes||''});
    }
  } else {
    for(let mo=1; mo<=12; mo++){
      const dim = daysInMonth(healthViewYear, mo);
      const ws = [];
      for(let d=1; d<=dim; d++){
        const k = buildKey(healthViewYear, mo, d);
        const day = DATA[k];
        if(!day?.health?.weight) continue;
        const w = parseFloat(day.health.weight);
        if(!isNaN(w)) ws.push(w);
      }
      if(!ws.length) continue;
      const avg = ws.reduce((a,b)=>a+b,0)/ws.length;
      entries.push({date:buildKey(healthViewYear,mo,1), day:mo, weight:Math.round(avg*10)/10, notes:`${ws.length} entries`});
    }
  }
  return entries;
}

function getHealthPeriodLabel(){
  const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  if(healthViewMode==='month') return `${mn[healthViewMonth-1]} ${healthViewYear}`;
  if(healthViewMode==='year')  return `${healthViewYear}`;
  if(healthViewMode==='week' && healthViewWeekStart){
    const{y,m,d}=parseKey(healthViewWeekStart);
    const s=new Date(y,m-1,d), e=new Date(y,m-1,d+6);
    return `${s.getDate()} ${mn[s.getMonth()].slice(0,3)} – ${e.getDate()} ${mn[e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
  }
  return '';
}

/* ── RENDER ALL ── */
function renderHealthMonth(){
  const lbl = document.getElementById('health-period-label');
  if(lbl) lbl.textContent = getHealthPeriodLabel();
  const entries = getHealthEntries();
  renderHealthStats(entries);
  renderHealthChart(entries);
  renderHealthLog(entries);
}

/* ── STATS ── */
function renderHealthStats(entries){
  if(!entries) entries = getHealthEntries();
  if(!entries.length){
    setElText('hw-stat-avg','—'); setElText('hw-stat-min','—');
    setElText('hw-stat-max','—'); setElText('hw-stat-trend','—');
    const tEl=document.getElementById('hw-stat-trend');if(tEl)tEl.style.color='';
    return;
  }
  const ws = entries.map(e=>e.weight);
  const avg = ws.reduce((a,b)=>a+b,0)/ws.length;
  setElText('hw-stat-avg', avg.toFixed(1)+' kg');
  setElText('hw-stat-min', Math.min(...ws).toFixed(1)+' kg');
  setElText('hw-stat-max', Math.max(...ws).toFixed(1)+' kg');
  const tEl = document.getElementById('hw-stat-trend');
  if(tEl){
    let trend='→';
    if(ws.length>=4){
      const mid=Math.floor(ws.length/2);
      const fa=ws.slice(0,mid).reduce((a,b)=>a+b,0)/mid;
      const la=ws.slice(-mid).reduce((a,b)=>a+b,0)/mid;
      const diff=la-fa;
      if(diff>0.3) trend='↑';
      else if(diff<-0.3) trend='↓';
    }
    tEl.textContent=trend;
    tEl.style.color=trend==='↑'?'var(--red)':trend==='↓'?'var(--green)':'var(--text2)';
  }
}

/* ── CHART ── */
function renderHealthChart(entries){
  if(!entries) entries = getHealthEntries();
  const canvas = document.getElementById('ch-weight');
  if(!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const W   = canvas.parentElement.clientWidth-30;
  const H   = 170;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const cs  = getComputedStyle(document.documentElement);
  const cT3 = cs.getPropertyValue('--text3').trim();
  const cBd = cs.getPropertyValue('--border').trim();
  const cAc = cs.getPropertyValue('--accent').trim();
  const cAd = cs.getPropertyValue('--accent-dim').trim();
  const pad = {top:18,right:18,bottom:34,left:52};
  const pw  = W-pad.left-pad.right, ph=H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  if(!entries.length){
    ctx.fillStyle=cT3; ctx.font='11px monospace'; ctx.textAlign='center';
    ctx.fillText('No data',W/2,H/2); return;
  }
  const ws   = entries.map(e=>e.weight);
  const minW = Math.min(...ws), maxW = Math.max(...ws);
  const vpad = Math.max((maxW-minW)*0.25,1);
  const minD = minW-vpad, maxD = maxW+vpad, rng = maxD-minD||1;
  // Y grid ticks
  const rawStep = (maxD-minD)/4;
  const step    = rawStep>5?5:rawStep>2?2:rawStep>0.5?1:0.5;
  const tickMin = Math.ceil(minD/step)*step;
  ctx.strokeStyle=cBd; ctx.lineWidth=1;
  for(let t=tickMin; t<=maxD+step; t=Math.round((t+step)*100)/100){
    const y = pad.top+ph-((t-minD)/rng)*ph;
    if(y<pad.top-5||y>pad.top+ph+5) continue;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+pw,y); ctx.stroke();
    ctx.fillStyle=cT3; ctx.font='9px monospace'; ctx.textAlign='right';
    ctx.fillText(Number.isInteger(t)?t:t.toFixed(1), pad.left-5, y+3);
  }
  // X axis labels
  ctx.fillStyle=cT3; ctx.font='9px monospace'; ctx.textAlign='center';
  if(healthViewMode==='month'){
    const dim=daysInMonth(healthViewYear,healthViewMonth);
    for(let d=1;d<=dim;d+=5){ ctx.fillText(d, pad.left+((d-1)/(dim-1||1))*pw, H-pad.bottom+13); }
  } else if(healthViewMode==='week'){
    ['M','T','W','T','F','S','S'].forEach((lbl,i)=>{ ctx.fillText(lbl, pad.left+(i/6)*pw, H-pad.bottom+13); });
  } else {
    ['J','F','M','A','M','J','J','A','S','O','N','D'].forEach((lbl,i)=>{ ctx.fillText(lbl, pad.left+(i/11)*pw, H-pad.bottom+13); });
  }
  // X position helper
  function getX(e){
    if(healthViewMode==='month'){
      const dim=daysInMonth(healthViewYear,healthViewMonth);
      return pad.left+((e.day-1)/(dim-1||1))*pw;
    }
    if(healthViewMode==='week') return pad.left+((e.day-1)/6)*pw;
    return pad.left+((e.day-1)/11)*pw;
  }
  // Area fill
  ctx.beginPath(); let first=true;
  for(const e of entries){
    const x=getX(e), y=pad.top+ph-((e.weight-minD)/rng)*ph;
    first?ctx.moveTo(x,y):ctx.lineTo(x,y); first=false;
  }
  const le=entries[entries.length-1];
  ctx.lineTo(getX(le),pad.top+ph);
  ctx.lineTo(getX(entries[0]),pad.top+ph);
  ctx.closePath(); ctx.fillStyle=cAd; ctx.fill();
  // Line
  ctx.beginPath(); first=true;
  for(const e of entries){
    const x=getX(e), y=pad.top+ph-((e.weight-minD)/rng)*ph;
    first?ctx.moveTo(x,y):ctx.lineTo(x,y); first=false;
  }
  ctx.strokeStyle=cAc; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
  // Dots
  for(const e of entries){
    const x=getX(e), y=pad.top+ph-((e.weight-minD)/rng)*ph;
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle=cAc; ctx.fill();
  }
  canvas._hw = {entries,pad,pw,ph,minD,rng,getX};
}

/* ── LOG TABLE ── */
function renderHealthLog(entries){
  if(!entries) entries = getHealthEntries();
  const tbody = document.getElementById('hw-log-body');
  if(!tbody) return;
  tbody.innerHTML='';
  if(!entries.length){
    const tr=document.createElement('tr');
    tr.innerHTML='<td colspan="3" style="text-align:center;color:var(--text3);padding:20px">No entries this period.</td>';
    tbody.appendChild(tr); return;
  }
  [...entries].reverse().forEach(e=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${fmtKey(e.date)}</td><td style="font-family:var(--font-mono)">${e.weight} kg</td><td style="color:var(--text3)">${e.notes||'—'}</td>`;
    tbody.appendChild(tr);
  });
}

/* ── CHART TOOLTIP ── */
function initHealthTooltips(){
  const canvas = document.getElementById('ch-weight');
  if(!canvas) return;
  let tp = null;
  canvas.addEventListener('mousemove',function(ev){
    if(!this._hw) return;
    const r=this.getBoundingClientRect(), mx=ev.clientX-r.left, my=ev.clientY-r.top;
    const{entries,pad,pw,ph,minD,rng,getX}=this._hw;
    let nr=null, md=18;
    for(const e of entries){
      const x=getX(e), y=pad.top+ph-((e.weight-minD)/rng)*ph;
      const d=Math.hypot(mx-x,my-y); if(d<md){md=d;nr=e;}
    }
    if(!tp){tp=document.createElement('div');tp.style.cssText='position:fixed;pointer-events:none;background:#1e1e24;border:1px solid #3a3a45;border-radius:6px;padding:4px 9px;font:11px monospace;color:#e8e8ec;z-index:9999;display:none';document.body.appendChild(tp);}
    if(nr){tp.style.display='block';tp.style.left=(ev.clientX+12)+'px';tp.style.top=(ev.clientY-20)+'px';tp.textContent=`${fmtKey(nr.date)} — ${nr.weight} kg`;}
    else tp.style.display='none';
  });
  canvas.addEventListener('mouseleave',function(){if(tp)tp.style.display='none';});
}

/* ── SUPPLEMENTS ── */
function renderSupplements(){
  const list = document.getElementById('supp-list');
  if(!list) return;
  const supps = getSupplements();
  const day   = getDayData(currentDate);
  if(!day.health)             day.health = {};
  if(!day.health.supplements) day.health.supplements = {};
  list.innerHTML='';
  if(!supps.length){
    list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:6px 0">No supplements added yet. Use the + button above.</div>';
    return;
  }
  const wrap = document.createElement('div');
  wrap.className='checklist';
  supps.forEach(s=>{
    const checked = !!day.health.supplements[s.id];
    const row  = document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px';
    const item = document.createElement('label');
    item.className='chk'+(checked?' on':'');
    item.style.flex='1';
    item.innerHTML=`<input type="checkbox"${checked?' checked':''}><div class="chk-box"><div class="chk-tick"></div></div><span class="chk-lbl">${s.name}</span>`;
    item.querySelector('input').addEventListener('change',function(){
      item.classList.toggle('on',this.checked);
      const d=getDayData(currentDate);
      if(!d.health)d.health={};
      if(!d.health.supplements)d.health.supplements={};
      d.health.supplements[s.id]=this.checked;
      queueDataSave();
    });
    const rm = document.createElement('button');
    rm.className='btn btn-sm btn-icon';
    rm.textContent='×';
    rm.title='Remove';
    rm.style.cssText='flex-shrink:0;font-size:14px;line-height:1;padding:2px 7px';
    rm.addEventListener('click',()=>{
      const all=getSupplements();
      const idx=all.findIndex(x=>x.id===s.id);
      if(idx>=0){all.splice(idx,1);saveSupplements(all);}
      renderSupplements();
    });
    row.appendChild(item); row.appendChild(rm);
    wrap.appendChild(row);
  });
  list.appendChild(wrap);
}

function addSupplement(){
  MP.open('Add Supplement','Supplement name:','',name=>{
    name=name.trim(); if(!name)return;
    const all=getSupplements();
    all.push({id:'s_'+Date.now(),name});
    saveSupplements(all);
    renderSupplements();
  });
}

function toggleSuppHistory(){
  const panel=document.getElementById('supp-history-panel');
  if(!panel)return;
  const vis=panel.style.display==='block';
  panel.style.display=vis?'none':'block';
  if(!vis)renderSuppHistory();
}

function renderSuppHistory(){
  const container=document.getElementById('supp-history-list');
  if(!container)return;
  const supps=getSupplements();
  if(!supps.length){container.innerHTML='<div style="color:var(--text3);font-size:12px">No supplements tracked yet.</div>';return;}
  // Show last 7 days
  const days=[];
  for(let i=6;i>=0;i--){
    const dt=new Date();dt.setDate(dt.getDate()-i);
    const k=buildKey(dt.getFullYear(),dt.getMonth()+1,dt.getDate());
    days.push(k);
  }
  const table=document.createElement('table');
  table.className='sleep-log-table';
  const thead=document.createElement('thead');
  let thRow='<tr><th>Date</th>';
  supps.forEach(s=>{thRow+=`<th>${s.name}</th>`;});
  thRow+='</tr>';
  thead.innerHTML=thRow;
  table.appendChild(thead);
  const tbody=document.createElement('tbody');
  days.forEach(dk=>{
    const d=DATA[dk];
    const supMap=(d&&d.health&&d.health.supplements)||{};
    const tr=document.createElement('tr');
    let row=`<td>${fmtKey(dk)}</td>`;
    supps.forEach(s=>{
      row+=`<td style="text-align:center;color:${supMap[s.id]?'var(--green)':'var(--text4)'}">${supMap[s.id]?'✓':'—'}</td>`;
    });
    tr.innerHTML=row;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.innerHTML='';
  container.appendChild(table);
}

/* ── MOOD ── */
const MOOD_STATES=['steady','sharp','restless','drained','wired','foggy','low','angry','stressed','clear','detached','motivated'];
const MOOD_MODIFIERS=['anxious','unfocused','productive','sluggish','headache','energized','irritable','calm','scattered','driven','blocked','flowing'];

function saveMoodField(field,value){
  const day=getDayData(currentDate);
  if(!day.mood)day.mood={state:'',modifiers:[],note:''};
  day.mood[field]=value;
  queueDataSave();
}

function toggleMoodState(state){
  const day=getDayData(currentDate);
  if(!day.mood)day.mood={state:'',modifiers:[],note:''};
  day.mood.state=(day.mood.state===state)?'':state;
  queueDataSave();
  renderMood();
}

function toggleMoodModifier(mod){
  const day=getDayData(currentDate);
  if(!day.mood)day.mood={state:'',modifiers:[],note:''};
  if(!day.mood.modifiers)day.mood.modifiers=[];
  const idx=day.mood.modifiers.indexOf(mod);
  if(idx>=0){
    day.mood.modifiers.splice(idx,1);
  } else {
    if(day.mood.modifiers.length<2)day.mood.modifiers.push(mod);
  }
  queueDataSave();
  renderMood();
}

function renderMood(){
  const day=getDayData(currentDate);
  const mood=(day.mood)||{state:'',modifiers:[],note:''};

  // State chips
  const stateGrid=document.getElementById('mood-state-grid');
  if(stateGrid){
    stateGrid.innerHTML='';
    MOOD_STATES.forEach(s=>{
      const chip=document.createElement('div');
      chip.className='mood-chip'+(mood.state===s?' on':'');
      chip.textContent=s;
      chip.addEventListener('click',()=>toggleMoodState(s));
      stateGrid.appendChild(chip);
    });
  }

  // Modifier chips
  const modGrid=document.getElementById('mood-mod-grid');
  if(modGrid){
    modGrid.innerHTML='';
    MOOD_MODIFIERS.forEach(m=>{
      const chip=document.createElement('div');
      chip.className='mood-chip mod'+((mood.modifiers||[]).includes(m)?' on':'');
      chip.textContent=m;
      chip.addEventListener('click',()=>toggleMoodModifier(m));
      modGrid.appendChild(chip);
    });
  }

  // Note
  setVal('mood-note',mood.note||'');
}

function toggleMoodHistory(){
  const panel=document.getElementById('mood-history-panel');
  if(!panel)return;
  const vis=panel.style.display==='block';
  panel.style.display=vis?'none':'block';
  if(!vis)renderMoodHistory();
}

function renderMoodHistory(){
  const container=document.getElementById('mood-history-list');
  if(!container)return;
  container.innerHTML='';
  const days=[];
  for(let i=6;i>=0;i--){
    const dt=new Date();dt.setDate(dt.getDate()-i);
    const k=buildKey(dt.getFullYear(),dt.getMonth()+1,dt.getDate());
    days.push(k);
  }
  const entries=days.map(dk=>{
    const d=DATA[dk];
    const mood=d&&d.mood&&d.mood.state?d.mood:{};
    return{date:dk,mood};
  }).filter(e=>e.mood.state);
  if(!entries.length){
    container.innerHTML='<div style="color:var(--text3);font-size:12px">No mood entries in the last 7 days.</div>';
    return;
  }
  entries.reverse().forEach(e=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)';
    const date=document.createElement('div');
    date.style.cssText='font-family:var(--font-mono);font-size:10px;color:var(--text3);min-width:90px;padding-top:2px';
    date.textContent=fmtKey(e.date);
    const info=document.createElement('div');
    info.style.cssText='flex:1';
    const state=document.createElement('div');
    state.style.cssText='font-size:13px;color:var(--text);margin-bottom:2px';
    state.textContent=e.mood.state||'—';
    info.appendChild(state);
    if(e.mood.modifiers&&e.mood.modifiers.length){
      const mods=document.createElement('div');
      mods.style.cssText='font-size:11px;color:var(--text3);font-family:var(--font-mono)';
      mods.textContent=e.mood.modifiers.join(', ');
      info.appendChild(mods);
    }
    if(e.mood.note){
      const note=document.createElement('div');
      note.style.cssText='font-size:11px;color:var(--text3);margin-top:2px;font-style:italic';
      note.textContent=e.mood.note;
      info.appendChild(note);
    }
    row.appendChild(date);row.appendChild(info);
    container.appendChild(row);
  });
}

/* ── MAIN RENDER ── */
function renderHealth(){
  renderHealthEntry();
  renderHealthMonth();
  renderSupplements();
  renderMood();
}
