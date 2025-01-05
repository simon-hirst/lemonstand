#!/usr/bin/env bash
# Install a robust shim so BSD/macOS "sed -i '' …" works on Git Bash (GNU sed).
# Also forces LF endings to avoid CRLF parse errors during install.

set -Eeuo pipefail

LEG_BIN="$HOME/.legacy-bin"
mkdir -p "$LEG_BIN"

# Find the REAL sed without hitting any previous shim
strip="$HOME/.legacy-bin"
PATH_NO_LEG="${PATH//:$strip/}"; PATH_NO_LEG="${PATH_NO_LEG//$strip:/}"; PATH_NO_LEG="${PATH_NO_LEG//$strip/}"
REAL_SED="$(PATH="$PATH_NO_LEG" command -v sed || true)"
[[ -x "$REAL_SED" ]] || REAL_SED="/usr/bin/sed"
[[ -x "$REAL_SED" ]] || { echo "✖ Could not locate real sed"; exit 1; }

WRAP="$LEG_BIN/sed"

# Write the wrapper with LF endings
{
  printf '%s\n' '#!/usr/bin/env bash'
  printf '%s\n' 'set -Eeuo pipefail'
  printf '%s\n' "REAL_SED=\"$REAL_SED\""
  printf '%s\n' 'args=()'
  printf '%s\n' 'while [[ $# -gt 0 ]]; do'
  printf '%s\n' '  case "$1" in'
  printf '%s\n' '    -i)'
  printf '%s\n' '      # Convert: -i ""  -> -i   (GNU sed "no backup" form)'
  printf '%s\n' '      if [[ $# -ge 2 && "$2" == "" ]]; then args+=("-i"); shift 2; continue; fi'
  printf '%s\n' '      ;;'
  printf "%s\n" "    -i'')"   # Convert: -i'' -> -i
  printf '%s\n' '      args+=("-i"); shift; continue;;'
  printf '%s\n' '  esac'
  printf '%s\n' '  args+=("$1"); shift'
  printf '%s\n' 'done'
  printf '%s\n' 'exec "$REAL_SED" "${args[@]}"'
} > "$WRAP"

# Force LF endings on Windows just in case
awk '{ sub(/\r$/, ""); print }' "$WRAP" > "$WRAP.tmp" && mv -f "$WRAP.tmp" "$WRAP"
chmod +x "$WRAP"

# Put ~/.legacy-bin first on PATH for future shells
BASHRC="$HOME/.bashrc"
if ! grep -q 'export PATH="$HOME/.legacy-bin:$PATH"' "$BASHRC" 2>/dev/null; then
  {
    echo ''
    echo '# Prefer legacy bin shims (sed compat)'
    echo 'export PATH="$HOME/.legacy-bin:$PATH"'
  } >> "$BASHRC"
  echo "› Added ~/.legacy-bin to PATH in ~/.bashrc"
fi

# Activate for current shell
case ":$PATH:" in *":$HOME/.legacy-bin:"* ) ;; *) export PATH="$HOME/.legacy-bin:$PATH";; esac

# Self-test (transforms -i '' to -i and succeeds)
tmp="$(mktemp)"; printf 'foo\n' > "$tmp"
"$WRAP" -i '' 's/foo/bar/' "$tmp"
if grep -q '^bar$' "$tmp"; then
  echo "✓ sed shim OK"
else
  echo "✖ sed shim test failed"; cat "$tmp"; rm -f "$tmp"; exit 1
fi
rm -f "$tmp"
