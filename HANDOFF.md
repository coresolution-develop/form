# FormFlow — 작업 핸드오프

> 다른 컴퓨터에서 이어서 작업하기 위한 현재 상태 스냅샷.
> 마지막 업데이트: 2026-06-18 · 브랜치 `main` (HEAD `39052c7`)

---

## 0. 지금 위치 (TL;DR)

- **운영 배포(prod/dev)** 완료 — `form.sosyge.net` 자가 호스팅 러너 CI/CD로 돌아감.
- **ex/ Sheets Sync 실험** 완료 — 구글시트 ↔ MySQL ↔ 웹 3-way 동기화가 `form.sosyge.net/ex/`에서 동작 중.
- **✅ ex/ 를 "근무표(월간 그리드)"로 전환 — 운영 배포 + end-to-end 검증 완료 (2026-06-17).** 실제 시트(코어솔루션 2026-06) CSV로 집계 규칙을 역설계해 **16명 전원 합계 일치 검증**, 스키마·집계엔진·시드·백엔드 API·셀단위 동기화·웹 UI·Apps Script 까지 교체 후 `main` push → 자동배포. `form.sosyge.net/ex/` 에서 **16명·합계가 시트와 일치, 시트↔웹 양방향 동기화 라이브 동작 확인**.
- **🆕 두 갈래로 확장 (2026-06-18, 아직 운영검증/마감 전):**
  - **(A) ex/ 멀티테넌시** — org 격리 모듈(`src/org/*`) + 마이그레이션 추가. 한 백엔드를 여러 조직이 공유. 거의 완성, **운영 마감 3건 남음**(§8 참조).
  - **(B) sheet-web/ 서버리스 앱** — NestJS/MySQL/Redis **없이** 브라우저가 구글시트를 직접 읽고 쓰는 단일 페이지 앱. ex/와 **시트 계약 호환**(=ex/의 경량 대체재 후보). v1 동작하나 **하드닝 필요**(§9 참조).
- **결정 필요한 갈림길**: 무거운 백엔드(ex/) vs 서버리스(sheet-web) 중 어디에 무게를 둘지. 둘은 같은 시트 구조를 공유해 공존 가능하나, 장기적으로 한쪽으로 수렴하는 게 자연스러움.

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

## 2. ✅ 완료: ex/ → 근무표(월간 그리드) 1차 구현

### 2-0. 구현 결과 (2026-06-17)
- **집계 규칙 역설계 + 검증**: 실제 시트 CSV로 코드별 `(버킷, 가중치)` 매핑을 풀어 **16명 전원 M///Y 합계가 1의 오차 없이 일치**. 출하 코드(`computeTotals` + `seed.data.ts`)로 재검증 통과.
  - 핵심: 한 코드가 여러 버킷에 쪼개짐 — 오후반차 `M/` → 근무 0.5 + 연차 0.5. 초과마커 `M5/M7/M9/MO`·`DY`·`H` 는 0 기여. 시트의 숨은 헬퍼열 `AQ~AX` 를 그대로 대체.
- **교체 완료 파일**:
  - 스키마: `Product` → `Employee`/`Assignment`/`ShiftType`/`AggregateBucket`/`ScheduleConfig` (+ migration `20260617130000_workschedule`)
  - 백엔드: `src/schedule/*` (그리드 API·집계엔진·시드·날짜헬퍼), `src/sheets/*`·`src/sync/*` 를 **셀/그리드 단위로 일반화**
  - UI: `public/index.html` = 월간 그리드 + 근무형태 세팅 + 직원 관리 (실시간 합계)
  - `apps-script/code.gs` = 그리드 onEdit → 직원 행 payload
- **빌드/배포**: `npm run build` 클린 → `main` push 로 자동배포 완료. 헬스체크 URL은 `/schedule/buckets` 로 교체(구 `/products` 가 없어져 실패하던 것 수정).
- **운영 셋업 완료**:
  - migration 적용됨(`Product` DROP, 새 5테이블). 부팅 시드 = **4 buckets / 25 shift types**.
  - 시트: 동기화 실험 스프레드시트(`SHEET_ID=132V…Oq5hg`)에 **`근무표` 탭** 추가, `A1=2026-06`(텍스트), 2행 헤더(`empId|성명|직급|1..30|M HD / Y`), 3행~ 16명. reconcile 로 16명 임포트 + empId/합계 회신.
  - 서버 `.env` `SHEET_TAB=근무표` 로 변경(이전 `시트1` 이라 reconcile 가 엉뚱한 탭 읽던 것 수정). Apps Script `SECRET` = `.env` 의 `SHEET_WEBHOOK_SECRET`, installable onEdit 등록.
  - **검증**: 16명 합계 시트 일치, 시트→웹/웹→시트 양방향 라이브 확인.
