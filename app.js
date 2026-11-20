// Daywork – Oberfläche. Daten: DayworkStore.Local (lokal), DayworkCloud (OneDrive).
(() => {
'use strict';
const { Local } = window.DayworkStore;
const Cloud = window.DayworkCloud;
const Settings = window.DayworkSettings;
const { T, Tn, lang: LANG, locale: LOC, applyStatic } = window.I18N;
const APP = window.APP_NAME;

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return e;
}
function ic(name, cls) { const s = h('span', { class: 'ic' + (cls ? ' ' + cls : '') }); s.innerHTML = `<svg><use href="#i-${name}"/></svg>`; return s; }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayDiff = s => Math.round((parseYmd(s) - parseYmd(today())) / 864e5);
const store = { get(k, d) { try { const v = localStorage.getItem('dw:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('dw:' + k, JSON.stringify(v)); } catch {} } };
const fmtTime = (H, M = 0) => new Date(2000, 0, 1, H, M).toLocaleTimeString(LOC, { hour: 'numeric', minute: '2-digit' });

function fmtDay(s) {
  const diff = dayDiff(s), d = parseYmd(s);
  if (diff === 0) return T('Heute'); if (diff === 1) return T('Morgen'); if (diff === -1) return T('Gestern');
  const o = { weekday: 'short', day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString(LOC, o);
}
function fmtRemind(s) { const d = new Date(s); return fmtDay(ymd(d)) + ', ' + fmtTime(d.getHours(), d.getMinutes()); }
function fmtStamp(ts) { return new Date(ts).toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'long' }); }
function fmtAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return T('gerade eben'); if (s < 3600) return T('vor {n} Min.', { n: Math.round(s / 60) });
  const d = new Date(ts); return T('{time} Uhr', { time: fmtTime(d.getHours(), d.getMinutes()) });
}
function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
function nextDate(s, rep) {
  const d = parseYmd(s);
  if (rep === 'daily') d.setDate(d.getDate() + 1);
  else if (rep === 'weekdays') { do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); }
  else if (rep === 'weekly') d.setDate(d.getDate() + 7);
  else if (rep === 'monthly') { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(day, daysIn(d.getFullYear(), d.getMonth()))); }
  else if (rep === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return ymd(d);
}
const REPEATS = { '': T('Nie'), daily: T('Täglich'), weekdays: T('Werktags'), weekly: T('Wöchentlich'), monthly: T('Monatlich'), yearly: T('Jährlich') };
const COLORS = ['#2b59c3', '#0f766e', '#7c3aed', '#be185d', '#c2410c', '#a16207', '#15803d', '#475569'];
const SMART = {
  'my-day':   { name: T('Mein Tag'),  icon: 'sun',    color: '#c2410c' },
  important:  { name: T('Wichtig'),   icon: 'star',   color: '#be185d' },
  planned:    { name: T('Geplant'),   icon: 'cal',    color: '#0f766e' },
  all:        { name: T('Alle'),      icon: 'all',    color: '#475569' },
  completed:  { name: T('Erledigt'),  icon: 'done',   color: '#15803d' },
  tasks:      { name: T('Aufgaben'),  icon: 'home',   color: '#2b59c3' },
};
const SORTS = { created: T('Neueste zuerst'), importance: T('Wichtigkeit'), due: T('Fälligkeitsdatum'), alpha: T('Alphabetisch'), myday: T('Zu „Mein Tag“ hinzugefügt') };
const EMOJI = /^(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*)\s*/u;

/* ================= state ================= */
const S = {
  lists: new Map(), tasks: new Map(),
  view: 'my-day', panel: null, search: '',
  closedGroups: store.get('closed', {}), sorts: store.get('sorts', {}),
  showDone: store.get('showDone', true),
};
function refresh() {
  S.lists = new Map(Local.live('lists').map(l => [l.id, l]));
  S.tasks = new Map(Local.live('tasks').map(t => [t.id, t]));
}

/* ================= persistence ================= */
function saveTask(t, quiet = false) { Local.put('tasks', t.id, t, { quiet }); if (quiet) { refresh(); Cloud.schedule(); } }
function patch(t, changes, opts = {}) { const n = { ...(S.tasks.get(t.id) || t), ...changes }; saveTask(n, !!opts.silent); return n; }
function saveList(l) { Local.put('lists', l.id, l); }
function removeTask(id) { Local.put('tasks', id, null); }

/* ================= views ================= */
function viewInfo(v = S.view) {
  if (SMART[v]) return { key: v, smart: true, ...SMART[v] };
  if (v.startsWith('list-')) {
    const l = S.lists.get(v.slice(5));
    if (l) { const m = l.name.match(EMOJI); return { key: v, smart: false, list: l, name: l.name, emoji: m ? m[1] : null, icon: 'list', color: l.color || COLORS[0] }; }
  }
  return null;
}
const listName = id => id === 'tasks' || !id ? T('Aufgaben') : (S.lists.get(id)?.name || T('Aufgaben'));
const listOf = t => (t.listId && t.listId !== 'tasks' && S.lists.has(t.listId)) ? t.listId : 'tasks';
const inMyDay = t => t.myDay === today();
function viewTasks(v) {
  const all = [...S.tasks.values()];
  switch (v) {
    case 'my-day': return all.filter(inMyDay);
    case 'important': return all.filter(t => t.important && !t.done);
    case 'planned': return all.filter(t => (t.due || t.remind) && !t.done);
    case 'all': return all.filter(t => !t.done);
    case 'completed': return all.filter(t => t.done);
    case 'tasks': return all.filter(t => listOf(t) === 'tasks');
    default: return v.startsWith('list-') ? all.filter(t => t.listId === v.slice(5)) : [];
  }
}
function countOpen(v) { return viewTasks(v).filter(t => !t.done).length; }
function sortTasks(arr, mode) {
  const by = {
    created: (a, b) => (b.created || 0) - (a.created || 0),
    importance: (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || (b.created || 0) - (a.created || 0),
    due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (b.created || 0) - (a.created || 0),
    alpha: (a, b) => a.title.localeCompare(b.title, LOC, { sensitivity: 'base' }),
    myday: (a, b) => (b.myDayAt || 0) - (a.myDayAt || 0),
  };
  return arr.sort(by[mode] || by.created);
}
const planDay = t => t.due || (t.remind ? t.remind.slice(0, 10) : '9999-12-31');

/* ================= quick-add parsing ================= */
const WD = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
const WD_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const parseQuick = raw => LANG === 'de' ? parseQuickDe(raw) : parseQuickEn(raw);
function parseQuickDe(raw) {
  let s = ' ' + raw + ' ', due = null, important = false, time = null, myDay = false;
  const take = (re, fn) => { const m = s.match(re); if (m) { fn(m); s = s.replace(m[0], ' '); } };
  take(/\s!(?=\s)/, () => important = true);
  take(/\s\*heute(?=\s)/i, () => myDay = true);
  take(/\sum\s(\d{1,2})(?:[:.](\d{2}))?\s?(?:uhr)?(?=\s)/i, m => { const H = +m[1], M = +(m[2] || 0); if (H < 24 && M < 60) time = pad(H) + ':' + pad(M); });
  const now = new Date();
  take(/\s(?:am\s)?übermorgen(?=\s)/i, () => due = ymd(addDays(now, 2)));
  take(/\s(?:am\s)?heute(?=\s)/i, () => due = ymd(now));
  take(/\s(?:am\s)?morgen(?=\s)/i, () => due = ymd(addDays(now, 1)));
  take(/\sin\s(\d{1,3})\stag(?:en)?(?=\s)/i, m => due = ymd(addDays(now, +m[1])));
  take(/\sin\s(\d{1,2})\swoche(?:n)?(?=\s)/i, m => due = ymd(addDays(now, 7 * m[1])));
  take(/\snächste\swoche(?=\s)/i, () => { const d = addDays(now, ((8 - now.getDay()) % 7) || 7); due = ymd(d); });
  take(new RegExp('\\s(?:am\\s|nächsten\\s)?(' + WD.join('|') + ')(?=\\s)', 'i'), m => { const t = WD.indexOf(m[1].toLowerCase()); let n = (t - now.getDay() + 7) % 7; if (n === 0) n = 7; due = ymd(addDays(now, n)); });
  take(/\s(?:am\s)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?=\s)/, m => {
    let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1]);
    if (!m[3] && d < parseYmd(today())) d.setFullYear(y + 1);
    if (d.getDate() === +m[1]) due = ymd(d);
  });
  let remind = null;
  if (time) { remind = (due || today()) + 'T' + time; if (!due) due = today(); }
  return { title: s.replace(/\s+/g, ' ').trim(), due, important, remind, myDay };
}
// English: "Call dentist tomorrow at 9am !", "Report friday 14:30", "Pay rent in 3 days", "*today", "12/24"
function parseQuickEn(raw) {
  let s = ' ' + raw + ' ', due = null, important = false, time = null, myDay = false;
  const take = (re, fn) => { const m = s.match(re); if (m) { fn(m); s = s.replace(m[0], ' '); } };
  const setTime = (h, mi, ap) => { let H = +h; const M = +(mi || 0); ap = (ap || '').toLowerCase();
    if (ap === 'pm' && H < 12) H += 12; if (ap === 'am' && H === 12) H = 0; if (H < 24 && M < 60) time = pad(H) + ':' + pad(M); };
  take(/\s!(?=\s)/, () => important = true);
  take(/\s\*today(?=\s)/i, () => myDay = true);
  take(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, m => setTime(m[1], m[2], m[3]));
  if (!time) take(/\s(?:at\s)?(\d{1,2}):(\d{2})(?=\s)/i, m => setTime(m[1], m[2]));
  if (!time) take(/\sat\s(\d{1,2})(?=\s)/i, m => setTime(m[1], 0));
  const now = new Date();
  take(/\s(?:the\s)?day\safter\stomorrow(?=\s)/i, () => due = ymd(addDays(now, 2)));
  take(/\stoday(?=\s)/i, () => due = ymd(now));
  take(/\stomorrow(?=\s)/i, () => due = ymd(addDays(now, 1)));
  take(/\sin\s(\d{1,3})\sdays?(?=\s)/i, m => due = ymd(addDays(now, +m[1])));
  take(/\sin\s(\d{1,2})\sweeks?(?=\s)/i, m => due = ymd(addDays(now, 7 * m[1])));
  take(/\snext\sweek(?=\s)/i, () => { const d = addDays(now, ((8 - now.getDay()) % 7) || 7); due = ymd(d); });
  take(new RegExp('\\s(?:on\\s|next\\s)?(' + WD_EN.join('|') + ')(?=\\s)', 'i'), m => { const t = WD_EN.indexOf(m[1].toLowerCase()); let n = (t - now.getDay() + 7) % 7; if (n === 0) n = 7; due = ymd(addDays(now, n)); });
  const monthFirst = /^en-(us|ca|ph)$/i.test(LOC) || LOC === 'en';
  take(/\s(?:on\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, m => {
    const mo = +(monthFirst ? m[1] : m[2]), da = +(monthFirst ? m[2] : m[1]);
    let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
    const d = new Date(y, mo - 1, da);
    if (!m[3] && d < parseYmd(today())) d.setFullYear(y + 1);
    if (d.getDate() === da) due = ymd(d);
  });
  let remind = null;
  if (time) { remind = (due || today()) + 'T' + time; if (!due) due = today(); }
  return { title: s.replace(/\s+/g, ' ').trim(), due, important, remind, myDay };
}

/* ================= actions ================= */
function addTask(raw) {
  const p = parseQuick(raw); if (!p.title) return;
  const v = S.view, now = Date.now();
  const t = { id: uid(), title: p.title, listId: v.startsWith('list-') ? v.slice(5) : 'tasks', done: false, important: p.important || v === 'important',
    due: p.due || (v === 'planned' ? today() : null), remind: p.remind, repeat: null, notes: '', steps: [], created: now,
    myDay: (v === 'my-day' || p.myDay) ? today() : null, myDayAt: (v === 'my-day' || p.myDay) ? now : null };
  saveTask(t);
}
function complete(t, rowEl) {
  const go = () => {
    const cur = S.tasks.get(t.id) || t;
    if (!cur.done && cur.repeat) {
      const base = cur.due || today(), nd = nextDate(base, cur.repeat);
      let nr = null;
      if (cur.remind) { const shift = Math.round((parseYmd(nd) - parseYmd(base)) / 864e5); nr = ymd(addDays(new Date(cur.remind), shift)) + cur.remind.slice(10); }
      const { cal: _c, ...copy } = cur;
      saveTask({ ...copy, id: uid(), done: false, doneAt: null, due: nd, remind: nr, myDay: null, myDayAt: null, created: Date.now(), steps: (cur.steps || []).map(s => ({ ...s, done: false })) }, true);
      patch(cur, { done: true, doneAt: Date.now(), repeat: null });
      toast({ icon: 'repeat', title: T('Nächste Wiederholung angelegt'), sub: fmtDay(nd) });
    } else {
      patch(cur, { done: !cur.done, doneAt: cur.done ? null : Date.now() });
      if (!cur.done) toast({ icon: 'done', title: T('Erledigt'), sub: cur.title, actions: [[T('Rückgängig'), () => patch(S.tasks.get(cur.id) || cur, { done: false, doneAt: null })]] });
    }
  };
  if (rowEl && !t.done) {
    rowEl.querySelector('.chk')?.classList.add('on');
    rowEl.classList.add('leaving'); setTimeout(go, 280);
  } else go();
}
function deleteTask(t) {
  if (S.panel?.id === t.id) S.panel = null;
  removeTask(t.id);
}
function createList() {
  const used = [...S.lists.values()].map(l => l.color);
  const color = COLORS.find(c => !used.includes(c)) || COLORS[S.lists.size % COLORS.length];
  const l = { id: uid(), name: T('Unbenannte Liste'), color, created: Date.now() };
  saveList(l); go('list-' + l.id);
  requestAnimationFrame(() => { const i = $('#listTitle'); if (i) { i.focus(); i.select(); } });
}
function deleteList(l) {
  for (const t of [...S.tasks.values()]) if (t.listId === l.id) Local.put('tasks', t.id, null, { quiet: true });
  Local.put('lists', l.id, null);
  go('my-day');
}

/* ================= navigation ================= */
function go(v) {
  if (!viewInfo(v)) v = 'my-day';
  S.view = v; S.search = ''; $('#q').value = '';
  if (S.panel?.type === 'suggest' && v !== 'my-day') S.panel = null;
  $('#app').classList.remove('drawer');
  if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
  render(); $('#scroll').scrollTop = 0;
}
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== S.view) go(v); });
function select(id) { S.panel = { type: 'task', id }; render(); }
function closePanel() { S.panel = null; render(); }

