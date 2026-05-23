start_infrastructure() {
  if [ "$SKIP_DOCKER" = true ]; then
    warn "Skipped docker compose (--skip-docker); database steps assume infra is reachable"
    return
  fi

  if ! docker info >/dev/null 2>&1; then
    die "Can't reach the Docker daemon. Start it (sudo systemctl start docker), and if you get a permission error, add yourself to the docker group: sudo usermod -aG docker \"\$(id -un)\" && newgrp docker"
  fi

  step "Starting infrastructure (postgres · redis · livekit · egress · coturn · mailhog)"
  docker compose up -d --wait --wait-timeout 180 --remove-orphans
  ok "Containers up and healthy"
}
