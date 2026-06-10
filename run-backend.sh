#!/usr/bin/env bash
# FormFlow 백엔드 로컬 실행 (Spring Boot, :8080)
# - .env.local 을 안전하게 로드 (값에 & 가 있어도 source 처럼 깨지지 않음)
# - JDK17 지정, 8080 점유 중이면 정리 후 실행
# 사용: ./run-backend.sh   (이 터미널 탭을 닫으면 백엔드도 종료됨)

set -uo pipefail
cd "$(dirname "$0")/backend"

# 1) 8080 점유 정리
if lsof -ti:8080 >/dev/null 2>&1; then
  echo "[run-backend] 포트 8080 사용 중 → 기존 프로세스 종료"
  lsof -ti:8080 | xargs kill 2>/dev/null || true
  sleep 2
  lsof -ti:8080 >/dev/null 2>&1 && { lsof -ti:8080 | xargs kill -9 2>/dev/null || true; sleep 1; }
fi

# 2) .env.local 로드 (라인 단위 — & 등 특수문자 안전)
if [ ! -f .env.local ]; then
  echo "[run-backend] backend/.env.local 이 없습니다." >&2
  exit 1
fi
while IFS= read -r line; do
  case "$line" in \#*|"") continue ;; esac
  export "${line%%=*}=${line#*=}"
done < .env.local

# 3) JDK17
JH="$(/usr/libexec/java_home -v 17 2>/dev/null)"
if [ -z "$JH" ]; then
  echo "[run-backend] JDK 17 을 찾을 수 없습니다 (Temurin 17 설치 필요)." >&2
  exit 1
fi
export JAVA_HOME="$JH"

echo "[run-backend] JAVA_HOME=$JAVA_HOME"
echo "[run-backend] port=${SERVER_PORT:-8080}  profile=${SPRING_PROFILES_ACTIVE:-local}"
echo "[run-backend] starting… (Ctrl+C 로 종료)"
exec ./gradlew bootRun
