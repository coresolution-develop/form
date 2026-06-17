# Google Sheets ↔ PostgreSQL 양방향 실시간 동기화 — 빌드 스펙

> 이 문서는 Claude Code가 읽고 그대로 구현하기 위한 빌드 지시서입니다.
> 비개발자(운영팀)는 Google Sheets에서 데이터를 입력/수정하고, 서비스는 PostgreSQL을 주 DB로 사용합니다.
> 양방향 + 거의 실시간 동기화가 목표입니다.

---

## 1. 목표 & 범위

- **주 DB**: PostgreSQL (Prisma)
- **입력 창구**: Google Sheets (운영팀이 직접 편집)
- **방향**: 양방향
  - `Sheets → DB`: 운영팀이 시트 편집 → onEdit 웹훅 → DB 반영
  - `DB → Sheets`: 서비스가 DB 변경 → Sheets API로 시트 반영
- **실시간성**: onEdit installable 트리거 + BullMQ 큐로 수 초 내 반영
- **동시성/순서 보장**: BullMQ에서 **행 id 단위로 직렬화**
- **테스트 우선**: 먼저 로컬에서 단방향(Sheets→DB)부터 검증 후 양방향 확장

---

## 2. 핵심 설계 원칙 (반드시 지킬 것)

### 원칙 ① 컬럼 소유권 분리 (충돌 방지의 핵심)

같은 칸을 양쪽이 동시에 고치면 데이터가 덮어써진다(lost update). 이를 구조적으로 막기 위해 **컬럼 단위로 소유권을 나눈다.**

| 영역 | 컬럼 | 운영팀 | 서비스 |
|---|---|---|---|
| 식별자 | A (`id`) | 읽기만 | 발급/쓰기 |
| 운영팀 소유 | B~E (`name`, `price`, `status`, `memo`) | **편집** | 읽기만 |
| 서비스 소유 | F~H (`sync_status`, `computed`, `updated_at`) | 읽기만(범위 보호) | **쓰기** |

- 서비스 소유 컬럼(F~H)은 시트에서 **범위 보호**(데이터 → 시트와 범위 보호)를 걸어 운영팀이 못 건드리게 한다.
- 이렇게 하면 "같은 칸 동시 수정"이 원천 차단되어 충돌 병합 로직이 거의 불필요해진다.

### 원칙 ② 무한 루프 차단

```
DB→시트(반영) → onEdit 발동 → 시트→DB → 다시 DB→시트 → ... (무한)
```

**다행히 Sheets API로 쓴 변경은 onEdit 트리거를 발동시키지 않는다.** 따라서:

- `DB → Sheets`는 항상 **Sheets API**로만 쓴다 → onEdit 안 터짐 → 루프 자동 차단.
- 추가 안전장치: DB→시트 푸시는 **서비스 소유 컬럼(F~H)에만** 쓴다. 운영팀 컬럼(B~E)은 절대 API로 덮어쓰지 않는다(신규행 id 발급 시 A열 제외).

### 원칙 ③ 행 식별은 rowIndex가 아니라 id로

운영팀이 중간 행을 삽입/삭제하면 행 번호(rowIndex)가 밀린다. 매칭 기준은 **항상 A열의 `id`**. rowIndex는 "방금 편집된 위치"를 잡는 보조 용도로만 쓰고, 시트에 다시 쓸 때는 id로 행 위치를 재조회한다.

---

## 3. 기술 스택

- NestJS (백엔드)
- Prisma + PostgreSQL
- BullMQ + Redis (큐/직렬화)
- `googleapis` (Sheets API)
- Google Apps Script (installable onEdit 트리거)

---

## 4. 아키텍처

```
                  ┌─────────────────────────────────────────┐
   운영팀 편집 ──▶ │ Google Sheet (A:id  B~E:운영팀  F~H:서비스) │
                  └─────────────┬───────────────────▲─────────┘
                  onEdit(웹훅)  │                    │ Sheets API (onEdit 안 터짐)
                                ▼                    │
                  ┌──────────────────────┐   ┌───────┴────────────┐
                  │ POST /sync/sheet-webhook│  │ SheetWriter 서비스 │
                  └──────────┬─────────────┘  └───────▲────────────┘
                             │ enqueue (jobId = sheet:{id})   │ enqueue (jobId = db:{id})
                             ▼                                │
                  ┌──────────────────────────────────────────┴──┐
                  │            BullMQ (Redis) — 행 id로 직렬화       │
                  └──────┬────────────────────────────────┬───────┘
                  sheet-to-db                          db-to-sheet
                         ▼                                  ▲
                  ┌──────────────┐  서비스 DB 변경 이벤트 ──┘
                  │ PostgreSQL   │ ◀──────────────────────────
                  │ (Prisma)     │
                  └──────────────┘
```

