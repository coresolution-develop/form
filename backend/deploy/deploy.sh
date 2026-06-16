#!/usr/bin/env bash
# FormFlow 백엔드 배포 스크립트 (서버에서 실행)
#
# 흐름: 스테이징 jar 확인 → 현재 운영 jar 백업 → 교체 → systemd 재시작
#       → 헬스체크 → 실패 시 직전 버전으로 자동 롤백 → 오래된 백업 정리
#
# GitHub Actions(.github/workflows/backend.yml) 가 jar(app.jar)와 이 스크립트를
# /tmp/formflow 로 올린 뒤 `bash deploy.sh` 로 호출한다. 수동 실행도 가능.
#
# 모든 설정은 환경변수로 덮어쓸 수 있다 (아래 기본값 참고).
set -Eeuo pipefail

# systemctl·/opt 쓰기 때문에 root 권한이 필요하다. 비root면 sudo 로 자동 승격.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/formflow}"
SERVICE="${SERVICE:-formflow}"
APP_USER="${APP_USER:-root}"
STAGING_DIR="${STAGING_DIR:-/tmp/formflow}"
HEALTH_URL="${HEALTH_URL:-http://localhost:9000/actuator/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

JAR_LIVE="$APP_DIR/formflow.jar"
BACKUP_DIR="$APP_DIR/backup"
TS="$(date +%Y%m%d-%H%M%S)"

log() { echo "[deploy][$(date +%H:%M:%S)] $*"; }
die() { echo "[deploy][ERROR] $*" >&2; exit 1; }

# ── 1) 스테이징에서 새 jar 찾기 (plain jar 제외) ────────────────────────────
NEW_JAR="$(find "$STAGING_DIR" -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | head -n1)"
[ -n "$NEW_JAR" ] || die "스테이징($STAGING_DIR)에서 배포할 jar를 찾지 못했습니다."
log "배포 대상 jar: $NEW_JAR"

# ── 2) 현재 운영 jar 백업 ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
PREV_BACKUP=""
if [ -f "$JAR_LIVE" ]; then
  PREV_BACKUP="$BACKUP_DIR/formflow-$TS.jar"
  cp -p "$JAR_LIVE" "$PREV_BACKUP"
  log "현재 버전 백업: $PREV_BACKUP"
else
  log "기존 운영 jar 없음 — 최초 배포로 진행"
fi

# ── 3) 새 jar 교체 (소유권·권한 설정) ──────────────────────────────────────
install -o "$APP_USER" -g "$APP_USER" -m 0640 "$NEW_JAR" "$JAR_LIVE"
log "jar 교체 완료 → $JAR_LIVE"

# ── 4) 재시작 ──────────────────────────────────────────────────────────────
systemctl restart "$SERVICE"
log "서비스 재시작 요청: $SERVICE"

# ── 5) 헬스체크 ────────────────────────────────────────────────────────────
healthy=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1
    log "헬스체크 통과 ($i/$HEALTH_RETRIES) — $HEALTH_URL"
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

# ── 6) 실패 시 직전 버전으로 롤백 ──────────────────────────────────────────
if [ "$healthy" -ne 1 ]; then
  log "헬스체크 실패 — 롤백을 시도합니다."
  if [ -n "$PREV_BACKUP" ] && [ -f "$PREV_BACKUP" ]; then
    install -o "$APP_USER" -g "$APP_USER" -m 0640 "$PREV_BACKUP" "$JAR_LIVE"
    systemctl restart "$SERVICE"
    log "이전 버전으로 롤백 후 재시작 완료: $(basename "$PREV_BACKUP")"
  else
    log "롤백할 백업이 없습니다 (최초 배포 실패일 수 있음)."
  fi
  systemctl status "$SERVICE" --no-pager -l 2>/dev/null | head -n 20 || true
  die "배포 실패: 헬스체크 미통과. 위 status / journalctl -u $SERVICE 를 확인하세요."
fi

# ── 7) 오래된 백업 정리 (최근 KEEP_BACKUPS 개만 유지) ──────────────────────
mapfile -t OLD_BACKUPS < <(ls -1t "$BACKUP_DIR"/formflow-*.jar 2>/dev/null | tail -n +"$((KEEP_BACKUPS + 1))")
for old in "${OLD_BACKUPS[@]}"; do
  rm -f "$old" && log "오래된 백업 삭제: $(basename "$old")"
done

# ── 8) 스테이징 정리 ──────────────────────────────────────────────────────
rm -f "$NEW_JAR" "$STAGING_DIR/deploy.sh" 2>/dev/null || true

log "배포 성공 ✅"
