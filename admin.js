/* ═══════════════════════════════════════════════════════
   admin.js — Admin / Customize panel rendering and controls
═══════════════════════════════════════════════════════ */

function switchAdminTab(name){
  const ids=['structure','sections','goals','labels','backup','appearance'];
  document.querySelectorAll('.admin-tab').forEach((b,i)=>{b.classList.toggle('active',ids[i]===name);});
  document.querySelectorAll('.admin-content-section').forEach(s=>s.classList.remove('active'));
  const p=document.getElementById('admin-'+name+'-panel');if(p)p.classList.add('active');
}

function renderAdminPanel(){
  renderAdminTabList();renderAdminPlannerSections();renderAdminGenTabSelect();
  renderAdminGoalGroupsList();renderAdminGoalsList();renderAdminLabelsList();renderAdminAppearance();
}

function resetSettings(){CFG=buildDefaultCFG();saveSettingsNow();init();}

/* ─── Tab list ─── */
function renderAdminTabList(){
  const list=document.getElementById('admin-tab-list');if(!list)return;
  list.innerHTML='';
  (CFG.tabs||[]).forEach((tab,i)=>{
    const row=document.createElement('div');row.className='admin-row';
    const isBuiltin=tab.type==='builtin'||tab.protected;
    row.innerHTML=`
      <span class="admin-row-label">${tab.label}</span>
      <span class="admin-row-meta badge">${tab.type}</span>
      ${tab.hidden?'<span class="badge red">hidden</span>':'<span class="badge green">visible</span>'}
      <button class="btn btn-sm" onclick="adminRenameTab('${tab.id}')">Rename</button>
      <button class="btn btn-sm" onclick="adminToggleTabHidden('${tab.id}')">${tab.hidden?'Show':'Hide'}</button>
      ${isBuiltin?'':'<button class="btn btn-sm btn-danger" onclick="adminDeleteTab(\''+tab.id+'\')">Delete</button>'}`;
    list.appendChild(row);
    const mv=document.createElement('div');mv.style.display='flex';mv.style.gap='3px';
    const up=document.createElement('button');up.className='btn btn-icon btn-sm';up.textContent='\u2191';up.onclick=()=>{if(i>0){[CFG.tabs[i-1],CFG.tabs[i]]=[CFG.tabs[i],CFG.tabs[i-1]];queueSettingsSave();renderAdminTabList();renderTabBar();}};
    const dn=document.createElement('button');dn.className='btn btn-icon btn-sm';dn.textContent='\u2193';dn.onclick=()=>{if(i<CFG.tabs.length-1){[CFG.tabs[i],CFG.tabs[i+1]]=[CFG.tabs[i+1],CFG.tabs[i]];queueSettingsSave();renderAdminTabList();renderTabBar();}};
    mv.appendChild(up);mv.appendChild(dn);row.appendChild(mv);
  });
}

function adminAddTab(){
  MP.open('New Tab Name','Enter a name for the new tab','New Tab',name=>{
    if(!name.trim())return;
    const id='tab_'+Date.now();
    CFG.tabs.push({id,label:name.trim(),type:'generic',hidden:false});
    if(!CFG.genericModules)CFG.genericModules={};
    CFG.genericModules[id]={sections:[]};
    queueSettingsSave();renderTabBar();buildGenericPanels();renderAdminTabList();
  });
}
function adminRenameTab(id){
  const tab=CFG.tabs.find(t=>t.id===id);if(!tab)return;
  MP.open('Rename Tab','Enter new name',tab.label,name=>{if(name.trim()){tab.label=name.trim();queueSettingsSave();renderTabBar();renderAdminTabList();}});
}
function adminToggleTabHidden(id){
  const tab=CFG.tabs.find(t=>t.id===id);if(!tab)return;
  tab.hidden=!tab.hidden;queueSettingsSave();renderTabBar();renderAdminTabList();buildGenericPanels();
}
function adminDeleteTab(id){
  MC.open('Delete Tab','This will permanently remove the tab and all its sections (NOT your logged data).',()=>{
    CFG.tabs=CFG.tabs.filter(t=>t.id!==id);
    if(CFG.genericModules)delete CFG.genericModules[id];
    queueSettingsSave();renderTabBar();buildGenericPanels();renderAdminTabList();renderAdminSectionsList(null);
  });
}

