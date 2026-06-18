#!/usr/bin/env bash
# ex 근무표(NestJS) 로컬 실행 — 기본 :3001 (FormFlow 프론트 3000 과 충돌 회피)
# 필요: 네이티브 MySQL(:3306, DB=sheetsync) + Redis(:6379)
# 사용: ./run-ex.sh            (Ctrl+C 로 종료)
#       PORT=3005 ./run-ex.sh  (포트 변경)
# UI 는 서버 루트(/), API 는 /schedule · /orgs · /sync.

set -uo pipefail
cd "$(dirname "$0")/ex"
export PORT="${PORT:-3001}"

# 1) 포트 정리
if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "[run-ex] 포트 $PORT 사용 중 → 기존 프로세스 종료"
  lsof -ti:"$PORT" | xargs kill 2>/dev/null || true
  sleep 1
fi

# 2) 의존성
if [ ! -d node_modules ]; then
  echo "[run-ex] node_modules 없음 → npm install"
  npm install
fi

# 3) 인프라 경고 (네이티브 MySQL/Redis — 자동 기동은 안 함)
nc -z 127.0.0.1 3306 >/dev/null 2>&1 || echo "[run-ex] ⚠️  MySQL(:3306) 응답 없음 — ex DB(sheetsync) 연결 실패 가능"
nc -z 127.0.0.1 6379 >/dev/null 2>&1 || echo "[run-ex] ⚠️  Redis(:6379) 응답 없음 — 동기화 큐 실패 가능"

echo "[run-ex] starting on http://localhost:$PORT/ … (Ctrl+C 로 종료)"
exec npm run start:dev
