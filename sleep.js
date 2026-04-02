/* ═══════════════════════════════════════════════════════
   sleep.js — Sleep tracker entry, charts, monthly stats
═══════════════════════════════════════════════════════ */

let _slTimer=null;

function onSleepChange(){
  const st=document.getElementById('sl-time').value;
  const wt=document.getElementById('sl-wake').value;
  const nt=document.getElementById('sl-notes').value;
  let mainDur=0,napDur=0;
  if(st&&wt){mainDur=calcSleepDur(hhmm2min(st),hhmm2min(wt));}
  const day=getDayData(currentDate);
  if(day.sleep&&day.sleep.nap&&day.sleep.nap.startTime&&day.sleep.nap.endTime){
    napDur=calcSleepDur(hhmm2min(day.sleep.nap.startTime),hhmm2min(day.sleep.nap.endTime));
  }
  const total=mainDur+napDur;
  document.getElementById('sl-dur-display').textContent=total>0?min2dur(total):'—';
  const bd=document.getElementById('sl-dur-breakdown');
  if(bd){
    if(napDur>0&&mainDur>0){bd.textContent=`${min2dur(mainDur)} sleep + ${min2dur(napDur)} nap`;bd.style.display='';}
    else{bd.style.display='none';}
  }
  clearTimeout(_slTimer);
  _slTimer=setTimeout(()=>{
    const d=getDayData(currentDate);
    // Spread existing sleep to preserve nap field
    d.sleep={...(d.sleep||{}),sleepTime:st,wakeTime:wt,notes:nt};
    queueDataSave();
    document.getElementById('sl-entry-status').textContent='Saved.';
    renderSleepMonth();
  },700);
}

function renderSleepEntry(){
  const lbl=document.getElementById('sleep-entry-date-lbl');if(lbl)lbl.textContent='Entry — '+fmtKey(currentDate);
  const day=getDayData(currentDate);
  const sl=day.sleep||{};
  setVal('sl-time',sl.sleepTime||'');setVal('sl-wake',sl.wakeTime||'');setVal('sl-notes',sl.notes||'');
  const hasNap=!!(sl.nap&&sl.nap.startTime&&sl.nap.endTime);
  let mainDur=0,napDur=0;
  if(sl.sleepTime&&sl.wakeTime)mainDur=calcSleepDur(hhmm2min(sl.sleepTime),hhmm2min(sl.wakeTime));
  if(hasNap)napDur=calcSleepDur(hhmm2min(sl.nap.startTime),hhmm2min(sl.nap.endTime));
  const totalDur=mainDur+napDur;
  const el=document.getElementById('sl-dur-display');if(el)el.textContent=totalDur>0?min2dur(totalDur):'—';
  const bd=document.getElementById('sl-dur-breakdown');
  if(bd){
    if(hasNap&&mainDur>0){bd.textContent=`${min2dur(mainDur)} sleep + ${min2dur(napDur)} nap`;bd.style.display='';}
    else{bd.style.display='none';}
  }
  const stEl=document.getElementById('sl-entry-status');if(stEl)stEl.textContent=(sl.sleepTime||hasNap)?'Entry loaded.':'No entry yet.';
  const pill=document.getElementById('sl-nap-pill');
  if(pill){
    if(hasNap){pill.textContent='Nap \u2713';pill.classList.add('has-nap');}
    else{pill.textContent='+ Nap';pill.classList.remove('has-nap');}
  }
}

function navSleepMonth(dir){
  sleepViewMonth+=dir;
  if(sleepViewMonth>12){sleepViewMonth=1;sleepViewYear++;}
  if(sleepViewMonth<1){sleepViewMonth=12;sleepViewYear--;}
  renderSleepMonth();
}

function goSleepNow(){const n=new Date();sleepViewYear=n.getFullYear();sleepViewMonth=n.getMonth()+1;renderSleepMonth();}

