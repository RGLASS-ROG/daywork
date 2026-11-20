# Daywork

A simple, fast to-do app: My Day, Important, Planned, custom lists, steps, reminders, repeating tasks,
notes and natural quick entry (“Call dentist tomorrow at 9am !”). English and German.

Your data stays on your device and, if you sign in, is synced through **your own OneDrive**
(file `Apps/Daywork/daywork.json`). There is no Daywork server, no account with us and no tracking.

Privacy policy and legal notice: [privacy.html](privacy.html)

## Run locally

```powershell
node serve.js
```

Then open <http://localhost:5173/>. Without a client ID, Daywork runs locally in the browser only.

## Connect OneDrive (one-time, about 5 minutes)

1. Open <https://entra.microsoft.com> and sign in with your Microsoft account.
   If the portal says you have no directory, create a free Azure account at <https://azure.microsoft.com/free>.
2. **Identity → Applications → App registrations → New registration**
   - Name: `Daywork`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: platform **Single-page application (SPA)**, `http://localhost:5173/`
3. Copy the **Application (client) ID** from the overview page into `config.js` as `clientId`.
4. Optional: **API permissions → Add a permission → Microsoft Graph → Delegated**:
   `Files.ReadWrite.AppFolder` and `Calendars.ReadWrite`. Otherwise Daywork asks for them at sign-in.
5. Reload Daywork, click the sync button at the bottom left, then **Sign in with Microsoft**.

Daywork can only see its own app folder in your OneDrive, no other files.
The client ID is not a secret and may be public.

## Deploy (GitHub Pages)

Enable *Settings → Pages* for branch `main`, then add `https://<user>.github.io/<repo>/` (with trailing slash)
as an additional **SPA redirect URI** in the app registration.
On a phone, open the page and choose **Add to Home Screen**.

## Reminders

- While Daywork is open (also in the background), notifications come from the browser or operating system.
- When Daywork is closed, a web app without a server cannot deliver notifications. For that, turn on
  **Add to Outlook calendar** in the settings: each reminder becomes a 15-minute event with an alert in your
  Outlook calendar (category “Daywork”), so Outlook reminds you on all devices.
  Completed or deleted tasks remove their event again.

## How sync works

Every list and task carries a timestamp. Local and OneDrive data are merged per item, and the newer one wins.
Deleted items are kept as tombstones for 60 days so other devices learn about them. Write conflicts are detected
through the file's eTag, and the merge is then repeated.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | user interface |
| `i18n.js` | English/German texts, migration from the former name “Tagwerk” |
| `store.js` | local storage, merging |
| `cloud.js` | sign-in (MSAL), OneDrive sync, Outlook events |
| `sw.js`, `manifest.webmanifest`, `icons/` | installable app, works offline |
| `privacy.html` | privacy policy and legal notice (EN/DE) |
| `vendor/msal-browser.min.js` | Microsoft Authentication Library 3.30.0 (MIT) |

## License

© 2026. All rights reserved. The source code is visible for transparency; it is not licensed for reuse.
Third-party components keep their own licenses (see `vendor/msal-LICENSE`).
