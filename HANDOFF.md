# FormFlow — 작업 핸드오프

> 다른 컴퓨터에서 이어서 작업하기 위한 현재 상태 스냅샷.
> 마지막 업데이트: 2026-06-17 · 브랜치 `main`

---

## 0. 지금 위치 (TL;DR)

- **운영 배포(prod/dev)** 완료 — `form.sosyge.net` 자가 호스팅 러너 CI/CD로 돌아감.
- **ex/ Sheets Sync 실험** 완료 — 구글시트 ↔ MySQL ↔ 웹 3-way 동기화가 `form.sosyge.net/ex/`에서 동작 중.
- **▶ 현재 작업: ex/ 를 "근무표(월간 그리드)"로 발전** — 방향 확정 단계. 시안까지 합의했고, **시프트 종류·기간·부가기능 답변 대기 중**. 아직 코드 변경 전.

---

## 1. 완료된 것

### 1-1. 운영/개발 배포 (form.sosyge.net)
- 서버: **Iwinv** (NCP 아님). Apache(httpd) 리버스 프록시, MySQL, `csm-next`/`mediplat-next`와 공용.
- 방화벽이 SSH를 화이트리스트 IP로만 허용 → **GitHub self-hosted runner**(`ghrunner` 유저)로 배포. 빌드는 GitHub-hosted, 배포는 self-hosted(아티팩트 전달).
- 구성요소:
  - Frontend: Next.js 14, 포트 **3001**, `/opt/formflow-frontend`, `formflow-frontend.service`
  - Backend: Spring Boot 3.2.5, 포트 **9000**, `/opt/formflow`, `formflow.service`
- 도메인: `form.sosyge.net`(FE) / `form-api.sosyge.net`(prod API) / `api-form-dev.sosyge.net`(dev API)
- Spring 프로파일: `local`/`dev`/`prod` (`SPRING_PROFILES_ACTIVE`). **보안 수정**: prod에서 rate-limit/reCAPTCHA를 끄던 `${SPRING_PROFILES_ACTIVE:local}` 기본값 제거.

### 1-2. ex/ Sheets Sync (form.sosyge.net/ex/) — 동기화 엔진
구글시트 ↔ DB ↔ 웹 3-way 양방향 동기화. **이 엔진을 근무표에서 재사용한다.**
- 스택: **NestJS + Prisma + BullMQ(Redis) + googleapis + Apps Script** installable onEdit 트리거.
- DB: **MySQL** `sheetsync` (csdev 계정). Redis 큐.
- 핵심 설계:
  - **단일 워커** `SyncProcessor` (`@Processor('sheet-sync')`)가 `job.name`으로 분기(`sheet-to-db`/`db-to-sheet`). ← 워커 2개 경쟁 버그 수정 결과.
  - jobId 구분자는 `-` (BullMQ가 `:` 거부).
  - **컬럼 소유권 분리**(운영팀 vs 서비스), onEdit 루프 방지(Sheets API 쓰기는 onEdit 미발생), id 기준 직렬화.
  - `reconcile` 엔드포인트: 시트에 없는 DB행 삭제(시트 주도 삭제 반영).
- Apache: `ProxyPass /ex/ → 127.0.0.1:9100`. **순서 주의** — `/ex/` 프록시가 `/`(→3001) 프록시보다 **위**, 그리고 `ProxyPass /ex !`로 catch-all 제외, `RewriteRule ^/ex$ /ex/`.
- 배포: `.github/workflows/ex.yml` (build@GitHub → deploy@self-hosted). 상세는 `ex/DEPLOY.md`.
- **검증됨**: 시트 수정 → 웹 반영, 웹 수정 → 시트 반영, 시트 삭제 → reconcile로 DB 반영까지 end-to-end 확인.

---

## 2. ▶ 현재 작업: ex/ → 근무표(월간 그리드)

### 2-1. 확정된 결정
- **형태**: 월간 그리드 — **직원(행) × 날짜(열)**, 각 칸에 시프트.
- **위치**: 새로 만들지 않고 **`ex/` 웹을 근무표로 발전**시킨다.
- **동기화 엔진은 재사용** — onEdit · reconcile · 삭제보정 그대로, **매핑만** 교체.

