#!/usr/bin/env bash
# Make `git add` always run from the repo root, no matter the current dir.
# Installs a shim at ~/.legacy-bin/git and ensures PATH picks it up.

set -Eeuo pipefail

REAL_GIT="$(command -v git || true)"
[[ -n "$REAL_GIT" ]] || { echo "✖ git not found on PATH"; exit 1; }

LEG_BIN="$HOME/.legacy-bin"
mkdir -p "$LEG_BIN"

cat > "$LEG_BIN/git" <<'EOF'
#!/usr/bin/env bash
# Shim: run `git add ...` from repo root so scripts don't miss files.
# Everything else is passed through to real git.

# Resolve real git (recorded at install time to avoid recursion)
REAL_GIT_CMD="__REAL_GIT__"

# If we're inside a repo, get its root
if "$REAL_GIT_CMD" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ROOT="$("$REAL_GIT_CMD" rev-parse --show-toplevel 2>/dev/null)"
else
  ROOT=""
fi

if [[ "$1" == "add" && -n "$ROOT" ]]; then
  # Always run add from the repo root so pathspecs are interpreted from root
  exec "$REAL_GIT_CMD" -C "$ROOT" "$@"
else
  exec "$REAL_GIT_CMD" "$@"
fi
EOF

# Inject the real git path into the shim
sed -i "s#__REAL_GIT__#${REAL_GIT//\//\\/}#g" "$LEG_BIN/git"
chmod +x "$LEG_BIN/git"

# Ensure ~/.legacy-bin is first on PATH for future shells
BASHRC="$HOME/.bashrc"
if ! grep -q 'export PATH="$HOME/.legacy-bin:$PATH"' "$BASHRC" 2>/dev/null; then
  {
    echo ''
    echo '# Prefer legacy bin shims (git add from repo root)'
    echo 'export PATH="$HOME/.legacy-bin:$PATH"'
  } >> "$BASHRC"
  echo "› Added ~/.legacy-bin to PATH in ~/.bashrc"
fi

# Make it active in this shell too
case ":$PATH:" in
  *":$HOME/.legacy-bin:"*) ;;
  *) export PATH="$HOME/.legacy-bin:$PATH" ;;
esac

echo "✓ Installed git shim. Open a NEW Git Bash (or run: source ~/.bashrc)."
echo "  From now on, 'git add .' from any subfolder will stage from the repo root."
