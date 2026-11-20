// Daywork – languages (German / English) and one-time migration of old "Tagwerk" storage keys.
// Texts in the code are written in German; EN maps them to English. DE only holds keys
// that are not German sentences themselves (e.g. 'act.done').
(() => {
'use strict';
window.APP_NAME = 'Daywork';

/* ---------- migrate data stored under the former name ---------- */
try {
  const moves = [['tagwerk:data', 'daywork:data'], ['tagwerk:settings', 'daywork:settings']];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('tw:')) moves.push([k, 'dw:' + k.slice(3)]); }
  for (const [from, to] of moves) {
    const v = localStorage.getItem(from);
    if (v != null && localStorage.getItem(to) == null) localStorage.setItem(to, v);
    if (v != null) localStorage.removeItem(from);
  }
} catch {}

/* ---------- language ---------- */
let pref = '';
try { pref = (JSON.parse(localStorage.getItem('daywork:settings')) || {}).lang || ''; } catch {}
const sys = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
const lang = pref || (sys.toLowerCase().startsWith('de') ? 'de' : 'en');
// For English, keep the user's regional date format (en-GB, en-AU …) when the system is English.
const locale = lang === 'de' ? 'de-DE' : (sys.toLowerCase().startsWith('en') ? sys : 'en-US');

const DE = {
  'act.done': 'Erledigt',
  'backup.file': 'daywork-sicherung',
  'nav.lists': 'Listen',
};

