/* ═══════════════════════════════════════════════════════
   config.js — Default configuration, migrations, labels, seed data
═══════════════════════════════════════════════════════ */

function buildDefaultCFG(){
  return {
    appTitle: 'Operator',
    theme: 'dark',
    appearance: { density:'normal', fontScale:'normal', accent:'#c8a96e' },
    tabs: [
      {id:'planner', label:'Planner', type:'builtin', hidden:false, protected:true},
      {id:'sleep',   label:'Sleep',   type:'builtin', hidden:false, protected:true},
      {id:'health',  label:'Health',  type:'builtin', hidden:false, protected:true},
      {id:'admin',   label:'Admin',   type:'builtin', hidden:false, protected:true},
    ],
    goalGroups: [
      {id:'portfolio', title:'Portfolio',  description:'Portfolio-related goals', order:0, visible:true},
      {id:'skills',    title:'Skills',     description:'Skill-building goals',    order:1, visible:true},
      {id:'general',   title:'General',    description:'Uncategorised goals',     order:2, visible:true},
    ],
    goals: [
      {id:'assets',   title:'Upgrade Portfolio Assets',  groupId:'portfolio', description:'e.g. improve a render \u00b7 clean up a drawing \u00b7 redo a plan \u00b7 upgrade sheet graphics \u00b7 edit project text', active:true, visible:true, order:0},
      {id:'website',  title:'Build Portfolio Website',   groupId:'portfolio', description:'e.g. build/edit a section \u00b7 upload a project \u00b7 rewrite a description \u00b7 improve navigation', active:true, visible:true, order:1},
      {id:'software', title:'Build Software Mastery',    groupId:'skills',    description:'e.g. focused learning (AutoCAD/Revit/SketchUp/Rhino/D5) \u00b7 practiced a workflow \u00b7 applied a new tool', active:true, visible:true, order:2},
    ],
    sections: [
      {id:'salvage',  title:'Salvage Mode',          moduleType:'builtin', tabId:'planner', order:0, visible:true, protected:true,  width:'full'},
      {id:'baseline', title:'Baseline Checklist',     moduleType:'builtin', tabId:'planner', order:1, visible:true, protected:true,  width:'full'},
      {id:'goal',     title:'Core Goal Progress',     moduleType:'builtin', tabId:'planner', order:2, visible:true, protected:true,  width:'full'},
      {id:'software', title:'Software Mastery Block', moduleType:'builtin', tabId:'planner', order:3, visible:true, protected:false, width:'full'},
      {id:'week',     title:'Weekly Review',          moduleType:'builtin', tabId:'planner', order:4, visible:true, protected:true,  width:'full'},
    ],
    labels: {
      'tab.planner':'Planner','tab.sleep':'Sleep','tab.health':'Health','tab.admin':'Admin',
      'sec.baseline':'Baseline Checklist','sec.goal':'Core Goal Progress',
      'sec.software':'Software Mastery Block','sec.week':'Weekly Review',
      'sec.salvage':'Salvage Mode',
      'help.baseline':'','help.goal':'',
      'help.software':'Optional dedicated block \u2014 separate from the project block. Completing this upgrades the day to a Win.',
      'help.week':'Auto-calculated from saved daily data \u2014 current week',
      'help.salvage':'A salvage day beats a write-off. Reduced bar, same discipline.',
      'salvage.banner':'\u26a1 Recovery mode \u2014 containment, not perfection.',
      'salvage.toggle':'Salvage',
      'status.miss':'Complete the baseline to upgrade your day.',
      'status.solid':'Baseline done. Complete your core goal for Ideal.',
      'status.ideal':'Ideal day. Add the software mastery block for Win.',
      'status.win':'Win \u2014 all three pillars complete.',
      'status.salvage':'Recovery mode. A salvage day beats a write-off.',
    },
    genericModules:{},
    subheaderHiddenTabs: [],
  };
}

