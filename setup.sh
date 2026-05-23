#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

# macOS ships a UTF-8 locale that makes tr choke on raw /dev/urandom bytes.
export LC_ALL=C
export LC_CTYPE=C

FORCE=false
SKIP_INSTALL=false
SKIP_DOCKER=false
SKIP_DB=false

source scripts/setup/config.sh
source scripts/setup/ui.sh
source scripts/setup/utils.sh
source scripts/setup/prerequisites.sh
source scripts/setup/env.sh
source scripts/setup/dependencies.sh
source scripts/setup/infrastructure.sh
source scripts/setup/database.sh
source scripts/setup/summary.sh

for arg in "$@"; do
  case "$arg" in
    --force)        FORCE=true ;;
    --skip-install) SKIP_INSTALL=true ;;
    --skip-docker)  SKIP_DOCKER=true ;;
    --skip-db)      SKIP_DB=true ;;
    -h|--help)      usage ;;
    *)              die "Unknown option: $arg (try --help)" ;;
  esac
done

banner
check_prerequisites
configure_env_files
install_dependencies
start_infrastructure
prepare_database
print_summary
