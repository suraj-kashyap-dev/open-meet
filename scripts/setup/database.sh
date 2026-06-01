prepare_database() {
  if [ "$SKIP_DB" = true ]; then
    warn "Skipped database setup (--skip-db)"
    return
  fi

  step "Preparing the database"
  pnpm --filter @open-meet/server exec prisma generate
  ok "Prisma client generated"

  if [ "$FORCE" = true ]; then
    warn "Resetting database - every table will be dropped (--force)"
    pnpm --filter @open-meet/server exec prisma migrate reset --force --skip-seed
    ok "Database reset and migrations re-applied"
  else
    pnpm --filter @open-meet/server exec prisma migrate deploy
    ok "Migrations applied"
  fi
}