/* ─── Planner Sections ─── */
function renderAdminPlannerSections(){
  const list=document.getElementById('admin-planner-sections-list');if(!list)return;
  list.innerHTML='';
  const secs=(CFG.sections||[]).sort((a,b)=>(a.order||0)-(b.order||0));
  secs.forEach((sec,i)=>{
    const row=document.createElement('div');row.className='admin-row';
    row.innerHTML=`
      <span class="admin-row-label">${L('sec.'+sec.id,sec.title)}</span>
      <span class="badge${sec.protected?' accent':''}">${sec.protected?'protected':'configurable'}</span>
      ${sec.visible===false?'<span class="badge red">hidden</span>':'<span class="badge green">visible</span>'}
      <span class="badge">${sec.width||'full'}</span>
      ${!sec.protected?'<button class="btn btn-sm" onclick="adminToggleSectionVis(\''+sec.id+'\')">'+((sec.visible===false)?'Show':'Hide')+'</button>':''}
      <button class="btn btn-sm" onclick="adminCycleSectionWidth('${sec.id}')">Width</button>`;
    const mv=document.createElement('div');mv.style.cssText='display:flex;gap:3px';
    const up=document.createElement('button');up.className='btn btn-icon btn-sm';up.textContent='\u2191';up.onclick=()=>{if(i>0){const t=secs[i-1].order;secs[i-1].order=secs[i].order;secs[i].order=t;queueSettingsSave();renderAdminPlannerSections();}};
    const dn=document.createElement('button');dn.className='btn btn-icon btn-sm';dn.textContent='\u2193';dn.onclick=()=>{if(i<secs.length-1){const t=secs[i+1].order;secs[i+1].order=secs[i].order;secs[i].order=t;queueSettingsSave();renderAdminPlannerSections();}};
    mv.appendChild(up);mv.appendChild(dn);row.appendChild(mv);
    list.appendChild(row);
  });
}
function adminToggleSectionVis(id){
  const sec=(CFG.sections||[]).find(s=>s.id===id);if(!sec||sec.protected)return;
  sec.visible=sec.visible===false?true:false;
  queueSettingsSave();renderAdminPlannerSections();applySectionVisibility();
}
function adminCycleSectionWidth(id){
  const sec=(CFG.sections||[]).find(s=>s.id===id);if(!sec)return;
  const w=['full','half','third'];const c=w.indexOf(sec.width||'full');
  sec.width=w[(c+1)%w.length];queueSettingsSave();renderAdminPlannerSections();
}

/* ─── Generic Tab Sections ─── */
let adminSelectedGenTabId=null;
function renderAdminGenTabSelect(){
  const sel=document.getElementById('admin-gen-tab-select');if(!sel)return;
  sel.innerHTML='<option value="">\u2014 select tab \u2014</option>';
  (CFG.tabs||[]).filter(t=>t.type==='generic').forEach(t=>{
    const o=document.createElement('option');o.value=t.id;o.textContent=t.label;
    if(t.id===adminSelectedGenTabId)o.selected=true;sel.appendChild(o);
  });
  if(adminSelectedGenTabId) renderAdminSectionsList(adminSelectedGenTabId);
}
function adminSelectGenTab(id){
  adminSelectedGenTabId=id||null;
  document.getElementById('admin-add-section-btn').style.display=id?'':'none';
  renderAdminSectionsList(id);
}

