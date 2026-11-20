# Daywork in den App-Stores – Fahrplan

Stand: 20.11.2026. Reihenfolge: Microsoft Store zuerst, dann Google Play, Apple zuletzt.

- App online: <https://rglass-rog.github.io/daywork/>
- Datenschutz: <https://rglass-rog.github.io/daywork/privacy.html>
- Repository: <https://github.com/RGLASS-ROG/daywork>
- Screenshots: Ordner `store-assets/` (2160×1350, je 4× EN und DE)

## 0. Vor dem Einreichen (Pflicht)

- [x] **Kontaktdaten** in `privacy.html` eingetragen (Support-E-Mail: daywork_rog@proton.me).
- [x] Schriften: Die App nutzt die Systemschrift (Segoe UI unter Windows), kein Google Fonts mehr.
- [ ] Markenrecherche „Daywork“ für Software (Klasse 9 und 42): <https://register.dpma.de>, <https://euipo.europa.eu/eSearch>, <https://tmsearch.uspto.gov>
- [x] Repository auf GitHub angelegt, GitHub Pages eingeschaltet

## 1. Microsoft-Anmeldung einrichten (damit OneDrive-Sync funktioniert)

Ohne diesen Schritt läuft die Store-App nur lokal („Nur lokal“). Dauert ca. 10 Minuten.

1. <https://entra.microsoft.com> öffnen, mit deinem Microsoft-Konto anmelden.
   Meldet das Portal, dass ein Verzeichnis fehlt: kostenloses Azure-Konto unter <https://azure.microsoft.com/free> anlegen.
2. **Identität → Anwendungen → App-Registrierungen → Neue Registrierung**
   - Name: **Daywork**
   - Unterstützte Kontotypen: **Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten**
   - Umleitungs-URI: Plattform **Single-Page-Anwendung (SPA)**, `https://rglass-rog.github.io/daywork/`
3. Danach unter **Authentifizierung → URI hinzufügen**: `http://localhost:5173/` (für lokale Tests).
4. Unter **Branding & Eigenschaften**: Startseite `https://rglass-rog.github.io/daywork/`, Datenschutz-URL `https://rglass-rog.github.io/daywork/privacy.html`, Logo `icons/icon-512.png` (max. 100 KB).
5. Auf der Übersichtsseite die **Anwendungs-ID (Client-ID)** kopieren und mir geben. Ich trage sie in `config.js` ein und veröffentliche das.
6. Optional später: **Herausgeber-Verifizierung** (braucht ein Microsoft-Partner-Konto). Ohne sie steht beim Login „nicht verifiziert“.

## 2. Microsoft Store (kostenlos für Privatpersonen)

1. **Entwicklerkonto anlegen:** <https://storedeveloper.microsoft.com> → **Individual developer** → mit Microsoft-Konto anmelden, Identität bestätigen (Ausweis + Selfie über den Prüfdienst). Die Freischaltung dauert meist einige Stunden bis wenige Tage.
2. **Namen reservieren:** In <https://partner.microsoft.com/dashboard> → **Apps und Spiele → Neues Produkt → MSIX- oder PWA-App** → Name **Daywork** reservieren.
3. **Paketdaten notieren:** Beim Produkt unter **Produktverwaltung → Produktidentität** stehen drei Werte:
   *Package/Identity/Name*, *Package/Identity/Publisher* (beginnt mit `CN=`) und *Package/Properties/PublisherDisplayName*.
4. **Paket bauen:** <https://www.pwabuilder.com> → `https://rglass-rog.github.io/daywork/` eingeben → **Package for stores → Windows → Generate Package**.
   Die drei Werte aus Schritt 3 eintragen, Version `1.0.0.0`. Ergebnis: eine ZIP-Datei mit `.msixbundle` und `.classic.appxbundle`.
   (PWABuilder hatte am 20.11.2026 Wartungsarbeiten; laut Entwicklern soll es noch am selben Tag wieder laufen.)
