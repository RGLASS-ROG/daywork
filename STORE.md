# Daywork in den App-Stores – Fahrplan

Stand: 20.11.2026. Reihenfolge: erst online stellen, dann Microsoft Store, dann Google Play, Apple zuletzt.

## 0. Vor dem Veröffentlichen (Pflicht)

- [ ] **Kontaktdaten** in `privacy.html` eintragen: Name, Anschrift, E-Mail (je zweimal: EN und DE, insgesamt 6 Stellen `[NAME]`, `[POSTAL ADDRESS]`/`[ANSCHRIFT]`, `[E-MAIL]`).
      Tipp: eine eigene E-Mail-Adresse nur für die App anlegen (z. B. daywork.app@…).
- [x] Schriften: Die App nutzt die Systemschrift (Segoe UI unter Windows), kein Google Fonts mehr.
- [ ] Markenrecherche „Daywork“ für Software (Klasse 9 und 42): <https://register.dpma.de>, <https://euipo.europa.eu/eSearch>, <https://tmsearch.uspto.gov>
- [ ] Repository auf GitHub anlegen (öffentlich), GitHub Pages einschalten → Adresse z. B. `https://rglass-rog.github.io/daywork/`

## 1. Microsoft-Anmeldung für alle öffnen

1. App-Registrierung in <https://entra.microsoft.com> anlegen oder umbenennen: Name **Daywork**.
2. Kontotypen: **beliebiges Organisationsverzeichnis + persönliche Microsoft-Konten**.
3. SPA-Umleitungs-URIs: `http://localhost:5173/` und die GitHub-Pages-Adresse (mit `/` am Ende).
4. Client-ID in `config.js` eintragen, committen, pushen.
5. Unter **Branding & Eigenschaften**: Logo, Startseite (GitHub-Pages-Adresse), Link zur Datenschutzerklärung (`…/privacy.html`).
6. Optional später: **Herausgeber-Verifizierung** (braucht ein Microsoft-Partner-Konto). Ohne sie steht beim Login „nicht verifiziert“.

## 2. Microsoft Store (kostenlos für Privatpersonen)

1. Entwicklerkonto: <https://storedeveloper.microsoft.com> → „Individual developer“.
2. In Partner Center einen App-Namen reservieren: **Daywork**.
3. <https://www.pwabuilder.com> → GitHub-Pages-Adresse eingeben → **Windows** → Paket erzeugen
   (Publisher-Daten aus Partner Center einfügen).
4. Paket (.msixbundle) in Partner Center hochladen, Store-Texte und Screenshots (siehe unten) eintragen, Datenschutz-URL angeben, zur Prüfung einreichen. Die Prüfung dauert meist 1 bis 3 Tage.

## 3. Google Play (25 $ einmalig)

1. Konto: <https://play.google.com/console> → privates Konto, Identitätsprüfung.
2. PWABuilder → **Android** → Paket erzeugen (Trusted Web Activity). Den **Signaturschlüssel sicher aufbewahren**: Ohne ihn sind keine Updates möglich.
3. Die Datei `assetlinks.json` aus dem PWABuilder-Paket nach `.well-known/assetlinks.json` ins Repository legen. Sonst zeigt die App eine Browser-Leiste.
   Bei GitHub Pages unter einem Unterpfad (`/daywork/`) funktioniert das **nicht**. Dafür braucht es entweder ein Repository `rglass-rog.github.io` oder eine eigene Domain (z. B. daywork.app, ca. 10–15 €/Jahr). Eine eigene Domain ist ohnehin zu empfehlen.
4. Neue private Konten: **geschlossener Test mit mindestens 12 Testern über 14 Tage**, erst danach ist die Produktion freigegeben.
5. Formulare ausfüllen: Datensicherheit („keine Daten erhoben/geteilt“, Daten liegen beim Nutzer in OneDrive), Inhaltseinstufung, Zielgruppe (ab 13/18), Händlerstatus.

## 4. Apple App Store (99 $/Jahr) – später

- Braucht einen Mac (oder einen gemieteten Cloud-Mac) und Xcode. PWABuilder erzeugt ein iOS-Projekt.
- Risiko: Apple lehnt reine Web-Hüllen oft ab (Richtlinie 4.2 „Minimum Functionality“). Erfolgsaussichten steigen mit nativen Extras (Widgets, Benachrichtigungen).

## 5. Rechtliches

- **Händlerstatus (EU, DSA):** Bei kostenloser Hobby-App „kein Händler“ möglich. Sobald Geld fließt: Händler, dann werden Adresse und Telefon im Store öffentlich.
- **Geld verlangen:** Gewerbe anmelden, Einnahmen versteuern (Kleinunternehmerregelung prüfen). Die Stores behalten 15 % (kleine Entwickler) bis 30 % ein.
- Kein Microsoft-Logo und nicht „Microsoft To Do“ im Namen oder Icon. „Syncs with OneDrive“ als Beschreibung ist in Ordnung.

## Store-Texte

### English

**Name:** Daywork – Tasks & Reminders
**Short description (80 characters):** Simple to-do lists with My Day and reminders, synced via your own OneDrive.

**Description:**
Daywork is a clean, fast to-do app that keeps your tasks where they belong: with you.

• My Day – plan today with a fresh list every morning, plus smart suggestions
• Important, Planned and custom lists with colors and emoji
• Steps, notes, due dates, reminders and repeating tasks
• Quick entry: type “Call dentist tomorrow at 9am !” and Daywork sets the date, reminder and star
• Sync across all your devices through your own Microsoft OneDrive
• Optional: reminders as Outlook calendar events, so you're notified even when the app is closed
• Works offline, light and dark theme, English and German

Privacy first: there is no Daywork server and no account with us. Your tasks are stored on your device and in a private app folder in your OneDrive. No ads, no tracking.

Daywork is an independent app and is not affiliated with Microsoft.

**Keywords:** to-do, tasks, checklist, reminders, planner, my day, onedrive, productivity

### Deutsch

**Name:** Daywork – Aufgaben & Erinnerungen
**Kurzbeschreibung (80 Zeichen):** Aufgabenlisten mit „Mein Tag“ und Erinnerungen, synchron über dein OneDrive.

**Beschreibung:**
Daywork ist eine übersichtliche, schnelle Aufgaben-App, und deine Aufgaben bleiben bei dir.

• Mein Tag: jeden Morgen eine frische Liste für heute, mit Vorschlägen
• Wichtig, Geplant und eigene Listen mit Farben und Emoji
• Schritte, Notizen, Fälligkeiten, Erinnerungen und Wiederholungen
• Schnelleingabe: „Zahnarzt anrufen morgen um 9 !“ setzt Datum, Erinnerung und Stern
• Abgleich über alle Geräte mit deinem eigenen Microsoft OneDrive
• Optional: Erinnerungen als Outlook-Termine, damit du auch bei geschlossener App benachrichtigt wirst
• Funktioniert offline, helles und dunkles Design, Deutsch und Englisch

Datenschutz zuerst: Es gibt keinen Daywork-Server und kein Konto bei uns. Deine Aufgaben liegen auf deinem Gerät und in einem privaten App-Ordner in deinem OneDrive. Keine Werbung, kein Tracking.

Daywork ist eine unabhängige App und steht in keiner Verbindung zu Microsoft.

### Screenshots

Benötigt: mindestens 2 (Google: Handy 16:9 oder 9:16; Microsoft: 1366×768 oder größer). Am besten mit Beispieldaten auf Englisch und auf Deutsch aufnehmen.
