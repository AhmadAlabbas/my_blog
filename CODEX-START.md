# Ahmad Alabbas blog — Node.js development

Use the existing checkout; cloud tasks are isolated, so do not create a worktree
unless requested. Read README.md and HOSTINGER-GITHUB.md.

The active app is Express on Node.js 24. Run `npm ci`, `npm run build`,
`npm test`, then `npm run dev` or `npm start`. Run `npm run test:mobile`
against the running Node app. PHP/Python are migration references, not part
of Node build/start/deployment.

Backend: server/. Layouts: web/templates/. Shared frontend/styles/assets:
source/. Initial content is source/backend/_cms/seed.json and arabic.json;
afterward edit content in the authenticated Node dashboard at /admin/.
English is /; Arabic is /ar/. Preserve RTL, paired article translations,
independent language bookshelves, artwork licenses and supplied photos.

Local SQLite, secrets and uploads are in ignored .local-data/. Production uses
MySQL and an external persistent uploads path from Hostinger environment
settings. Never commit credentials, database dumps or uploaded media.

The export may be older than live dashboard edits. Preserve the existing
MySQL database, assets/uploads and private/blog-config.php. The Node schema
supports existing aa_* tables and legacy password hashes; migrations preserve
existing content and use draft Arabic translations for changed originals.
Do not rerun the installer on an existing site. Obtain a current backup and
validate a staging Node deployment before a live migration or domain switch.
