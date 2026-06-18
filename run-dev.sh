#!/usr/bin/env bash
# FormFlow 로컬 동시 부팅 — 인프라(docker) + 백엔드(:8080) + 프론트(:3000) + ex 근무표(:3001)
# 사용:
#   ./run-dev.sh              인프라 확인/기동 + 백엔드 + 프론트 + ex 근무표
#   ./run-dev.sh --no-ex      ex 근무표는 빼고 FormFlow(백+프론트)만
#   ./run-dev.sh --no-infra   docker 인프라 단계 건너뛰기
# 종료: Ctrl+C  →  전부 정리됨 (각 스크립트가 8080/3000/3001 점유도 정리)

set -uo pipefail
cd "$(dirname "$0")"

SKIP_INFRA=0
RUN_EX=1
for a in "$@"; do
  case "$a" in
    --no-infra) SKIP_INFRA=1 ;;
    --no-ex)    RUN_EX=0 ;;
    *) echo "[run-dev] 알 수 없는 옵션: $a  (사용: --no-infra | --no-ex)" ;;
  esac
done

port_up() { nc -z 127.0.0.1 "$1" >/dev/null 2>&1; }
compose() {
  if docker compose version >/dev/null 2>&1; then docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then docker-compose "$@"
  else return 127; fi
}

# 1) 인프라 — FormFlow 는 docker(compose): MySQL :3307, Redis :6379, Mailhog :1025.
#    (MySQL 은 호스트 Homebrew MySQL 3306 과 충돌 피하려 3307 로 매핑)
#    "비어 있는 포트만" 기동 → 네이티브 redis(6379) 등 이미 떠 있는 건 그대로 둔다.
#    docker 데몬은 Colima — 꺼져 있으면 자동으로 colima start.
if [ "$SKIP_INFRA" -eq 0 ]; then
  need=()
  port_up 3307 || need+=(mysql)
  port_up 6379 || need+=(redis)
  port_up 1025 || need+=(mailhog)
  if [ ${#need[@]} -eq 0 ]; then
    echo "[run-dev] 인프라 이미 충족 (mysql:3307 · redis:6379 · mailhog:1025)"
  else
    echo "[run-dev] 인프라 기동 필요: ${need[*]}"
    if ! docker info >/dev/null 2>&1; then
      if command -v colima >/dev/null 2>&1; then
        echo "[run-dev] Colima(도커 데몬) 시작 중… (첫 부팅은 수십 초 걸릴 수 있음)"
        colima start || echo "[run-dev] ⚠️  colima start 실패 — 수동으로 'colima start' 후 재시도하세요"
      else
        echo "[run-dev] ⚠️  도커 데몬이 꺼져 있습니다 — Docker Desktop / Colima 를 먼저 켜주세요"
      fi
    fi
    if docker info >/dev/null 2>&1; then
      compose -f docker-compose.local.yml up -d "${need[@]}" || echo "[run-dev] ⚠️  일부 인프라 기동 실패(로그 확인)"
      if printf '%s\n' "${need[@]}" | grep -qx mysql; then
        printf "[run-dev] MySQL(3307) 준비 대기"
        for _ in $(seq 1 90); do port_up 3307 && break; printf "."; sleep 1; done
        echo " ok"
      fi
    else
      echo "[run-dev] ⚠️  docker 사용 불가 — 백엔드 DB(3307) 연결이 실패할 수 있습니다."
    fi
  fi
fi

# 2) 서버 동시 실행 (Ctrl+C 시 전부 종료)
trap 'trap - INT TERM EXIT; echo; echo "[run-dev] 종료 중…"; kill 0 2>/dev/null' INT TERM EXIT

echo "[run-dev] FormFlow 백엔드 → http://localhost:8080"
echo "[run-dev] FormFlow 프론트 → http://localhost:3000"
[ "$RUN_EX" -eq 1 ] && echo "[run-dev] ex 근무표      → http://localhost:3001/"
echo "[run-dev] (Ctrl+C 로 전부 종료)"
echo

./run-backend.sh  2>&1 | awk '{ print "[BE] " $0; fflush() }' &
./run-frontend.sh 2>&1 | awk '{ print "[FE] " $0; fflush() }' &
if [ "$RUN_EX" -eq 1 ]; then
  ./run-ex.sh 2>&1 | awk '{ print "[EX] " $0; fflush() }' &
fi
wait
