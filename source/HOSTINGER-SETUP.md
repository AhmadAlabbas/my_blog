# Install your private blog dashboard

The Hostinger package adds a real PHP/database backend. The ChatGPT-hosted preview is static: it shows the blog and cookie banner but cannot execute PHP, log you in, or save dashboard changes. Use Hostinger for the working admin dashboard.

## 1. Prepare Hostinger

Use a Hostinger Web or Cloud hosting account with PHP 8.2 or newer and MySQL/MariaDB. This is a custom-code site uploaded with File Manager, not a Hostinger Website Builder project.

In hPanel, open Websites → your domain → Dashboard → Databases → Management. Create a dedicated database and database user. Record the database name, user, password, and host exactly as Hostinger supplies them.

Enable PHP extensions PDO MySQL, Fileinfo, and GD with WebP support. Set upload_max_filesize to at least 8M and post_max_size to at least 10M for media uploads. Use HTTPS for the entire website.

## 2. Upload the website

Back up your existing site outside public_html. Extract ahmadalabbas-hostinger-upload.zip inside this domain’s public_html. app.php, .htaccess, admin/, api/, _cms/, and assets/ must be directly inside public_html. The .htaccess included in this package routes public pages through the database-backed app.

The admin area is /admin/. Do not upload source/, originals/, or database configuration into public_html. The existing article/book content imports automatically during setup.

## 3. Create the private configuration

Beside public_html, create a folder named private. The layout must be:

    your-domain-folder/
      private/blog-config.php
      public_html/app.php
      public_html/admin/

From the complete source ZIP, copy blog-config.example.php to private/blog-config.php. Edit its database details and base_url (https://ahmadalabbas.com).

Replace app_key and setup_token with TWO DIFFERENT random values of at least 32 characters. Use your password manager’s random-password generator. These are not your admin password. Do not paste them in chat or put them in JavaScript.

Limit private configuration permissions to your hosting user (600 where supported). assets/uploads must be writable by PHP (usually 755 for the directory; do not use 777). The package blocks executable uploads and re-encodes accepted images as WebP.

## 4. Create your admin account

Visit https://ahmadalabbas.com/admin/setup.php. Enter the setup token from your private config, your admin email, and a unique password of 12–128 characters.

Setup imports all 29 book summaries, eleven articles, the current gallery collection, and initial About/Work text. The home slideshow and animated miniature worlds are included. A single KFUPM photograph appears on About. Installation locks after the first account is created. Sign in at https://ahmadalabbas.com/admin/.

After setup, clear setup_token in the private configuration and remove admin/setup.php from the live server. Never distribute a configured private file or database backup.

## 5. Use your dashboard

- Articles and books: create, edit, save drafts, publish, and delete. Published changes appear immediately on the public blog. Drafts are hidden. Slug changes change public URLs; keep published slugs stable.
- Editor: paragraphs separated by blank lines; ## introduces a section heading; > introduces a pull quote. HTML is shown as text to keep editing safe.
- Media: upload PNG/JPEG/WebP illustrations and real book covers, then select them on content or gallery entries. Gallery entries have title, alt text, category, and display order. Removing an entry preserves its media file.
- Home, About & Work: change the hero headline, introduction, biography, and project descriptions.
- Blog settings: display name, description, public email, and newsletter introduction.
- Messages: read, mark read, reply through your email app, and delete. The contact form saves messages in the dashboard; it does not send notification emails.
- Subscribers: collect explicit opt-ins, export active email addresses and unsubscribe URLs, and delete records. No email campaign provider is connected. If you send updates through a provider, include each subscriber’s unsubscribe link and update the privacy notice with the provider’s identity. Signup is single opt-in; email confirmation is not configured.
- Account: change your password. Sign-in attempts are rate-limited; sessions expire after 30 minutes of inactivity. Other sessions stop working after a password change.

## Cookies

Accept and Reject have equal prominence. An essential cookie remembers the choice for 180 days. The footer opens preferences again. No optional analytics or advertising scripts are installed. The admin sign-in cookie is essential and unaffected by rejecting optional cookies. Future optional scripts must check window.blogConsent.allowsOptional() before loading and respond to blog:consent changes.

## Verify before using it

Sign in and save a draft; ensure visitors cannot open it. Publish a test entry and check its public URL. Test Contact, a newsletter signup and unsubscribe, image upload, password change, and the cookie choices. Remove test content afterward.

The package does not configure your Hostinger account remotely. Database connection and upload permissions must be tested on your hosting account. Back up both the database and assets/uploads regularly using Hostinger. A static file backup alone will not include your future dashboard content. Do not re-extract a later package over assets/uploads without preserving your uploaded media.

## Password recovery

There is no email-based password reset until an email provider is configured. If locked out, generate a password_hash using PHP on a trusted machine and update password_hash for your admin row in aa_admins through Hostinger phpMyAdmin. Never store plaintext passwords. Removing/reinstalling the database would lose your dashboard content; restore a backup instead.

## References

Hostinger database setup: https://support.hostinger.com/en/articles/1583542-how-to-create-a-new-mysql-database

PHP password hashing: https://www.php.net/manual/en/function.password-hash.php

PHP prepared statements: https://www.php.net/manual/en/pdo.prepared-statements.php

## Release contents and official guidance

Release: October 10, 2026 (Saudi Arabia). Includes 11 articles, 29 books, the continuous homepage bookshelf, the redesigned About page without the family feature, ten London photographs and the authenticated dashboard. The ZIP contains no real database credentials or configured admin account. The setup page creates the schema and imports the included seed, so no separate SQL dump is required for a fresh installation.

Official File Manager reference: https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/

Official MySQL reference: https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/

The upload archive contains the web-root files directly. It does not contain an extra public_html directory. If extraction creates an extra folder, the application files belong directly in the domain web root, not one level below it. The complete source ZIP is for local retention; it contains the same deployable files under public/.