/* ================= render ================= */
let popOpen = null;
function render() {
  if (!viewInfo()) S.view = 'my-day';
  const vi = viewInfo();
  $('#app').style.setProperty('--acc', vi.color);
  $('#main').style.setProperty('--acc', vi.color);
  renderNav(); renderHead(vi); renderBanner(); renderList(vi); renderDetail(); renderChips(); renderSync();
  $('#addForm').hidden = S.view === 'completed' || !!S.search;
  const ph = { 'my-day': T('Aufgabe für heute hinzufügen'), important: T('Wichtige Aufgabe hinzufügen'), planned: T('Aufgabe mit Fälligkeit heute hinzufügen') };
  $('#addInput').placeholder = ph[S.view] || T('Aufgabe hinzufügen');
  document.title = (S.view === 'my-day' ? '' : vi.name + ' · ') + APP;
}
function navItem(v, name, iconEl, color, count) {
  return h('button', { class: 'nav-item' + (S.view === v && !S.search ? ' active' : ''), 'data-acc': true, style: `--acc:${color}`, onclick: () => go(v), 'aria-current': S.view === v ? 'page' : null },
    iconEl, h('span', { class: 'name' }, name), count ? h('span', { class: 'cnt' }, count) : null);
}
function renderNav() {
  const nav = $('#nav'); nav.replaceChildren();
  for (const k of ['my-day', 'important', 'planned', 'all', 'completed', 'tasks'])
    nav.append(navItem(k, SMART[k].name, ic(SMART[k].icon), SMART[k].color, k === 'completed' ? '' : countOpen(k)));
  const lists = [...S.lists.values()].sort((a, b) => (a.created || 0) - (b.created || 0));
  if (lists.length) nav.append(h('div', { class: 'nav-sep' }));
  for (const l of lists) {
    const m = l.name.match(EMOJI);
    nav.append(navItem('list-' + l.id, m ? l.name.slice(m[0].length) || l.name : l.name, m ? h('span', { class: 'emo' }, m[1]) : ic('list'), l.color || COLORS[0], countOpen('list-' + l.id)));
  }
}
function renderHead(vi) {
  const ht = $('#headTitles'), tools = $('#headTools');
  // keep the list title field while it is being edited
  if (document.activeElement && document.activeElement.id === 'listTitle' && vi.list) { if (popOpen) { tools.querySelector('.pop')?.remove(); tools.append(buildPop(vi)); } return; }
  ht.replaceChildren(); tools.replaceChildren();
  if (S.search) { ht.append(h('h1', { class: 'title' }, T('Suche: „{q}“', { q: S.search }))); return; }
  if (vi.list) {
    const inp = h('input', { class: 'title', id: 'listTitle', value: vi.list.name, 'aria-label': T('Listenname'), maxlength: 120 });
    const commit = () => { const n = inp.value.trim() || T('Unbenannte Liste'); const cur = S.lists.get(vi.list.id); if (cur && n !== cur.name) saveList({ ...cur, name: n }); else render(); };
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); $('#addInput').focus(); } if (e.key === 'Escape') { inp.value = vi.list.name; inp.blur(); } });
    ht.append(inp);
  } else ht.append(h('h1', { class: 'title' }, vi.name));
  if (S.view === 'my-day') ht.append(h('div', { class: 'subtitle' }, new Date().toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' })));

  if (S.view === 'my-day') tools.append(h('button', { class: 'tool' + (S.panel?.type === 'suggest' ? ' on' : ''), onclick: () => { S.panel = S.panel?.type === 'suggest' ? null : { type: 'suggest' }; render(); } }, ic('bulb'), h('span', { class: 't' }, T('Vorschläge'))));
  if (S.view !== 'completed' && S.view !== 'planned') tools.append(h('button', { class: 'tool', onclick: e => openPop(e, 'sort'), 'aria-haspopup': 'menu' }, ic('sort'), h('span', { class: 't' }, T('Sortieren'))));
  tools.append(h('button', { class: 'tool', onclick: e => openPop(e, 'more'), 'aria-label': T('Weitere Optionen'), 'aria-haspopup': 'menu' }, ic('more')));
  if (popOpen) tools.append(buildPop(vi));
}
function confirmBox(text, label, onYes) {
  return h('div', { style: 'padding:8px 10px' },
    h('div', { style: 'font-size:13px;margin-bottom:8px' }, text),
    h('div', { class: 'confirm' }, h('button', { class: 'btn red', onclick: () => { popOpen = null; onYes(); } }, label), h('button', { class: 'btn plain', onclick: () => { popOpen = null; render(); } }, T('Abbrechen'))));
}
function buildPop(vi) {
  const pop = h('div', { class: 'pop', role: 'menu', onclick: e => e.stopPropagation() });
  if (popOpen === 'sort') {
    pop.append(h('div', { class: 'lbl' }, T('Sortieren nach')));
    const cur = S.sorts[S.view] || 'created';
    for (const [k, n] of Object.entries(SORTS)) {
      if (k === 'myday' && S.view !== 'my-day') continue;
      pop.append(h('button', { class: 'it' + (cur === k ? ' cur' : ''), role: 'menuitem', onclick: () => { S.sorts[S.view] = k; store.set('sorts', S.sorts); popOpen = null; render(); } }, cur === k ? ic('check') : h('span', { class: 'ic' }), n));
    }
  } else if (popOpen === 'more') {
    pop.append(h('button', { class: 'it', role: 'menuitem', onclick: () => { S.showDone = !S.showDone; store.set('showDone', S.showDone); popOpen = null; render(); } }, ic('done'), S.showDone ? T('Erledigte ausblenden') : T('Erledigte anzeigen')));
    if (vi.list) {
      pop.append(h('div', { class: 'lbl' }, T('Farbe')));
      const sw = h('div', { class: 'swatches' });
      for (const c of COLORS) sw.append(h('button', { class: 'sw' + (vi.list.color === c ? ' cur' : ''), 'data-acc': true, style: `--acc:${c}`, 'aria-label': T('Farbe {c}', { c }), onclick: () => saveList({ ...vi.list, color: c }) }));
      pop.append(sw);
      const del = h('button', { class: 'it red', role: 'menuitem' }, ic('trash'), T('Liste löschen'));
      del.addEventListener('click', () => { const n = viewTasks(S.view).length; del.replaceWith(confirmBox(Tn(n, '„{name}“ und 1 Aufgabe endgültig löschen?', '„{name}“ und {n} Aufgaben endgültig löschen?', { name: vi.list.name }), T('Löschen'), () => deleteList(vi.list))); });
      pop.append(del);
    }
    if (S.view === 'completed') {
      const done = viewTasks('completed');
      if (done.length) {
        const clr = h('button', { class: 'it red', role: 'menuitem' }, ic('trash'), T('Alle erledigten löschen'));
        clr.addEventListener('click', () => clr.replaceWith(confirmBox(Tn(done.length, '1 erledigte Aufgabe endgültig löschen?', '{n} erledigte Aufgaben endgültig löschen?'), T('Löschen'), () => {
          for (const t of done) Local.put('tasks', t.id, null, { quiet: true });
          S.panel = null; Local.save(); Local.emit('local');
        })));
        pop.append(clr);
      }
    }
  }
  return pop;
}
function openPop(e, kind) { e.stopPropagation(); popOpen = popOpen === kind ? null : kind; render(); }
document.addEventListener('click', () => { if (popOpen) { popOpen = null; render(); } });

function renderBanner() {
  const b = $('#banner'); b.replaceChildren();
  if (Cloud.state === 'needs-login') b.append(h('div', { class: 'banner' }, T('Die Anmeldung bei OneDrive ist abgelaufen. Deine Änderungen bleiben auf diesem Gerät, bis du dich neu anmeldest. '),
    h('button', { class: 'btn acc', style: 'margin-left:6px', onclick: () => Cloud.login() }, T('Neu anmelden'))));
}

function metaFor(t, showList) {
  const m = [];
  if (showList) m.push(h('span', {}, listName(listOf(t))));
  if (inMyDay(t) && S.view !== 'my-day') m.push(h('span', {}, ic('sun'), T('Mein Tag')));
  const st = t.steps || [];
  if (st.length) m.push(h('span', {}, T('{done} von {n}', { done: st.filter(s => s.done).length, n: st.length })));
  if (t.due) { const dd = dayDiff(t.due); m.push(h('span', { class: !t.done && dd < 0 ? 'late' : (dd === 0 ? 'now' : '') }, ic('cal'), (dd < 0 && !t.done ? T('Überfällig, ') : T('Fällig: ')) + fmtDay(t.due))); }
  if (t.remind && !t.done) m.push(h('span', { class: new Date(t.remind) < new Date() ? 'late' : '' }, ic('bell'), fmtRemind(t.remind)));
  if (t.repeat) m.push(h('span', { title: REPEATS[t.repeat] }, ic('repeat')));
  if (t.notes && t.notes.trim()) m.push(h('span', { title: T('Notiz') }, ic('note')));
  return m.length ? h('div', { class: 'meta' }, m) : null;
}
function taskRow(t, showList) {
  const sel = S.panel?.type === 'task' && S.panel.id === t.id;
  const color = viewInfo('list-' + t.listId)?.color || SMART.tasks.color;
  const row = h('div', { class: 'task' + (t.done ? ' done' : '') + (sel ? ' sel' : ''), tabindex: 0, role: 'button', 'aria-label': t.title,
    'data-acc': true, style: showList ? `--acc:${color}` : null,
    onclick: () => select(t.id), onkeydown: e => { if (e.key === 'Enter' && e.target === row) select(t.id); } },
    h('button', { class: 'chk', 'aria-label': t.done ? T('Als nicht erledigt markieren') : T('Als erledigt markieren'), onclick: e => { e.stopPropagation(); complete(t, row); } }, ic('check')),
    h('div', { class: 'tbody' }, h('div', { class: 'ttl' }, t.title), metaFor(t, showList)),
    h('button', { class: 'star' + (t.important ? ' on' : ''), 'aria-label': t.important ? T('Nicht mehr wichtig') : T('Als wichtig markieren'), 'aria-pressed': t.important ? 'true' : 'false', onclick: e => { e.stopPropagation(); patch(t, { important: !t.important }); } }, ic('star', t.important ? 'fill' : '')));
  return row;
}
function group(key, title, items, showList, collapsible = true) {
  const closed = collapsible && S.closedGroups[key];
  const frag = [h('div', { class: 'group-h' + (closed ? ' closed' : '') },
    collapsible ? h('button', { 'aria-expanded': closed ? 'false' : 'true', onclick: () => { S.closedGroups[key] = !closed; store.set('closed', S.closedGroups); render(); } }, ic('chev'), title, h('span', { class: 'n' }, items.length)) : h('span', {}, title, ' ', h('span', { class: 'n' }, items.length)))];
  if (!closed) frag.push(h('div', { class: 'tasks' }, items.map(t => taskRow(t, showList))));
  return frag;
}
function emptyState(icon, title, text) {
  const e = h('div', { class: 'empty' }); e.append(ic(icon, 'big'), h('h3', {}, title), h('div', {}, text)); return e;
}
function renderList(vi) {
  const el = $('#list'); el.replaceChildren();
  if (S.search) {
    const q = S.search.toLowerCase();
    const hits = [...S.tasks.values()].filter(t => (t.title + ' ' + (t.notes || '') + ' ' + (t.steps || []).map(s => s.t).join(' ')).toLowerCase().includes(q));
    if (!hits.length) { el.append(emptyState('search', T('Nichts gefunden'), T('Gesucht wird in Titeln, Schritten und Notizen.'))); return; }
    const open = sortTasks(hits.filter(t => !t.done), 'created'), done = sortTasks(hits.filter(t => t.done), 'created');
    if (open.length) el.append(h('div', { class: 'tasks' }, open.map(t => taskRow(t, true))));
    if (done.length) el.append(...group('search-done', T('Erledigt'), done, true));
    return;
  }
  const v = S.view, mode = S.sorts[v] || 'created';
  const showList = !vi.list && v !== 'tasks';
  const items = viewTasks(v);
  if (v === 'planned') {
    const open = items.sort((a, b) => planDay(a).localeCompare(planDay(b)) || (a.remind || '').localeCompare(b.remind || ''));
    const buckets = [['late', 'Überfällig', d => d < 0], ['today', 'Heute', d => d === 0], ['tomorrow', 'Morgen', d => d === 1], ['week', 'Diese Woche', d => d <= 7], ['later', 'Später', () => true]];
    const used = new Set();
    for (const [key, name, fn] of buckets) { const g = open.filter(t => !used.has(t.id) && fn(dayDiff(planDay(t)))); g.forEach(t => used.add(t.id)); if (g.length) el.append(...group('planned-' + key, T(name), g, true)); }
    if (!open.length) el.append(emptyState('cal', T('Nichts geplant'), T('Aufgaben mit Fälligkeitsdatum oder Erinnerung erscheinen hier.')));
    return;
  }
  if (v === 'completed') {
    const done = items.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    if (!done.length) { el.append(emptyState('done', T('Noch nichts erledigt'), T('Abgehakte Aufgaben aus allen Listen landen hier.'))); return; }
    el.append(h('div', { class: 'tasks' }, done.map(t => taskRow(t, true))));
    return;
  }
  const open = sortTasks(items.filter(t => !t.done), mode), done = items.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  if (!open.length && !done.length) {
    const E = { 'my-day': ['sun', 'Konzentrier dich auf heute', 'Füge Aufgaben hinzu, die du heute schaffen willst. „Mein Tag“ startet jeden Morgen leer. Vorschläge helfen beim Füllen.'],
      important: ['star', 'Nichts Wichtiges offen', 'Markiere Aufgaben mit dem Stern, damit sie hier erscheinen.'],
      all: ['all', 'Alles erledigt', 'Alle offenen Aufgaben aus allen Listen stehen hier.'] }[v]
      || ['list', 'Diese Liste ist leer', 'Tipp: „Zahnarzt anrufen morgen um 9 !“ setzt Fälligkeit, Erinnerung und Stern in einem Schritt.'];
    el.append(emptyState(E[0], T(E[1]), T(E[2]))); return;
  }
  if (open.length) el.append(h('div', { class: 'tasks' }, open.map(t => taskRow(t, showList))));
  else el.append(h('div', { class: 'empty', style: 'padding:28px 16px 8px' }, T('Alles abgehakt. Gut gemacht.')));
  if (done.length && S.showDone && v !== 'important' && v !== 'all') el.append(...group('done-' + v, T('Erledigt'), done, showList));
}

/* ---------- quick-add chips ---------- */
function renderChips() {
  const box = $('#addChips'), val = $('#addInput').value;
  const p = val.trim() ? parseQuick(val) : null;
  box.replaceChildren();
  if (!p) { box.hidden = true; return; }
  const c = [];
  if (p.due) c.push(h('span', { class: 'chip' }, ic('cal'), T('Fällig: ') + fmtDay(p.due)));
  if (p.remind) c.push(h('span', { class: 'chip' }, ic('bell'), fmtRemind(p.remind)));
  if (p.important) c.push(h('span', { class: 'chip' }, ic('star', 'fill'), T('Wichtig')));
  if (p.myDay && S.view !== 'my-day') c.push(h('span', { class: 'chip' }, ic('sun'), T('Mein Tag')));
  box.append(...c);
  box.hidden = !c.length;
}

/* ---------- detail panel ---------- */
let detailFor = null, notesTimer = null;
function renderDetail() {
  const d = $('#detail');
  const p = S.panel;
  const t = p?.type === 'task' ? S.tasks.get(p.id) : null;
  if (p?.type === 'task' && !t) S.panel = null;
  const open = !!S.panel;
  d.classList.toggle('open', open);
  if (!open) { if (detailFor) { d.replaceChildren(); detailFor = null; } return; }
  const typing = d.contains(document.activeElement) && document.activeElement.matches('input,textarea,select');
  if (S.panel.type === 'suggest') { d.style.setProperty('--acc', SMART['my-day'].color); renderSuggest(d); detailFor = 'suggest'; return; }
  if (S.panel.type === 'settings') { d.style.setProperty('--acc', '#2b59c3'); if (!(typing && detailFor === 'settings')) renderSettings(d); detailFor = 'settings'; return; }
  d.style.setProperty('--acc', viewInfo('list-' + t.listId)?.color || SMART.tasks.color);
  // keep the field being typed in
  if (detailFor === t.id && typing) { const c = d.querySelector('.d-title .chk'); if (c) c.classList.toggle('on', !!t.done); return; }
  detailFor = t.id;
  d.replaceChildren(buildDetail(t));
}
function buildDetail(t) {
  const title = h('textarea', { rows: 1, 'aria-label': T('Titel'), value: t.title });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  title.addEventListener('blur', () => { const v = title.value.replace(/\s+/g, ' ').trim(); const cur = S.tasks.get(t.id); if (!cur) return; if (v && v !== cur.title) patch(cur, { title: v }); else if (!v) title.value = cur.title; });

  const steps = h('div', { class: 'steps' }, (t.steps || []).map(s => {
    const inp = h('input', { value: s.t, 'aria-label': T('Schritt') });
    inp.addEventListener('change', () => { const cur = S.tasks.get(t.id); patch(cur, { steps: cur.steps.map(x => x.id === s.id ? { ...x, t: inp.value.trim() || x.t } : x) }); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    return h('div', { class: 'step' + (s.done ? ' sdone' : '') },
      h('button', { class: 'chk' + (s.done ? ' on' : ''), 'aria-label': s.done ? T('Schritt offen') : T('Schritt erledigt'), onclick: () => { const cur = S.tasks.get(t.id); patch(cur, { steps: cur.steps.map(x => x.id === s.id ? { ...x, done: !x.done } : x) }); } }, ic('check')),
      inp,
      h('button', { class: 'x', 'aria-label': T('Schritt löschen'), onclick: () => { const cur = S.tasks.get(t.id); patch(cur, { steps: cur.steps.filter(x => x.id !== s.id) }); } }, ic('x')));
  }));
  const stepIn = h('input', { placeholder: (t.steps || []).length ? T('Nächster Schritt') : T('Schritt hinzufügen'), 'aria-label': T('Schritt hinzufügen'), id: 'stepIn', enterkeyhint: 'done' });
  stepIn.addEventListener('keydown', e => {
    if (e.key === 'Enter' && stepIn.value.trim()) {
      const cur = S.tasks.get(t.id);
      patch(cur, { steps: [...(cur.steps || []), { id: uid(), t: stepIn.value.trim(), done: false }] }, { silent: true });
      detailFor = null; render(); requestAnimationFrame(() => $('#stepIn')?.focus());
    }
  });

  const card1 = h('div', { class: 'card' },
    h('div', { class: 'd-title' },
      h('button', { class: 'chk' + (t.done ? ' on' : ''), 'aria-label': T('Erledigt umschalten'), onclick: () => complete(t) }, ic('check')),
      title,
      h('button', { class: 'star' + (t.important ? ' on' : ''), 'aria-label': T('Wichtig'), onclick: () => patch(t, { important: !t.important }) }, ic('star', t.important ? 'fill' : ''))),
    steps, h('div', { class: 'step-add' }, ic('plus'), stepIn));

  const md = inMyDay(t);
  const card2 = h('div', { class: 'card' },
    h('button', { class: 'row' + (md ? ' on' : ''), onclick: () => patch(t, md ? { myDay: null, myDayAt: null } : { myDay: today(), myDayAt: Date.now() }) },
      ic('sun'), h('span', { class: 'lbl' }, md ? T('Zu „Mein Tag“ hinzugefügt') : T('Zu „Mein Tag“ hinzufügen')), md ? h('span', { class: 'x', 'aria-hidden': 'true' }, ic('x')) : null));

  const rIn = h('input', { type: 'datetime-local', value: t.remind || '', 'aria-label': T('Erinnerung') });
  rIn.addEventListener('change', () => patch(t, { remind: rIn.value || null }));
  const at = (d, H, M = 0) => ymd(d) + 'T' + pad(H) + ':' + pad(M);
  const now = new Date();
  const laterToday = new Date(now.getTime() + 3 * 36e5); laterToday.setMinutes(0);
  const nextMon = addDays(now, ((8 - now.getDay()) % 7) || 7);
  const quickR = h('div', { class: 'quick' },
    laterToday.getDate() === now.getDate() ? h('button', { onclick: () => patch(t, { remind: at(laterToday, laterToday.getHours()) }) }, T('Später heute {time}', { time: fmtTime(laterToday.getHours()) })) : null,
    h('button', { onclick: () => patch(t, { remind: at(addDays(now, 1), 9) }) }, T('Morgen') + ' ' + fmtTime(9)),
    h('button', { onclick: () => patch(t, { remind: at(nextMon, 9) }) }, T('Nächste Woche')));
  const dIn = h('input', { type: 'date', value: t.due || '', 'aria-label': T('Fälligkeitsdatum') });
  dIn.addEventListener('change', () => patch(t, { due: dIn.value || null }));
  const quickD = h('div', { class: 'quick' },
    h('button', { onclick: () => patch(t, { due: today() }) }, T('Heute')),
    h('button', { onclick: () => patch(t, { due: ymd(addDays(now, 1)) }) }, T('Morgen')),
    h('button', { onclick: () => patch(t, { due: ymd(nextMon) }) }, T('Nächste Woche')));
  const rep = h('select', { 'aria-label': T('Wiederholen') }, Object.entries(REPEATS).map(([k, n]) => h('option', { value: k }, n)));
  rep.value = t.repeat || '';
  rep.addEventListener('change', () => { const cur = S.tasks.get(t.id); patch(cur, { repeat: rep.value || null, due: rep.value && !cur.due ? today() : cur.due }); });
  const calOn = !!Settings.get().calendar && !!Cloud.account;
  const card3 = h('div', { class: 'card' },
    h('div', { class: 'row' + (t.remind ? ' on' : '') }, ic('bell'), h('span', { class: 'lbl' }, T('Erinnerung')), rIn, t.remind ? h('button', { class: 'x', 'aria-label': T('Erinnerung entfernen'), onclick: () => patch(t, { remind: null }) }, ic('x')) : null),
    quickR,
    t.remind && calOn ? h('div', { class: 'hint', style: 'padding:0 14px 10px 44px' }, t.cal ? T('Steht in deinem Outlook-Kalender.') : T('Wird beim nächsten Sync in Outlook eingetragen.')) : null,
    h('div', { class: 'row' + (t.due ? ' on' : ''), style: 'border-top:1px solid var(--line)' }, ic('cal'), h('span', { class: 'lbl' }, T('Fällig')), dIn, t.due ? h('button', { class: 'x', 'aria-label': T('Fälligkeit entfernen'), onclick: () => patch(t, { due: null }) }, ic('x')) : null),
    quickD,
    h('div', { class: 'row' + (t.repeat ? ' on' : ''), style: 'border-top:1px solid var(--line)' }, ic('repeat'), h('span', { class: 'lbl' }, T('Wiederholen')), rep));

  const mv = h('select', { 'aria-label': T('Liste') }, h('option', { value: 'tasks' }, T('Aufgaben')), [...S.lists.values()].sort((a, b) => (a.created || 0) - (b.created || 0)).map(l => h('option', { value: l.id }, l.name)));
  mv.value = listOf(t);
  mv.addEventListener('change', () => patch(t, { listId: mv.value }));
  const card4 = h('div', { class: 'card' }, h('div', { class: 'row' }, ic('move'), h('span', { class: 'lbl' }, T('Liste')), mv));

  const notes = h('textarea', { placeholder: T('Notiz hinzufügen'), 'aria-label': T('Notiz'), value: t.notes || '' });
  const flush = () => { clearTimeout(notesTimer); notesTimer = null; const cur = S.tasks.get(t.id); if (cur && notes.value !== (cur.notes || '')) patch(cur, { notes: notes.value }, { silent: true }); };
  notes.addEventListener('input', () => { clearTimeout(notesTimer); notesTimer = setTimeout(flush, 700); });
  notes.addEventListener('blur', () => { flush(); renderList(viewInfo()); });
  const card5 = h('div', { class: 'card notes' }, notes);

  const delBtn = h('button', { class: 'icon-btn danger', 'aria-label': T('Aufgabe löschen'), title: T('Aufgabe löschen') }, ic('trash'));
  const foot = h('div', { class: 'd-foot' },
    h('button', { class: 'icon-btn', 'aria-label': T('Details schließen'), title: T('Schließen (Esc)'), onclick: closePanel }, ic('x')),
    h('span', { class: 'grow' }, t.done && t.doneAt ? T('Erledigt am {d}', { d: fmtStamp(t.doneAt) }) : T('Erstellt am {d}', { d: fmtStamp(t.created || Date.now()) })),
    delBtn);
  delBtn.addEventListener('click', () => delBtn.replaceWith(h('div', { class: 'confirm' },
    h('button', { class: 'btn plain', onclick: () => { detailFor = null; render(); } }, T('Abbrechen')),
    h('button', { class: 'btn red', onclick: () => deleteTask(t) }, T('Löschen')))));

  return h('div', { class: 'd-inner' }, h('div', { class: 'd-scroll' }, card1, card2, card3, card4, card5), foot);
}

/* ---------- suggestions for My Day ---------- */
function renderSuggest(d) {
  const open = [...S.tasks.values()].filter(t => !t.done && !inMyDay(t));
  const used = new Set(), groups = [];
  const take = (name, arr) => { const g = arr.filter(t => !used.has(t.id)); g.forEach(t => used.add(t.id)); if (g.length) groups.push([name, g]); };
  take(T('Überfällig'), open.filter(t => t.due && dayDiff(t.due) < 0));
  take(T('Heute fällig'), open.filter(t => t.due && dayDiff(t.due) === 0));
  take(T('Bald fällig'), open.filter(t => t.due && dayDiff(t.due) > 0 && dayDiff(t.due) <= 3));
  take(T('Früher in „Mein Tag“'), open.filter(t => t.myDay && t.myDay < today()));
  take(T('Wichtig'), open.filter(t => t.important));
  take(T('Kürzlich hinzugefügt'), open.filter(t => Date.now() - (t.created || 0) < 7 * 864e5).sort((a, b) => b.created - a.created).slice(0, 8));
  const body = h('div', { class: 'd-scroll sugg' },
    h('div', { class: 'sugg-head' }, h('h3', {}, T('Vorschläge')), h('button', { class: 'icon-btn', 'aria-label': T('Vorschläge schließen'), onclick: closePanel }, ic('x'))));
  if (!groups.length) body.append(h('p', { style: 'color:var(--muted)' }, T('Keine Vorschläge. Alles Dringende steht schon in „Mein Tag“.')));
  for (const [name, g] of groups) {
    body.append(h('h4', {}, name));
    for (const t of g) body.append(h('div', { class: 's' },
      h('div', { class: 'tbody' }, h('div', { class: 'ttl' }, t.title), metaFor(t, true)),
      h('button', { class: 'plus', 'aria-label': T('Zu „Mein Tag“ hinzufügen'), onclick: () => patch(t, { myDay: today(), myDayAt: Date.now() }) }, ic('plus'))));
  }
  d.replaceChildren(h('div', { class: 'd-inner' }, body));
}

/* ---------- sync pill & settings ---------- */
const SYNC_LABEL = {
  unconfigured: ['cloud-off', T('Nur lokal'), ''], 'signed-out': ['cloud-off', T('Nicht verbunden'), ''],
  syncing: ['sync', T('Synchronisiert …'), 'busy'], ok: ['cloud', 'OneDrive', 'ok'], offline: ['cloud-off', 'Offline', ''],
  error: ['cloud-off', T('Sync-Fehler'), 'err'], 'needs-login': ['cloud-off', T('Anmelden'), 'err'],
};
function renderSync() {
  const [icon, label, cls] = SYNC_LABEL[Cloud.state] || SYNC_LABEL.unconfigured;
  const p = $('#syncPill');
  p.className = 'sync-pill ' + cls;
  p.replaceChildren(ic(icon), h('span', {}, label));
  p.title = Cloud.lastSync ? T('Zuletzt synchronisiert {ago}', { ago: fmtAgo(Cloud.lastSync) }) : T('Synchronisierung und Einstellungen');
}
function renderSettings(d) {
  const st = Settings.get();
  const body = h('div', { class: 'd-scroll set' },
    h('div', { class: 'sugg-head' }, h('h3', {}, T('Einstellungen')), h('button', { class: 'icon-btn', 'aria-label': T('Einstellungen schließen'), onclick: closePanel }, ic('x'))));

  // --- OneDrive
  body.append(h('div', { class: 'sec' }, 'OneDrive'));
  const od = h('div', { class: 'card' });
  if (Cloud.state === 'unconfigured') {
    od.append(h('p', {}, T('Daywork speichert gerade nur auf diesem Gerät. In dieser Version ist die OneDrive-Synchronisierung nicht eingerichtet.')));
  } else if (!Cloud.account) {
    od.append(h('p', {}, T('Melde dich mit deinem Microsoft-Konto an. Daywork legt dann in deinem OneDrive den Ordner „Apps/Daywork“ an und hält alle Geräte damit aktuell. Auf andere Dateien hat die App keinen Zugriff.')),
      h('div', { class: 'btns' }, h('button', { class: 'btn acc', onclick: () => Cloud.login() }, T('Mit Microsoft anmelden'))));
  } else {
    od.append(h('div', { class: 'who' }, h('b', {}, Cloud.account.name || T('Microsoft-Konto')), h('span', {}, Cloud.account.username || '')));
    const status = Cloud.state === 'ok' ? T('Synchronisiert {ago}', { ago: fmtAgo(Cloud.lastSync) })
      : Cloud.state === 'syncing' ? T('Wird synchronisiert …')
      : Cloud.state === 'offline' ? T('Offline. Änderungen werden später übertragen.')
      : Cloud.error || T('Nicht synchronisiert');
    od.append(h('p', { class: Cloud.state === 'error' || Cloud.state === 'needs-login' ? 'err-text' : '' }, status),
      h('div', { class: 'btns' },
        Cloud.state === 'needs-login' ? h('button', { class: 'btn acc', onclick: () => Cloud.login() }, T('Neu anmelden')) : h('button', { class: 'btn acc', onclick: () => Cloud.sync() }, T('Jetzt synchronisieren')),
        h('button', { class: 'btn plain', onclick: () => Cloud.logout() }, T('Abmelden'))));
  }
  body.append(od);

  // --- reminders
  body.append(h('div', { class: 'sec' }, T('Erinnerungen')));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const rem = h('div', { class: 'card' },
    h('div', { class: 'row' }, ic('bell'), h('span', { class: 'lbl', style: 'color:var(--ink)' }, T('Benachrichtigungen')),
      perm === 'granted' ? h('span', { class: 'val' }, T('Erlaubt'))
      : perm === 'denied' ? h('span', { class: 'val' }, T('Im Browser blockiert'))
      : perm === 'unsupported' ? h('span', { class: 'val' }, T('Nicht verfügbar'))
      : h('button', { class: 'btn plain', onclick: async () => { await Notification.requestPermission(); render(); } }, T('Erlauben'))),
    h('p', {}, T('Benachrichtigungen kommen, solange Daywork geöffnet ist, auch im Hintergrund.')));
  if (Cloud.account) {
    const sw = h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!st.calendar, 'aria-label': T('Erinnerungen in Outlook eintragen') }), h('span'));
    sw.querySelector('input').addEventListener('change', async e => {
      try { if (e.target.checked) await Cloud.enableCalendar(); else await Cloud.disableCalendar(); }
      catch (err) { toast({ icon: 'x', title: T('Outlook-Kalender nicht erreichbar'), sub: err.message || String(err) }); }
      render();
    });
    rem.append(h('div', { class: 'row', style: 'border-top:1px solid var(--line)' }, ic('cal'), h('span', { class: 'lbl', style: 'color:var(--ink)' }, T('In Outlook-Kalender eintragen')), sw),
      h('p', { class: Cloud.calError ? 'err-text' : '' }, Cloud.calError || T('Jede Erinnerung wird als kurzer Termin mit Alarm eingetragen. So meldet sich Outlook auf Handy und PC, auch wenn Daywork geschlossen ist.')));
  }
  body.append(rem);

  // --- appearance
  body.append(h('div', { class: 'sec' }, T('Darstellung')));
  const seg = h('div', { class: 'seg' }, [['', 'System'], ['light', T('Hell')], ['dark', T('Dunkel')]].map(([k, n]) =>
    h('button', { class: (st.theme || '') === k ? 'cur' : '', onclick: () => { Settings.set({ theme: k }); applyTheme(); render(); } }, n)));
  const langSeg = h('div', { class: 'seg' }, [['', 'System'], ['de', 'Deutsch'], ['en', 'English']].map(([k, n]) =>
    h('button', { class: (st.lang || '') === k ? 'cur' : '', onclick: () => { if ((st.lang || '') === k) return; Settings.set({ lang: k }); location.reload(); } }, n)));
  body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, ic('sun'), h('span', { class: 'lbl', style: 'color:var(--ink)' }, T('Farbschema')), seg),
    h('div', { class: 'row', style: 'border-top:1px solid var(--line)' }, ic('note'), h('span', { class: 'lbl', style: 'color:var(--ink)' }, T('Sprache')), langSeg)));

  // --- data
  body.append(h('div', { class: 'sec' }, T('Daten')));
  const nT = S.tasks.size, nL = S.lists.size;
  body.append(h('div', { class: 'card' },
    h('p', {}, T('{tasks} in {lists}.', { tasks: Tn(nT, '1 Aufgabe', '{n} Aufgaben'), lists: Tn(nL + 1, '1 Liste', '{n} Listen') }) + ' ' + T('Sicherungen kannst du herunterladen und auf jedem Gerät wieder einspielen.')),
    h('div', { class: 'btns' },
      h('button', { class: 'btn plain', onclick: exportData }, ic('down'), ' ' + T('Sicherung herunterladen')),
      h('button', { class: 'btn plain', onclick: () => $('#importFile').click() }, ic('up'), ' ' + T('Sicherung einspielen')))));

  // --- about
  body.append(h('div', { class: 'sec' }, T('Info')));
  body.append(h('div', { class: 'card' },
    h('p', {}, T('Daywork speichert deine Aufgaben auf deinem Gerät und in deinem eigenen OneDrive. Es gibt keinen Daywork-Server.')),
    h('div', { class: 'btns' }, h('a', { class: 'btn plain', href: 'privacy.html', target: '_blank', rel: 'noopener' }, T('Datenschutz & Impressum')))));
  d.replaceChildren(h('div', { class: 'd-inner' }, body));
}
function applyTheme() {
  const t = Settings.get().theme;
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}

