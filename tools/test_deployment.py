"""Exercise packaging and non-destructive update extraction without a live host."""
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

repo = Path(__file__).resolve().parent.parent
subprocess.run(['python3', str(repo / 'tools/package_hostinger.py')], check=True)
with tarfile.open(repo / 'artifacts/hostinger-update.tar.gz') as archive:
    names = archive.getnames()
assert 'app.php' in names and '.htaccess' in names
assert 'admin/setup.php' not in names
assert not any(n.startswith(('assets/uploads/', 'private/')) for n in names)
assert not any(Path(n).is_absolute() or '..' in Path(n).parts for n in names)

with tempfile.TemporaryDirectory(prefix='blog-deploy-check-') as temporary:
    temp = Path(temporary)
    live = temp / 'public_html'
    live.mkdir()
    sentinels = {
        'assets/uploads/existing-image.webp': b'existing uploaded media',
        'admin/setup.php': b'existing installer state',
        'private/blog-config.php': b'existing private test configuration',
        'database.sqlite': b'existing database',
        'unmanaged.txt': b'existing unmanaged file',
    }
    for name, data in sentinels.items():
        file = live / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
    (live / 'styles.css').write_text('old release')
    shim = temp / 'bin'
    shim.mkdir()
    fake_ssh = shim / 'ssh'
    fake_ssh.write_text('''#!/usr/bin/env python3
import os, subprocess, sys
assert 'StrictHostKeyChecking=yes' in sys.argv
command = sys.argv[-1].replace('/home/test/domains/example.test/public_html', os.environ['TEST_LIVE_PATH'])
sys.exit(subprocess.run(['bash', '-c', command], stdin=sys.stdin.buffer).returncode)
''')
    fake_ssh.chmod(0o700)
    environment = {
        **os.environ,
        'PATH': str(shim) + os.pathsep + os.environ['PATH'],
        'HOSTINGER_SSH_HOST': 'example.test',
        'HOSTINGER_SSH_USER': 'test',
        'HOSTINGER_SSH_PORT': '65002',
        'HOSTINGER_DEPLOY_PATH': '/home/test/domains/example.test/public_html',
        'HOSTINGER_SSH_KEY': 'isolated test placeholder',
        'HOSTINGER_KNOWN_HOSTS': 'isolated test placeholder',
        'TEST_LIVE_PATH': str(live),
    }
    subprocess.run(['bash', str(repo / 'tools/deploy_hostinger.sh')], env=environment, check=True, capture_output=True)
    for name, data in sentinels.items():
        assert (live / name).read_bytes() == data, f'Update changed {name}'
    assert (live / 'styles.css').read_bytes() == (repo / 'source/hostinger/styles.css').read_bytes()
    assert (live / 'app.php').is_file()
    invalid = {**environment, 'HOSTINGER_DEPLOY_PATH': '/home/test/../public_html'}
    result = subprocess.run(['bash', str(repo / 'tools/deploy_hostinger.sh')], env=invalid, capture_output=True)
    assert result.returncode != 0, 'Unsafe target accepted'
    missing = {**environment}
    missing.pop('HOSTINGER_SSH_KEY')
    result = subprocess.run(['bash', str(repo / 'tools/deploy_hostinger.sh')], env=missing, capture_output=True)
    assert result.returncode != 0, 'Missing SSH key accepted'
print('PASS: release files updated; uploads, private config, database, installer and unrelated files preserved; unsafe/missing settings rejected.')