function getMonthEntries(){
  const dim=daysInMonth(sleepViewYear,sleepViewMonth);const entries=[];
  for(let d=1;d<=dim;d++){
    const k=buildKey(sleepViewYear,sleepViewMonth,d);const day=DATA[k];
    if(!day||!day.sleep)continue;
    const sl=day.sleep;
    const hasSleep=!!(sl.sleepTime&&sl.wakeTime);
    const hasNap=!!(sl.nap&&sl.nap.startTime&&sl.nap.endTime);
    if(!hasSleep&&!hasNap)continue;
    let sm=null,wm=null,mainDur=0;
    if(hasSleep){sm=hhmm2min(sl.sleepTime);wm=hhmm2min(sl.wakeTime);mainDur=calcSleepDur(sm,wm);}
    let napStartMin=null,napEndMin=null,napDur=0;
    if(hasNap){napStartMin=hhmm2min(sl.nap.startTime);napEndMin=hhmm2min(sl.nap.endTime);napDur=calcSleepDur(napStartMin,napEndMin);}
    entries.push({date:k,day:d,sleepMin:sm,wakeMin:wm,mainDur,napStartMin,napEndMin,napDur,dur:mainDur+napDur,notes:sl.notes||''});
  }
  return entries;
}

function renderSleepMonth(){
  const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const lbl=document.getElementById('sleep-month-label');if(lbl)lbl.textContent=`${mn[sleepViewMonth-1]} ${sleepViewYear}`;
  const entries=getMonthEntries();
  if(!entries.length){
    ['sm-avg-dur','sm-avg-sleep','sm-avg-wake','sm-total-sleep','sm-total-awake'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
  } else {
    const avgDur=entries.reduce((a,e)=>a+e.dur,0)/entries.length;
    const totSleep=entries.reduce((a,e)=>a+e.dur,0);
    const totAwake=entries.length*1440-totSleep;
    // avgSleep/avgWake use only main sleep episodes (not nap)
    const me=entries.filter(e=>e.sleepMin!=null);
    const avgSleep=me.length?circMean(me.map(e=>e.sleepMin)):null;
    const avgWake=me.length?circMean(me.map(e=>e.wakeMin)):null;
    setElText('sm-avg-dur',min2dur(Math.round(avgDur)));
    setElText('sm-avg-sleep',avgSleep!=null?hhmm2disp(min2hhmm(avgSleep)):'—');
    setElText('sm-avg-wake',avgWake!=null?hhmm2disp(min2hhmm(avgWake)):'—');
    setElText('sm-total-sleep',min2dur(totSleep));
    setElText('sm-total-awake',min2dur(totAwake));
  }
  renderDurationChart(entries);
  renderTimelineChart(entries);
  renderScatterChart(entries);
  renderSleepLogTable(entries);
}

/* ── Duration chart ── */
function renderDurationChart(entries){
  const canvas=document.getElementById('ch-duration');if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth-30;const H=170;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const cs=getComputedStyle(document.documentElement);
  const cT3=cs.getPropertyValue('--text3').trim();
  const cBd=cs.getPropertyValue('--border').trim();
  const cAc=cs.getPropertyValue('--accent').trim();
  const cAd=cs.getPropertyValue('--accent-dim').trim();
  const pad={top:18,right:18,bottom:34,left:42};
  const pw=W-pad.left-pad.right,ph=H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  if(!entries.length){ctx.fillStyle=cT3;ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('No data',W/2,H/2);return;}
  const dim=daysInMonth(sleepViewYear,sleepViewMonth);
  const maxD=Math.max(...entries.map(e=>e.dur),600);const minD=0;const rng=maxD-minD||60;
  const yTicks=[0,4*60,6*60,8*60,10*60,12*60].filter(t=>t<=maxD+120);
  ctx.strokeStyle=cBd;ctx.lineWidth=1;
  yTicks.forEach(t=>{
    const y=pad.top+ph-((t-minD)/rng)*ph;
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(pad.left+pw,y);ctx.stroke();
    ctx.fillStyle=cT3;ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText(Math.floor(t/60)+'h',pad.left-5,y+3);
  });
  ctx.fillStyle=cT3;ctx.font='9px monospace';ctx.textAlign='center';
  for(let d=1;d<=dim;d+=5){const x=pad.left+((d-1)/(dim-1||1))*pw;ctx.fillText(d,x,H-pad.bottom+13);}
  // Area fill
  ctx.beginPath();let first=true;
  for(const e of entries){const x=pad.left+((e.day-1)/(dim-1||1))*pw;const y=pad.top+ph-((e.dur-minD)/rng)*ph;first?ctx.moveTo(x,y):ctx.lineTo(x,y);first=false;}
  const le=entries[entries.length-1];const lx=pad.left+((le.day-1)/(dim-1||1))*pw;
  ctx.lineTo(lx,pad.top+ph);ctx.lineTo(pad.left+((entries[0].day-1)/(dim-1||1))*pw,pad.top+ph);ctx.closePath();ctx.fillStyle=cAd;ctx.fill();
  ctx.beginPath();first=true;
  for(const e of entries){const x=pad.left+((e.day-1)/(dim-1||1))*pw;const y=pad.top+ph-((e.dur-minD)/rng)*ph;first?ctx.moveTo(x,y):ctx.lineTo(x,y);first=false;}
  ctx.strokeStyle=cAc;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  for(const e of entries){const x=pad.left+((e.day-1)/(dim-1||1))*pw;const y=pad.top+ph-((e.dur-minD)/rng)*ph;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=cAc;ctx.fill();}
  canvas._d={entries,pad,pw,ph,dim,minD,rng};
}

/* ── Timeline chart ── */
function renderTimelineChart(entries){
  const container=document.getElementById('ch-timeline');if(!container)return;
  container.innerHTML='';
  const dim=daysInMonth(sleepViewYear,sleepViewMonth);
  const byDay={};entries.forEach(e=>{byDay[e.day]=e;});
  const cs=getComputedStyle(document.documentElement);
  const cBg=cs.getPropertyValue('--bg3').trim();const cAc=cs.getPropertyValue('--accent').trim();const cBd=cs.getPropertyValue('--border').trim();const cT3=cs.getPropertyValue('--text3').trim();
  const hdr=document.createElement('div');hdr.style.cssText='display:flex;margin-left:30px;margin-bottom:5px';
  for(let h=0;h<=24;h+=3){const d=document.createElement('div');d.style.cssText=`flex:3;font:9px monospace;color:${cT3};${h===0?'text-align:left':h===24?'text-align:right':'text-align:center'}`;d.textContent=h===0?'0:00':h===24?'24':h+':00';hdr.appendChild(d);}
  container.appendChild(hdr);
  for(let d=1;d<=dim;d++){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;margin-bottom:2px';
    const dl=document.createElement('div');dl.style.cssText=`width:26px;font:9px monospace;color:${cT3};text-align:right;padding-right:4px;flex-shrink:0`;dl.textContent=d;row.appendChild(dl);
    const track=document.createElement('div');track.style.cssText=`flex:1;height:11px;background:${cBg};border:1px solid ${cBd};border-radius:2px;position:relative;overflow:visible`;
    const e=byDay[d];
    if(e){
      const{sleepMin:sm,wakeMin:wm,napStartMin,napEndMin}=e;
      let title='';
      if(sm!=null&&wm!=null){
        if(wm>sm){track.appendChild(mkBlock((sm/1440)*100,((wm-sm)/1440)*100,cAc,0.85));}
        else{track.appendChild(mkBlock((sm/1440)*100,((1440-sm)/1440)*100,cAc,0.85));track.appendChild(mkBlock(0,(wm/1440)*100,cAc,0.85));}
        title=`${hhmm2disp(min2hhmm(sm))} → ${hhmm2disp(min2hhmm(wm))} (${min2dur(e.mainDur)})`;
      }
      if(napStartMin!=null&&napEndMin!=null){
        if(napEndMin>napStartMin){track.appendChild(mkBlock((napStartMin/1440)*100,((napEndMin-napStartMin)/1440)*100,cAc,0.55));}
        else{track.appendChild(mkBlock((napStartMin/1440)*100,((1440-napStartMin)/1440)*100,cAc,0.55));track.appendChild(mkBlock(0,(napEndMin/1440)*100,cAc,0.55));}
        const nl=`Nap: ${hhmm2disp(min2hhmm(napStartMin))} → ${hhmm2disp(min2hhmm(napEndMin))} (${min2dur(e.napDur)})`;
        title=title?`${title} + ${nl}`:nl;
      }
      if(title)track.title=title;
    }
    row.appendChild(track);container.appendChild(row);
  }
}
function mkBlock(l,w,c,op){const b=document.createElement('div');b.style.cssText=`position:absolute;top:0;height:100%;left:${l}%;width:${w}%;background:${c};opacity:${op!=null?op:.85};border-radius:1px`;return b;}

/* ── Scatter chart ── */
function renderScatterChart(entries){
  const canvas=document.getElementById('ch-scatter');if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth-30;const H=310;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const cs=getComputedStyle(document.documentElement);
  const cT3=cs.getPropertyValue('--text3').trim();const cT2=cs.getPropertyValue('--text2').trim();
  const cBd=cs.getPropertyValue('--border').trim();const cAc=cs.getPropertyValue('--accent').trim();
  const pad={top:18,right:18,bottom:48,left:52};
  const pw=W-pad.left-pad.right,ph=H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);
  if(!entries.length){ctx.fillStyle=cT3;ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('No data',W/2,H/2);return;}
  const ticks=[0,3,6,9,12,15,18,21,24].map(h=>h*60);
  ctx.strokeStyle=cBd;ctx.lineWidth=1;
  ticks.forEach(t=>{
    if(t>1440)return;
    ctx.beginPath();ctx.moveTo(pad.left+(t/1440)*pw,pad.top);ctx.lineTo(pad.left+(t/1440)*pw,pad.top+ph);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pad.left,pad.top+(t/1440)*ph);ctx.lineTo(pad.left+pw,pad.top+(t/1440)*ph);ctx.stroke();
    const hs=t===0?'0:00':t===1440?'24':Math.floor(t/60)+':00';
    ctx.fillStyle=cT3;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(hs,pad.left+(t/1440)*pw,pad.top+ph+13);
    ctx.textAlign='right';ctx.fillText(hs,pad.left-5,pad.top+(t/1440)*ph+3);
  });
  ctx.fillStyle=cT2;ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('Wake Time →',pad.left+pw/2,H-8);
  ctx.save();ctx.translate(12,pad.top+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText('Sleep Time →',0,0);ctx.restore();
  // Main sleep points
  for(const e of entries){
    if(e.sleepMin==null||e.wakeMin==null)continue;
    const x=pad.left+(e.wakeMin/1440)*pw;const y=pad.top+(e.sleepMin/1440)*ph;
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=cAc;ctx.fill();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;ctx.stroke();
  }
  // Nap points — smaller and more transparent, separate episode
  const napEntries=entries.filter(e=>e.napStartMin!=null&&e.napEndMin!=null);
  ctx.globalAlpha=0.45;
  for(const e of napEntries){
    const x=pad.left+(e.napEndMin/1440)*pw;const y=pad.top+(e.napStartMin/1440)*ph;
    ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=cAc;ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=0.8;ctx.stroke();
  }
  ctx.globalAlpha=1;
  canvas._sc={entries,napEntries,pad,pw,ph};
}