/* ================= reminders ================= */
const fired = new Set(store.get('fired', []));
function checkReminders() {
  const now = new Date(); let n = 0;
  for (const t of S.tasks.values()) {
    if (!t.remind || t.done) continue;
    const key = t.id + '@' + t.remind;
    if (fired.has(key) || new Date(t.remind) > now) continue;
    fired.add(key); n++;
    if (now - new Date(t.remind) < 6 * 36e5) notify(t);
    if (n <= 3) toast({ icon: 'bell', title: t.title, sub: T('Erinnerung · {when}', { when: fmtRemind(t.remind) }), sticky: true,
      actions: [[T('act.done'), () => complete(S.tasks.get(t.id) || t)], [T('Öffnen'), () => openTask(t.id)]] });
  }
  if (n > 3) toast({ icon: 'bell', title: T('Und {n} weitere Erinnerungen', { n: n - 3 }), sub: T('Siehe „Geplant“.') });
  if (n) store.set('fired', [...fired].slice(-500));
}
function openTask(id) {
  const t = S.tasks.get(id); if (!t) return;
  go(inMyDay(t) ? 'my-day' : (t.listId && S.lists.has(t.listId) ? 'list-' + t.listId : 'tasks'));
  select(id);
}
async function notify(t) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: T('Erinnerung · {when}', { when: fmtRemind(t.remind) }), tag: t.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { id: t.id } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(t.title, opts); else new Notification(t.title, opts);
  } catch (e) { console.warn('Benachrichtigung', e); }
}
function toast({ icon = 'check', title, sub, actions = [], sticky = false }) {
  const el = h('div', { class: 'toast', role: 'status' }, ic(icon),
    h('div', { class: 'tb' }, title, sub ? h('small', {}, sub) : null,
      actions.length ? h('div', { class: 'acts' }, actions.map(([l, fn]) => h('button', { onclick: () => { fn(); el.remove(); } }, l))) : null),
    h('button', { class: 'x', 'aria-label': T('Schließen'), onclick: () => el.remove() }, ic('x')));
  $('#toasts').append(el);
  if (!sticky) setTimeout(() => el.remove(), 4500);
}

