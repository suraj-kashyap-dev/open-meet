#!/usr/bin/env bash
# Zero-dependency tests for setup.sh and its modules.
# Run: bash scripts/setup/test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIB="$ROOT/scripts/setup"

PASS=0
FAIL=0
if [ -t 1 ]; then G=$'\033[0;32m'; R=$'\033[0;31m'; Y=$'\033[1;33m'; N=$'\033[0m'; else G=''; R=''; Y=''; N=''; fi

section() { printf '\n%b▶ %s%b\n' "$Y" "$1" "$N"; }
pass() { PASS=$((PASS + 1)); printf '  %b✓%b %s\n' "$G" "$N" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf '  %b✗%b %s\n' "$R" "$N" "$1"; }
skip() { printf '  %b•%b %s (skipped)\n' "$Y" "$N" "$1"; }

assert_eq()     { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 - got '$2', want '$3'"; fi; }
assert_ge()     { if [ "${2:-x}" -ge "$3" ] 2>/dev/null; then pass "$1"; else fail "$1 - got '${2:-}', want >= $3"; fi; }
assert_file()   { if [ -f "$2" ]; then pass "$1"; else fail "$1 - missing $2"; fi; }
assert_grep()   { if grep -qE "$2" "$3" 2>/dev/null; then pass "$1"; else fail "$1 - /$2/ not in $3"; fi; }
assert_absent() { if grep -qF -- "$2" "$3" 2>/dev/null; then fail "$1 - found in $3"; else pass "$1"; fi; }

run_setup() { ( cd "$1" && shift && bash setup.sh "$@" ) >/dev/null 2>&1; }

# ── 1. syntax ─────────────────────────────────────────────────────────────
section "Syntax (bash -n)"
for f in "$ROOT/setup.sh" "$LIB"/*.sh; do
  case "$f" in */test.sh) continue ;; esac
  if bash -n "$f"; then pass "$(basename "$f")"; else fail "$(basename "$f")"; fi
done

# ── 2. helper unit tests ──────────────────────────────────────────────────
section "Helpers (utils.sh)"
# shellcheck source=scripts/setup/ui.sh
source "$LIB/ui.sh"
# shellcheck source=scripts/setup/utils.sh
source "$LIB/utils.sh"

u="$(mktemp -d)"

a="$(gen_secret)"
b="$(gen_secret)"
c="$(gen_secret 24)"
assert_eq "gen_secret default length is 50" "${#a}" "50"
assert_eq "gen_secret honors length arg" "${#c}" "24"
if [ "$a" != "$b" ]; then pass "gen_secret values are unique"; else fail "gen_secret values are unique"; fi
if printf '%s' "$a" | grep -qE '^[A-Za-z0-9]+$'; then pass "gen_secret is alphanumeric (safe in .env/yaml)"; else fail "gen_secret is alphanumeric"; fi

printf 'FOO=old\nBAR=keep\n' >"$u/e"
set_env "$u/e" FOO new
set_env "$u/e" NEWKEY hello
assert_eq "set_env replaces an existing key" "$(read_env "$u/e" FOO)" "new"
assert_eq "set_env preserves other keys" "$(read_env "$u/e" BAR)" "keep"
assert_eq "set_env appends a missing key" "$(read_env "$u/e" NEWKEY)" "hello"
assert_eq "read_env returns empty for an absent key" "$(read_env "$u/e" NOPE)" ""

printf 'X=1\n' >"$u/src"
if ( source "$LIB/ui.sh"; source "$LIB/utils.sh"; copy_env_file "$u/src" "$u/dst" ) >/dev/null 2>&1 && [ -f "$u/dst" ]; then
  pass "copy_env_file copies a template"
else
  fail "copy_env_file copies a template"
fi
if ( source "$LIB/ui.sh"; source "$LIB/utils.sh"; copy_env_file "$u/missing" "$u/x" ) >/dev/null 2>&1; then
  fail "copy_env_file dies on a missing source"
else
  pass "copy_env_file dies on a missing source"
fi