- **근무형태 세팅 편집 UI + 양방향 동기화 (2026-06-18 추가)**:
  - 세팅 탭에서 코드 추가/라벨·색(프리셋)·버킷별 가중치 편집/삭제. 그리드 색·합계 즉시 반영.
  - 시트에 **`설정` 탭** 신설(양방향): `code|label|bg|fg|<버킷 가중치>`. 색은 hex 텍스트라 values API로 왕복. push/pull 버튼 + onEdit(`설정` 탭) 지원. **라이브 양방향 검증 완료.**
  - 삭제는 `?code=` query(코드에 `/` 있음). 설정 동기 잡은 **고정 jobId 미사용**.
- **운영 함정(겪고 해결한 것)**:
  - 헬스체크 URL 구 `/products` → `/schedule/buckets`.
  - 서버 `.env` `SHEET_TAB` 이 구 `시트1` 이면 reconcile 가 엉뚱한 탭을 읽음 → `근무표` 로.
  - BullMQ **고정 jobId + removeOnFail 유지** 조합은 실패 잡이 같은 id 재추가를 막아 영구 정지 → 설정 잡은 auto-id.
  - 시트 `A1` 월은 **텍스트**(`'2026-06`)여야 함(날짜 자동변환 방지).
- **월별 탭 + 다음 달 자동화 (2026-06-18 추가)**:
  - 시트는 **월마다 한 탭** `근무표-YYYY-MM` (과거 탭 아카이브). 탭 = `SHEET_TAB`(접두사) + `-월`. 동기화·reconcile·onEdit·db→sheet 전부 월→탭으로 타겟.
  - **`POST /schedule/months/roll`** (UI `＋ 다음 달 준비` 버튼): 다음 달 탭 생성(`ensureTab`) + 명부 채움(코드 빈칸, A1은 RAW 라 텍스트 유지) + `activeMonth` 전환.
  - reconcile 는 **월 스코프**로 변경 — 직원 전역 삭제 안 함, 그 달 탭에서 빠진 직원의 **그 달 배정만** 정리.
  - **마이그레이션(1회)**: 기존 `근무표` 탭 → `근무표-2026-06` 로 rename, Apps Script 재붙여넣기(`근무표-YYYY-MM` 매칭). **라이브 검증 완료**: reconcile 2026-06 16명, roll → `근무표-2026-07` 자동생성+명부+activeMonth 전환, 웹↔7월탭 셀 반영.

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

> ⚠️ §2-3~2-5 의 "근무표 전환" 액션은 **이미 완료**됨(2026-06-17). 아래가 현재 열린 작업이다.

**0순위 — 노선 결정**: ex/(무거운 백엔드) vs sheet-web(서버리스) 중 무게중심을 정한다. 이게 정해져야 아래 우선순위가 갈린다.

**(A) ex/ 멀티테넌시 마감 — §8 상세**
1. `OrgController` list/create 에 인증 추가(현재 무방비, 내부 전용 가정).
2. 하드코딩 `2026-06` 기본 활성월 → 동적화.
3. `updateEmployee` 방어적 `where: { id, orgId }` (현재 안전하나 belt-and-suspenders).
4. org별 구글시트 바인딩 검증/프로비저닝 흐름 정리.

**(B) sheet-web 하드닝 — §9 상세**
1. OAuth 토큰 자동 갱신(1시간 만료 → 재로그인 제거). *체감 가장 큰 UX 개선.*
2. 다단계 쓰기 부분 실패 처리 / 충돌(last-write-wins) 대응.
3. 소규모 거친점(초기화 덮어쓰기 경고, 월 시퀀스 빈칸, 입력 검증).

## 7. 주의 / 미해결
- `form.sosyge.net` **SSL 체인 불완전**(중간 인증서 누락) — 검증 시 `curl -k` 사용 중. 미수정.
- `.agents/` 디렉토리 **수정 금지**(SSOT). 프로젝트 SSOT는 `FormFlow-Spec.md`.
- 프론트 확정사항(스킬 기본값보다 우선): **Zustand, 커스텀 컴포넌트(shadcn 금지), PascalCase 파일명, TanStack Query, react-hook-form+zod**. ※ ex/ 와 sheet-web/ 은 별도 실험(NestJS / 정적 html)이라 이 규칙 밖.
- 커밋 규칙: `git add -A`/`.` 금지, 시크릿/.env 커밋 금지, 파일명 명시 스테이징.

---

## 8. ex/ 멀티테넌시 현황 (2026-06-18, 코드 점검 결과)

**커밋**: `d63ddaa feat(ex): add multi-tenant org isolation to work schedule`