/* ================= backup ================= */
function exportData() {
  const data = JSON.stringify({ app: 'daywork', version: 2, exported: new Date().toISOString(), lists: [...S.lists.values()], tasks: [...S.tasks.values()] }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = h('a', { href: url, download: `${T('backup.file')}-${today()}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function importData(file) {
  let j; try { j = JSON.parse(await file.text()); } catch { toast({ icon: 'x', title: T('Datei nicht lesbar'), sub: T('Erwartet wird eine Daywork-Sicherung (.json).') }); return; }
  if (!['daywork', 'tagwerk'].includes(j?.app) || !j.tasks) { toast({ icon: 'x', title: T('Keine Daywork-Sicherung'), sub: T('Die Datei enthält keine Aufgabenliste.') }); return; }
  const lists = Array.isArray(j.lists) ? j.lists : Object.values(j.lists || {});
  const tasks = Array.isArray(j.tasks) ? j.tasks : Object.values(j.tasks || {});
  toast({ icon: 'up', title: T('{n} Aufgaben und {m} Listen einspielen?', { n: tasks.length, m: lists.length }), sub: T('Gleiche Einträge werden überschrieben, alles andere bleibt.'), sticky: true,
    actions: [[T('Einspielen'), () => {
      for (const l of lists) if (l && l.id && l.name && !l.deleted) Local.put('lists', l.id, { ...l }, { quiet: true });
      for (const t of tasks) if (t && t.id && t.title && !t.deleted) { const { cal: _c, ...rest } = t; Local.put('tasks', t.id, { steps: [], notes: '', ...rest }, { quiet: true }); }
      Local.save(); Local.emit('local');
      toast({ title: T('Sicherung eingespielt') });
    }]] });
}

/* ================= wiring ================= */
$('#addForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#addInput'); if (i.value.trim()) { addTask(i.value); i.value = ''; renderChips(); } });
$('#addInput').addEventListener('input', renderChips);
$('#q').addEventListener('input', e => { S.search = e.target.value.trim(); render(); });
$('#newList').addEventListener('click', createList);
$('#menuBtn').addEventListener('click', () => $('#app').classList.add('drawer'));
$('#scrim').addEventListener('click', () => $('#app').classList.remove('drawer'));
$('#syncPill').addEventListener('click', () => { S.panel = S.panel?.type === 'settings' ? null : { type: 'settings' }; $('#app').classList.remove('drawer'); render(); });
$('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) importData(f); e.target.value = ''; });
document.addEventListener('keydown', e => {
  const typing = e.target.matches?.('input,textarea,select');
  if (e.key === 'Escape') { if (popOpen) { popOpen = null; render(); } else if (S.panel) closePanel(); else $('#app').classList.remove('drawer'); }
  else if (e.key === '/' && !typing) { e.preventDefault(); $('#q').focus(); }
  else if (e.key.toLowerCase() === 'n' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); $('#addInput').focus(); }
});
let lastDay = today();
setInterval(() => { checkReminders(); if (today() !== lastDay) { lastDay = today(); render(); } else if (S.panel?.type === 'settings') renderSync(); }, 20000);

Local.on(() => { refresh(); render(); });
Cloud.on(() => { renderSync(); renderBanner(); if (S.panel?.type === 'settings') renderDetail(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service Worker', e));
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'open-task') openTask(e.data.id); });
}

/* ================= boot ================= */
applyStatic();
applyTheme();
Local.load(); refresh();
const startHash = location.hash.slice(1);
const openParam = new URLSearchParams(location.search).get('task');
if (startHash && !startHash.includes('=') && viewInfo(startHash)) S.view = startHash;
render();
if (openParam) openTask(openParam);
checkReminders();
Cloud.init();
})();
