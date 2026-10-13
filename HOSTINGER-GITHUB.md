# Develop with Codex and deploy through GitHub

Codex edits the source, GitHub stores the changes and runs the checks, and GitHub
Actions uploads the tested PHP release to Hostinger over SSH. Once connected,
each push to `main` deploys automatically. Pull requests run checks without
deploying. GitHub's Actions tab shows build and deployment results.

Use your domain's regular PHP hosting. Hostinger's Node.js Git import wizard
does not run this site's PHP dashboard. You do not need that importer or the
Hostinger GitHub app for this workflow.

## One-time connection

1. In Hostinger, open Websites, your domain's dashboard, then SSH Access.
   Enable SSH and record the host, username, and port. Use the actual values
   Hostinger shows; the port is often 65002.
2. Back up the existing files and database before the first automated update.
3. Create a dedicated SSH key on your own computer:

   ```sh
   ssh-keygen -t ed25519 -C github-hostinger -f hostinger_github
   ```

   Leave the passphrase empty for automated deployment. Add the contents of
   `hostinger_github.pub` to the hosting account's authorized SSH keys using
   Hostinger's SSH key management. Keep `hostinger_github` private; do not commit
   it or send it in chat.
4. Test the key and confirm the server identity through a trusted Hostinger
   connection:

   ```sh
   ssh -i hostinger_github -p YOUR_PORT YOUR_USER@YOUR_HOST
   ```

   In that session, find the absolute document-root path for the existing
   domain. It usually resembles
   `/home/u123456789/domains/ahmadalabbas.com/public_html`. Use the actual
   directory; do not create or replace the website to obtain a path.
5. In [GitHub repository settings](https://github.com/AhmadAlabbas/my_blog/settings/secrets/actions),
   open Settings → Secrets and variables → Actions. Add these **repository
   variables** under Variables:

   | Variable | Value |
   | --- | --- |
   | `HOSTINGER_SSH_HOST` | SSH server hostname or IPv4 address |
   | `HOSTINGER_SSH_USER` | SSH username |
   | `HOSTINGER_SSH_PORT` | SSH port shown in hPanel |
   | `HOSTINGER_DEPLOY_PATH` | Absolute `/home/.../public_html` path for this domain |
   | `HOSTINGER_DEPLOY_ENABLED` | Keep `false` until the connection settings are complete; then set `true` |

   Under Secrets, add these **repository secrets**:

   | Secret | Value |
   | --- | --- |
   | `HOSTINGER_SSH_KEY` | Complete private key file, including BEGIN/END lines |
   | `HOSTINGER_KNOWN_HOSTS` | OpenSSH known-hosts record for the verified Hostinger SSH server |

   After a verified SSH connection, its host-key record is in your computer's
   `.ssh/known_hosts`. For a nonstandard port, retrieve the matching record:

   ```sh
   ssh-keygen -F '[YOUR_HOST]:YOUR_PORT' -f ~/.ssh/known_hosts
   ```

   For port 22, use `YOUR_HOST` instead of `[YOUR_HOST]:YOUR_PORT`. Store the
   matching record in the secret. The workflow requires strict host-key
   checking and does not accept unknown servers automatically.
6. Set `HOSTINGER_DEPLOY_ENABLED` to `true`. Open
   [Actions](https://github.com/AhmadAlabbas/my_blog/actions), select
   **Verify and deploy to Hostinger**, and click **Run workflow** on `main`.
   Confirm that build, PHP integration, phone-layout checks, and deployment
   pass. Check the live English/Arabic pages, admin login and forms afterward.
   Clear Hostinger's website cache if it continues showing old files.

## Routine development

Ask Codex for a change. Review the GitHub diff or pull request. When the tested
change reaches `main`, the workflow builds and deploys it. There are no routine
ZIP uploads. Set `HOSTINGER_DEPLOY_ENABLED` to `false` to pause deployment while
keeping build checks enabled.

The release contains generated website files at the web-root level, including
`.htaccess`. It excludes `admin/setup.php`, `assets/uploads`, private database
configuration and local database files. Deployment overwrites matching release
files and does not delete unrelated files. It never runs the installer or resets
the existing database. Live dashboard content stays in that database; JSON in
GitHub is seed data for fresh installations, not a backup of live edits.

This workflow updates an existing installation. A brand-new site requires the
initial private PHP/MySQL configuration and installation described in
`source/HOSTINGER-SETUP.md` before enabling automatic updates.

## Local checks

Install Python dependencies from `source/requirements.txt` and the pinned Node
test packages (`@php-wasm/node@3.1.54`, `@php-wasm/universal@3.1.54`,
`playwright-core@1.64.0`) in `source/node_modules`. From `source`, build the
static and PHP outputs, run `validate.py`, and run `node tests/test-cms.mjs`.
From the repository root, run `node tools/serve-php.mjs` for a disposable PHP
rendering site. In another terminal, run `node source/tests/mobile-layout.mjs`.
Chromium must be installed; `CHROMIUM_PATH` can override its location.

`python tools/package_hostinger.py` creates the update archive under ignored
`artifacts/`. `python tools/test_deployment.py` checks archive exclusions and
exercises the deployment script against an isolated local SSH stand-in.
This proves file preservation, not real Hostinger connectivity.
