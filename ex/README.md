# Sheets Sync (실험)

Google Sheets ↔ PostgreSQL 양방향 실시간 동기화. 전체 설계·근거는 [SHEETS_SYNC_BUILD.md](./SHEETS_SYNC_BUILD.md) 참고.

> ⚠️ FormFlow 본체(Spring/Next)와 무관한 **실험 프로젝트**다. `ex/sheets-sync` 브랜치의 `ex/` 폴더에 격리돼 있다.

## 스택
NestJS · Prisma · PostgreSQL · BullMQ(Redis) · googleapis · Google Apps Script

## 핵심 설계
- **컬럼 소유권 분리**: 운영팀 `A~E`(편집) / 서비스 `F~H`(범위 보호) → lost update 원천 차단
- **루프 차단**: `DB→Sheets`는 Sheets API로 `F~H`만 씀 → onEdit 안 터짐
- **행 매칭은 id 기준**(rowIndex 아님) · BullMQ에서 **id 단위 직렬화**

## 디렉토리
```
ex/
├── prisma/schema.prisma          # Product 모델
├── apps-script/code.gs           # installable onEdit 트리거
└── src/
    ├── prisma/                    # PrismaModule/Service
    ├── sheets/                    # Sheets API 클라이언트 + 라이터(F~H 전용)
    └── sync/                      # 웹훅 컨트롤러 + 큐 + 양방향 워커
```

## 로컬 실행

```bash
# 1) 의존성
npm install

# 2) 인프라 (예시 — Docker)
docker run -d --name pg   -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user -e POSTGRES_DB=sheetsync -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7

# 3) 환경변수
cp .env.example .env   # SHEET_ID / SHEET_WEBHOOK_SECRET 등 채우기

# 4) Prisma
npx prisma generate
npx prisma migrate dev --name init_product

# 5) 서버 (포트 3000)
npm run start:dev
```

## 외부 설정 (사람이 1회)

1. **Google Cloud**: 프로젝트 생성 → Google Sheets API 활성화 → 서비스 계정 생성 → JSON 키를 `service-account.json` 으로 저장
2. 대상 스프레드시트를 **서비스 계정 이메일**에 **편집자**로 공유
3. **시트 구성**: 1행 헤더 `id|name|price|status|memo|sync_status|computed|updated_at`, `F~H` 범위 보호
4. **Apps Script**: `apps-script/code.gs` 배포 → `WEBHOOK_URL`·`SECRET` 채우고 **installable onEdit 트리거** 등록
5. **웹훅 노출**: 로컬 테스트는 `ngrok http 3000` → 받은 URL을 Apps Script `WEBHOOK_URL` 에

## 동작 흐름
- **Sheets → DB**: 운영팀 편집 → `onEdit` → `POST /sync/sheet-webhook` → 큐(`sheet:{id}`) → `SheetToDbProcessor` → DB upsert + `F~H` 회신
- **DB → Sheets**: 서비스가 DB 변경 후 `enqueueDbToSheet(id)` → 큐(`db:{id}`) → `DbToSheetProcessor` → `F~H`만 반영 (루프 없음)
- 테스트 트리거: `POST /test/update-computed/:id`

## 테스트 시나리오
[SHEETS_SYNC_BUILD.md §11](./SHEETS_SYNC_BUILD.md) 의 T1~T8 참고. **Phase 1(시트→DB, T1~T5·T8)** 을 먼저 통과시킨 뒤 Phase 2(역방향 T6·T7)를 얹는다.
