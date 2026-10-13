"""Create the deployable PHP/MySQL website; private credentials are never bundled."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
out=root/'hostinger'
if out.exists():shutil.rmtree(out)
shutil.copytree(root/'public',out)
shutil.copytree(root/'backend',out,dirs_exist_ok=True,ignore=shutil.ignore_patterns('hostinger.htaccess'))
shutil.copyfile(root/'backend/hostinger.htaccess',out/'.htaccess')
print('Hostinger PHP package prepared in',out)