5. **Einreichung ausfüllen** (Partner Center → Daywork → **Einreichung starten**):
   - *Preise und Verfügbarkeit:* kostenlos, alle Märkte
   - *Eigenschaften:* Kategorie **Produktivität**, Datenschutz-URL (siehe oben), Website `https://rglass-rog.github.io/daywork/`, Support-Kontakt `daywork_rog@proton.me`
   - *Altersfreigaben:* IARC-Fragebogen (keine Gewalt, keine Käufe, keine Nutzerinteraktion → „ab 3 / Everyone“)
   - *Pakete:* beide Dateien aus der ZIP hochladen
   - *Store-Einträge:* **Englisch (USA)** und **Deutsch**, je Beschreibung, Kurzbeschreibung, Stichwörter (unten) und Screenshots aus `store-assets/` (`en-*` bzw. `de-*`)
6. **Einreichen.** Die Prüfung dauert meist 1 bis 3 Werktage. Danach ist Daywork im Store unter dem reservierten Namen zu finden.

**Updates:** Weil die Store-App die Website lädt, kommen Änderungen per `git push` sofort bei allen an. Ein neues Paket ist nur nötig, wenn sich Name, Icon oder Manifest-Grundlegendes ändert.

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

## Store-Texte (Version 1.0, ohne OneDrive-Sync)

Sobald der Sync eingerichtet ist, kommen die Zeilen unter „Später ergänzen“ dazu.

### English

**Name:** Daywork – Tasks & Reminders
**Short description (80 characters):** Simple, private to-do lists with My Day, reminders and quick entry.

**Description:**
Daywork is a clean, fast to-do app that keeps your tasks where they belong: with you.

• My Day – plan today with a fresh list every morning, plus smart suggestions
• Important, Planned and custom lists with colors and emoji
• Steps, notes, due dates, reminders and repeating tasks
• Quick entry: type “Call dentist tomorrow at 9am !” and Daywork sets the date, reminder and star
• Works offline, light and dark theme, English and German
• Backup and restore: move your tasks to another device with a single file

Privacy first: no account, no server, no ads, no tracking. Your tasks are stored only on your device.

**Keywords:** to-do, tasks, checklist, reminders, planner, my day, productivity, offline

*Später ergänzen (mit Sync):*
• Sync across all your devices through your own Microsoft OneDrive
• Optional: reminders as Outlook calendar events, so you're notified even when the app is closed
Daywork is an independent app and is not affiliated with Microsoft.

### Deutsch

**Name:** Daywork – Aufgaben & Erinnerungen
**Kurzbeschreibung (80 Zeichen):** Einfache, private Aufgabenlisten mit „Mein Tag“, Erinnerungen und Schnelleingabe.

**Beschreibung:**
Daywork ist eine übersichtliche, schnelle Aufgaben-App, und deine Aufgaben bleiben bei dir.

• Mein Tag: jeden Morgen eine frische Liste für heute, mit Vorschlägen
• Wichtig, Geplant und eigene Listen mit Farben und Emoji
• Schritte, Notizen, Fälligkeiten, Erinnerungen und Wiederholungen
• Schnelleingabe: „Zahnarzt anrufen morgen um 9 !“ setzt Datum, Erinnerung und Stern
• Funktioniert offline, helles und dunkles Design, Deutsch und Englisch
• Sichern und Einspielen: Aufgaben mit einer einzigen Datei auf ein anderes Gerät mitnehmen

Datenschutz zuerst: kein Konto, kein Server, keine Werbung, kein Tracking. Deine Aufgaben liegen nur auf deinem Gerät.

**Stichwörter:** Aufgaben, To-do, Checkliste, Erinnerungen, Planer, Mein Tag, Produktivität, offline

*Später ergänzen (mit Sync):*
• Abgleich über alle Geräte mit deinem eigenen Microsoft OneDrive
• Optional: Erinnerungen als Outlook-Termine, damit du auch bei geschlossener App benachrichtigt wirst
Daywork ist eine unabhängige App und steht in keiner Verbindung zu Microsoft.

### Screenshots

Fertig im Ordner `store-assets/` (2160×1350): `en-1` bis `en-4` für den englischen, `de-1` bis `de-4` für den deutschen Eintrag. Microsoft verlangt mindestens 1, empfohlen sind 4.
