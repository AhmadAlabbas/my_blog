#!/usr/bin/env bash
set -euo pipefail
for setting in HOSTINGER_SSH_HOST HOSTINGER_SSH_USER HOSTINGER_SSH_PORT HOSTINGER_DEPLOY_PATH HOSTINGER_SSH_KEY HOSTINGER_KNOWN_HOSTS; do
  if [ -z "${!setting:-}" ]; then
    printf 'Missing GitHub setting: %s\n' "$setting" >&2
    exit 1
  fi
done
[[ "$HOSTINGER_SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Invalid SSH host' >&2; exit 1; }
[[ "$HOSTINGER_SSH_USER" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$ ]] || { echo 'Invalid SSH user' >&2; exit 1; }
[[ "$HOSTINGER_SSH_PORT" =~ ^[0-9]{1,5}$ ]] && (( HOSTINGER_SSH_PORT > 0 && HOSTINGER_SSH_PORT <= 65535 )) || { echo 'Invalid SSH port' >&2; exit 1; }
[[ "$HOSTINGER_DEPLOY_PATH" =~ ^/home/[a-zA-Z0-9_./-]+/public_html$ ]] && [[ "$HOSTINGER_DEPLOY_PATH" != *'/../'* ]] && [[ "$HOSTINGER_DEPLOY_PATH" != *'/./'* ]] || { echo 'Use the absolute /home/.../public_html path for this domain' >&2; exit 1; }
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
release="$repo/artifacts/hostinger-update.tar.gz"
test -f "$release"
ssh_files=$(mktemp -d)
trap 'rm -rf "$ssh_files"' EXIT
umask 077
printf '%s\n' "$HOSTINGER_SSH_KEY" > "$ssh_files/key"
printf '%s\n' "$HOSTINGER_KNOWN_HOSTS" > "$ssh_files/known_hosts"
unset HOSTINGER_SSH_KEY HOSTINGER_KNOWN_HOSTS
ssh_args=(-p "$HOSTINGER_SSH_PORT" -i "$ssh_files/key" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ssh_files/known_hosts" -o ConnectTimeout=20)
# Upload only release files; tar extraction never deletes unrelated live files.
# The archive omits the installer, uploaded media and private configuration.
ssh "${ssh_args[@]}" "$HOSTINGER_SSH_USER@$HOSTINGER_SSH_HOST" "test -d '$HOSTINGER_DEPLOY_PATH' && command -v tar >/dev/null"
ssh "${ssh_args[@]}" "$HOSTINGER_SSH_USER@$HOSTINGER_SSH_HOST" "tar --no-same-owner --no-same-permissions -xzf - -C '$HOSTINGER_DEPLOY_PATH'" < "$release"
echo 'Hostinger update uploaded. Existing database and uploaded media were preserved.'