### 2-2. 합의된 시안 (시각 방향)
브라우저 화면 한 장:
- 상단: 제목 `근무표` + `◀ 2026년 6월 ▶` 월 이동 + `↻ 시트와 동기화`(=현 reconcile) 버튼.
- 범례: 주간 / 야간 / 오프 / 연차.
- 표: 첫 열 `직원`, 이후 날짜 열(숫자+요일, **주말 빨강**). 각 칸 = 시프트 색 배지(1글자 주/야/휴/연).
- 시프트 색(라이트, brand 토큰 계열):

  | 시프트 | 배지 글자 | 배경 | 글자색 |
  |--------|-----------|------|--------|
  | 주간 | 주 | `#E6F1FB` | `#0C447C` |
  | 야간 | 야 | `#EEEDFE` | `#3C3489` |
  | 오프 | 휴 | `#F1EFE8` | `#888780` |
  | 연차 | 연 | `#EAF3DE` | `#27500A` |

### 2-3. ⏳ 대기 중 — 사용자 답변 필요 (이게 와야 구현 시작)
1. **시프트 종류**: 2교대(주/야)? 3교대(주간/오후/야간)? 자체 방식?
2. **기간/뷰**: 한 화면에 한 달 전체(31일, 가로 스크롤)? 2주씩?
3. **부가기능**: 직원별 근무일수 합계? 부서·날짜 필터? 그 외?

### 2-4. 바꿔야 할 두 층 (답변 후 구현)
1. **데이터 모델** — 현재 `Product(name/price/...)`는 폐기 대상. 근무표는 매트릭스라 **정규화(3NF)** 필요:
   - `Employee(id, name, dept?, sortOrder)`
   - `Assignment(id, employeeId FK, date, shift, source, syncStatus)` + `@@unique([employeeId, date])`
   - 시트는 **그리드 모양**(행=직원, 열=날짜, 셀=시프트코드) → DB는 `(employeeId, date, shift)`로 정규화 저장.
2. **화면** — `ex/public/index.html`의 Product 테이블을 2-2 그리드로 교체.

### 2-5. 동기화 매핑 변경 포인트 (엔진 재사용 시 손볼 곳)
- 현재: **한 행 = 한 레코드**(Product). onEdit가 편집된 행 id로 단일 레코드 동기화.
- 근무표: **셀 = 레코드**. onEdit가 편집 셀의 (행→직원, 열→날짜)를 해석해 `Assignment` upsert.
- `sheet-client.service.ts` / `sheet-writer.service.ts`의 행 단위 read/write를 셀(범위) 단위로 일반화 필요.
- `reconcile`은 "시트 그리드에 없는 (직원,날짜) 조합 정리" 의미로 재정의.

---

## 3. 핵심 파일 맵

### 근무표로 바꿀 때 건드릴 파일 (ex/)
| 파일 | 역할 | 근무표 전환 시 |
|------|------|----------------|
| `ex/prisma/schema.prisma` | `Product` 모델 | → `Employee` + `Assignment`로 교체 (새 migration) |
| `ex/public/index.html` | **현재 초안 UI**(Product 표) | → 월간 그리드로 교체 |
| `ex/src/product/product.controller.ts` | `@Controller('products')` CRUD + `/reconcile` | → 근무표 컨트롤러로 재작성 |
| `ex/src/sheets/sheet-client.service.ts` | googleapis read/write, findRowIndexById | 셀/범위 단위로 일반화 |
| `ex/src/sheets/sheet-writer.service.ts` | writeId, appendNewRow, writeFullRow | 그리드 셀 쓰기로 조정 |
| `ex/src/sync/sync.processor.ts` | 단일 워커, job.name 분기 | 매핑 로직 교체(구조는 유지) |
| `ex/src/sync/sync.producer.ts` | jobId 발급(`-` 구분자) | 키를 (직원,날짜) 기준으로 |
| `ex/src/sync/sync.controller.ts` | `/sync/sheet-webhook` | 유지 |
| `ex/apps-script/code.gs` | onEdit installable 트리거 | 그리드 편집 → webhook payload 조정 |

