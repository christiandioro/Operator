/* ═══════════════════════════════════════════════════════
   supabase.js — Cloud auth, storage, and migration helpers
   Loads after storage.js and config.js; before app.js.
═══════════════════════════════════════════════════════ */

/* ── CONFIG — paste your project values here ── */
const SUPABASE_URL             = 'https://dsakjkiehegcznyzlxbw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XZoFQ7bj53L86gk35v32Bg_iC8DuZeR';

/* ── CLIENT ── */
let _sb = null;
let currentUser = null;

function initSupabaseClient(){
  // Guard: CDN not loaded or config not filled in yet
  if(typeof supabase === 'undefined') return;
  if(SUPABASE_URL.includes('PASTE_') || SUPABASE_PUBLISHABLE_KEY.includes('PASTE_')) return;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

/* ── AUTH ── */
async function sendMagicLink(email){
  if(!_sb) throw new Error('Supabase not configured.');
  const { error } = await _sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  if(error) throw error;
}

async function signOut(){
  if(!_sb) return;
  await _sb.auth.signOut();
  // onAuthStateChange SIGNED_OUT handler takes it from here
}

/* ── CLOUD LOAD ── */
async function loadAllCloud(){
  if(!_sb || !currentUser) return false;
  try{
    // Daily entries → DATA
    const { data: entries, error: e1 } = await _sb
      .from('daily_entries')
      .select('entry_date, data_json')
      .eq('user_id', currentUser.id);
    if(e1) throw e1;
    if(entries && entries.length){
      DATA = {};
      for(const row of entries) DATA[row.entry_date] = row.data_json;
    }

    // Weekly reviews → WEEK
    const { data: weeks, error: e2 } = await _sb
      .from('weekly_reviews')
      .select('week_key, data_json')
      .eq('user_id', currentUser.id);
    if(e2) throw e2;
    if(weeks && weeks.length){
      WEEK = {};
      for(const row of weeks) WEEK[row.week_key] = row.data_json;
    }

    // Settings → CFG
    const { data: settings, error: e3 } = await _sb
      .from('user_settings')
      .select('settings_json')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if(e3) throw e3;
    if(settings && settings.settings_json){
      CFG = settings.settings_json;
      migrateSettings();
    }

    // Lists → LISTS
    const { data: lists, error: e4 } = await _sb
      .from('user_lists')
      .select('lists_json')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if(e4) throw e4;
    if(lists && lists.lists_json) Object.assign(LISTS, lists.lists_json);

    return true;
  }catch(err){
    console.error('Cloud load error:', err);
    return false;
  }
}

/* ── CLOUD SAVE (internal) ── */
async function _pushDataCloud(){
  if(!_sb || !currentUser) return;
  const uid = currentUser.id;

  const entries = Object.entries(DATA).map(([date, d]) => ({
    user_id: uid, entry_date: date, data_json: d
  }));
  if(entries.length){
    const { error } = await _sb
      .from('daily_entries')
      .upsert(entries, { onConflict: 'user_id,entry_date' });
    if(error) throw error;
  }

  const weeks = Object.entries(WEEK).map(([week_key, d]) => ({
    user_id: uid, week_key, data_json: d
  }));
  if(weeks.length){
    const { error } = await _sb
      .from('weekly_reviews')
      .upsert(weeks, { onConflict: 'user_id,week_key' });
    if(error) throw error;
  }
}

async function _pushSettingsCloud(){
  if(!_sb || !currentUser) return;
  const { error } = await _sb
    .from('user_settings')
    .upsert({ user_id: currentUser.id, settings_json: CFG }, { onConflict: 'user_id' });
  if(error) throw error;
}

async function _pushListsCloud(){
  if(!_sb || !currentUser) return;
  const { error } = await _sb
    .from('user_lists')
    .upsert({ user_id: currentUser.id, lists_json: LISTS }, { onConflict: 'user_id' });
  if(error) throw error;
}

async function saveAllCloud(){
  await Promise.all([_pushDataCloud(), _pushSettingsCloud(), _pushListsCloud()]);
}

async function saveListsCloud(){
  await _pushListsCloud();
}

/* ── CLOUD SAVE HOOK — called by storage.js after every local save ── */
let _cloudSaveTimer = null;
function _scheduleCloudSave(){
  if(!currentUser || !_sb) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(async ()=>{
    try{ await saveAllCloud(); }
    catch(err){ _showSaveError(); console.error('Cloud save error:', err); }
  }, 1500);
}

function _showSaveError(){
  const dot = document.getElementById('save-dot');
  const lbl = document.getElementById('save-label');
  if(dot){ dot.className = 'save-dot'; dot.style.background = 'var(--red,#e05c5c)'; }
  if(lbl) lbl.textContent = 'Cloud save failed — data safe locally';
}

/* ── USER-TRIGGERED MIGRATION ── */
async function pushLocalToCloud(){
  if(!_sb || !currentUser){ alert('Not signed in.'); return; }
  try{
    await saveAllCloud();
    touchSaveIndicator();
    alert('Push complete — local data is now in the cloud.');
  }catch(err){
    _showSaveError();
    alert('Push failed: ' + err.message);
  }
}

async function pullCloudToLocal(){
  if(!_sb || !currentUser){ alert('Not signed in.'); return; }
  const ok = await loadAllCloud();
  if(!ok){ alert('Pull failed — cloud data could not be loaded.'); return; }
  saveAllLocal();
  // seedSleep only fills gaps — safe to call after cloud load
  seedSleep();
  init();
  alert('Pull complete — cloud data loaded.');
}

/* ── AUTH UI ── */
function updateAuthUI(){
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn  = document.getElementById('auth-logged-in');
  if(!loggedOut || !loggedIn) return;
  if(currentUser){
    loggedOut.style.display = 'none';
    loggedIn.style.display  = 'flex';
    const lbl = document.getElementById('auth-email-lbl');
    if(lbl) lbl.textContent = currentUser.email || '✓';
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display  = 'none';
  }
}

function openSignInModal(){
  const m = document.getElementById('auth-modal');
  if(!m) return;
  document.getElementById('auth-email-input').value = '';
  document.getElementById('auth-status').textContent = '';
  const btn = document.getElementById('auth-send-btn');
  if(btn){ btn.disabled = false; btn.textContent = 'Send Link'; }
  m.classList.add('open');
  setTimeout(()=>document.getElementById('auth-email-input').focus(), 50);
}

function closeSignInModal(){
  const m = document.getElementById('auth-modal');
  if(m) m.classList.remove('open');
}

async function submitSignIn(){
  const email = document.getElementById('auth-email-input').value.trim();
  const status = document.getElementById('auth-status');
  if(!email){ status.textContent = 'Enter your email address.'; return; }
  const btn = document.getElementById('auth-send-btn');
  btn.disabled = true;
  status.textContent = 'Sending…';
  try{
    await sendMagicLink(email);
    status.textContent = 'Check your email for the magic link.';
    btn.textContent = 'Sent ✓';
  }catch(err){
    status.textContent = 'Error: ' + err.message;
    btn.disabled = false;
  }
}

/* ── BOOT — called from bootApp() in app.js ── */
async function initSupabase(){
  initSupabaseClient();
  if(!_sb) return;

  // Wait for initial session to be determined before continuing boot
  await new Promise((resolve)=>{
    _sb.auth.onAuthStateChange((event, session)=>{
      if(event === 'INITIAL_SESSION'){
        currentUser = session?.user || null;
        resolve();
        return;
      }

      if(event === 'SIGNED_IN'){
        const wasLoggedIn = !!currentUser;
        currentUser = session?.user || null;
        updateAuthUI();
        // Only reload data if this is a new sign-in (not the initial session check)
        if(!wasLoggedIn){
          loadAllCloud().then(ok=>{
            if(ok){ saveAllLocal(); init(); }
            closeSignInModal();
          }).catch(()=>{ closeSignInModal(); });
        }
      }

      if(event === 'SIGNED_OUT'){
        currentUser = null;
        updateAuthUI();
        loadAllLocal();
        init();
      }
    });

    // Safety net: if INITIAL_SESSION never fires (e.g. network issue), continue anyway
    setTimeout(resolve, 3000);
  });
}