/* ─── Generic Section list ─── */
function renderAdminSectionsList(tabId){
  const list=document.getElementById('admin-sections-list');if(!list)return;
  if(!tabId){list.innerHTML='<p class="help-text">Select a generic tab above to manage its sections.</p>';return;}
  const mod=CFG.genericModules?.[tabId]||{sections:[]};
  if(!CFG.genericModules)CFG.genericModules={};
  if(!CFG.genericModules[tabId])CFG.genericModules[tabId]={sections:[]};
  list.innerHTML='';
  if(!mod.sections.length){list.innerHTML='<p class="help-text">No sections yet. Add one above.</p>';return;}
  mod.sections.forEach((sec,i)=>{
    const row=document.createElement('div');row.className='admin-row';row.style.flexWrap='wrap';
    row.innerHTML=`
      <span class="admin-row-label">${sec.name}</span>
      <span class="admin-row-meta badge">${(sec.fields||[]).length} field${(sec.fields||[]).length!==1?'s':''}</span>
      ${sec.hidden?'<span class="badge red">hidden</span>':'<span class="badge green">visible</span>'}
      <button class="btn btn-sm" onclick="adminRenameSection('${tabId}','${sec.id}')">Rename</button>
      <button class="btn btn-sm" onclick="adminEditSectionDesc('${tabId}','${sec.id}')">Description</button>
      <button class="btn btn-sm" onclick="adminToggleSectionHidden('${tabId}','${sec.id}')">${sec.hidden?'Show':'Hide'}</button>
      <button class="btn btn-sm btn-accent" onclick="adminAddField('${tabId}','${sec.id}')">+ Field</button>
      <button class="btn btn-sm btn-danger" onclick="adminDeleteSection('${tabId}','${sec.id}')">Delete</button>`;
    if((sec.fields||[]).length){
      const fp=document.createElement('div');fp.style.cssText='width:100%;display:flex;flex-wrap:wrap;gap:5px;padding:8px 0 0 0';
      sec.fields.forEach((f,fi)=>{
        const p=document.createElement('span');p.className='badge';p.style.cursor='pointer';p.title='Click to delete';
        p.textContent=`${f.label} (${f.type})`;
        p.onclick=()=>MC.open('Delete Field',`Remove field "${f.label}"?`,()=>{sec.fields.splice(fi,1);queueSettingsSave();buildGenericPanels();renderAdminSectionsList(tabId);});
        fp.appendChild(p);
      });
      row.appendChild(fp);
    }
    list.appendChild(row);
  });
}
function adminAddSection(){
  if(!adminSelectedGenTabId)return;
  MP.open('New Section Name','Enter a name for the new section','',name=>{
    if(!name.trim())return;
    const id='sec_'+Date.now();
    if(!CFG.genericModules[adminSelectedGenTabId])CFG.genericModules[adminSelectedGenTabId]={sections:[]};
    CFG.genericModules[adminSelectedGenTabId].sections.push({id,name:name.trim(),description:'',hidden:false,fields:[]});
    queueSettingsSave();buildGenericPanels();renderAdminSectionsList(adminSelectedGenTabId);
  });
}
function adminRenameSection(tabId,secId){
  const sec=CFG.genericModules?.[tabId]?.sections.find(s=>s.id===secId);if(!sec)return;
  MP.open('Rename Section','New name',sec.name,name=>{if(name.trim()){sec.name=name.trim();queueSettingsSave();buildGenericPanels();renderAdminSectionsList(tabId);}});
}
function adminEditSectionDesc(tabId,secId){
  const sec=CFG.genericModules?.[tabId]?.sections.find(s=>s.id===secId);if(!sec)return;
  MP.open('Section Description','Help text shown below section title',sec.description||'',desc=>{sec.description=desc;queueSettingsSave();buildGenericPanels();renderAdminSectionsList(tabId);});
}
function adminToggleSectionHidden(tabId,secId){
  const sec=CFG.genericModules?.[tabId]?.sections.find(s=>s.id===secId);if(!sec)return;
  sec.hidden=!sec.hidden;queueSettingsSave();buildGenericPanels();renderAdminSectionsList(tabId);
}
function adminDeleteSection(tabId,secId){
  MC.open('Delete Section','Removes this section and all its fields (NOT your logged data).',()=>{
    if(CFG.genericModules?.[tabId])CFG.genericModules[tabId].sections=CFG.genericModules[tabId].sections.filter(s=>s.id!==secId);
    queueSettingsSave();buildGenericPanels();renderAdminSectionsList(tabId);
  });
}
function adminAddField(tabId,secId){MAF.open(tabId,secId);}

