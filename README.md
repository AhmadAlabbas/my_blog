# Ahmad Alabbas blog

Bilingual English/Arabic personal blog with a PHP dashboard for Hostinger.

For automatic deployment from GitHub, follow [HOSTINGER-GITHUB.md](HOSTINGER-GITHUB.md).
Pushes to `main` build and test the site; deployment starts after the one-time
SSH connection settings are configured in GitHub.

Start with [CODEX-START.md](CODEX-START.md) and [source/README.md](source/README.md).
Edit the authoring files in `source/`; generated output is excluded from Git.

## Build and verify

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r source/requirements.txt
cd source
../.venv/bin/python build.py
../.venv/bin/python build_hostinger.py
../.venv/bin/python validate.py
```

`source/public/` is the static preview. `source/hostinger/` is the PHP deployment
output. For a static development server, run `python3 -m http.server 8000
--bind 127.0.0.1 --directory public` from `source/`.

The PHP integration suite is `source/tests/test-cms.mjs`; it requires
`@php-wasm/node` and `@php-wasm/universal` and uses a disposable SQLite database.
The other test files contain snippets already included in that suite.

`source/tests/mobile-layout.mjs` checks the PHP-rendered English/Arabic home and
contact pages at phone, tablet, and desktop widths, including menu opening and
independent bookshelf scrolling. It requires `playwright-core` and Chromium.
Run it against an isolated, seeded PHP development site:

```sh
cd source
BLOG_TEST_BASE_URL=http://127.0.0.1:8001 node tests/mobile-layout.mjs
```

In this cloud environment, the dependencies live in `/workspace/blog-tools/`,
and `node /workspace/blog-tools/serve-php.mjs` starts the disposable PHP 8.3/
SQLite development site used by that check. It serves local rendering checks;
it is not a production server or a connection to the Hostinger database.

## Existing Hostinger installation

Follow [source/BILINGUAL-UPDATE.md](source/BILINGUAL-UPDATE.md) for updates.
Back up the live database and files before deployment. Preserve
`private/blog-config.php`, `assets/uploads`, and dashboard content. Never rerun
the installer on an existing installation. GitHub contains source and seed
content, not the live database or credentials.
