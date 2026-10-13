# Hostinger Node.js deployment from GitHub

The blog now has a native Node server and dashboard. Hostinger's Node.js GitHub
importer is the correct route for this version. Routine changes need no ZIP
upload or PHP deployment workflow.

## Import the app

1. In Hostinger's Node.js app import screen, select `AhmadAlabbas/my_blog`,
   branch `main`. If missing, grant the Hostinger GitHub app access to this
   repository and refresh the list.
2. Choose a Node.js/Express app, Node **24**, project root **/**, build command
   **npm run build**, and start command **npm start**. If asked for an entry
   file, use `server.js`. This is a running server: do not choose
   “Deploy as static” or treat `dist` as a static output folder.
3. Before starting production, configure these variables securely in Hostinger.
   Use a temporary hostname first when replacing an existing website and set
   `PUBLIC_URL` to that hostname.

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PUBLIC_URL` | Complete HTTPS origin, e.g. `https://ahmadalabbas.com` |
   | `DB_DRIVER` | `mysql` |
   | `MYSQL_HOST` | Exact database host supplied by Hostinger |
   | `MYSQL_PORT` | Supplied port, usually `3306` |
   | `MYSQL_DATABASE` | Database name |
   | `MYSQL_USER` | Database username |
   | `MYSQL_PASSWORD` | Database password, entered in secure settings |
   | `SESSION_SECRET` | Random secret of at least 32 characters |
   | `UPLOAD_DIR` | Absolute writable media path that survives app deployments |
   | `SETUP_TOKEN` | Separate random secret of at least 32 characters, for a new admin only |

   Hostinger supplies `PORT`; the server reads it automatically. If the database
   requires TLS, set `MYSQL_SSL=true`; certificate verification stays enabled.
   Do not put credentials in GitHub or chat.

   Confirm the persistent media path available to your Hostinger Node app. It
   must be outside the replaceable app deployment directory. If your plan does
   not provide this storage, image uploads need another persistent storage
   service before production deployment. Files inside a fresh Git checkout
   must not be assumed to survive subsequent deployments.
4. Deploy. `/health` should return `{"status":"ok","runtime":"node"}`.
   Test `/`, `/ar/`, `/admin/`, publishing, a draft, Contact, signup/unsubscribe
   and an image upload before switching the live domain.
5. Enable automatic deployment from `main` in Hostinger if the importer offers
   it. Hostinger rebuilds on GitHub changes. GitHub Actions also checks the app;
   use passing pull requests before merging for a review/check gate ahead of
   Hostinger's automatic deployment.

## Preserve existing content

Back up MySQL, website files and `assets/uploads` before migration. Configure
Node with the existing database or a restored staging copy. It supports the
existing `aa_*` tables and PHP bcrypt hashes, adds its own session table, and
preserves edited content, messages, subscribers and translation statuses. Seed
imports happen only when both posts and admins are absent. Missing bilingual
metadata is additive.

Copy existing media into the selected persistent storage location, keeping the
original files intact. References stay `/assets/uploads/<filename>` and are
served from `UPLOAD_DIR`.

With existing admins, use your current account; setup is locked. For a new
database, create your account at `/admin/setup` using `SETUP_TOKEN`, then remove
that variable from Hostinger and restart. Do not run either installer on an
existing database.

After staging validation, switch the domain to Node and update `PUBLIC_URL`.
Local tests do not verify actual Hostinger credentials, storage, import or the
live domain switch.

## Development and checks

Run `npm ci`, `npm run build`, `npm test`, `npm start`. No PHP/Python runtime is
needed. `npm run test:mobile` checks the running app with Chromium. CI also runs
integration tests on disposable MySQL 8.4. MySQL tests require `TEST_MYSQL=1`
and `MYSQL_*` settings for a fresh dedicated database ending in `_test`. Never
point tests at production.

Legacy SSH/PHP deployment tools remain as references and are no longer called
by GitHub Actions. `HOSTINGER_SSH_*` GitHub settings are unnecessary for native
Node.js import.
