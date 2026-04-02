/* ═══════════════════════════════════════════════════════
   modules.js — Generic module/tab rendering and helpers
═══════════════════════════════════════════════════════ */

function buildGenericPanels(){
  const container=document.getElementById('generic-panels-container');
  container.innerHTML='';
  (CFG.tabs||[]).filter(t=>t.type==='generic'&&!t.hidden).forEach(tab=>{
    const panel=document.createElement('div');
    panel.className='tab-panel';
    panel.id='panel-'+tab.id;
    const wrap=document.createElement('div');
    wrap.className='page-wrap';
    panel.appendChild(wrap);
    const mod=CFG.genericModules?.[tab.id]||{sections:[]};
    (mod.sections||[]).filter(s=>!s.hidden).forEach(sec=>{
      const card=document.createElement('div');
      card.className='card generic-module';
      card.innerHTML=`
        <div class="card-header" onclick="toggleCard('gm-${tab.id}-${sec.id}')">
          <div class="card-title"><div class="card-title-dot"></div>${sec.name}</div>
          <span class="card-toggle open" id="caret-gm-${tab.id}-${sec.id}">▾</span>
        </div>
        <div class="card-body" id="body-gm-${tab.id}-${sec.id}">
          ${sec.description?`<p class="help-text" style="margin-bottom:11px">${sec.description}</p>`:''}
          <div id="gm-fields-${tab.id}-${sec.id}"></div>
        </div>`;
      wrap.appendChild(card);
      renderGenericFieldsFor(tab.id,sec,card.querySelector('#gm-fields-'+tab.id+'-'+sec.id));
    });
    container.appendChild(panel);
  });
}

function renderGenericFieldsFor(tabId,sec,container){
  container.innerHTML='';
  (sec.fields||[]).forEach(field=>{
    const day=getDayData(currentDate);
    if(!day.generic)day.generic={};
    if(!day.generic[sec.id])day.generic[sec.id]={};
    const val=day.generic[sec.id][field.id]||'';
    const wrap=document.createElement('div');
    wrap.className='gm-field-row';
    const lbl=document.createElement('span');
    lbl.className='field-label';lbl.style.display='block';lbl.style.marginBottom='5px';
    lbl.textContent=field.label;
    wrap.appendChild(lbl);
    let input;
    const onChange=(v)=>{
      const day=getDayData(currentDate);
      if(!day.generic)day.generic={};if(!day.generic[sec.id])day.generic[sec.id]={};
      day.generic[sec.id][field.id]=v;queueDataSave();
    };
    if(field.type==='text'){
      input=document.createElement('input');input.type='text';input.value=val;input.placeholder=field.placeholder||'';
      input.oninput=()=>onChange(input.value);
    } else if(field.type==='textarea'){
      input=document.createElement('textarea');input.value=val;input.placeholder=field.placeholder||'';
      input.oninput=()=>onChange(input.value);
    } else if(field.type==='checkbox'){
      const label=document.createElement('label');label.className='chk'+(val?' on':'');
      label.innerHTML=`<input type="checkbox" ${val?'checked':''}><div class="chk-box"><div class="chk-tick"></div></div><span class="chk-lbl">${field.label}</span>`;
      const inp=label.querySelector('input');
      inp.onchange=()=>{label.classList.toggle('on',inp.checked);onChange(inp.checked);};
      wrap.innerHTML='';wrap.appendChild(label);container.appendChild(wrap);return;
    } else if(field.type==='number'){
      input=document.createElement('input');input.type='number';input.value=val;input.placeholder=field.placeholder||'0';
      input.oninput=()=>onChange(input.value);
    } else if(field.type==='date'){
      input=document.createElement('input');input.type='date';input.value=val;
      input.oninput=()=>onChange(input.value);
    } else if(field.type==='select'){
      input=document.createElement('select');
      const opts=(field.options||[]).map(o=>o.trim()).filter(Boolean);
      input.innerHTML='<option value="">—</option>'+opts.map(o=>`<option${val===o?' selected':''}>${o}</option>`).join('');
      input.onchange=()=>onChange(input.value);
    } else if(field.type==='progress'){
      const pv=parseFloat(val)||0;
      wrap.innerHTML=`<span class="field-label" style="display:block;margin-bottom:5px">${field.label}</span>
        <div class="progress-field-wrap">
          <input type="number" min="0" max="100" step="1" value="${pv}" style="width:70px">
          <div class="progress-field-bar"><div class="progress-field-fill" style="width:${pv}%"></div></div>
          <span class="help-text">${pv}%</span>
        </div>`;
      const ni=wrap.querySelector('input');const fill=wrap.querySelector('.progress-field-fill');const sp=wrap.querySelector('span.help-text');
      ni.oninput=()=>{const nv=Math.min(100,Math.max(0,parseFloat(ni.value)||0));fill.style.width=nv+'%';sp.textContent=nv+'%';onChange(String(nv));};
      container.appendChild(wrap);return;
    }
    if(input) wrap.appendChild(input);
    container.appendChild(wrap);
  });
}

function renderGenericSectionsData(){
  (CFG.tabs||[]).filter(t=>t.type==='generic').forEach(tab=>{
    const mod=CFG.genericModules?.[tab.id]||{};
    (mod.sections||[]).forEach(sec=>{
      const cont=document.getElementById('gm-fields-'+tab.id+'-'+sec.id);
      if(cont) renderGenericFieldsFor(tab.id,sec,cont);
    });
  });
}