# ── 3. integration: env phase against an isolated fixture ─────────────────
section "Integration: env phase (isolated fixture)"
fx="$(mktemp -d)"
mkdir -p "$fx/apps/server" "$fx/apps/web" "$fx/apps/admin" "$fx/docker" "$fx/scripts"
cp "$ROOT/setup.sh" "$fx/setup.sh"
cp -r "$LIB" "$fx/scripts/setup"
cp "$ROOT/apps/server/.env.example" "$fx/apps/server/.env.example"
cp "$ROOT/apps/web/.env.example" "$fx/apps/web/.env.example"
cp "$ROOT/apps/admin/.env.example" "$fx/apps/admin/.env.example"
cp "$ROOT/docker-compose.yml" "$fx/docker-compose.yml"
cp "$ROOT/docker/"* "$fx/docker/" 2>/dev/null || true

if run_setup "$fx" --skip-install --skip-docker --skip-db; then
  pass "setup.sh env phase exits 0 on a clean checkout"
else
  fail "setup.sh env phase exits 0 on a clean checkout"
fi

assert_file "server .env generated" "$fx/apps/server/.env"
assert_file "web .env.local generated" "$fx/apps/web/.env.local"
assert_file "admin .env.local generated" "$fx/apps/admin/.env.local"
assert_file "root .env generated" "$fx/.env"
assert_grep "LIVEKIT_API_KEY normalized to devkey" '^LIVEKIT_API_KEY=devkey$' "$fx/apps/server/.env"

jwt="$(read_env "$fx/apps/server/.env" JWT_ACCESS_SECRET)"
assert_ge "JWT_ACCESS_SECRET is at least 16 chars" "${#jwt}" "16"

ss="$(read_env "$fx/apps/server/.env" LIVEKIT_API_SECRET)"
rs="$(read_env "$fx/.env" LIVEKIT_API_SECRET)"
assert_eq "root .env secret mirrors the server" "$rs" "$ss"

assert_absent "secret never written to docker/livekit.yaml" "$ss" "$fx/docker/livekit.yaml"
assert_absent "secret never written to docker/egress.yaml" "$ss" "$fx/docker/egress.yaml"
assert_absent "secret never written to docker-compose.yml" "$ss" "$fx/docker-compose.yml"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  if ( cd "$fx" && docker compose config 2>/dev/null ) | grep -qF "LIVEKIT_KEYS: 'devkey: $ss'"; then
    pass "compose injects the secret via LIVEKIT_KEYS from root .env"
  else
    fail "compose injects the secret via LIVEKIT_KEYS from root .env"
  fi
else
  skip "compose interpolation check (docker compose unavailable)"
fi

# ── 4. idempotency & --force ──────────────────────────────────────────────
section "Idempotency & --force"
run_setup "$fx" --skip-install --skip-docker --skip-db
assert_eq "re-run preserves the existing secret" "$(read_env "$fx/apps/server/.env" LIVEKIT_API_SECRET)" "$ss"

run_setup "$fx" --force --skip-install --skip-docker --skip-db
fs="$(read_env "$fx/apps/server/.env" LIVEKIT_API_SECRET)"
if [ "$fs" != "$ss" ]; then pass "--force regenerates the secret"; else fail "--force regenerates the secret"; fi
assert_grep "--force keeps the key name devkey" '^LIVEKIT_API_KEY=devkey$' "$fx/apps/server/.env"

# ── 5. writability guard ──────────────────────────────────────────────────
section "Writability guard"
if [ "$(id -u)" -eq 0 ]; then
  skip "guard test (root ignores file permissions)"
else
  printf 'EXISTING=1\n' >"$fx/apps/server/.env"
  chmod 000 "$fx/apps/server/.env"
  if run_setup "$fx" --skip-install --skip-docker --skip-db; then
    fail "guard rejects an unwritable .env"
  else
    pass "guard rejects an unwritable .env"
  fi
  chmod 644 "$fx/apps/server/.env"
fi

rm -rf "$u" "$fx"

# ── summary ───────────────────────────────────────────────────────────────
printf '\n'
if [ "$FAIL" -eq 0 ]; then
  printf '%b✓ %d passed, 0 failed%b\n' "$G" "$PASS" "$N"
  exit 0
fi
printf '%b✗ %d passed, %d failed%b\n' "$R" "$PASS" "$FAIL" "$N"
exit 1
