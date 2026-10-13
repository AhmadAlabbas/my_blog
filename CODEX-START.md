# Ahmad Alabbas blog

Edit the files in source/. Read source/README.md, HOSTINGER-SETUP.md, BILINGUAL-UPDATE.md and QA.md first.

All optimized website assets and their licenses are included. Original high-resolution working images and duplicate generated deployment folders were excluded to fit the transfer limit. They are not required for the normal build.

Install Python dependencies from source/requirements.txt. From source run python build.py, python build_hostinger.py and python validate.py. These recreate public/ (static preview) and hostinger/ (PHP deployment). PHP/MySQL features need a configured database to run; read setup instructions and use an isolated development database.

The existing site is bilingual (en/ar), with RTL Arabic, paired article translations, independent bookshelves and shared translated gallery. Preserve content and the Hostinger installation. Never overwrite live private/blog-config.php, assets/uploads or the database, and do not rerun the installer on the existing site. Dashboard edits and uploaded images may be newer than this export. Ask for a current backup if needed.

This conversation's deployment was confirmed working by Ahmad on October 10, 2026.
