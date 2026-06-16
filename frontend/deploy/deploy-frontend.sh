#!/usr/bin/env bash
# FormFlow 프론트엔드 배포 스크립트 (서버에서 실행) — next start 방식 유지
#
# GitHub Actions(.github/workflows/frontend.yml)가 빌드 산출물 tar를 풀어
# /tmp/formflow-frontend 에 .next/public/package.json 등을 둔 뒤 이 스크립트를 호출한다.
#
# 흐름: 스테이징 검증 → 현재 빌드 백업 → 교체 → prod 의존성 설치 → 재시작 → 헬스체크 → 실패 시 롤백
set -Eeuo pipefail

# systemctl·/opt 쓰기 때문에 root 권한 필요. 비root면 sudo 로 자동 승격.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/formflow-frontend}"
SERVICE="${SERVICE:-formflow-frontend}"
STAGING_DIR="${STAGING_DIR:-/tmp/formflow-frontend}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3001/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
KEEP_BACKUPS="${KEEP_BACKUPS:-3}"
BACKUP_DIR="${BACKUP_DIR:-/opt/formflow-frontend-backup}"
TS="$(date +%Y%m%d-%H%M%S)"

log() { echo "[deploy-fe][$(date +%H:%M:%S)] $*"; }
die() { echo "[deploy-fe][ERROR] $*" >&2; exit 1; }

restart_and_check() {
  systemctl restart "$SERVICE"
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -fsS -o /dev/null "$HEALTH_URL"; then
      log "헬스체크 통과 ($i/$HEALTH_RETRIES) — $HEALTH_URL"
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
  done
  return 1
}

# ── 1) 스테이징 검증 ───────────────────────────────────────────────────────
[ -d "$STAGING_DIR/.next" ] || die "스테이징($STAGING_DIR)에 .next 빌드가 없습니다."
[ -f "$STAGING_DIR/package.json" ] || die "스테이징에 package.json 이 없습니다."

# ── 2) 현재 빌드 백업 (.next + public + package.json — node_modules 제외) ───
if [ -d "$APP_DIR/.next" ]; then
  mkdir -p "$BACKUP_DIR/$TS"
  cp -a "$APP_DIR/.next" "$BACKUP_DIR/$TS/.next"
  [ -d "$APP_DIR/public" ] && cp -a "$APP_DIR/public" "$BACKUP_DIR/$TS/public"
  [ -f "$APP_DIR/package.json" ] && cp -a "$APP_DIR/package.json" "$BACKUP_DIR/$TS/package.json"
  log "현재 빌드 백업: $BACKUP_DIR/$TS"
fi

# ── 3) 새 빌드 적용 (stale 청크 제거 위해 .next/public 통째 교체) ──────────
mkdir -p "$APP_DIR"
rm -rf "$APP_DIR/.next"
cp -a "$STAGING_DIR/.next" "$APP_DIR/.next"
if [ -d "$STAGING_DIR/public" ]; then
  rm -rf "$APP_DIR/public"
  cp -a "$STAGING_DIR/public" "$APP_DIR/public"
fi
cp -a "$STAGING_DIR/package.json" "$APP_DIR/package.json"
[ -f "$STAGING_DIR/package-lock.json" ] && cp -a "$STAGING_DIR/package-lock.json" "$APP_DIR/package-lock.json"
[ -f "$STAGING_DIR/next.config.mjs" ] && cp -a "$STAGING_DIR/next.config.mjs" "$APP_DIR/next.config.mjs"
log "새 빌드 적용 완료 → $APP_DIR"

# ── 4) prod 의존성 설치 (next start 런타임용) ──────────────────────────────
( cd "$APP_DIR" && npm ci --omit=dev )
log "prod 의존성 설치 완료"

# ── 5) 재시작 + 헬스체크, 실패 시 롤백 ─────────────────────────────────────
if ! restart_and_check; then
  log "헬스체크 실패 — 롤백을 시도합니다."
  if [ -d "$BACKUP_DIR/$TS/.next" ]; then
    rm -rf "$APP_DIR/.next"; cp -a "$BACKUP_DIR/$TS/.next" "$APP_DIR/.next"
    if [ -d "$BACKUP_DIR/$TS/public" ]; then rm -rf "$APP_DIR/public"; cp -a "$BACKUP_DIR/$TS/public" "$APP_DIR/public"; fi
    [ -f "$BACKUP_DIR/$TS/package.json" ] && cp -a "$BACKUP_DIR/$TS/package.json" "$APP_DIR/package.json"
    ( cd "$APP_DIR" && npm ci --omit=dev ) || true
    systemctl restart "$SERVICE"
    log "이전 빌드로 롤백 후 재시작 완료"
  else
    log "롤백할 백업이 없습니다 (최초 배포 실패일 수 있음)."
  fi
  systemctl status "$SERVICE" --no-pager -l 2>/dev/null | head -n 20 || true
  die "배포 실패: 헬스체크 미통과. journalctl -u $SERVICE 를 확인하세요."
fi

# ── 6) 오래된 백업 정리 (최근 KEEP_BACKUPS 개만 유지) ──────────────────────
mapfile -t OLD_BACKUPS < <(ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +"$((KEEP_BACKUPS + 1))")
for d in "${OLD_BACKUPS[@]}"; do rm -rf "$d" && log "오래된 백업 삭제: $d"; done

# ── 7) 스테이징 정리 ──────────────────────────────────────────────────────
rm -rf "$STAGING_DIR/.next" "$STAGING_DIR/public" "$STAGING_DIR"/*.tar.gz "$STAGING_DIR/deploy-frontend.sh" 2>/dev/null || true

log "프론트엔드 배포 성공 ✅"
