have() { command -v "$1" >/dev/null 2>&1; }

gen_secret() {
  # `|| true` swallows the SIGPIPE that head triggers in tr (set -o pipefail).
  local len="${1:-50}" out=''
  out="$(tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c "$len")" || true
  [ -n "$out" ] || die "Failed to generate a secret (need 'tr' + /dev/urandom)."
  printf '%s' "$out"
}

read_env() {
  [ -f "$1" ] && grep -E "^$2=" "$1" | head -n1 | cut -d= -f2- || true
}

set_env() {
  # Portable replace-or-append. Values must contain no `|` (the sed delimiter);
  # generated secrets are alphanumeric, so this holds.
  local file="$1" key="$2" value="$3" tmp
  if grep -qE "^${key}=" "$file"; then
    tmp="$(mktemp)"
    sed "s|^${key}=.*|${key}=${value}|" "$file" >"$tmp" && mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

copy_env_file() {
  local source="$1" destination="$2"
  [ -f "$source" ] || die "Source env template $source is missing."
  cp "$source" "$destination" && ok "Wrote $destination" || die "Failed to write $destination"
}
