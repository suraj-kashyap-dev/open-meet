check_prerequisites() {
  step "Checking prerequisites"

  if [ "$(id -u)" -eq 0 ]; then
    warn "Running as root (sudo) uses root's Node/pnpm — not your nvm/fnm version — and creates root-owned files. Prefer running without sudo."
  fi

  have node || die "node not found — install Node 22 LTS."

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" -lt 22 ]; then
    die "Node $(node -v) detected, but pnpm 10 needs Node >= 22.13. If you ran this with sudo, drop it — sudo falls back to root's Node, not your version manager's."
  fi

  have docker || die "docker not found — install Docker."
  docker compose version >/dev/null 2>&1 || die "docker compose v2 plugin not found."

  corepack enable pnpm >/dev/null 2>&1 || true
  have pnpm || die "pnpm not found — enable corepack or run \`npm i -g pnpm\`."

  ok "node $(node -v) · pnpm $(pnpm -v) · $(docker --version | cut -d, -f1)"
}
