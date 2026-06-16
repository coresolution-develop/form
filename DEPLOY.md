# FormFlow 배포 가이드 (Iwinv 단일 서버 · dev/prod)

스펙 §13(NCP + Vercel 분리)과 달리, **하나의 Iwinv 공용 서버**에 dev/prod 두 환경이 함께 올라간다.

> ⚠️ **공용 서버** — `csm-next`, `mediplat-next` 등 타 서비스가 공존한다. 배포 스크립트는 `formflow*` 서비스와 `/opt/formflow*` 경로만 건드린다.

## 환경 매핑

| | local | dev | prod |
|---|---|---|---|
| 프로필(`SPRING_PROFILES_ACTIVE`) | local | dev | prod |
| 브랜치 | — | `develop` | `main` |
| 백엔드 | :8080 | `formflow-dev` :9001 | `formflow` :9000 |
| 프론트 | :3000 | `formflow-frontend-dev` :3002 | `formflow-frontend` :3001 |
| 경로(BE) | — | `/opt/formflow-dev` | `/opt/formflow` |
| 경로(FE) | — | `/opt/formflow-frontend-dev` | `/opt/formflow-frontend` |
| MySQL | formflow | `formflow_dev` | formflow |
| Redis(db) | 0 | 1 | 0 |
| 프론트 도메인 | localhost | `form-dev.sosyge.net` | `form.sosyge.net` |
| API 도메인 | localhost | `api-form-dev.sosyge.net` | `form-api.sosyge.net` |

## CI 흐름

- `develop` push → **dev** 배포 / `main` push → **prod** 배포 (변경된 `backend/**`·`frontend/**`만)
- 워크플로가 브랜치로 환경(서비스명·경로·포트·도메인)을 해석해 배포 스크립트에 환경변수로 전달
- 백엔드: `test` → `bootJar` → SCP → `deploy.sh`
- 프론트: `lint`/`typecheck`/`build` → tar → SCP → `deploy-frontend.sh`

## 구성 파일

| 파일 | 역할 |
|---|---|
| `.github/workflows/backend.yml` · `frontend.yml` | 브랜치 분기 CI/CD |
| `backend/deploy/deploy.sh` · `frontend/deploy/deploy-frontend.sh` | 환경변수 파라미터화된 배포(백업·교체·헬스체크·롤백) |
| `backend/deploy/formflow{,-dev}.service` | 백엔드 prod/dev 유닛 |
| `frontend/deploy/formflow-frontend{,-dev}.service` | 프론트 prod/dev 유닛 |
| `backend/src/main/resources/application-{local,dev,prod}.yml` | 프로필별 설정 |

## Spring 프로필

- `application.yml`: 공통 + 안전 기본값. **프로필 미지정 시 보안 ON**(rate-limit·reCAPTCHA·secure 쿠키).
- 각 환경 `.env`에 **`SPRING_PROFILES_ACTIVE`(local/dev/prod)를 반드시 지정**한다. 누락 시 프로필 설정(SMTP 등)이 안 붙는다.

## GitHub 등록

**Secrets** (dev/prod 동일 서버):
| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_KEY` | 서버 IP / SSH 유저 / SSH key |

**Variables** (프론트 빌드 — API_URL·ENV는 브랜치로 자동 결정되므로 키 값만):
| 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `NEXT_PUBLIC_RECAPTCHA_ENABLED` / `NEXT_PUBLIC_SENTRY_DSN` | 운영 값 |

## nginx 도메인 → 포트

| 도메인 | proxy_pass |
|---|---|
| `form.sosyge.net` | `127.0.0.1:3001` |
| `form-api.sosyge.net` | `127.0.0.1:9000` |
| `form-dev.sosyge.net` | `127.0.0.1:3002` |
| `api-form-dev.sosyge.net` | `127.0.0.1:9001` |

## ✅ 당신이 준비할 것

- [ ] **운영 `.env` 점검** — `/opt/formflow/.env`에 `SPRING_PROFILES_ACTIVE=prod` 확인/추가 (없으면 그동안 `local`로 떠서 보안 비활성 상태였을 수 있음)
- [ ] **dev 인스턴스 셋업** — `/opt/formflow-dev`, `/opt/formflow-frontend-dev` 생성, 각 `.env`(`SPRING_PROFILES_ACTIVE=dev`, `DB_URL`=formflow_dev, `REDIS_DB=1`, 도메인=dev)
- [ ] **dev 유닛 설치** — `formflow-dev.service`·`formflow-frontend-dev.service` → `/etc/systemd/system/`, `daemon-reload`, `enable`
- [ ] **MySQL `formflow_dev` 스키마 생성**, **`develop` 브랜치 생성**
- [ ] **GitHub Secrets/Variables 등록**
- [ ] **nginx에 `form-dev`·`api-form-dev` 라우팅 추가** (위 매핑)
- [ ] (메일) SMTP 수단 결정 후 운영 `.env`에 `SMTP_*` 채우기

## 수동 배포 / 롤백

```bash
# dev 백엔드 수동 배포 (jar 를 /tmp/formflow-dev 에 둔 뒤)
SERVICE=formflow-dev APP_DIR=/opt/formflow-dev STAGING_DIR=/tmp/formflow-dev \
  HEALTH_URL=http://localhost:9001/actuator/health bash backend/deploy/deploy.sh

# prod 백엔드 (기본값이 prod)
bash backend/deploy/deploy.sh

# 롤백 (prod 예시)
sudo cp /opt/formflow/backup/formflow-<TS>.jar /opt/formflow/formflow.jar
sudo systemctl restart formflow
```