/* ── Sleep log table ── */
function renderSleepLogTable(entries){
  const tbody=document.getElementById('sl-log-body');if(!tbody)return;
  tbody.innerHTML='';
  if(!entries.length){const tr=document.createElement('tr');tr.innerHTML='<td colspan="6" style="text-align:center;color:var(--text3);padding:20px">No entries this month.</td>';tbody.appendChild(tr);return;}
  entries.forEach(e=>{
    const tr=document.createElement('tr');const dh=e.dur/60;
    const dc=dh>=7&&dh<=9?'dur-good':dh<6?'dur-short':'dur-long';
    const sleepDisp=e.sleepMin!=null?hhmm2disp(min2hhmm(e.sleepMin)):'—';
    const wakeDisp=e.wakeMin!=null?hhmm2disp(min2hhmm(e.wakeMin)):'—';
    const napDisp=e.napStartMin!=null&&e.napEndMin!=null?`${hhmm2disp(min2hhmm(e.napStartMin))}–${hhmm2disp(min2hhmm(e.napEndMin))}`:'—';
    tr.innerHTML=`<td>${fmtKey(e.date)}</td><td>${sleepDisp}</td><td>${wakeDisp}</td><td class="${dc}">${min2dur(e.dur)}</td><td style="color:var(--text3)">${napDisp}</td><td style="color:var(--text3)">${e.notes||'—'}</td>`;
    tbody.appendChild(tr);
  });
}

