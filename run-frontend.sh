#!/usr/bin/env bash
# FormFlow 프론트엔드 로컬 실행 (Next.js dev, :3000)
# - CORS_ORIGINS 가 http://localhost:3000 으로 고정이라 반드시 3000 에서 떠야 함
# - 3000 점유 중이면 정리 후 실행 (3001 로 밀려 CORS 깨지는 것 방지)
# 사용: ./run-frontend.sh   (이 터미널 탭을 닫으면 프론트도 종료됨)

set -uo pipefail
cd "$(dirname "$0")/frontend"

# 1) 3000 점유 정리
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "[run-frontend] 포트 3000 사용 중 → 기존 프로세스 종료"
  lsof -ti:3000 | xargs kill 2>/dev/null || true
  sleep 2
  lsof -ti:3000 >/dev/null 2>&1 && { lsof -ti:3000 | xargs kill -9 2>/dev/null || true; sleep 1; }
fi

# 2) 의존성 확인
if [ ! -d node_modules ]; then
  echo "[run-frontend] node_modules 없음 → npm install"
  npm install
fi

echo "[run-frontend] starting on http://localhost:3000 … (Ctrl+C 로 종료)"
exec npm run dev