/* ─── Goal Groups ─── */
function renderAdminGoalGroupsList(){
  const list=document.getElementById('admin-goal-groups-list');if(!list)return;
  list.innerHTML='';
  const groups=(CFG.goalGroups||[]).sort((a,b)=>(a.order||0)-(b.order||0));
  if(!groups.length){list.innerHTML='<p class="help-text">No goal groups yet.</p>';return;}
  groups.forEach((g,i)=>{
    const gc=(CFG.goals||[]).filter(gl=>gl.groupId===g.id).length;
    const row=document.createElement('div');row.className='admin-row';
    row.innerHTML=`
      <span class="admin-row-label">${g.title}</span>
      <span class="admin-row-meta">${gc} goal${gc!==1?'s':''}</span>
      ${g.visible===false?'<span class="badge red">hidden</span>':'<span class="badge green">visible</span>'}
      <button class="btn btn-sm" onclick="adminEditGoalGroup('${g.id}')">Rename</button>
      <button class="btn btn-sm" onclick="adminToggleGoalGroupVis('${g.id}')">${g.visible===false?'Show':'Hide'}</button>
      <button class="btn btn-sm btn-danger" onclick="adminDeleteGoalGroup('${g.id}')">Delete</button>`;
    const mv=document.createElement('div');mv.style.cssText='display:flex;gap:3px';
    const up=document.createElement('button');up.className='btn btn-icon btn-sm';up.textContent='\u2191';up.onclick=()=>{if(i>0){const t=groups[i-1].order;groups[i-1].order=groups[i].order;groups[i].order=t;queueSettingsSave();renderAdminGoalGroupsList();}};
    const dn=document.createElement('button');dn.className='btn btn-icon btn-sm';dn.textContent='\u2193';dn.onclick=()=>{if(i<groups.length-1){const t=groups[i+1].order;groups[i+1].order=groups[i].order;groups[i].order=t;queueSettingsSave();renderAdminGoalGroupsList();}};
    mv.appendChild(up);mv.appendChild(dn);row.appendChild(mv);
    list.appendChild(row);
  });
}
function adminAddGoalGroup(){
  MP.open('New Goal Group','Enter group name','',name=>{
    if(!name.trim())return;
    const id='grp_'+Date.now();const mx=Math.max(0,...(CFG.goalGroups||[]).map(g=>g.order||0));
    CFG.goalGroups.push({id,title:name.trim(),description:'',order:mx+1,visible:true});
    queueSettingsSave();renderAdminGoalGroupsList();
  });
}
function adminEditGoalGroup(id){
  const g=(CFG.goalGroups||[]).find(x=>x.id===id);if(!g)return;
  MP.open('Rename Group','New name',g.title,name=>{if(name.trim()){g.title=name.trim();queueSettingsSave();renderAdminGoalGroupsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');}});
}
function adminToggleGoalGroupVis(id){
  const g=(CFG.goalGroups||[]).find(x=>x.id===id);if(!g)return;
  g.visible=g.visible===false?true:false;
  queueSettingsSave();renderAdminGoalGroupsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
}
function adminDeleteGoalGroup(id){
  const gc=(CFG.goals||[]).filter(g=>g.groupId===id).length;
  MC.open('Delete Group',gc?`This group has ${gc} goal(s). They will be moved to General.`:'Delete this empty group?',()=>{
    if(gc)(CFG.goals||[]).filter(g=>g.groupId===id).forEach(g=>{g.groupId='general';});
    CFG.goalGroups=CFG.goalGroups.filter(g=>g.id!==id);
    queueSettingsSave();renderAdminGoalGroupsList();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
  });
}

/* ─── Goals list ─── */
function renderAdminGoalsList(){
  const list=document.getElementById('admin-goals-list');if(!list)return;
  list.innerHTML='';
  const groups=(CFG.goalGroups||[]).sort((a,b)=>(a.order||0)-(b.order||0));
  const goals=(CFG.goals||[]).sort((a,b)=>(a.order||0)-(b.order||0));
  groups.forEach(group=>{
    const gg=goals.filter(g=>g.groupId===group.id);if(!gg.length)return;
    const hdr=document.createElement('div');hdr.className='label-group-title';hdr.textContent=group.title;list.appendChild(hdr);
    gg.forEach((g,i)=>list.appendChild(makeGoalRow(g,i,gg)));
  });
  const ung=goals.filter(g=>!groups.find(gr=>gr.id===g.groupId));
  if(ung.length){const hdr=document.createElement('div');hdr.className='label-group-title';hdr.style.color='var(--text3)';hdr.textContent='Ungrouped';list.appendChild(hdr);ung.forEach((g,i)=>list.appendChild(makeGoalRow(g,i,ung)));}
  if(!goals.length) list.innerHTML='<p class="help-text">No goals defined yet.</p>';
}
function makeGoalRow(g,i,arr){
  const row=document.createElement('div');row.className='admin-row';
  row.innerHTML=`
    <span class="admin-row-label">${g.title}</span>
    ${g.active===false?'<span class="badge red">inactive</span>':'<span class="badge green">active</span>'}
    ${g.visible===false?'<span class="badge red">hidden</span>':''}
    <button class="btn btn-sm" onclick="adminEditGoal('${g.id}')">Edit</button>
    <button class="btn btn-sm" onclick="adminToggleGoalActive('${g.id}')">${g.active===false?'Activate':'Deactivate'}</button>
    <button class="btn btn-sm btn-danger" onclick="adminDeleteGoal('${g.id}')">Delete</button>`;
  const mv=document.createElement('div');mv.style.cssText='display:flex;gap:3px';
  const up=document.createElement('button');up.className='btn btn-icon btn-sm';up.textContent='\u2191';up.onclick=()=>{if(i>0){const t=arr[i-1].order;arr[i-1].order=arr[i].order;arr[i].order=t;queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');}};
  const dn=document.createElement('button');dn.className='btn btn-icon btn-sm';dn.textContent='\u2193';dn.onclick=()=>{if(i<arr.length-1){const t=arr[i+1].order;arr[i+1].order=arr[i].order;arr[i].order=t;queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');}};
  mv.appendChild(up);mv.appendChild(dn);row.appendChild(mv);
  return row;
}
function adminAddGoal(){
  MP.open('New Goal','Enter goal name','',name=>{
    if(!name.trim())return;
    const id='goal_'+Date.now();const mx=Math.max(0,...(CFG.goals||[]).map(g=>g.order||0));
    const dg=(CFG.goalGroups||[])[0]?.id||'general';
    CFG.goals.push({id,title:name.trim(),groupId:dg,description:'',active:true,visible:true,order:mx+1});
    queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
  });
}
function adminEditGoal(id){
  const g=(CFG.goals||[]).find(x=>x.id===id);if(!g)return;
  MP.open('Edit Goal Title','',g.title,title=>{
    if(!title.trim())return;g.title=title.trim();
    MP.open('Goal Description','Help text shown when selected',g.description||'',desc=>{
      g.description=desc;
      const grpOpts=(CFG.goalGroups||[]).map(gr=>gr.title).join(', ');
      MP.open('Assign to Group','Available: '+grpOpts,(CFG.goalGroups||[]).find(gr=>gr.id===g.groupId)?.title||'',grpName=>{
        if(grpName.trim()){const grp=(CFG.goalGroups||[]).find(gr=>gr.title.toLowerCase()===grpName.trim().toLowerCase());if(grp)g.groupId=grp.id;}
        queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
      });
    });
  });
}
function adminToggleGoalActive(id){
  const g=(CFG.goals||[]).find(x=>x.id===id);if(!g)return;
  g.active=g.active===false?true:false;
  queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
}
function adminDeleteGoal(id){
  MC.open('Delete Goal','Remove this goal? Logged data referencing it remains.',()=>{
    CFG.goals=CFG.goals.filter(g=>g.id!==id);
    queueSettingsSave();renderAdminGoalsList();buildGoalDropdown(getDayData(currentDate).goal?.category||'');
  });
}

/* ─── Labels list ─── */
function renderAdminLabelsList(){
  const list=document.getElementById('admin-labels-list');if(!list)return;
  list.innerHTML='';
  const cats={
    'Tab Titles':{'tab.planner':'Planner tab','tab.sleep':'Sleep tab','tab.admin':'Admin tab'},
    'Section Titles':{'sec.baseline':'Baseline Checklist','sec.goal':'Core Goal Progress','sec.software':'Software Mastery Block','sec.week':'Weekly Review','sec.salvage':'Salvage Mode'},
    'Section Help Text':{'help.software':'Software help','help.week':'Review help','help.salvage':'Salvage help','help.baseline':'Baseline help','help.goal':'Goal help'},
    'Status Messages':{'status.miss':'Miss','status.solid':'Solid','status.win':'Win','status.ideal':'Ideal','status.salvage':'Salvage'},
    'Salvage UI':{'salvage.banner':'Banner text','salvage.toggle':'Toggle label'}
  };
  (CFG.tabs||[]).filter(t=>t.type==='generic').forEach(t=>{
    if(!cats['Custom Tab Titles'])cats['Custom Tab Titles']={};
    cats['Custom Tab Titles']['tab.'+t.id]=t.label+' tab';
  });
  Object.entries(cats).forEach(([cn,labels])=>{
    const grp=document.createElement('div');grp.className='label-group';
    const title=document.createElement('div');title.className='label-group-title';title.textContent=cn;grp.appendChild(title);
    Object.entries(labels).forEach(([key,desc])=>{
      const row=document.createElement('div');row.className='label-row';
      const k=document.createElement('span');k.className='label-key';k.textContent=desc;
      const inp=document.createElement('input');inp.type='text';inp.value=(CFG.labels||{})[key]||'';
      inp.placeholder=buildDefaultCFG().labels[key]||key;
      inp.oninput=()=>{if(!CFG.labels)CFG.labels={};CFG.labels[key]=inp.value;queueSettingsSave();applyLabels();renderTabBar();};
      row.appendChild(k);row.appendChild(inp);grp.appendChild(row);
    });
    list.appendChild(grp);
  });
}
function adminResetLabels(){
  MC.open('Restore Default Labels','Reset all labels to defaults?',()=>{
    CFG.labels=buildDefaultCFG().labels;queueSettingsSave();renderAdminLabelsList();applyLabels();renderTabBar();
  });
}

/* ─── Appearance panel ─── */
function renderAdminAppearance(){
  const inp=document.getElementById('admin-app-title');if(inp)inp.value=CFG.appTitle||'Operator';
  const ds=document.getElementById('admin-density');if(ds)ds.value=(CFG.appearance||{}).density||'normal';
  const fs=document.getElementById('admin-font-scale');if(fs)fs.value=(CFG.appearance||{}).fontScale||'normal';
  const pk=document.getElementById('accent-picker');
  if(pk){
    pk.innerHTML='';
    const accents=['#c8a96e','#e0c48a','#5a9a78','#5a7aa0','#c05c5c','#8a72c0','#c08060','#60a0a0'];
    const cur=(CFG.appearance||{}).accent||'#c8a96e';
    accents.forEach(c=>{
      const sw=document.createElement('div');sw.className='accent-swatch'+(c===cur?' active':'');
      sw.style.background=c;sw.onclick=()=>updateAccent(c);pk.appendChild(sw);
    });
  }
  const ct=document.getElementById('admin-subheader-toggle');if(!ct)return;
  ct.innerHTML='';
  (CFG.tabs||[]).forEach(tab=>{
    const label=document.createElement('label');label.className='inline-toggle';label.style.cssText='margin-bottom:8px;display:flex';
    const hidden=(CFG.subheaderHiddenTabs||[]).includes(tab.id);
    label.innerHTML=`<div class="tog-track${hidden?' on':''}"><div class="tog-thumb"></div></div><span class="tog-label">${L('tab.'+tab.id,tab.label)}</span>`;
    label.onclick=()=>{
      if(!CFG.subheaderHiddenTabs)CFG.subheaderHiddenTabs=[];
      const idx=CFG.subheaderHiddenTabs.indexOf(tab.id);
      if(idx>-1)CFG.subheaderHiddenTabs.splice(idx,1);else CFG.subheaderHiddenTabs.push(tab.id);
      queueSettingsSave();renderAdminAppearance();
    };
    ct.appendChild(label);
  });
}
function updateAppTitle(v){
  CFG.appTitle=v;
  const wm=document.getElementById('app-wordmark-text');if(wm)wm.textContent=v||'Operator';
  document.title=v||'Operator';
  queueSettingsSave();
}
function updateDensity(v){
  if(!CFG.appearance)CFG.appearance={};CFG.appearance.density=v;
  document.body.classList.toggle('density-compact',v==='compact');queueSettingsSave();
}
function updateFontScale(v){
  if(!CFG.appearance)CFG.appearance={};CFG.appearance.fontScale=v;
  document.body.classList.remove('font-small','font-large');
  if(v==='small')document.body.classList.add('font-small');
  if(v==='large')document.body.classList.add('font-large');
  queueSettingsSave();
}
function updateAccent(c){
  if(!CFG.appearance)CFG.appearance={};CFG.appearance.accent=c;
  document.documentElement.style.setProperty('--accent',c);
  const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-dim',`rgba(${r},${g},${b},.14)`);
  document.documentElement.style.setProperty('--accent-dim2',`rgba(${r},${g},${b},.06)`);
  queueSettingsSave();renderAdminAppearance();
}