/* ── Nap modal ── */
const MN={
  open(){
    const day=getDayData(currentDate);
    const nap=(day.sleep&&day.sleep.nap)||{};
    setVal('mn-start',nap.startTime||'');setVal('mn-end',nap.endTime||'');
    const hasNap=!!(nap.startTime&&nap.endTime);
    const rmBtn=document.getElementById('mn-remove');if(rmBtn)rmBtn.style.display=hasNap?'':'none';
    document.getElementById('modal-nap').classList.add('open');
    setTimeout(()=>document.getElementById('mn-start').focus(),50);
  },
  cancel(){document.getElementById('modal-nap').classList.remove('open');}
};

function openNapModal(){MN.open();}

function saveNap(){
  const stEl=document.getElementById('mn-start');
  const etEl=document.getElementById('mn-end');
  if(!stEl.value||!etEl.value){
    [stEl,etEl].forEach(el=>{if(!el.value){el.style.outline='2px solid var(--red)';setTimeout(()=>{el.style.outline='';},1200);}});
    return;
  }
  const day=getDayData(currentDate);
  if(!day.sleep)day.sleep={sleepTime:'',wakeTime:'',notes:''};
  day.sleep.nap={startTime:stEl.value,endTime:etEl.value};
  queueDataSave();
  MN.cancel();
  renderSleepEntry();
  renderSleepMonth();
}