---

## 5. 디렉토리 구조 (NestJS 모듈)

```
src/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── sheets/
│   ├── sheets.module.ts
│   ├── sheets.constants.ts        # 컬럼 매핑, 시트 이름 등 상수
│   ├── sheet-client.service.ts    # googleapis 인증 + 저수준 read/write
│   ├── sheet-writer.service.ts    # DB→시트 (서비스 소유 컬럼만)
│   └── sheets.types.ts
├── sync/
│   ├── sync.module.ts
│   ├── sync.controller.ts         # onEdit 웹훅 수신
│   ├── sync.producer.ts           # 큐에 잡 등록 (양방향 공용)
│   ├── sheet-to-db.processor.ts   # 시트→DB 워커
│   └── db-to-sheet.processor.ts   # DB→시트 워커
└── app.module.ts
```

---

## 6. 환경 변수 (`.env`)

```env
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/sheetsync?schema=public

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Sheets
SHEET_ID=                        # 스프레드시트 ID (URL의 /d/ 뒤 부분)
SHEET_TAB=Sheet1                 # 탭(시트) 이름
GOOGLE_SA_KEY_PATH=./service-account.json   # 서비스 계정 키 경로

# Webhook 보안
SHEET_WEBHOOK_SECRET=            # Apps Script와 공유할 긴 랜덤 문자열
```

> `service-account.json`은 절대 커밋하지 말 것. `.gitignore`에 추가.

---

## 7. 사전 설정 (사람이 수동으로 한 번)

### 7-1. Google Cloud
1. Google Cloud Console → 새 프로젝트
2. **Google Sheets API** 활성화
3. **서비스 계정** 생성 → JSON 키 다운로드 → `service-account.json`으로 저장
4. 대상 스프레드시트를 **서비스 계정 이메일**(`xxx@xxx.iam.gserviceaccount.com`)에 **편집자**로 공유

### 7-2. 시트 구성
1. 1행은 헤더: `id | name | price | status | memo | sync_status | computed | updated_at`
2. F~H 컬럼(`sync_status`, `computed`, `updated_at`)에 **범위 보호** 설정 → 운영팀 편집 불가
3. Apps Script 트리거 등록 (아래 9번 코드 배포 후): 트리거 → 함수 `onEditInstallable`, 이벤트 `수정 시(On edit)`

---

## 8. Prisma 스키마

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id         String   @id @default(cuid())
  name       String
  price      Int
  status     String   @default("active")
  memo       String?

  // 동기화 메타
  source     String   @default("sheet")   // 'sheet' | 'service'
  syncStatus String   @default("synced")  // 'synced' | 'error' | 'pending'
  computed   Int      @default(0)          // 서비스가 계산하는 값(예시)
  rowIndex   Int?                          // 시트 행 위치 캐시(보조용)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([source])
}
```

```bash
npx prisma migrate dev --name init_product
```

---

## 9. Apps Script (installable onEdit 트리거)

> simple 트리거는 외부 호출(UrlFetchApp)이 막혀 있으므로 **반드시 installable 트리거**로 등록한다.

```javascript
// 코드.gs
const WEBHOOK_URL = 'https://your-server.com/sync/sheet-webhook'; // 실제 서버 URL
const SECRET = 'PUT_THE_SAME_SECRET_AS_ENV';                      // .env의 SHEET_WEBHOOK_SECRET와 동일
const TAB_NAME = 'Sheet1';
const OWNER_LAST_COL = 5; // A~E (운영팀 소유 컬럼 범위)

