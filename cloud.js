// OneDrive-Synchronisierung (Microsoft Graph, App-Ordner) und optionale
// Outlook-Kalender-Erinnerungen. Anmeldung über MSAL (Auth-Code-Flow mit PKCE).
(() => {
'use strict';
const { Local, mergeData, purgeTombstones, differs } = window.DayworkStore;
const { T } = window.I18N;
const CFG = window.DAYWORK_CONFIG || {};
const GRAPH = 'https://graph.microsoft.com/v1.0';
const FILE = '/me/drive/special/approot:/daywork.json';
const FILE_SCOPES = ['Files.ReadWrite.AppFolder'];
const CAL_SCOPES = ['Calendars.ReadWrite'];
const SETTINGS_KEY = 'daywork:settings';

const Settings = {
  get() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } },
  set(patch) { const s = { ...this.get(), ...patch }; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} return s; },
};

const Cloud = {
  // unconfigured | signed-out | syncing | ok | offline | error | needs-login
  state: CFG.clientId ? 'signed-out' : 'unconfigured',
  account: null, lastSync: null, error: '', calError: '',
  _pca: null, _busy: false, _again: false, _timer: null, _listeners: new Set(),

  on(fn) { this._listeners.add(fn); },
  _emit() { for (const fn of this._listeners) try { fn(); } catch (e) { console.error(e); } },
  _set(state, error = '') { this.state = state; this.error = error; this._emit(); },

  async init() {
    if (!CFG.clientId) return;
    if (!window.msal) { this._set('error', T('Die Anmeldebibliothek konnte nicht geladen werden.')); return; }
    try {
      this._pca = new msal.PublicClientApplication({
        auth: { clientId: CFG.clientId, authority: CFG.authority || 'https://login.microsoftonline.com/common', redirectUri: location.origin + location.pathname },
        cache: { cacheLocation: 'localStorage' },
      });
      await this._pca.initialize();
      const res = await this._pca.handleRedirectPromise();
      if (res && res.account) this._pca.setActiveAccount(res.account);
      if (res && res.state === 'calendar') Settings.set({ calendar: true });
      const acc = this._pca.getActiveAccount() || this._pca.getAllAccounts()[0];
      if (acc) { this._pca.setActiveAccount(acc); this.account = acc; this._emit(); await this.sync(); }
      else this._set('signed-out');
    } catch (e) {
      console.error(e);
      this._set('error', T('Anmeldung fehlgeschlagen: ') + (e.errorMessage || e.message || e));
    }
    window.addEventListener('online', () => this.schedule(300));
    window.addEventListener('focus', () => this.schedule(300));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.schedule(300); });
    setInterval(() => { if (document.visibilityState === 'visible') this.schedule(0); }, 60000);
  },

  login() { if (this._pca) this._pca.loginRedirect({ scopes: FILE_SCOPES, prompt: 'select_account' }); },
  async logout() {
    if (!this._pca || !this.account) return;
    await this._pca.logoutRedirect({ account: this.account, onRedirectNavigate: () => false });
    this.account = null; this.lastSync = null; this._set('signed-out');
  },

  async _token(scopes, interactive = false) {
    try {
      return (await this._pca.acquireTokenSilent({ scopes, account: this.account })).accessToken;
    } catch (e) {
      if (e instanceof msal.InteractionRequiredAuthError) {
        if (interactive) { await this._pca.acquireTokenRedirect({ scopes, account: this.account, state: scopes === CAL_SCOPES ? 'calendar' : '' }); return null; }
        const err = new Error('needs-login'); err.needsLogin = true; throw err;
      }
      throw e;
    }
  },
  async _graph(path, opts = {}, scopes = FILE_SCOPES) {
    const tok = await this._token(scopes);
    return fetch(path.startsWith('http') ? path : GRAPH + path, { ...opts, headers: { Authorization: 'Bearer ' + tok, ...(opts.headers || {}) } });
  },

  schedule(ms = 1500) {
    if (!this.account) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.sync(), ms);
  },

  async sync() {
    if (!this.account) return;
    if (this._busy) { this._again = true; return; }
    this._busy = true; this._set('syncing');
    try {
      let done = false;
      for (let attempt = 0; attempt < 4 && !done; attempt++) {
        // 1. Stand aus OneDrive holen
        let remote = { lists: {}, tasks: {} }, etag = null;
        const meta = await this._graph(FILE);
        if (meta.status === 404) { /* noch keine Datei */ }
        else if (!meta.ok) throw await httpError(meta);
        else {
          const m = await meta.json(); etag = m.eTag;
          const r = await fetch(m['@microsoft.graph.downloadUrl'], { cache: 'no-store' });
          if (!r.ok) throw await httpError(r);
          const j = await r.json();
          remote = { lists: j.lists || {}, tasks: j.tasks || {} };
        }
        // 2. zusammenführen
        const merged = purgeTombstones(mergeData(Local.data, remote));
        // 3. zurückschreiben, falls sich etwas geändert hat
        if (differs(merged, remote)) {
          const put = await this._graph(FILE + ':/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }) },
            body: JSON.stringify({ app: 'daywork', version: 2, savedAt: new Date().toISOString(), lists: merged.lists, tasks: merged.tasks }),
          });
          if (put.status === 412 || put.status === 409) continue; // anderes Gerät war schneller – neu laden
          if (!put.ok) throw await httpError(put);
        }
        // 4. lokal übernehmen; was währenddessen lokal geändert wurde, bleibt (ist neuer)
        const next = mergeData(merged, Local.data);
        if (differs(next, merged)) this._again = true;
        if (differs(next, Local.data)) Local.replace(next);
        done = true;
      }
      if (!done) throw new Error(T('Zu viele gleichzeitige Änderungen, versuche es gleich noch einmal.'));
      this.lastSync = Date.now();
      this._set('ok');
      if (Settings.get().calendar) this.reconcileCalendar().catch(e => { this.calError = e.message || String(e); this._emit(); });
    } catch (e) {
      console.warn('Sync', e);
      if (e.needsLogin) this._set('needs-login', T('Die Anmeldung ist abgelaufen.'));
      else if (!navigator.onLine) this._set('offline');
      else this._set('error', e.message || String(e));
    } finally {
      this._busy = false;
      if (this._again) { this._again = false; this.schedule(800); }
    }
  },

  /* ---------- Outlook-Kalender ---------- */
  async enableCalendar() {
    if (!this.account) return false;
    const tok = await this._token(CAL_SCOPES, true); // leitet bei Bedarf zur Zustimmung weiter
    if (!tok) return false;
    Settings.set({ calendar: true }); this.calError = ''; this._emit();
    await this.reconcileCalendar();
    return true;
  },
  async disableCalendar() {
    Settings.set({ calendar: false }); this._emit();
    // eingetragene Termine wieder entfernen
    for (const t of Object.values(Local.data.tasks)) if (t.cal && t.cal.id) await this._deleteEvent(t);
  },
  async _deleteEvent(t) {
    const r = await this._graph('/me/events/' + encodeURIComponent(t.cal.id), { method: 'DELETE' }, CAL_SCOPES);
    if (r.ok || r.status === 404) setCal(t, null);
  },
  async reconcileCalendar() {
    if (!this.account || this._calBusy) return;
    this._calBusy = true;
    try {
      const keepUntil = Date.now() - 864e5; // vergangene Termine einen Tag stehen lassen
      for (const t of Object.values(Local.data.tasks)) {
        const want = !t.deleted && !t.done && t.remind && new Date(t.remind).getTime() > keepUntil;
        if (want && (!t.cal || t.cal.at !== t.remind || t.cal.title !== t.title)) {
          const start = new Date(t.remind), end = new Date(start.getTime() + 15 * 60000);
          const body = JSON.stringify({
            subject: '⏰ ' + t.title,
            body: { contentType: 'text', content: T('Erinnerung aus Daywork') + (t.notes ? '\n\n' + t.notes : '') },
            start: { dateTime: start.toISOString().slice(0, 19), timeZone: 'UTC' },
            end: { dateTime: end.toISOString().slice(0, 19), timeZone: 'UTC' },
            isReminderOn: true, reminderMinutesBeforeStart: 0, showAs: 'free', categories: [window.APP_NAME],
          });
          let r = null;
          if (t.cal && t.cal.id) r = await this._graph('/me/events/' + encodeURIComponent(t.cal.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }, CAL_SCOPES);
          if (!r || r.status === 404) r = await this._graph('/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }, CAL_SCOPES);
          if (!r.ok) throw await httpError(r);
          const ev = await r.json();
          setCal(Local.data.tasks[t.id], { id: ev.id, at: t.remind, title: t.title });
        } else if (!want && t.cal && t.cal.id) {
          await this._deleteEvent(t);
        }
      }
      this.calError = '';
    } finally { this._calBusy = false; this._emit(); }
  },
};

function setCal(t, cal) {
  const cur = Local.data.tasks[t.id]; if (!cur) return;
  const next = { ...cur, updatedAt: Date.now() };
  if (cal) next.cal = cal; else delete next.cal;
  Local.data.tasks[t.id] = next;
  Local.save(); Local.emit('local');
}
async function httpError(res) {
  let msg = res.status + ' ' + res.statusText;
  try { const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; } catch {}
  return new Error(msg);
}

Local.on(kind => { if (kind === 'local') Cloud.schedule(); });
window.DayworkCloud = Cloud;
window.DayworkSettings = Settings;
})();
