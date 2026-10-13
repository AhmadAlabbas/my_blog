"""Package generated release files for updating an existing installation."""
from pathlib import Path
import tarfile

repo = Path(__file__).resolve().parent.parent
source = repo / 'source/hostinger'
out = repo / 'artifacts/hostinger-update.tar.gz'
assert (source / 'app.php').is_file() and (source / '.htaccess').is_file(), 'Build the PHP website first'
out.parent.mkdir(exist_ok=True)
with tarfile.open(out, 'w:gz') as archive:
    for file in sorted(source.rglob('*')):
        if not file.is_file():
            continue
        name = file.relative_to(source).as_posix()
        if name == 'admin/setup.php' or name.startswith(('assets/uploads/', 'private/')):
            continue
        if file.name == 'blog-config.php' or file.suffix in {'.sqlite', '.sqlite3', '.db'}:
            continue
        archive.add(file, arcname=name, recursive=False)
print(f'Prepared {out.name}; installer, private configuration and uploads excluded.')
