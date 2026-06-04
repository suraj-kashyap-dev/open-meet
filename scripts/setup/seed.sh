seed_demo_data() {
  if [ "$SEED" != true ]; then
    return
  fi

  if [ "$SKIP_DB" = true ]; then
    warn "Skipped seeding (--skip-db)"
    return
  fi

  step "Seeding demo departments + users"
  pnpm --filter @open-meet/server db:seed
  ok "Demo departments and users seeded"
}