function migrateSettings(){
  const def = buildDefaultCFG();
  if(!CFG.tabs) CFG.tabs = def.tabs;
  // Ensure builtin tabs added in later versions are present
  def.tabs.forEach(dt=>{ if(!CFG.tabs.find(t=>t.id===dt.id)) CFG.tabs.splice(def.tabs.indexOf(dt),0,dt); });
  if(!CFG.genericModules) CFG.genericModules = {};
  if(!CFG.subheaderHiddenTabs) CFG.subheaderHiddenTabs = [];
  if(!CFG.appearance) CFG.appearance = def.appearance;
  if(!CFG.goalGroups) CFG.goalGroups = def.goalGroups;
  if(!CFG.goals) CFG.goals = def.goals;
  else if(CFG.goals.length && CFG.goals[0].label && !CFG.goals[0].title){
    const old = CFG.goals;
    CFG.goals = [];
    const gm = {assets:'portfolio',website:'portfolio',software:'skills'};
    old.forEach((og,i)=>{
      CFG.goals.push({id:og.id,title:og.label||og.id,groupId:gm[og.id]||'general',description:og.help||'',active:!og.hidden,visible:!og.hidden,order:i});
    });
  }
  if(!CFG.sections||!CFG.sections.length||!CFG.sections[0]?.moduleType) CFG.sections=def.sections;
  // Remove deprecated phone/ritual sections if present
  CFG.sections = CFG.sections.filter(s=>s.id!=='phone'&&s.id!=='ritual');
  // Ensure all default sections exist
  def.sections.forEach(ds=>{if(!CFG.sections.find(s=>s.id===ds.id))CFG.sections.push(ds);});
  if(!CFG.labels) CFG.labels={};
  Object.entries(def.labels).forEach(([k,v])=>{if(CFG.labels[k]===undefined)CFG.labels[k]=v;});
}

function emptyDay(){
  return{
    salvage:false,
    baseline:{},
    goal:{category:'',task:'',target:'',made:'',log:'',next:'',done:false},
    software:{done:false,selected:'',notes:''},
    salvageChecks:{},
    salvageNotes:'',
    sleep:{sleepTime:'',wakeTime:'',notes:''},
    health:{weight:'',notes:'',supplements:{}},
    mood:{state:'',modifiers:[],note:''},
    generic:{},
  };
}

/* Seed sleep data */
const SEED_SLEEP=[{date:"2026-02-01",sleep:"06:15",wake:"14:00"},{date:"2026-02-02",sleep:"15:15",wake:"18:45"},{date:"2026-02-03",sleep:"05:40",wake:"15:50"},{date:"2026-02-04",sleep:"09:15",wake:"15:15"},{date:"2026-02-05",sleep:"06:00",wake:"13:30"},{date:"2026-02-06",sleep:"06:15",wake:"15:20"},{date:"2026-02-07",sleep:"07:15",wake:"13:30"},{date:"2026-02-08",sleep:"06:20",wake:"12:50"},{date:"2026-02-09",sleep:"23:50",wake:"07:45"},{date:"2026-02-10",sleep:"04:30",wake:"13:40"},{date:"2026-02-11",sleep:"06:30",wake:"13:45"},{date:"2026-02-12",sleep:"06:15",wake:"13:30"},{date:"2026-02-13",sleep:"07:45",wake:"15:40"},{date:"2026-02-14",sleep:"04:45",wake:"14:00"},{date:"2026-02-15",sleep:"06:00",wake:"14:00"},{date:"2026-02-16",sleep:"07:00",wake:"15:00"},{date:"2026-02-17",sleep:"01:00",wake:"13:00"},{date:"2026-02-18",sleep:"07:15",wake:"15:00"},{date:"2026-02-19",sleep:"04:00",wake:"11:00"},{date:"2026-02-20",sleep:"04:30",wake:"15:00"},{date:"2026-02-21",sleep:"07:00",wake:"13:00"},{date:"2026-02-22",sleep:"04:30",wake:"13:30"},{date:"2026-02-23",sleep:"05:00",wake:"15:00"},{date:"2026-02-24",sleep:"03:40",wake:"12:00"},{date:"2026-02-25",sleep:"05:40",wake:"13:15"},{date:"2026-02-26",sleep:"04:45",wake:"14:45"},{date:"2026-02-27",sleep:"06:15",wake:"13:00"},{date:"2026-02-28",sleep:"04:40",wake:"14:00"},{date:"2026-03-01",sleep:"05:30",wake:"13:30"},{date:"2026-03-02",sleep:"07:00",wake:"18:00"},{date:"2026-03-03",sleep:"05:00",wake:"13:40"},{date:"2026-03-04",sleep:"03:30",wake:"13:30"},{date:"2026-03-06",sleep:"05:30",wake:"13:30"},{date:"2026-03-07",sleep:"07:20",wake:"15:30"},{date:"2026-03-08",sleep:"05:15",wake:"15:00"},{date:"2026-03-09",sleep:"06:00",wake:"15:20"},{date:"2026-03-10",sleep:"04:30",wake:"09:38"}];

function seedSleep(){
  for(const e of SEED_SLEEP){
    if(!DATA[e.date])DATA[e.date]=emptyDay();
    if(!DATA[e.date].sleep.sleepTime){
      DATA[e.date].sleep={sleepTime:e.sleep,wakeTime:e.wake,notes:''};
    }
  }
}
