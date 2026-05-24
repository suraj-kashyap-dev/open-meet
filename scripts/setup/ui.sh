if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; BLUE=$'\033[0;34m'; YELLOW=$'\033[1;33m'
  RED=$'\033[0;31m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  GREEN=''; BLUE=''; YELLOW=''; RED=''; BOLD=''; NC=''
fi

step() { printf '\n%b▸ %s%b\n' "$BOLD$BLUE" "$1" "$NC"; }
ok()   { printf '%b✓%b %s\n' "$GREEN" "$NC" "$1"; }
warn() { printf '%b!%b %s\n' "$YELLOW" "$NC" "$1"; }
die()  { printf '%b✗ %s%b\n' "$RED$BOLD" "$1" "$NC" >&2; exit 1; }

banner() {
  printf '\n%b' "$BOLD$BLUE"
  cat <<'ART'
 ██████  ██████  ███████ ██    ██   ███    ███ ███████ ███████ ████████
██    ██ ██   ██ ██      ███   ██   ████  ████ ██      ██         ██
██    ██ ██████  █████   ██ ██ ██   ██ ████ ██ █████   █████      ██
██    ██ ██      ██      ██   ███   ██  ██  ██ ██      ██         ██
 ██████  ██      ███████ ██    ██   ██      ██ ███████ ███████    ██
ART
  printf '%b        Real-time video conferencing · Setting Up the Environment%b\n\n' "$BOLD$BLUE" "$NC"
}

usage() {
  cat <<'EOF'
open-meet setup — one command to a running local stack.

Usage:
  ./setup.sh [--force] [--skip-install] [--skip-docker] [--skip-db]

  --force         Regenerate every secret and RESET the database (drops all
                  tables). Overwrites apps/server/.env, apps/web/.env.local,
                  and apps/admin/.env.local.
  --skip-install  Skip dependency installation.
  --skip-docker   Skip `docker compose up` (infra already running).
  --skip-db       Skip Prisma generate + migrate.
  -h, --help      Show this help and exit.
EOF
  exit 0
}
