# Ahmad Alabbas — personal blog and private dashboard

A white background, pure black navigation and footer, rounded editorial blocks, and a coordinated yellow, fern green, lilac, apricot, and pink palette. Includes 11 articles, 29 book summaries with real edition covers, ten London trip photographs, one supplied KFUPM photograph on About, and selected article YouTube explainers. The homepage bookshelf loops through all books and supports pause, swipe and reduced motion. The Laqman article remains in Articles and is absent from About.

## Arabic and SEO update — October 10, 2026

English stays at `/`; Arabic lives at `/ar/` with RTL layout and self-hosted IBM Plex Sans Arabic. The same 11 articles have complete Arabic translations. Both galleries share the same photos. Books have independent English and Arabic shelves: the Arabic shelf starts empty and you add its own titles in the dashboard. Article editors include Arabic translation fields and a draft/published control; books include a language selector. Gallery, Home, About, Work, and identity settings include Arabic text fields.

See BILINGUAL-UPDATE.md for updating an already installed Hostinger website. Existing database content, accounts, uploads, messages, and private configuration are preserved. Sign in to /admin/ after uploading to apply the idempotent migration. Changed original articles receive draft translations for review. Do not rerun the installer.

SEO includes canonical URLs, reciprocal hreflang, unique descriptions, Article/Book/Person/Breadcrumb/ImageGallery structured data, social image previews, descriptive image text, and a dynamic bilingual image sitemap. No fake ratings or traffic claims. Submit the sitemap after updating the public domain. Search-engine indexing and rankings are not guaranteed.

## Deploy to Hostinger

Upload and extract ahmadalabbas-hostinger-upload.zip into your domain's public_html. This release adds PHP and a database: it requires the one-time setup in HOSTINGER-SETUP.md. The working dashboard will be https://ahmadalabbas.com/admin/.

Create a dedicated Hostinger MySQL database, put your configured blog-config.php in a private folder beside public_html, then visit /admin/setup.php to create your account. Do not upload configured secrets into public_html or send them in chat. No npm or Node server is required on Hostinger.

The complete source ZIP includes public/ (the deployable PHP website), source/ (authoring code and originals), HOSTINGER-SETUP.md, and blog-config.example.php (also included under source/). Upload only public's contents. Keep source and original images offline.

## Your dashboard

Manage articles, book summaries, photo and illustration uploads, YouTube videos, gallery order and alt text, Home/About/Work text, contact messages, newsletter subscriber exports, blog settings, and your password. Save drafts privately, preview saved entries, publish, edit, or delete. Existing content imports once during installation. Contact messages are saved in your dashboard; automatic notification emails and newsletter campaigns need a separate email provider.

Cookie Accept and Reject are equally prominent. An essential cookie remembers the choice for 180 days; the footer reopens preferences. No analytics or advertising scripts are installed. Embedded YouTube players are disabled until the visitor accepts optional content and chooses Play; Reject removes any loaded player. The Watch on YouTube link is always available. Admin sign-in uses its own essential session cookie.

## Preview and development

The ChatGPT-hosted Site is static. It shows the blog, cookie banner, and a read-only dashboard design preview at admin-preview.html. It cannot execute the Hostinger PHP backend.

Install the build dependency with `python3 -m pip install -r requirements.txt`. Run python3 build.py and python3 validate.py from source for the static preview. build_hostinger.py creates the complete backend output from the static build and backend files. JSON content is the initial seed only; after installation, edit live content in the dashboard and back up the database.

Illustration prompts and paths are in ILLUSTRATIONS.md. Book cover sources and ISBNs are in assets/book-covers/credits.json. Source Serif 4 and DM Sans are locally hosted under the SIL Open Font License. No Gates Notes assets or proprietary source are included.

PHP 8.3 integration checks exercised setup, authentication, CRUD publishing, draft protection, preview, contact, signup/unsubscribe, image validation/upload, password change, and sitemap using a local SQLite test database. MySQL/Hostinger configuration must be verified on your hosting account. Browser visual testing was unavailable.
