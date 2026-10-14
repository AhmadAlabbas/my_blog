# Ahmad Alabbas — Node.js blog

An Express app with an authenticated dashboard, bilingual English/Arabic pages,
independent bookshelves, a shared gallery, contact messages, newsletter signup,
and image uploads. Node.js runs the public site and backend. PHP and Python are
not required to build or run this version.

## Homepage and discovery

In the dashboard's **Home, About & Work** section, choose three featured
articles and edit the welcome introduction in English and Arabic. Existing
page text stays editable. An unavailable Arabic translation is replaced by
another published Arabic article in the featured selection.

Article and book collections support combined text search and topic filters.
`/search.html` and `/ar/search.html` search all published content in that
language. Native GET forms work without JavaScript; dialog search also handles
Arabic diacritics. Filtered pages stay out of the search index.

Articles have estimated reading time, heading links, and recommendations
ranked by shared topic and title/subtitle terms. The mobile browser checks
cover home, contact, collections, reading pages, and search.

## Develop with Codex

Use Node.js 24 (Node 22.13+ is also supported):

```sh
npm ci
npm run build
npm test
npm run dev
```

`npm start` starts the server; `PORT` defaults to 3000. Local development uses an
isolated SQLite database in ignored `.local-data/`. Local session/setup secrets
are generated there with restrictive permissions. To create a local account,
open `/admin/setup` and read the local setup token from `.local-data/setup-token`
on your own machine. Never commit it or send it in chat. Setup locks after an
admin exists.

Edit backend behavior in `server/`, layouts in `web/templates/`, and shared
frontend code/styles/assets in `source/`. Run `npm run build` after changing
layouts or assets. The dashboard edits the database. Seed JSON is not a backup
of live dashboard edits: `source/backend/_cms/seed.json` and `arabic.json` provide
initial content/translations and are read as data only.

`npm test` covers setup locking, authentication, CSRF, publishing/drafts,
translations, shelf separation, gallery/settings/video editing, uploads,
messages, subscribers/unsubscribe, SEO, migration preservation, and legacy
password compatibility. GitHub Actions runs it with SQLite and MySQL. Run
`npm run test:mobile` against the running Node app for mobile checks. Chromium
is required; `CHROMIUM_PATH` overrides `/usr/bin/chromium`. It checks both
languages at seven viewport widths, menus and independent bookshelf scrolling.
Browser emulation does not replace testing on a physical iPhone.

## Deploy through GitHub

Follow [HOSTINGER-GITHUB.md](HOSTINGER-GITHUB.md). Import this repository as a
Node.js app with Node 24, `npm run build`, and `npm start`. Root `package.json`
and its lockfile enable Hostinger's full Node import.

Production requires persistent MySQL and an uploads directory that survives
deployments, configured through Hostinger's secure environment settings.
See `.env.example` for names. Existing `aa_*` tables and PHP bcrypt passwords
are supported; missing bilingual metadata is added without replacing entries.
Back up the current site/database/uploads and verify a staging Node deployment
before switching the live domain. Hostinger connection and domain cutover are
separate steps.

Old PHP/Python tools remain as migration references. The active GitHub workflow
tests Node.js and no longer deploys the PHP release.
