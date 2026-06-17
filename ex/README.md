# 근무표 (실험)

Google Sheets ↔ MySQL ↔ 웹 3-way 동기화 위에 올린 **월간 근무표(직원×날짜 그리드)**.
동기화 엔진의 원형 설계·근거는 [SHEETS_SYNC_BUILD.md](./SHEETS_SYNC_BUILD.md) 참고.

> ⚠️ FormFlow 본체(Spring/Next)와 무관한 **실험 프로젝트**. `ex/` 폴더에 격리돼 있다.

## 스택
NestJS · Prisma · MySQL · BullMQ(Redis) · googleapis · Google Apps Script · 정적 HTML UI

## 모델 (정규화)
- `Employee(id, name, rank, dept, sortOrder, …)` — 직원(행)
- `Assignment(employeeId, date, shift, …)` `@@unique([employeeId, date])` — 한 칸 = 한 배정
- `ShiftType(code, label, bgColor, fgColor, contributions[])` — **근무형태 사전(엔진)**
- `AggregateBucket(key, label)` — 합계 열 정의 (M / HD / / / Y)
- `ScheduleConfig(activeMonth, orgName)` — 시트가 보여주는 활성 월

## 집계 규칙 (핵심)
`ShiftType.contributions` = `[{ bucket, weight }]`. 한 코드가 **여러 버킷에 쪼개져** 기여한다.
- 오후반차 `M/` → 근무 `M` +0.5 · 연차 `Y` +0.5
- 초과마커 `M5/M7/M9/MO`·대체연차 `DY`·공가 `H` → 4개 합계엔 0 (별도 추적)

> 시드 값은 코어솔루션 2026-06 시트에서 역설계해 **16명 전원 합계 일치**를 검증한 규칙
> (`src/schedule/seed.data.ts`). 시트의 숨은 헬퍼 열(AQ~AX)을 그대로 대체한다.

## 핵심 설계 (동기화)
- **소유권 분리**: 운영팀 = 성명/직급/날짜셀, 서비스 = `empId(A)` + 합계열
- **루프 차단**: `DB→Sheets` 는 Sheets API 로 씀 → onEdit 안 터짐
- **행 매칭은 empId 기준** · BullMQ에서 **직원 단위 직렬화** · 단일 워커 `job.name` 분기

## 시트 계약
**`근무표` 탭 (그리드, 양방향)**
```
A1            = 활성 월 "YYYY-MM"
2행(헤더)     = A:empId | B:성명 | C:직급 | D..:날짜(1..N) | 뒤:합계열(M HD / Y)
3행~          = 직원 1명 = 1행
```
**`설정` 탭 (근무형태 세팅, 양방향)**
```
1행(헤더)     = code | label | bg | fg | <버킷 라벨들: M HD / Y>
2행~          = 근무형태 1종 = 1행. 색은 hex 텍스트(값)라 values API로 양방향.
```
- 웹 편집(PUT/DELETE shift-type) → `설정` 탭 전체 재기록. `설정` 탭 편집 → onEdit → DB upsert/삭제.
- 설정 동기 잡은 **고정 jobId 미사용**(실패 잡이 retain 되면 같은 jobId 재추가가 BullMQ에서 무시돼 멈추므로).

## 디렉토리
```
ex/
├── prisma/schema.prisma          # Employee/Assignment/ShiftType/AggregateBucket/ScheduleConfig
├── apps-script/code.gs           # 그리드 onEdit → 직원 행 webhook
├── public/index.html             # 월간 그리드 + 근무형태 세팅 + 직원 관리 UI
└── src/
    ├── schedule/                 # 그리드 API · 집계 엔진 · 시드 · 날짜 헬퍼
    ├── sheets/                   # Sheets API 클라이언트 + 라이터(셀/범위 단위)
    └── sync/                     # 웹훅 컨트롤러 + 큐 + 양방향 워커
```

## API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/schedule/grid?month=YYYY-MM` | 월간 그리드(직원·날짜·셀·합계) |
| PUT | `/schedule/cell` | `{employeeId, date, code}` 한 칸 설정 → 시트 반영 |
| GET/PUT | `/schedule/shift-types` `?code=`(DELETE) | 근무형태 세팅 (코드에 `/` 있어 삭제는 query) |
| POST | `/schedule/settings/push` `/pull` | 설정 DB↔`설정` 탭 강제 동기화 |
| GET/POST/PATCH/DELETE | `/schedule/employees[/:id]` | 직원 관리 |
| POST | `/schedule/reconcile` | 그리드 전체 재동기화(삭제 보정 포함) |
| POST | `/sync/settings-webhook` | `설정` 탭 onEdit 수신 → 전체 재읽기 |
| POST | `/sync/sheet-webhook` | Apps Script onEdit 수신 |

## 로컬 실행
```bash
npm ci
cp .env.example .env            # DATABASE_URL / SHEET_ID / SECRET 등 채우기
#  → service-account.json 을 ex/ 에 배치 (안전채널)
npx prisma generate
npx prisma migrate deploy       # 또는 dev: prisma migrate dev
npm run start:dev               # 포트 9100 (PORT 환경변수)
```
시작 시 `ScheduleSeedService` 가 근무형태·버킷·설정을 멱등 시드한다.

## 외부 설정 (사람이 1회)
1. **Google Cloud**: Sheets API 활성화 → 서비스 계정 → JSON 키를 `service-account.json` 으로 저장
2. 대상 스프레드시트를 **서비스 계정 이메일**에 **편집자** 공유
3. **시트 구성**: 위 "시트 계약"대로 `근무표` 탭 구성 (A1=월, 2행 헤더, 3행~ 직원)
4. **Apps Script**: `apps-script/code.gs` 배포 → `WEBHOOK_URL`·`SECRET` 채우고 **installable onEdit** 등록
5. 로컬 웹훅 노출은 cloudflared/ngrok → URL 을 Apps Script `WEBHOOK_URL` 에 (운영은 Apache 프록시)

## 동작 흐름
- **Sheets → DB**: 날짜셀 편집 → `onEdit` → `POST /sync/sheet-webhook` → 큐(`sheet-{empId}`) → 워커가 배정 통째 교체 + 합계 회신
- **Web → DB → Sheets**: 셀 클릭 → `PUT /schedule/cell` → 큐(`db-{empId}`) → 워커가 날짜셀+합계 반영
- **재동기화**: `POST /schedule/reconcile` → 시트에 없는 직원 행 삭제까지 반영
