print_summary() {
  local admin_email admin_pass
  admin_email="$(read_env "$SERVER_ENV" DEFAULT_ADMIN_EMAIL)"
  admin_pass="$(read_env "$SERVER_ENV" DEFAULT_ADMIN_PASSWORD)"

  printf '\n%b✓ Setup complete.%b\n\n' "$BOLD$GREEN" "$NC"
  printf '%bNext steps:%b\n' "$BOLD" "$NC"
  echo "  1. Start the app:   ${BOLD}pnpm dev${NC}"
  echo "  2. Web (user app):  http://localhost:3000"
  echo "  3. Admin console:   http://localhost:3001"
  echo "  4. API docs:        http://localhost:3002/api/docs"
  echo
  echo "The API auto-creates the default admin (sign in at the admin console):"
  echo "    email:    ${admin_email:-admin@example.com}"
  echo "    password: ${admin_pass:-admin12345}"
  echo "  (edit DEFAULT_ADMIN_* in $SERVER_ENV before first run, or rotate after.)"
  echo
  echo "Reset everything (drops the DB, regenerates secrets):  ${BOLD}./setup.sh --force${NC}"
  printf '\n%bHappy meeting! 🎥%b\n' "$GREEN" "$NC"
}