### 그대로 둘 인프라
- `.github/workflows/ex.yml`, `ex/deploy/*`(deploy-ex.sh, formflow-ex.service, apache-form-ex.conf), `ex/DEPLOY.md`, `ex/src/main.ts`(정적파일 서빙), `ex/src/prisma/*`.

---

## 4. 서버 · 접속 · 시크릿 (값은 안전채널/서버에서)

> ⚠️ 비밀값은 이 파일에 적지 않음. 아래는 **위치/키 이름**만. 실제 값은 서버 `.env`·`~/.ssh`·1Password 등에서.

- **ex 웹**: https://form.sosyge.net/ex/
- **ex 앱**: `/opt/formflow-ex` (systemd `formflow-ex`, 포트 **9100**)
  - `.env` 키: `DATABASE_URL`(mysql `sheetsync`), `REDIS_HOST/PORT`, `PORT=9100`, `SHEET_ID`, `SHEET_TAB`, `GOOGLE_SA_KEY_PATH=./service-account.json`, `SHEET_WEBHOOK_SECRET`
  - `service-account.json` — 서버에만 존재, **절대 커밋 금지**(`.gitignore`됨).
- **SSH 배포키**: `~/.ssh/formflow_deploy` — **커밋/공유 금지**.
- **Apps Script `WEBHOOK_URL`**: `https://form.sosyge.net/ex/sync/sheet-webhook`
- **구글시트**: `SHEET_ID`는 서버 `.env` 참조, 탭 `시트1`. (근무표 전환 시 시트를 그리드 구조로 재구성)
- **미커밋 변경**: `ex/apps-script/code.gs` (M) — WEBHOOK_URL 운영주소 반영분. 커밋 여부 결정 필요.

---

## 5. 다른 컴퓨터에서 다시 시작하는 법

```bash
git clone <repo> formflow && cd formflow
git pull            # main 최신화

# --- ex/ 로컬 구동 (선택, 동기화 엔진 만질 때) ---
cd ex
cp .env.example .env           # 그리고 값 채우기 (DATABASE_URL/SHEET_ID/SECRET 등)
#  → service-account.json 을 ex/ 에 배치 (안전채널에서 가져옴)
npm ci
npx prisma generate
npx prisma migrate deploy      # 또는 dev: migrate dev
npm run start:dev              # 포트 9100
```
- 로컬에서 시트 webhook을 받으려면 cloudflared quick tunnel 등으로 `:9100` 노출(불안정 URL). 운영은 이미 Apache 프록시로 연결됨.
- 배포는 손으로 안 함 — `ex/**` 변경을 `main`에 push하면 `ex.yml` CI가 자동 배포.

---

## 6. 다음 액션 (이어받는 사람용)
1. **2-3의 3개 질문에 대한 사용자 답변 확인** (시프트 종류 / 기간 / 부가기능).
2. 답변 기반으로 `Assignment` 스키마 확정 → migration 작성.
3. 구글시트를 그리드 구조로 재구성 + Apps Script payload 조정.
4. `sheet-client`/`sheet-writer`/`processor` 매핑을 셀 단위로 일반화.
5. `ex/public/index.html`을 월간 그리드로 교체(시안 2-2).
6. end-to-end 검증(시트→웹, 웹→시트, reconcile) 후 `main` push → 자동 배포.

## 7. 주의 / 미해결
- `form.sosyge.net` **SSL 체인 불완전**(중간 인증서 누락) — 검증 시 `curl -k` 사용 중. 미수정.
- `.agents/` 디렉토리 **수정 금지**(SSOT). 프로젝트 SSOT는 `FormFlow-Spec.md`.
- 프론트 확정사항(스킬 기본값보다 우선): **Zustand, 커스텀 컴포넌트(shadcn 금지), PascalCase 파일명, TanStack Query, react-hook-form+zod**. ※ ex/ 는 별도 실험(NestJS+정적 html)이라 이 규칙 밖.
- 커밋 규칙: `git add -A`/`.` 금지, 시크릿/.env 커밋 금지, 파일명 명시 스테이징.
