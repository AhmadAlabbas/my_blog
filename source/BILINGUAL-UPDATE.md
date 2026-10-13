# Ahmad Alabbas: Arabic + SEO update

This is an update for your existing, working Hostinger installation.

## Upload the update
1. Back up public_html and your MySQL database using Hostinger.
2. Upload ahmadalabbas-arabic-seo-update.zip to the domain’s public_html. Extract it and replace matching release files. The ZIP contents belong directly inside public_html, not inside another nested folder. Include the .htaccess file.
3. Keep private/blog-config.php, your existing database, and assets/uploads. Do not remove old files first. This update has no secrets and does not contain the installer.
4. Sign in at https://ahmadalabbas.com/admin/ with your existing account. The authenticated dashboard creates the new bilingual tables once and preserves your data. Do not rerun setup.php.
5. Open https://ahmadalabbas.com/ar/ and https://ahmadalabbas.com/sitemap.xml. Check a translated article and the gallery. Clear Hostinger cache if you still see the previous version; CSS includes fresh version identifiers.

## Check forms after uploading
Submit one English and one Arabic contact message and newsletter signup. Confirm they appear under Messages and Subscribers in your dashboard. These forms store records; automatic email notifications and newsletter campaigns require a separate email service.

## Bilingual editing
- Articles: one shared slug, image, publication date, category, and two text versions. Review Arabic fields and publish both. Keep the meanings in sync when editing. A missing/draft Arabic translation is hidden and omitted from hreflang/sitemap.
- Books: select English or Arabic bookshelf in the book editor. A book belongs only to that language. The existing 29 English books remain English; Arabic starts empty until you add separate titles.
- Gallery: both languages use the exact same image and order. Enter Arabic title, description, and category in the gallery editor.
- Home/About/Work and blog settings: separate Arabic text fields are available.
- If an original article was edited on Hostinger, its supplied Arabic translation starts as a draft for review. English content is never reset from seed data.

## Enable search discovery
1. Open Google Search Console and add ahmadalabbas.com as a Domain property. Verify ownership with its DNS TXT record in Hostinger. Never paste account credentials into chat.
2. In Sitemaps, submit https://ahmadalabbas.com/sitemap.xml after uploading.
3. Use URL Inspection for the English homepage, /ar/, an article in each language, and /gallery.html. Request indexing after the live test succeeds.
4. You can also verify the domain in Bing Webmaster Tools and submit the same sitemap.

Implemented: canonical URLs, reciprocal en/ar/x-default hreflang, localized metadata, social preview images, Article/Book/Person/Breadcrumb/ImageGallery structured data, descriptive gallery text, crawlable HTML, robots.txt, image sitemap, locally hosted fonts, and shared optimized images.

These improvements help search engines understand and discover the site. Indexing, image inclusion, rich results, and rankings remain search-engine decisions and take time.

## Validation
88 generated pages and 8,011 local links/assets were checked. PHP 8.3 with a disposable SQLite database verifies authenticated migration, article translations, independent books, shared gallery, UTF-8 forms, metadata, image sitemap, and existing dashboard functionality. Browser visual QA was unavailable; MySQL deployment must be checked after the update is uploaded.

## Development
Install Python dependencies from requirements.txt. Run python3 build.py, python3 build_hostinger.py, python3 validate.py. For integration tests install @php-wasm/node and @php-wasm/universal in source, then run node tests/test-cms.mjs. The test uses an isolated temporary directory and never touches your live database.