function removeNap(){
  const day=getDayData(currentDate);
  if(day.sleep)delete day.sleep.nap;
  queueDataSave();
  MN.cancel();
  renderSleepEntry();
  renderSleepMonth();
}

/* ── Chart tooltips (set up once DOM is ready) ── */
function initSleepTooltips(){
  let tp=null;
  document.getElementById('ch-duration').addEventListener('mousemove',function(ev){
    if(!this._d)return;const r=this.getBoundingClientRect();const mx=ev.clientX-r.left,my=ev.clientY-r.top;
    const{entries,pad,pw,ph,dim,minD,rng}=this._d;let nr=null,md=18;
    for(const e of entries){const x=pad.left+((e.day-1)/(dim-1||1))*pw;const y=pad.top+ph-((e.dur-minD)/rng)*ph;const d=Math.hypot(mx-x,my-y);if(d<md){md=d;nr=e;}}
    if(!tp){tp=document.createElement('div');tp.style.cssText='position:fixed;pointer-events:none;background:#1e1e24;border:1px solid #3a3a45;border-radius:6px;padding:4px 9px;font:11px monospace;color:#e8e8ec;z-index:9999;display:none';document.body.appendChild(tp);}
    if(nr){tp.style.display='block';tp.style.left=(ev.clientX+12)+'px';tp.style.top=(ev.clientY-20)+'px';tp.textContent=`Day ${nr.day} — ${min2dur(nr.dur)}`;}else tp.style.display='none';
  });
  document.getElementById('ch-duration').addEventListener('mouseleave',function(){if(tp)tp.style.display='none';});

  let tp2=null;
  document.getElementById('ch-scatter').addEventListener('mousemove',function(ev){
    if(!this._sc)return;const r=this.getBoundingClientRect();const mx=ev.clientX-r.left,my=ev.clientY-r.top;
    const{entries,napEntries,pad,pw,ph}=this._sc;let nr=null,md=18,isNap=false;
    for(const e of entries){
      if(e.sleepMin==null||e.wakeMin==null)continue;
      const x=pad.left+(e.wakeMin/1440)*pw;const y=pad.top+(e.sleepMin/1440)*ph;const d=Math.hypot(mx-x,my-y);if(d<md){md=d;nr=e;isNap=false;}
    }
    for(const e of napEntries){
      const x=pad.left+(e.napEndMin/1440)*pw;const y=pad.top+(e.napStartMin/1440)*ph;const d=Math.hypot(mx-x,my-y);if(d<md){md=d;nr=e;isNap=true;}
    }
    if(!tp2){tp2=document.createElement('div');tp2.style.cssText='position:fixed;pointer-events:none;background:#1e1e24;border:1px solid #3a3a45;border-radius:6px;padding:5px 9px;font:11px monospace;color:#e8e8ec;z-index:9999;display:none;line-height:1.6';document.body.appendChild(tp2);}
    if(nr){
      tp2.style.display='block';tp2.style.left=(ev.clientX+12)+'px';tp2.style.top=(ev.clientY-30)+'px';
      if(isNap){tp2.innerHTML=`<b>${fmtKey(nr.date)}</b><br>Nap: ${hhmm2disp(min2hhmm(nr.napStartMin))} → ${hhmm2disp(min2hhmm(nr.napEndMin))}<br>Dur: ${min2dur(nr.napDur)}`;}
      else{tp2.innerHTML=`<b>${fmtKey(nr.date)}</b><br>Sleep: ${hhmm2disp(min2hhmm(nr.sleepMin))}<br>Wake: ${hhmm2disp(min2hhmm(nr.wakeMin))}<br>Dur: ${min2dur(nr.mainDur)}`;}
    } else tp2.style.display='none';
  });
  document.getElementById('ch-scatter').addEventListener('mouseleave',function(){if(tp2)tp2.style.display='none';});
}