### 완성된 것 (✅)
- **org 식별**: `OrgGuard` 가 `X-Org-Id` 헤더(id 또는 slug) → `?org=` 쿼리 → default org 순으로 해석, `req.org`/`req.orgId` 주입. `@OrgId()`/`@CurrentOrg()` 데코레이터로 핸들러에서 추출. (`src/org/org.guard.ts`, `org-id.decorator.ts`)
- **데이터 격리**: `Employee`/`Assignment`/`ShiftType`/`AggregateBucket` 4개 모델 전부 `orgId` FK. `ShiftType(orgId,code)`·`AggregateBucket(orgId,key)` 복합 PK. cascade 삭제.
- **마이그레이션 안전**: `20260618093740_multitenancy` — Org 테이블 생성 → 기존 행 `org_default` 백필 → NOT NULL → FK. 기존 데이터 무손실.
- **동기화 경로**: webhook 은 `x-webhook-secret` → `OrgService.findBySecret` 로 org 매칭. jobId 에 orgId 포함(`sheet-{orgId}-{row}`). 프로세서 모든 쿼리 `where:{orgId}`.
- **신규 org**: `POST /orgs` → 생성 + `seedOrgDefaults`(기본 시프트/버킷 자동 시드). 부팅 시 env `SHEET_ID`/`SHEET_WEBHOOK_SECRET` 는 **`org_default` 최초 채움에만** 사용(`__bootstrap__` 플레이스홀더), 이후 DB 가 SSOT.

### 남은 마감 작업 (⚠️ — §6-A)
- **`OrgController` 인증 없음** (`org.controller.ts`) — list/create 무방비. 내부 전용 가정이나 외부 노출 시 위험.
- **org별 시트 바인딩 수동** — `sheetId` 빈 값 허용·검증 없음. 새 org 가 자기 시트/Apps Script 를 갖는 프로비저닝 흐름 미정리.
- **하드코딩 `2026-06`** 기본 활성월 (`org.service.ts`) → 동적화.
- (오탐 정정) `updateEmployee` 의 `where:{id}` 는 바로 위 `assertEmployeeInOrg` 가드(`findFirst{id,orgId}` → 없으면 throw) 덕에 **교차테넌트 안전**. 방어적으로 `where:{id,orgId}` 추가는 선택사항이지 보안 구멍 아님.

---

## 9. sheet-web/ 서버리스 앱 현황 (2026-06-18)

**커밋**: `0e2b3d0`(앱) · `fbf3e7f`(월 준비 시 기본근무 자동입력) · `0b1de2c`(이번 달 기본근무 채우기) · `7e39bde`(HTML 캐시 끔). 상세는 `sheet-web/README.md`.

### 구조
- 단일 파일 `sheet-web/index.html` (~725줄, inline CSS/HTML/JS). 외부 의존 = Google Identity Services 스크립트 하나.
- 브라우저 OAuth 토큰 → Google Sheets API v4 직접 호출. 서버·DB·env 없음. 시트가 SSOT, **여러 조직 = 여러 시트**(앱에서 ⚙ 시트 전환).
- 탭 이름에서 접두사/월목록/`설정` 탭 자동 감지. 집계는 `설정` 탭 규칙으로 클라이언트 계산. **ex/ 와 시트 계약 호환.**

### 동작하는 것 (✅, README §4)
월 그리드 보기·셀 편집(즉시 시트 기록 + 합계 자동)·월 이동·`설정` 탭 편집/저장·직원 추가/수정/행삭제·**다음 달 준비**(다음 달 탭 + 명부 이월 + 월~금 `M`/주말 `/` 자동입력)·**기본근무 채우기**(현재 달)·**빈 시트 초기화**(설정 25종 시드).

### 하드닝 필요 (⚠️ — §6-B)
- **OAuth 토큰 ~1시간 만료, 자동 갱신 없음** (`index.html:185-206`). 현재는 401 → 다음 호출 때 재로그인 1회 재시도. *실사용 가장 거슬리는 지점.* 개선: 만료 전 `prompt:none` 재요청.
- **동시편집 충돌 제어 없음** (last-write-wins, `index.html:427~`). 두 명이 같은 칸 편집 시 나중 쓰기가 덮음, 감지 없음.
- **다단계 쓰기 부분 실패**: 시프트 코드와 합계를 별도 호출로 기록 → 둘째 실패 시 시트 합계만 stale.
- **셀 서식 미기록**: 색은 웹 UI 에만, 시트는 값만.
- 소규모 거친점: `빈 시트 초기화` 가 기존 설정 경고 없이 덮어씀 · 월 시퀀스에 빈칸 있으면 `다음 달 준비` 가 엉뚱한 달 생성 · 시프트 코드 입력 검증 없음(임의 텍스트 기록 가능) · 모바일 레이아웃 미검증.
