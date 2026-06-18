#!/usr/bin/env bash
# sheet-web 정적앱 배포 — self-hosted 러너(운영 서버)에서 실행.
# 단일 정적 파일(index.html)을 /opt/formflow-sheet 에 배치. Apache 가 /sheet/ 로 서빙.
# 빌드/DB/systemd 없음. Apache conf 는 최초 1회 수동 설치(apache-form-sheet.conf 참고).
set -Eeuo pipefail

# /opt 쓰기 때문에 root 권한 필요. 비root면 sudo 로 자동 승격.
if [ "$(id -u)" -ne 0 ]; then
  exec sudo -E bash "$0" "$@"
fi

APP_DIR="${APP_DIR:-/opt/formflow-sheet}"
STAGING_DIR="${STAGING_DIR:-/tmp/formflow-sheet}"
HEALTH_URL="${HEALTH_URL:-https://form.sosyge.net/sheet/}"

[ -f "$STAGING_DIR/index.html" ] || { echo "[deploy-sheet] ERROR: $STAGING_DIR/index.html 없음"; exit 1; }

mkdir -p "$APP_DIR"
cp -a "$STAGING_DIR/index.html" "$APP_DIR/index.html"
[ -f "$STAGING_DIR/README.md" ] && cp -a "$STAGING_DIR/README.md" "$APP_DIR/README.md" || true
# Apache(www-data/apache) 가 읽도록 보장
chmod 755 "$APP_DIR"; chmod 644 "$APP_DIR/index.html"
echo "[deploy-sheet] 배치 완료 -> $APP_DIR"

# 헬스체크: 200 + 핵심 마커. (form.sosyge.net SSL 체인 불완전 → -k)
ok=0
for i in $(seq 1 15); do
  if curl -k -fsS "$HEALTH_URL" 2>/dev/null | grep -q '근무표'; then ok=1; echo "[deploy-sheet] 헬스체크 통과 ($i)"; break; fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  echo "[deploy-sheet] 헬스체크 실패 — Apache /sheet/ 설정(apache-form-sheet.conf)이 VirtualHost 에 적용됐는지 확인"; exit 1
fi
echo "[deploy-sheet] 배포 성공"
