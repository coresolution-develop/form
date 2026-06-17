#!/usr/bin/env bash
# ex/ Sheets Sync 배포 — self-hosted 러너(운영 서버)에서 실행.
# 빌드 산출물(dist/public/prisma/package.json)을 /opt/formflow-ex 에 배치하고
# prod 의존성 설치 -> 마이그레이션 -> 재시작. .env / service-account.json 은 서버에 그대로 보존.
set -Eeuo pipefail

# systemctl / opt 쓰기 때문에 root 권한 필요. 비root면 sudo 로 자동 승격.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/formflow-ex}"
SERVICE="${SERVICE:-formflow-ex}"
STAGING_DIR="${STAGING_DIR:-/tmp/formflow-ex}"
HEALTH_URL="${HEALTH_URL:-http://localhost:9100/products}"

[ -d "$STAGING_DIR/dist" ] || { echo "[deploy-ex] ERROR: $STAGING_DIR/dist 없음"; exit 1; }

mkdir -p "$APP_DIR"
# 코드만 교체 (.env, service-account.json, node_modules 는 서버에 보존)
rm -rf "$APP_DIR/dist" "$APP_DIR/public" "$APP_DIR/prisma"
cp -a "$STAGING_DIR/dist" "$APP_DIR/dist"
[ -d "$STAGING_DIR/public" ] && cp -a "$STAGING_DIR/public" "$APP_DIR/public"
cp -a "$STAGING_DIR/prisma" "$APP_DIR/prisma"
cp -a "$STAGING_DIR/package.json" "$STAGING_DIR/package-lock.json" "$APP_DIR/"
echo "[deploy-ex] 코드 배치 완료 -> $APP_DIR"

cd "$APP_DIR"
npm ci --omit=dev
npx --yes prisma generate
npx --yes prisma migrate deploy
echo "[deploy-ex] 의존성/마이그레이션 완료"

systemctl restart "$SERVICE"

ok=0
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then ok=1; echo "[deploy-ex] 헬스체크 통과 ($i)"; break; fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  echo "[deploy-ex] 헬스체크 실패"; systemctl status "$SERVICE" --no-pager -l 2>/dev/null | head -20; exit 1
fi
echo "[deploy-ex] 배포 성공"
