# Fixed identifier (not a secret): must match webhook.api_key in
# docker/livekit.yaml and the server's LIVEKIT_API_KEY. Only the secret rotates.
readonly LIVEKIT_KEY_NAME="devkey"

readonly SERVER_ENV="apps/server/.env"
readonly WEB_ENV="apps/web/.env.local"
readonly ADMIN_ENV="apps/admin/.env.local"
readonly ROOT_ENV=".env"

readonly ENV_FILES=(
  "apps/server/.env.example|$SERVER_ENV"
  "apps/web/.env.example|$WEB_ENV"
  "apps/admin/.env.example|$ADMIN_ENV"
)

readonly GENERATED_SECRET_KEYS=(
  JWT_ACCESS_SECRET
  JWT_REFRESH_SECRET
  ADMIN_JWT_ACCESS_SECRET
  LIVEKIT_API_SECRET
)
