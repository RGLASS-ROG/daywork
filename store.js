// Lokaler Speicher + Zusammenführen zweier Datenstände.
// Jede Liste und Aufgabe trägt `updatedAt`; Gelöschtes bleibt als Grabstein
// ({id, deleted:true, updatedAt}) erhalten, bis alle Geräte es gesehen haben.
(() => {
'use strict';
const KEY = 'daywork:data';
const TOMBSTONE_TTL = 60 * 864e5; // 60 Tage

const Local = {
  data: { lists: {}, tasks: {} },
  listeners: new Set(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); this.data = { lists: d.lists || {}, tasks: d.tasks || {} }; }
    } catch (e) { console.warn('Lokale Daten nicht lesbar', e); }
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('Lokales Speichern fehlgeschlagen', e); }
  },
  /** data === null legt einen Grabstein an. */
  put(col, id, data, { quiet = false } = {}) {
    const prev = this.data[col][id];
    if (data === null) this.data[col][id] = { id, deleted: true, updatedAt: Date.now(), ...(prev && prev.cal ? { cal: prev.cal } : {}) };
    else this.data[col][id] = { ...data, id, updatedAt: Date.now() };
    this.save();
    if (!quiet) this.emit('local');
  },
  replace(data) { this.data = { lists: data.lists || {}, tasks: data.tasks || {} }; this.save(); this.emit('remote'); },
  live(col) { return Object.values(this.data[col]).filter(x => x && !x.deleted); },
  on(fn) { this.listeners.add(fn); },
  emit(kind) { for (const fn of this.listeners) try { fn(kind); } catch (e) { console.error(e); } },
};

/** Pro Eintrag gewinnt der neuere Stand; bei Gleichstand der von `b`. */
function mergeData(a, b) {
  const out = { lists: {}, tasks: {} };
  for (const col of ['lists', 'tasks']) {
    const A = (a && a[col]) || {}, B = (b && b[col]) || {};
    for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const x = A[id], y = B[id];
      out[col][id] = !x ? y : !y ? x : ((x.updatedAt || 0) > (y.updatedAt || 0) ? x : y);
    }
  }
  return out;
}
function purgeTombstones(d) {
  const cut = Date.now() - TOMBSTONE_TTL;
  for (const col of ['lists', 'tasks'])
    for (const [id, v] of Object.entries(d[col]))
      if (v && v.deleted && !v.cal && (v.updatedAt || 0) < cut) delete d[col][id];
  return d;
}
/** true, wenn `a` Einträge hat, die in `b` fehlen oder anders sind. */
function differs(a, b) {
  for (const col of ['lists', 'tasks']) {
    const A = a[col] || {}, B = b[col] || {};
    if (Object.keys(A).length !== Object.keys(B).length) return true;
    for (const id in A) if (A[id] !== B[id] && JSON.stringify(A[id]) !== JSON.stringify(B[id])) return true;
  }
  return false;
}

window.DayworkStore = { Local, mergeData, purgeTombstones, differs };
})();
