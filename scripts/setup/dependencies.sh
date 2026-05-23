install_dependencies() {
  if [ "$SKIP_INSTALL" = true ]; then
    warn "Skipped pnpm install (--skip-install)"
    return
  fi

  step "Installing workspace dependencies"
  pnpm install
  ok "Dependencies installed"
}