const EN = {
  'act.done': 'Done',
  'backup.file': 'daywork-backup',
  'nav.lists': 'Lists',
  // dates & time
  'Heute': 'Today', 'Morgen': 'Tomorrow', 'Gestern': 'Yesterday',
  'gerade eben': 'just now', 'vor {n} Min.': '{n} min ago', '{time} Uhr': '{time}',
  // repeat
  'Nie': 'Never', 'Täglich': 'Daily', 'Werktags': 'Weekdays', 'Wöchentlich': 'Weekly', 'Monatlich': 'Monthly', 'Jährlich': 'Yearly',
  // smart lists
  'Mein Tag': 'My Day', 'Wichtig': 'Important', 'Geplant': 'Planned', 'Alle': 'All', 'Erledigt': 'Completed', 'Aufgaben': 'Tasks',
  // sorting
  'Neueste zuerst': 'Newest first', 'Wichtigkeit': 'Importance', 'Fälligkeitsdatum': 'Due date', 'Alphabetisch': 'Alphabetically',
  'Zu „Mein Tag“ hinzugefügt': 'Added to My Day', 'Sortieren nach': 'Sort by', 'Sortieren': 'Sort',
  // general
  'Nächste Wiederholung angelegt': 'Next occurrence created', 'Rückgängig': 'Undo', 'Unbenannte Liste': 'Untitled list',
  'Aufgabe für heute hinzufügen': 'Add a task for today', 'Wichtige Aufgabe hinzufügen': 'Add an important task',
  'Aufgabe mit Fälligkeit heute hinzufügen': 'Add a task due today', 'Aufgabe hinzufügen': 'Add a task',
  'Suche: „{q}“': 'Search: “{q}”', 'Listenname': 'List name', 'Vorschläge': 'Suggestions', 'Weitere Optionen': 'More options',
  'Abbrechen': 'Cancel', 'Löschen': 'Delete', 'Erledigte ausblenden': 'Hide completed tasks', 'Erledigte anzeigen': 'Show completed tasks',
  'Farbe': 'Color', 'Farbe {c}': 'Color {c}', 'Liste löschen': 'Delete list',
  '„{name}“ und 1 Aufgabe endgültig löschen?': 'Permanently delete “{name}” and its 1 task?',
  '„{name}“ und {n} Aufgaben endgültig löschen?': 'Permanently delete “{name}” and its {n} tasks?',
  'Alle erledigten löschen': 'Delete all completed tasks',
  '1 erledigte Aufgabe endgültig löschen?': 'Permanently delete 1 completed task?',
  '{n} erledigte Aufgaben endgültig löschen?': 'Permanently delete {n} completed tasks?',
  'Die Anmeldung bei OneDrive ist abgelaufen. Deine Änderungen bleiben auf diesem Gerät, bis du dich neu anmeldest. ':
    'Your OneDrive sign-in has expired. Your changes stay on this device until you sign in again. ',
  'Neu anmelden': 'Sign in again',
  // task rows
  '{done} von {n}': '{done} of {n}', 'Überfällig, ': 'Overdue, ', 'Fällig: ': 'Due ', 'Notiz': 'Note',
  'Als nicht erledigt markieren': 'Mark as not completed', 'Als erledigt markieren': 'Mark as completed',
  'Nicht mehr wichtig': 'Remove importance', 'Als wichtig markieren': 'Mark as important',
  // empty states & groups
  'Nichts gefunden': 'No results', 'Gesucht wird in Titeln, Schritten und Notizen.': 'Searches titles, steps and notes.',
  'Überfällig': 'Overdue', 'Diese Woche': 'This week', 'Später': 'Later',
  'Nichts geplant': 'Nothing planned', 'Aufgaben mit Fälligkeitsdatum oder Erinnerung erscheinen hier.': 'Tasks with a due date or reminder show up here.',
  'Noch nichts erledigt': 'Nothing completed yet', 'Abgehakte Aufgaben aus allen Listen landen hier.': 'Completed tasks from all lists end up here.',
  'Konzentrier dich auf heute': 'Focus on today',
  'Füge Aufgaben hinzu, die du heute schaffen willst. „Mein Tag“ startet jeden Morgen leer. Vorschläge helfen beim Füllen.':
    'Add the tasks you want to get done today. My Day starts empty every morning, and Suggestions help you fill it.',
  'Nichts Wichtiges offen': 'Nothing important left', 'Markiere Aufgaben mit dem Stern, damit sie hier erscheinen.': 'Star tasks to see them here.',
  'Alles erledigt': 'All done', 'Alle offenen Aufgaben aus allen Listen stehen hier.': 'All open tasks from every list appear here.',
  'Diese Liste ist leer': 'This list is empty',
  'Tipp: „Zahnarzt anrufen morgen um 9 !“ setzt Fälligkeit, Erinnerung und Stern in einem Schritt.':
    'Tip: “Call dentist tomorrow at 9am !” sets the due date, reminder and star in one go.',
  'Alles abgehakt. Gut gemacht.': 'All checked off. Nice work.',
  // detail panel
  'Titel': 'Title', 'Schritt': 'Step', 'Schritt offen': 'Mark step as open', 'Schritt erledigt': 'Mark step as done',
  'Schritt löschen': 'Delete step', 'Nächster Schritt': 'Next step', 'Schritt hinzufügen': 'Add step',
  'Erledigt umschalten': 'Toggle completed', 'Zu „Mein Tag“ hinzufügen': 'Add to My Day',
  'Erinnerung': 'Reminder', 'Später heute {time}': 'Later today {time}', 'Nächste Woche': 'Next week',
  'Wiederholen': 'Repeat', 'Steht in deinem Outlook-Kalender.': 'In your Outlook calendar.',
  'Wird beim nächsten Sync in Outlook eingetragen.': 'Will be added to Outlook at the next sync.',
  'Fällig': 'Due', 'Fälligkeit entfernen': 'Remove due date', 'Erinnerung entfernen': 'Remove reminder',
  'Liste': 'List', 'Notiz hinzufügen': 'Add a note', 'Aufgabe löschen': 'Delete task', 'Details schließen': 'Close details',
  'Schließen (Esc)': 'Close (Esc)', 'Erledigt am {d}': 'Completed {d}', 'Erstellt am {d}': 'Created {d}',
  // suggestions
  'Heute fällig': 'Due today', 'Bald fällig': 'Due soon', 'Früher in „Mein Tag“': 'Earlier in My Day', 'Kürzlich hinzugefügt': 'Recently added',
  'Vorschläge schließen': 'Close suggestions',
  'Keine Vorschläge. Alles Dringende steht schon in „Mein Tag“.': 'No suggestions. Everything urgent is already in My Day.',
  // sync & settings
  'Nur lokal': 'Local only', 'Nicht verbunden': 'Not connected', 'Synchronisiert …': 'Syncing…', 'Sync-Fehler': 'Sync error', 'Anmelden': 'Sign in',
  'Zuletzt synchronisiert {ago}': 'Last synced {ago}', 'Synchronisierung und Einstellungen': 'Sync and settings',
  'Einstellungen': 'Settings', 'Einstellungen schließen': 'Close settings',
  'Daywork speichert gerade nur auf diesem Gerät. In dieser Version ist die OneDrive-Synchronisierung nicht eingerichtet.':
    'Daywork is storing your data on this device only. OneDrive sync is not set up in this version.',
  'Melde dich mit deinem Microsoft-Konto an. Daywork legt dann in deinem OneDrive den Ordner „Apps/Daywork“ an und hält alle Geräte damit aktuell. Auf andere Dateien hat die App keinen Zugriff.':
    'Sign in with your Microsoft account. Daywork then creates the folder “Apps/Daywork” in your OneDrive and uses it to keep all your devices in sync. The app has no access to any other files.',
  'Mit Microsoft anmelden': 'Sign in with Microsoft', 'Microsoft-Konto': 'Microsoft account',
  'Synchronisiert {ago}': 'Synced {ago}', 'Wird synchronisiert …': 'Syncing…',
  'Offline. Änderungen werden später übertragen.': 'Offline. Changes will be uploaded later.',
  'Nicht synchronisiert': 'Not synced', 'Jetzt synchronisieren': 'Sync now', 'Abmelden': 'Sign out',
  'Erinnerungen': 'Reminders', 'Benachrichtigungen': 'Notifications', 'Erlaubt': 'Allowed', 'Im Browser blockiert': 'Blocked in browser',
  'Nicht verfügbar': 'Not available', 'Erlauben': 'Allow',
  'Benachrichtigungen kommen, solange Daywork geöffnet ist, auch im Hintergrund.': 'Notifications arrive while Daywork is open, even in the background.',
  'Erinnerungen in Outlook eintragen': 'Add reminders to Outlook', 'Outlook-Kalender nicht erreichbar': 'Outlook calendar unavailable',
  'In Outlook-Kalender eintragen': 'Add to Outlook calendar',
  'Jede Erinnerung wird als kurzer Termin mit Alarm eingetragen. So meldet sich Outlook auf Handy und PC, auch wenn Daywork geschlossen ist.':
    'Each reminder is added as a short event with an alert, so Outlook notifies you on your phone and PC even when Daywork is closed.',
  'Darstellung': 'Appearance', 'Hell': 'Light', 'Dunkel': 'Dark', 'Farbschema': 'Theme', 'Sprache': 'Language',
  'Daten': 'Data', '1 Aufgabe': '1 task', '{n} Aufgaben': '{n} tasks', '1 Liste': '1 list', '{n} Listen': '{n} lists',
  '{tasks} in {lists}.': '{tasks} in {lists}.',
  'Sicherungen kannst du herunterladen und auf jedem Gerät wieder einspielen.': 'You can download a backup and restore it on any device.',
  'Sicherung herunterladen': 'Download backup', 'Sicherung einspielen': 'Restore backup',
  'Info': 'About', 'Datenschutz & Impressum': 'Privacy & legal notice',
  'Daywork speichert deine Aufgaben auf deinem Gerät und in deinem eigenen OneDrive. Es gibt keinen Daywork-Server.':
    'Daywork stores your tasks on your device and in your own OneDrive. There is no Daywork server.',
  // reminders, toasts
  'Erinnerung · {when}': 'Reminder · {when}', 'Öffnen': 'Open', 'Und {n} weitere Erinnerungen': 'And {n} more reminders',
  'Siehe „Geplant“.': 'See Planned.', 'Schließen': 'Close',
  // backup
  'Datei nicht lesbar': 'Cannot read file', 'Erwartet wird eine Daywork-Sicherung (.json).': 'Expected a Daywork backup (.json).',
  'Keine Daywork-Sicherung': 'Not a Daywork backup', 'Die Datei enthält keine Aufgabenliste.': 'The file contains no task list.',
  '{n} Aufgaben und {m} Listen einspielen?': 'Restore {n} tasks and {m} lists?',
  'Gleiche Einträge werden überschrieben, alles andere bleibt.': 'Matching items are overwritten; everything else stays.',
  'Einspielen': 'Restore', 'Sicherung eingespielt': 'Backup restored',
  // cloud.js
  'Die Anmeldebibliothek konnte nicht geladen werden.': 'The sign-in library could not be loaded.',
  'Anmeldung fehlgeschlagen: ': 'Sign-in failed: ',
  'Zu viele gleichzeitige Änderungen, versuche es gleich noch einmal.': 'Too many simultaneous changes. Please try again in a moment.',
  'Die Anmeldung ist abgelaufen.': 'Your sign-in has expired.', 'Erinnerung aus Daywork': 'Reminder from Daywork',
  // index.html
  'Suchen  ( / )': 'Search  ( / )', 'Aufgaben durchsuchen': 'Search tasks', 'Neue Liste': 'New list',
  'Listen anzeigen': 'Show lists', 'Details': 'Details',
  'Aufgaben, Listen und Erinnerungen – synchronisiert über dein OneDrive.': 'Tasks, lists and reminders, synced through your own OneDrive.',
};

/** Translate a German source text; {name} placeholders are filled from vars. */
function T(s, vars) {
  let r = (lang === 'de' ? DE[s] : EN[s]);
  if (r == null) r = s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return r;
}
/** Singular/plural: one and other are German source texts, {n} is filled in. */
function Tn(n, one, other, vars = {}) { return T(n === 1 ? one : other, { n, ...vars }); }

/** Apply translations to static markup: data-i18n (text), -ph (placeholder), -aria (aria-label), -title. */
function applyStatic(root = document) {
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = T(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.placeholder = T(el.dataset.i18nPh);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', T(el.dataset.i18nAria));
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = T(el.dataset.i18nTitle);
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = T(md.content);
}

window.I18N = { lang, locale, T, Tn, applyStatic };
})();
