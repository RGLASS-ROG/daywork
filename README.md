# Tagwerk

Aufgaben-App als Ersatz für Microsoft To Do. Mein Tag, Wichtig, Geplant, eigene Listen, Schritte,
Erinnerungen, Wiederholungen, Notizen, Schnelleingabe („Zahnarzt morgen um 9 !“).
Die Daten liegen lokal auf jedem Gerät und werden über **deinen OneDrive** abgeglichen
(Datei `Apps/Tagwerk/tagwerk.json`). Einen eigenen Server gibt es nicht.

## Lokal starten

```powershell
node serve.js
```

Dann <http://localhost:5173/> öffnen. Ohne Client-ID läuft Tagwerk nur lokal im Browser.

## OneDrive anbinden (einmalig, ca. 5 Minuten)

1. <https://entra.microsoft.com> öffnen und mit deinem Microsoft-Konto anmelden.
   Falls das Portal meldet, dass dir ein Verzeichnis fehlt: unter <https://azure.microsoft.com/free>
   ein kostenloses Azure-Konto anlegen. Das kostet nichts, Microsoft verlangt aber eine Kreditkarte zur Identitätsprüfung.
2. **Identität → Anwendungen → App-Registrierungen → Neue Registrierung**
   - Name: `Tagwerk`
   - Unterstützte Kontotypen: **Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten**
   - Umleitungs-URI: Plattform **Single-Page-Anwendung (SPA)**, Adresse `http://localhost:5173/`
3. Auf der Übersichtsseite die **Anwendungs-ID (Client-ID)** kopieren und in `config.js` bei `clientId` eintragen.
4. Optional unter **API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph → Delegiert**:
   `Files.ReadWrite.AppFolder` und `Calendars.ReadWrite`. Ohne diesen Schritt fragt Tagwerk die Berechtigungen bei der Anmeldung selbst ab.
5. Tagwerk neu laden, unten links auf den Sync-Knopf klicken und dann auf **Mit Microsoft anmelden**.

Tagwerk sieht nur seinen eigenen App-Ordner in deinem OneDrive, keine anderen Dateien.
Die Client-ID ist kein Geheimnis und darf öffentlich im Code stehen.

## Im Internet bereitstellen (für das Handy)

Zum Beispiel kostenlos über GitHub Pages: Repository veröffentlichen, unter *Settings → Pages* den Branch
`main` freigeben und dann die Adresse `https://<benutzer>.github.io/<repo>/` in der App-Registrierung als
**weitere SPA-Umleitungs-URI** eintragen (mit Schrägstrich am Ende).
Auf dem Handy die Seite öffnen und **Zum Startbildschirm hinzufügen** wählen.

## Erinnerungen

- Solange Tagwerk geöffnet ist (auch im Hintergrund), kommen Benachrichtigungen vom Browser bzw. Betriebssystem.
- Ist Tagwerk geschlossen, kann eine Web-App ohne eigenen Server keine Nachrichten zustellen. Dafür gibt es in den
  Einstellungen **In Outlook-Kalender eintragen**: Jede Erinnerung wird als 15-Minuten-Termin mit Alarm
  (Kategorie „Tagwerk“) in deinem Outlook-Kalender angelegt. Outlook erinnert dich dann auf allen Geräten.
  Erledigte oder gelöschte Aufgaben räumen ihren Termin selbst wieder weg.

## Wie der Abgleich funktioniert

Jede Liste und Aufgabe trägt einen Zeitstempel. Beim Abgleich werden lokaler und OneDrive-Stand pro Eintrag
zusammengeführt, und der neuere gewinnt. Gelöschtes bleibt 60 Tage als Markierung erhalten, damit andere Geräte es
mitbekommen. Schreibkonflikte erkennt Tagwerk über das eTag der Datei und führt den Abgleich dann neu aus.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `styles.css`, `app.js` | Oberfläche |
| `store.js` | lokaler Speicher, Zusammenführen |
| `cloud.js` | Anmeldung (MSAL), OneDrive-Abgleich, Outlook-Termine |
| `sw.js`, `manifest.webmanifest`, `icons/` | installierbare App, offline nutzbar |
| `vendor/msal-browser.min.js` | Microsoft Authentication Library 3.30.0 (MIT) |