function onEditInstallable(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== TAB_NAME) return;

  const startRow = range.getRow();
  const numRows = range.getNumRows();
  if (startRow < 2) return; // 헤더 제외

  // 운영팀 소유 컬럼(F~H)이 아닌, A~E만 동기화 대상
  const values = sheet.getRange(startRow, 1, numRows, OWNER_LAST_COL).getValues();

  const rows = values.map((row, i) => ({
    rowIndex: startRow + i,
    id: String(row[0] || ''),
    name: row[1],
    price: row[2],
    status: row[3],
    memo: row[4],
  }));

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Webhook-Secret': SECRET },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });
}
```

**트리거 등록**: Apps Script 편집기 → 좌측 시계 아이콘(트리거) → 트리거 추가 → 함수 `onEditInstallable` / 이벤트 소스 `스프레드시트에서` / 이벤트 유형 `수정 시`.

---

## 10. NestJS 구현

### 10-1. 상수 & 타입

```typescript
// src/sheets/sheets.constants.ts
export const SHEET_TAB = process.env.SHEET_TAB ?? 'Sheet1';

// 컬럼 매핑 (0-based index 기준)
export const COL = {
  id: 'A',
  name: 'B',
  price: 'C',
  status: 'D',
  memo: 'E',
  syncStatus: 'F',
  computed: 'G',
  updatedAt: 'H',
} as const;
```

```typescript
// src/sheets/sheets.types.ts
export interface SheetRowPayload {
  rowIndex: number;
  id: string;
  name: string;
  price: string | number;
  status: string;
  memo: string;
}
```

### 10-2. Sheets 저수준 클라이언트

```typescript
// src/sheets/sheet-client.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { SHEET_TAB } from './sheets.constants';

@Injectable()
export class SheetClientService implements OnModuleInit {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId = process.env.SHEET_ID!;

  onModuleInit() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SA_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /** id로 시트 행 번호 찾기 (A열 전체 조회) — 행 삽입/삭제로 rowIndex가 밀려도 안전 */
  async findRowIndexById(id: string): Promise<number | null> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!A2:A`,
    });
    const ids = res.data.values ?? [];
    const idx = ids.findIndex((r) => String(r[0]) === id);
    return idx === -1 ? null : idx + 2; // +2: 1-based & 헤더 제외
  }

  async writeRange(rangeA1: string, values: any[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!${rangeA1}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
}
```

### 10-3. DB → 시트 라이터 (서비스 소유 컬럼만)

```typescript
// src/sheets/sheet-writer.service.ts
import { Injectable } from '@nestjs/common';
import { SheetClientService } from './sheet-client.service';
import { COL } from './sheets.constants';

@Injectable()
export class SheetWriterService {
  constructor(private client: SheetClientService) {}

  /** 신규행: 운영팀이 만든 행에 DB가 발급한 id를 A열에 회신 */
  async writeId(rowIndex: number, id: string) {
    await this.client.writeRange(`${COL.id}${rowIndex}`, [[id]]);
  }

  /** 서비스 소유 컬럼(F~H)에만 반영 — 운영팀 컬럼은 절대 건드리지 않음 */
  async pushServiceFields(
    id: string,
    fields: { syncStatus: string; computed: number; updatedAt: string },
  ) {
    const rowIndex = await this.client.findRowIndexById(id);
    if (!rowIndex) return; // 시트에서 행이 사라졌으면 스킵
    await this.client.writeRange(
      `${COL.syncStatus}${rowIndex}:${COL.updatedAt}${rowIndex}`,
      [[fields.syncStatus, fields.computed, fields.updatedAt]],
    );
  }
}
```

### 10-4. 큐 프로듀서 (양방향 공용)

```typescript
// src/sync/sync.producer.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SheetRowPayload } from '../sheets/sheets.types';

@Injectable()
export class SyncProducer {
  constructor(@InjectQueue('sheet-sync') private queue: Queue) {}

  /** 시트→DB: 행 id(없으면 rowIndex)로 직렬화 */
  async enqueueSheetToDb(row: SheetRowPayload) {
    await this.queue.add('sheet-to-db', row, {
      jobId: `sheet:${row.id || 'new:' + row.rowIndex}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  /** DB→시트: 같은 id면 직렬화 */
  async enqueueDbToSheet(id: string) {
    await this.queue.add('db-to-sheet', { id }, {
      jobId: `db:${id}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
```

### 10-5. 웹훅 컨트롤러

```typescript
// src/sync/sync.controller.ts
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { SyncProducer } from './sync.producer';
import { SheetRowPayload } from '../sheets/sheets.types';

@Controller('sync')
export class SyncController {
  constructor(private producer: SyncProducer) {}

  @Post('sheet-webhook')
  async fromSheet(
    @Headers('x-webhook-secret') secret: string,
    @Body() body: { rows: SheetRowPayload[] },
  ) {
    if (secret !== process.env.SHEET_WEBHOOK_SECRET) {
      throw new UnauthorizedException();
    }
    for (const row of body.rows ?? []) {
      await this.producer.enqueueSheetToDb(row);
    }
    return { ok: true, count: body.rows?.length ?? 0 };
  }
}
```

### 10-6. 시트 → DB 워커

```typescript
// src/sync/sheet-to-db.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { SheetRowPayload } from '../sheets/sheets.types';

@Processor('sheet-sync')
export class SheetToDbProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'sheet-to-db') return;
    const row = job.data as SheetRowPayload;

    // 1. 검증 (운영팀 오입력 방어)
    if (!row.name) return;
    const price = Number(row.price);
    if (Number.isNaN(price)) {
      // 잘못된 가격 → 시트에 에러 표시 + (선택) 카톡/슬랙 알림
      if (row.id) {
        await this.writer.pushServiceFields(row.id, {
          syncStatus: 'error: price',
          computed: 0,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    // 2. 신규행(id 없음) → DB가 id 발급 → 시트 A열에 회신
    if (!row.id) {
      const created = await this.prisma.product.create({
        data: {
          name: row.name,
          price,
          status: row.status || 'active',
          memo: row.memo,
          source: 'sheet',
          syncStatus: 'synced',
        },
      });
      await this.writer.writeId(row.rowIndex, created.id);
      await this.writer.pushServiceFields(created.id, {
        syncStatus: 'synced',
        computed: created.computed,
        updatedAt: created.updatedAt.toISOString(),
      });
      return;
    }

    // 3. 기존행 → upsert (LWW). 시트가 운영팀 컬럼의 source of truth
    const saved = await this.prisma.product.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        name: row.name,
        price,
        status: row.status || 'active',
        memo: row.memo,
        source: 'sheet',
        syncStatus: 'synced',
      },
      update: {
        name: row.name,
        price,
        status: row.status || 'active',
        memo: row.memo,
        source: 'sheet',
        syncStatus: 'synced',
      },
    });

    // 서비스 소유 컬럼만 시트에 반영 (운영팀 컬럼은 안 건드림 → 루프 없음)
    await this.writer.pushServiceFields(saved.id, {
      syncStatus: 'synced',
      computed: saved.computed,
      updatedAt: saved.updatedAt.toISOString(),
    });
  }
}
```

### 10-7. DB → 시트 워커

```typescript
// src/sync/db-to-sheet.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';

@Processor('sheet-sync')
export class DbToSheetProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'db-to-sheet') return;
    const { id } = job.data as { id: string };

    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) return;

    // 서비스 소유 컬럼(F~H)에만 반영 → onEdit 안 터짐 → 루프 차단
    await this.writer.pushServiceFields(p.id, {
      syncStatus: p.syncStatus,
      computed: p.computed,
      updatedAt: p.updatedAt.toISOString(),
    });
  }
}
```

> 서비스 로직에서 DB를 바꾼 뒤 `syncProducer.enqueueDbToSheet(id)`를 호출하면 시트에 반영된다.
> (Prisma `$extends` / 미들웨어로 자동 트리거하는 것도 가능하지만, 처음엔 명시적 호출로 시작하는 걸 권장)

### 10-8. 모듈 와이어링

```typescript
// src/sync/sync.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncProducer } from './sync.producer';
import { SheetToDbProcessor } from './sheet-to-db.processor';
import { DbToSheetProcessor } from './db-to-sheet.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [
    PrismaModule,
    SheetsModule,
    BullModule.registerQueue({ name: 'sheet-sync' }),
  ],
  controllers: [SyncController],
  providers: [SyncProducer, SheetToDbProcessor, DbToSheetProcessor],
  exports: [SyncProducer],
})
export class SyncModule {}
```

```typescript
// src/app.module.ts (핵심 부분)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    SyncModule,
  ],
})
export class AppModule {}
```

---

## 11. 테스트 시나리오

> 로컬 테스트 시 서버가 외부에서 접근 가능해야 onEdit 웹훅을 받는다. `ngrok http 3000` 등으로 터널을 열고, 그 URL을 Apps Script `WEBHOOK_URL`에 넣는다.

| # | 시나리오 | 동작 | 기대 결과 |
|---|---|---|---|
| T1 | 신규행 입력 | 시트 빈 행에 name/price 입력 | DB에 row 생성 + A열에 id 자동 채워짐 + F~H 채워짐 |
| T2 | 기존행 수정 | name 또는 price 수정 | DB 해당 row 업데이트 + `updated_at` 갱신 |
| T3 | 잘못된 가격 | price에 "abc" 입력 | DB 미반영 + F열 `error: price` 표시 |
| T4 | 다중 행 붙여넣기 | 여러 행 한 번에 paste | 모든 행 각각 처리(직렬화 확인) |
| T5 | 행 삽입 후 수정 | 중간에 행 삽입 → 아래 행 수정 | rowIndex 밀려도 id로 정확히 매칭 |
| T6 | DB→시트 | 서비스에서 computed 변경 후 enqueue | 해당 id 행의 G열만 갱신, B~E 불변 |
| T7 | 루프 검증 | T6 직후 | onEdit 재발동 안 함 / 추가 잡 생성 안 됨 |
| T8 | 보안 | 잘못된 secret으로 웹훅 호출 | 401 |

---

## 12. 구현 순서 (Claude Code 작업 단계)

**Phase 0 — 스캐폴딩**
- [ ] NestJS 프로젝트 + 의존성: `@nestjs/bullmq bullmq @nestjs/config googleapis prisma @prisma/client`
- [ ] `.env`, `.gitignore`(service-account.json 제외) 구성
- [ ] PrismaModule/Service, Prisma 스키마 + 마이그레이션

**Phase 1 — 단방향(Sheets→DB) 먼저 검증**
- [ ] SheetClientService, SheetWriterService 구현
- [ ] SyncController(웹훅) + SyncProducer + SheetToDbProcessor
- [ ] Apps Script 배포 + installable 트리거 등록 + ngrok 연결
- [ ] T1~T5, T8 통과 확인

**Phase 2 — 역방향(DB→Sheets) 추가**
- [ ] DbToSheetProcessor + `enqueueDbToSheet` 연결
- [ ] 테스트용 엔드포인트(예: `POST /test/update-computed/:id`)로 DB 변경 트리거
- [ ] T6, T7 통과 확인 (루프 없음 검증)

**Phase 3 — 견고화**
- [ ] 검증 실패 행 알림(카톡/슬랙) 연동
- [ ] Sheets API rate limit 대응: `batchUpdate`로 묶기 / BullMQ rate-limiter
- [ ] 삭제 정책 결정 및 구현(소프트 삭제 권장)
- [ ] (선택) Prisma `$extends`로 DB 변경 시 자동 enqueue

---

## 13. 운영 주의사항 / 결정 필요 항목

- **삭제 정책**: 시트 행 삭제 시 DB 처리 방식. onEdit은 행 삭제를 직접 감지하기 어려우므로, "삭제 대신 `status=deleted` 입력" 규칙을 운영팀과 합의하는 게 안전.
- **Sheets API 할당량**: 사용자/서비스계정당 분당 write ≈ 60. 트래픽 많으면 배치/레이트리밋 필수.
- **시크릿 관리**: `SHEET_WEBHOOK_SECRET`는 충분히 길게(32자+ 랜덤). Apps Script와 `.env` 동일값 유지.
- **컬럼 순서 고정**: 운영팀이 컬럼 순서를 바꾸면 깨진다. 헤더 기준 매핑으로 확장하거나, 시트 구조 변경 금지 안내.
- **초기 풀싱크**: 최초 1회는 시트 전체를 읽어 DB에 적재하는 부트스트랩 스크립트가 있으면 편하다(onEdit은 "변경"만 잡으므로).

---

## 14. 참고 — 처음엔 단방향부터

양방향을 한 번에 켜지 말고 **Phase 1(시트→DB)만 먼저 완성**해서 T1~T5를 통과시킨 뒤, Phase 2로 역방향을 얹는다. 루프/충돌 디버깅이 훨씬 쉬워진다.
