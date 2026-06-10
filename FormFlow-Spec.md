# 📋 FormFlow — SaaS 폼 빌더 (운영 서비스)

> **이 문서의 목적**
> Claude Code가 이 문서 **하나만 보고** FormFlow를 처음부터 끝까지 개발·배포할 수 있도록 작성된 단일 명세서.
> 모든 의사결정은 명시되어 있으며, 미정 항목은 `[DECISION-NEEDED]`로 표시한다.

---

## 0. 문서 사용 가이드 (Claude Code용)

### 0.0 🟢 Phase 우선순위 (반드시 먼저 읽을 것)

이 명세서는 **"로컬에서 끝까지 돌아가는 것"** 을 1순위로 한다. 도메인·SSL·외부 인프라 의존 작업은 **추후 Phase 배포**에서 진행한다.

| Phase | 범위 | 진행 시점 |
|---|---|---|
| **Phase 0 — 로컬 셋업** | docker-compose로 MySQL/Redis/MailHog 띄우고, 백엔드/프론트가 `localhost`에서 구동되는 것까지 | **최우선. 다른 작업보다 먼저.** §3-A, §14 M0 |
| **Phase 1~3 — 기능 개발** | 회원/폼/응답/관리자 기능을 **로컬 환경에서** 모두 완성 | §14 M1~M7 |
| **Phase 배포 — 운영 환경** | 도메인 발급, NCP 인프라, SSL, Vercel, CI/CD | **추후.** §3-B, §13, §14 M8 |

**Claude Code 작업 시 규칙**
- 사용자가 **"배포"** 또는 **"운영"** 을 명시하지 않은 경우, 모든 작업은 로컬 환경 기준으로 진행한다.
- 외부 서비스(NCP Mailer, Sentry, 실제 reCAPTCHA 도메인 등) 호출은 **로컬 대체재**(MailHog, Sentry 비활성, reCAPTCHA 테스트 키)로 동작해야 한다.
- §13(배포), §3-B(운영 환경)는 **명시 요청 전에는 건드리지 않는다**.

### 0.1 작업 우선순위 규칙
1. **이 문서가 단일 진실의 원천(Single Source of Truth)이다.** 외부 베스트 프랙티스보다 이 문서 명세를 우선한다.
2. 충돌이 있으면 **§17 의사결정 로그**를 우선 따른다.
3. 모든 코드는 **§4 기술 스택의 정확한 버전**에 맞춘다.
4. 패키지·디렉토리 구조는 **§8 / §9** 와 완전히 일치시킨다.
5. API 응답 포맷은 **§7.1 공통 응답 포맷**을 절대 위반하지 않는다.
6. 예외는 반드시 **§6.6 / §16.2 에러 코드 표** 안에서만 발생시킨다.
7. 환경변수는 **§16.1 환경변수 표**에 정의된 것만 사용한다.

### 0.2 작업 단위 권장
한 번에 하나의 마일스톤(§14)만 진행한다. 마일스톤마다:
- (a) 해당 섹션 DDL/마이그레이션 적용
- (b) Mapper → Service → Controller → DTO 순으로 구현
- (c) Postman/Swagger로 API 검증
- (d) 프론트 연동
- (e) §15 체크리스트 통과 확인

### 0.3 코드 스타일
- Java: Google Java Style, Lombok 허용 (`@Getter`, `@Builder`, `@RequiredArgsConstructor`만)
- TS: ESLint Airbnb + Prettier
- 모든 public 메서드는 의도가 명확하지 않으면 한국어 Javadoc 1줄
- 매직넘버 금지 → `application.yml` 또는 상수 클래스

---

## 1. 서비스 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | **FormFlow** |
| 한 줄 정의 | 누구나 5분 안에 만드는 한국형 온라인 설문/신청 폼 빌더 |
| 운영 도메인 | `form.sosyge.net` (프론트) / `api.form.sosyge.net` (API) |
| 타겟 사용자 | 1차: 소규모 사업자/동호회/스터디 운영자, 2차: 중소기업 HR/마케팅 |
| 차별점 | (1) 무료 플랜에서도 응답 CSV·통계 제공 (2) 한국어 UX·이메일 (3) 결제·환불 등 한국 비즈니스 양식 템플릿 |
| 수익 모델 | **현 단계: 무료 운영.** 추후 Freemium 확장을 위해 `users.plan` 컬럼만 미리 보유 (§5.2 참조) |
| 법적 운영 주체 | `[DECISION-NEEDED: 사업자명/대표자/주소/이메일 — §12에서 사용됨]` |

### 1.1 Phase 로드맵

| Phase | 기간 | 범위 |
|---|---|---|
| **Phase 1 (MVP)** | 3주 | 회원/폼/필드/공개응답/응답목록 + **이메일 인증** + **Rate Limit** + **약관** |
| **Phase 2** | 2주 | dnd-kit 순서변경, CSV 다운로드, 공개/마감 토글, **비밀번호 재설정**, **reCAPTCHA**, **Sentry** |
| **Phase 3** | 2주 | 통계 차트, 조건부 분기, **관리자 페이지**, 폼 신고 |
| **Phase 4** | 후속 | 결제/구독, 폼 테마, 파일 첨부 필드 |

---

## 2. 시스템 아키텍처

```
                       ┌─────────────────────────────────────────────────┐
                       │                  사용자 브라우저                  │
                       └───────────────┬─────────────────────────────────┘
                                       │ HTTPS
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        │                                                             │
        ▼                                                             ▼
┌──────────────────┐                                       ┌──────────────────┐
│  Vercel          │                                       │  NCP CentOS      │
│  (Next.js 14)    │                                       │  nginx (443)     │
│  form.sosyge.net │                                       │  api.form.sosyge │
└────────┬─────────┘                                       └────────┬─────────┘
         │                                                          │
         │  axios (fetch)                                           │ reverse proxy
         │  Bearer + Cookie                                         ▼
         └─────────────────────────────────────────────┐  ┌──────────────────┐
                                                       └─▶│  Spring Boot 3.x │
                                                          │  (port 8080)     │
                                                          └────────┬─────────┘
                                                                   │
                              ┌────────────────────────────────────┼──────────────────────────┐
                              ▼                                    ▼                          ▼
                    ┌──────────────────┐                 ┌──────────────────┐       ┌──────────────────┐
                    │  MySQL 8.x       │                 │  Redis 7.x       │       │  외부 서비스       │
                    │  (NCP Cloud DB)  │                 │  (NCP Cloud DB)  │       │  - NCP Mailer    │
                    └──────────────────┘                 └──────────────────┘       │  - reCAPTCHA v3  │
                                                                                    │  - Sentry        │
                                                                                    └──────────────────┘
```

### 2.1 컴포넌트 책임
- **Next.js (Vercel)**: SSR 공개 폼 페이지(SEO), 나머지는 CSR. axios interceptor로 토큰 갱신.
- **nginx**: TLS 종료, gzip, Rate Limit 1차 방어, 정적 파일 캐싱.
- **Spring Boot**: 비즈니스 로직, JWT 검증, MyBatis로 MySQL 접근.
- **MySQL**: 영속 데이터.
- **Redis**: ① 이메일/리셋 토큰 임시 저장 ② Refresh Token 블랙리스트 ③ Rate Limit 카운터 ④ reCAPTCHA 결과 캐싱(선택).
- **NCP Mailer**: 인증·재설정·관리자 알림 메일.
- **reCAPTCHA v3**: 회원가입, 비밀번호 재설정 요청, 공개 폼 응답 제출.
- **Sentry**: 백엔드(Spring) + 프론트(Next.js) 에러 추적.

### 2.2 데이터 흐름 — 공개 폼 응답 (가장 중요한 패스)
1. 응답자: `GET https://form.sosyge.net/f/{slug}` → SSR로 폼 메타+필드 렌더
2. SSR 단계에서 백엔드: `GET https://api.form.sosyge.net/api/f/{slug}`
3. 응답자: reCAPTCHA v3 토큰 발급 → `POST /api/f/{slug}/submit` (헤더 `X-Recaptcha-Token`)
4. 백엔드: ① reCAPTCHA 검증 ② Rate Limit 확인 (IP + slug 단위) ③ `respondent_key` 중복 체크 ④ INSERT
5. 응답자: 완료 페이지 + localStorage에 `respondent_key` 저장 (중복 방지)

---

## 3. 환경 구성

> **§3-A 로컬 환경** = Phase 0 / Phase 1~3 작업의 실제 실행 환경. **이 절을 그대로 따르면 도메인 없이 모든 기능을 검증할 수 있다.**
> **§3-B 운영 환경** = Phase 배포에서 사용. 도메인 발급 전에는 참고만 한다.

---

### 3-A. 로컬 환경 (Phase 0 — 주력 환경)

#### 3-A.1 URL & 포트 (로컬 고정)

| 항목 | URL | 비고 |
|---|---|---|
| 프론트 | `http://localhost:3000` | Next.js dev 서버 |
| 백엔드 API | `http://localhost:8080` | Spring Boot |
| MySQL | `localhost:3306` | docker compose |
| Redis | `localhost:6379` | docker compose |
| MailHog SMTP | `localhost:1025` | docker compose (백엔드가 송신) |
| MailHog Web UI | `http://localhost:8025` | **모든 발송 메일을 여기서 확인** |
| Swagger UI | `http://localhost:8080/swagger-ui.html` | API 문서 |
| 공개 폼 URL 예시 | `http://localhost:3000/f/{slug}` | 응답자용 |

#### 3-A.2 사전 요구사항

| 도구 | 버전 | 설치 확인 |
|---|---|---|
| JDK | 17 | `java -version` |
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Docker | 24+ | `docker -v` |
| Docker Compose | v2 | `docker compose version` |
| Git | 2.40+ | `git --version` |

OS는 Windows(WSL2 권장) / macOS / Ubuntu 모두 가능.

#### 3-A.3 docker-compose (로컬 인프라)

`docker-compose.local.yml` (리포지토리 루트)
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: formflow-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpw
      MYSQL_DATABASE: formflow
      MYSQL_USER: formflow
      MYSQL_PASSWORD: formflowpw
      TZ: Asia/Seoul
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_0900_ai_ci
      - --default-time-zone=+09:00
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-prootpw"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7-alpine
    container_name: formflow-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  mailhog:
    image: mailhog/mailhog:latest
    container_name: formflow-mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI

volumes:
  mysql_data:
  redis_data:
```

기동:
```bash
docker compose -f docker-compose.local.yml up -d
docker compose -f docker-compose.local.yml ps
```

종료/초기화:
```bash
docker compose -f docker-compose.local.yml down          # 컨테이너만
docker compose -f docker-compose.local.yml down -v       # 볼륨까지 삭제 (DB 초기화)
```

#### 3-A.4 백엔드 로컬 환경변수 (`.env.local` 또는 IDE Run Configuration)

`backend/.env.local` (Git ignore 대상)
```bash
SPRING_PROFILES_ACTIVE=local

# DB / Redis
DB_URL=jdbc:mysql://localhost:3306/formflow?useSSL=false&serverTimezone=Asia/Seoul&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
DB_USERNAME=formflow
DB_PASSWORD=formflowpw
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (로컬 고정값 — 운영은 절대 사용 금지)
JWT_SECRET=local-dev-only-change-me-to-random-base64-string-32bytes-or-more

# URLs
FRONT_URL=http://localhost:3000
API_URL=http://localhost:8080

# Cookie (로컬은 SameSite=Lax + Secure=false)
COOKIE_DOMAIN=
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax

# CORS
CORS_ORIGINS=http://localhost:3000

# Mail — 로컬은 SMTP(MailHog) 사용
MAIL_PROVIDER=smtp
MAIL_FROM=no-reply@formflow.local
SMTP_HOST=localhost
SMTP_PORT=1025

# reCAPTCHA — 로컬은 우회 (아래 §3-A.7 참조)
RECAPTCHA_ENABLED=false
RECAPTCHA_SECRET=local-disabled
RECAPTCHA_SITE_KEY=local-disabled

# Sentry — 로컬 비활성
SENTRY_DSN_BACKEND=

# 관리자 IP 화이트리스트 — 로컬은 비활성
ADMIN_ALLOWED_IPS=
```

IntelliJ에서 적용: Run/Debug Configurations → Environment variables → `EnvFile` 플러그인 또는 직접 입력.

VSCode/터미널에서 적용:
```bash
export $(grep -v '^#' backend/.env.local | xargs)
cd backend && ./gradlew bootRun
```

#### 3-A.5 프론트엔드 로컬 환경변수

`frontend/.env.local` (Next.js가 자동 로드)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
NEXT_PUBLIC_RECAPTCHA_ENABLED=false
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ENV=local
```

> `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`는 Google 공식 테스트 키. 항상 `success: true, score: 0.9` 응답이지만, 로컬에서는 `RECAPTCHA_ENABLED=false`로 검증 자체를 건너뛴다 (§3-A.7).

#### 3-A.6 메일 — MailHog로 분기

`application-local.yml`은 `MAIL_PROVIDER=smtp`를 사용해 Spring의 기본 `JavaMailSender`로 MailHog에 송신.

```yaml
# application-local.yml 추가 부분
spring:
  mail:
    host: ${SMTP_HOST:localhost}
    port: ${SMTP_PORT:1025}
    properties:
      mail:
        smtp:
          auth: false
          starttls:
            enable: false
```

`SmtpMailService`는 §11.1의 `NcpMailService`와 동일 `MailService` 인터페이스를 구현. 프로필에 따라 자동 분기:

`service/mail/SmtpMailService.java`
```java
@Service
@Profile("local")
@RequiredArgsConstructor
public class SmtpMailService implements MailService {
    private final JavaMailSender mailSender;
    private final MailProperties props;

    @Override
    @Async("mailExecutor")
    public void send(String to, String subject, String htmlBody) {
        MimeMessage msg = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(props.getFrom(), props.getFromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("[MAIL][SMTP] send failed to={} subject={}", to, subject, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "메일 발송에 실패했습니다.");
        }
    }
}
```

`NcpMailService`는 `@Profile("!local")`로 운영 프로필에서만 활성. 두 빈이 동시에 뜨는 일은 없음.

발송된 메일은 `http://localhost:8025`(MailHog UI)에서 즉시 확인. 이메일 인증 링크도 여기서 클릭해 테스트.

#### 3-A.7 reCAPTCHA — 로컬은 우회

로컬에서 매번 Google에 토큰 검증을 요청하면 개발이 번거롭다. `RECAPTCHA_ENABLED=false`일 때 `RecaptchaVerifier`가 검증을 건너뛰도록 구현:

`security/RecaptchaVerifier.java` (§11.3의 풀 코드를 다음과 같이 수정)
```java
@Component
@RequiredArgsConstructor
public class RecaptchaVerifier {
    private static final String URL = "https://www.google.com/recaptcha/api/siteverify";
    private final RecaptchaProperties props;
    private final RestTemplate restTemplate;

    public void verify(String token, String action, double threshold) {
        if (!props.isEnabled()) {
            log.debug("[RECAPTCHA] disabled — skip verify");
            return;
        }
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
        // ... (이하 §11.3 동일)
    }
}
```

`RecaptchaProperties.enabled`는 `RECAPTCHA_ENABLED` 환경변수로 주입. 운영은 기본 `true`, 로컬은 `false`.

프론트 측도 동일하게 `NEXT_PUBLIC_RECAPTCHA_ENABLED=false`인 경우 `executeRecaptcha()` 호출 없이 빈 문자열을 전송. (백엔드가 검증을 건너뛰므로 OK)

`frontend/src/lib/recaptcha.ts`
```ts
'use client';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  return async (action: string): Promise<string> => {
    if (!ENABLED) return '';
    if (!executeRecaptcha) throw new Error('reCAPTCHA not ready');
    return await executeRecaptcha(action);
  };
}
```

`RecaptchaProvider`도 비활성 시 `children`만 그대로 반환하도록 보강:
```tsx
export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const enabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
  if (!enabled) return <>{children}</>;
  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey} scriptProps={{ async: true, defer: true }}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
```

#### 3-A.8 Rate Limit — 로컬은 완화

로컬에서 매번 429를 만나면 개발이 번거롭다. `application-local.yml`에서 한도를 크게 풀거나 비활성화:

```yaml
formflow:
  rate-limit:
    enabled: false   # 로컬 비활성
```

`RateLimitFilter`에서 `enabled=false`이면 필터를 통과시킨다.

#### 3-A.9 Cookie — 로컬 설정

로컬은 HTTPS가 아니므로 `Secure=false`, 같은 도메인이 아니어도 동작하도록 `SameSite=Lax`, `Domain` 비움.

`config/CookieProperties.java` 가 `application-local.yml`의 값을 그대로 사용. 운영에서는 §6.5 표대로.

#### 3-A.10 데이터 시드 (선택)

로컬에서 빠르게 테스트하기 위한 시드 마이그레이션을 추가할 수 있다.

`backend/src/main/resources/db/migration/V900__local_seed.sql` (운영에는 적용 금지 — 파일명 V900으로 두고 운영 Flyway에서는 `flyway.placeholderReplacement=false` + 별도 처리, 혹은 더 안전하게 **로컬 전용 SQL을 별도 디렉토리**로 두고 `application-local.yml`에서만 로드):

운영 안전성 우선 — 시드는 Flyway에 두지 않고 `backend/scripts/seed-local.sql`로 둔다:
```sql
-- backend/scripts/seed-local.sql
-- 로컬 개발용 더미 데이터. 운영에 절대 적용 금지.

-- 테스트 사용자 (비밀번호: Test1234!)
INSERT INTO users (email, password, nickname, role, status, email_verified_at)
VALUES (
  'user@test.local',
  '$2a$12$5DqLwhCv7yY.5DqLwhCv7uPlaceholderBcryptHash................',
  '테스트유저', 'USER', 'ACTIVE', NOW()
);

-- 위 해시는 placeholder. 실제로는 다음 명령으로 생성한 값을 사용:
-- echo -n 'Test1234!' | htpasswd -bnBC 12 "" 'Test1234!' | tr -d ':\n' | sed 's/$2y/$2a/'
```

적용:
```bash
mysql -h 127.0.0.1 -P 3306 -uformflow -pformflowpw formflow < backend/scripts/seed-local.sql
```

> 정식 bcrypt 해시는 백엔드가 한 번 기동된 후 회원가입 API로 만들거나, `BCryptPasswordEncoder.encode()` 한 줄 호출하는 유틸을 만들어 출력해 두면 편하다.

#### 3-A.11 실행 순서 (Cold Start)

```bash
# 1) 인프라 기동
docker compose -f docker-compose.local.yml up -d

# 2) MySQL 준비 대기 (~10초)
docker compose -f docker-compose.local.yml ps  # mysql healthy 확인

# 3) 백엔드 기동
cd backend
export $(grep -v '^#' .env.local | xargs)
./gradlew bootRun
# → Flyway가 V1, V2 마이그레이션 자동 적용
# → http://localhost:8080/actuator/health → {"status":"UP"}

# 4) 프론트 기동 (새 터미널)
cd frontend
npm install   # 최초 1회
npm run dev
# → http://localhost:3000

# 5) MailHog 확인
# → http://localhost:8025 열어두기

# 6) 회원가입 → MailHog에서 메일 클릭 → 인증 완료 → 로그인
```

---

### 3-B. 운영 환경 (Phase 배포 — 추후 작업)

> 🔵 **이 절은 도메인 발급 + NCP 인프라 준비가 완료된 뒤 진행한다. 로컬 개발 중에는 참고만 한다.**

#### 3-B.1 도메인 구성 (예정)

| 용도 | 도메인 | 호스팅 | 비고 |
|---|---|---|---|
| 메인 프론트 | `form.sosyge.net` | Vercel | SSL 자동 |
| API | `api.form.sosyge.net` | NCP + nginx | Let's Encrypt |
| 관리자 | 동일 도메인 `/admin` 경로 | Vercel | 백엔드는 `/api/admin/**` |
| 정적 파일 | (Phase 4) `static.form.sosyge.net` | NCP Object Storage | 현재 미사용 |

#### 3-B.2 환경 분리

| 환경 | 프론트 URL | API URL | DB | 용도 |
|---|---|---|---|---|
| local | `http://localhost:3000` | `http://localhost:8080` | docker MySQL | 개발 (§3-A) |
| dev | `https://form-dev.sosyge.net` | `https://api-form-dev.sosyge.net` | 기존 dev 서버 MySQL `formflow` 스키마 | 실서버 검증 (§3-B.5) |
| prod | `form.sosyge.net` | `api.form.sosyge.net` | NCP Cloud DB (prod) | 운영 |

> **dev 도메인 주의**: 와일드카드 인증서 `*.sosyge.net`은 **정확히 한 레벨**만 커버한다. `form.dev.sosyge.net`(두 레벨)은 커버 못 하므로, 하이픈을 써서 `form-dev.sosyge.net` / `api-form-dev.sosyge.net`(한 레벨)으로 둔다.

#### 3-B.5 dev 분기 배포 (기존 서버 공존)

기존 톰캣/서비스가 돌아가는 dev 서버(CentOS Stream 9, nginx)에 FormFlow를 **포트·스키마·프로세스 격리**로 공존 배포한 실제 구성. 운영 배포(prod) 시에도 동일 패턴 재사용.

**핵심 원칙**: 기존 서비스의 포트·nginx conf·DB를 절대 수정하지 않는다. FormFlow용 자원만 **추가**한다.

| 자원 | 값 | 격리 방법 |
|---|---|---|
| 백엔드 포트 | `18080` | 기존 점유 포트(8005/8080/8090/8185/18083)와 분리 |
| 프론트 포트 | `13000` | 〃 |
| Java | JDK 17 **추가 설치** (`/usr/lib/jvm/java-17-openjdk`) | 기존 Java 11 기본값 유지. FormFlow systemd만 `JAVA_HOME=17` 명시 |
| DB | MySQL `formflow` 스키마 + `formflow`@`localhost`,`@127.0.0.1` 계정 | 기존 DB·계정 무관 |
| Redis | `dnf install redis`, `127.0.0.1:6379` | 신규 |
| Node | `dnf module install nodejs:20` | 신규 |
| 메일 | MailHog 바이너리, `127.0.0.1:1025/8025` | `MAIL_PROVIDER=smtp` |
| nginx | `/etc/nginx/conf.d/form-dev.sosyge.net.conf` **신규 파일** | 기존 `dev.sosyge.net.conf` 미수정 |
| SSL | 기존 `*.sosyge.net` 와일드카드 재사용 | certbot 불필요 |

**백엔드 배포**: 로컬에서 `bootJar` 빌드 → `scp` → `/opt/formflow/formflow.jar`. `/opt/formflow/.env`(권한 600)에 환경변수, systemd `formflow.service`로 기동(`User=formflow`, `JAVA_HOME=17`, `-Xmx1g`). prod 프로파일.

**프론트 배포**: 소스 `rsync`(node_modules/.next 제외) → 서버에서 `npm ci && npm run build`(빌드는 root, 실행은 formflow). systemd `formflow-frontend.service`(`User=formflow`, `PORT=13000`, `HOME=/home/formflow`, `API_URL_INTERNAL=http://127.0.0.1:18080`).

**dev `.env` 핵심값**:
```bash
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=18080
DB_URL=jdbc:mysql://localhost:3306/formflow?...&allowPublicKeyRetrieval=true
COOKIE_DOMAIN=.sosyge.net          # 프론트/API 서브도메인 쿠키 공유
COOKIE_SECURE=true                 # HTTPS
CORS_ORIGINS=https://form-dev.sosyge.net
MAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SPRING_MAIL_HOST=localhost         # ★ prod에서 JavaMailSender 빈 생성 트리거
SPRING_MAIL_PORT=1025
RECAPTCHA_ENABLED=false
```

**프론트 `.env.production` 핵심값**:
```bash
NEXT_PUBLIC_API_URL=https://api-form-dev.sosyge.net   # 브라우저(클라) 호출
API_URL_INTERNAL=http://127.0.0.1:18080               # SSR 공개폼 서버사이드 직접 호출
NEXT_PUBLIC_RECAPTCHA_ENABLED=false
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=                        # ! 단언 빌드 깨짐 방지 빈 값
```

**nginx conf (신규 파일)**: `form-dev`→`127.0.0.1:13000`, `api-form-dev`→`127.0.0.1:18080`, SSL은 기존 와일드카드 경로 재사용. server 블록 4개(각 도메인 80 redirect + 443 proxy). `nginx -t` 후 `systemctl reload`(무중단).

#### 3-B.3 서버 사양 (NCP 권장 시작점)

| 구분 | 사양 | 비고 |
|---|---|---|
| App Server | Server (vCPU 2, RAM 4GB) × 1 | Spring Boot |
| MySQL | Cloud DB for MySQL (Micro) | 자동 백업 7일 |
| Redis | Cloud DB for Redis (Standard, 1GB) | persistence on |
| 로드밸런서 | (Phase 4) Load Balancer | 초기 미사용 |

#### 3-B.4 nginx 설정 (api.form.sosyge.net)

`/etc/nginx/sites-available/api.form.sosyge.net.conf`

```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_submit:10m rate=10r/s;

server {
    listen 80;
    server_name api.form.sosyge.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.form.sosyge.net;

    ssl_certificate     /etc/letsencrypt/live/api.form.sosyge.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.form.sosyge.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 5M;

    location ~ ^/api/auth/(login|signup|password-reset) {
        limit_req zone=api_auth burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include /etc/nginx/snippets/proxy-headers.conf;
    }
    location ~ ^/api/f/.+/submit$ {
        limit_req zone=api_submit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include /etc/nginx/snippets/proxy-headers.conf;
    }
    location /api/ {
        limit_req zone=api_general burst=60 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include /etc/nginx/snippets/proxy-headers.conf;
    }
    location = /actuator/health {
        proxy_pass http://127.0.0.1:8080;
        access_log off;
    }
}
```

`/etc/nginx/snippets/proxy-headers.conf`
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-Id $request_id;
proxy_read_timeout 30s;
proxy_connect_timeout 5s;
```

#### 3-B.5 SSL 발급 (운영 첫 세팅 시 1회)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.form.sosyge.net -m admin@sosyge.net --agree-tos
sudo systemctl enable --now certbot.timer
```

---

## 4. 기술 스택 (버전 고정)

### 4.1 백엔드 (`build.gradle`)

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.5'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'org.flywaydb.flyway' version '10.10.0'
}

group = 'net.sosyge.formflow'
version = '0.1.0'
sourceCompatibility = '17'

repositories { mavenCentral() }

dependencies {
    // Web / Validation
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // Security / JWT
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.5'
    runtimeOnly    'io.jsonwebtoken:jjwt-impl:0.12.5'
    runtimeOnly    'io.jsonwebtoken:jjwt-jackson:0.12.5'

    // MyBatis / MySQL
    implementation 'org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.3'
    runtimeOnly    'com.mysql:mysql-connector-j:8.3.0'

    // Redis
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'

    // Mail (NCP Cloud Outbound Mailer는 HTTP API, RestTemplate 사용)
    implementation 'org.springframework.boot:spring-boot-starter-mail' // SMTP fallback

    // Flyway
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-mysql'

    // OpenAPI (Swagger UI)
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.5.0'

    // 모니터링
    implementation 'io.sentry:sentry-spring-boot-starter-jakarta:7.6.0'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    // Rate Limit (Redis 기반)
    implementation 'com.bucket4j:bucket4j-redis:8.10.1'

    // Lombok
    compileOnly    'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // Test
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testImplementation 'org.testcontainers:mysql:1.19.7'
}

tasks.named('test') { useJUnitPlatform() }
```

### 4.2 프론트엔드 (`package.json` 핵심)

```json
{
  "name": "formflow-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.4.5",
    "@tanstack/react-query": "5.40.0",
    "zustand": "4.5.2",
    "axios": "1.7.2",
    "@dnd-kit/core": "6.1.0",
    "@dnd-kit/sortable": "8.0.0",
    "react-hook-form": "7.51.4",
    "zod": "3.23.8",
    "@hookform/resolvers": "3.4.2",
    "recharts": "2.12.7",
    "react-google-recaptcha-v3": "1.10.1",
    "@sentry/nextjs": "8.7.0",
    "tailwindcss": "3.4.3",
    "clsx": "2.1.1",
    "date-fns": "3.6.0",
    "uuid": "9.0.1"
  },
  "devDependencies": {
    "@types/node": "20.12.12",
    "@types/react": "18.3.2",
    "@types/uuid": "9.0.8",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.3",
    "prettier": "3.2.5",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.38"
  }
}
```

### 4.3 외부 서비스

| 서비스 | 용도 | 환경변수 | 비고 |
|---|---|---|---|
| NCP Cloud Outbound Mailer | 트랜잭션 메일 | `NCP_ACCESS_KEY`, `NCP_SECRET_KEY`, `MAIL_FROM` | HMAC v2 서명 |
| Google reCAPTCHA v3 | 봇 방지 | `RECAPTCHA_SITE_KEY` (FE), `RECAPTCHA_SECRET` (BE) | score 임계값 0.5 |
| Sentry | 에러 추적 | `SENTRY_DSN_BACKEND`, `SENTRY_DSN_FRONTEND` | 무료 플랜으로 시작 |
| NCP Cloud Insight | 서버 메트릭 | (NCP 콘솔에서 설정) | CPU/Mem/Disk 알람 |

---

## 5. DB 설계

### 5.1 ERD (논리)

```
users (1) ──< (N) refresh_tokens
  │
  ├──< email_tokens         (이메일 인증 + 비밀번호 재설정 통합)
  ├──< terms_agreements     (약관 동의 이력)
  ├──< login_audits         (로그인 시도 로그)
  │
  └──< forms (1) ──< (N) form_fields
              │              │
              │              └──< response_items (N) ──> (1) form_fields
              │
              ├──< responses (1) ──< (N) response_items
              │
              └──< form_reports (사용자 신고)

admin_audits (관리자 작업 감사 로그)
```

### 5.2 DDL 전체

`backend/src/main/resources/db/migration/V1__init.sql`

```sql
-- =========================================================
-- V1: 초기 스키마
-- =========================================================
SET NAMES utf8mb4;
SET time_zone = '+09:00';

-- ---------------------------------------------------------
-- 사용자
-- ---------------------------------------------------------
CREATE TABLE users (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255) NOT NULL,
  password        VARCHAR(255) NOT NULL COMMENT 'bcrypt cost 12',
  nickname        VARCHAR(50)  NOT NULL,
  role            ENUM('USER','ADMIN')                          NOT NULL DEFAULT 'USER',
  status          ENUM('PENDING','ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'PENDING',
  plan            ENUM('FREE','PRO','TEAM')                     NOT NULL DEFAULT 'FREE'
                  COMMENT '미래 결제용 컬럼. Phase 1~3 동안 FREE 고정',
  email_verified_at DATETIME     NULL,
  last_login_at     DATETIME     NULL,
  suspended_reason  VARCHAR(500) NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- Refresh Token (DB 보관 — Redis는 블랙리스트 용도)
-- ---------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256(token) — 평문 미저장',
  user_agent  VARCHAR(255) NULL,
  ip          VARCHAR(45)  NULL,
  expired_at  DATETIME     NOT NULL,
  revoked_at  DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY idx_refresh_user_id (user_id),
  KEY idx_refresh_expired (expired_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 이메일 토큰 (인증 / 비밀번호 재설정 통합)
-- ---------------------------------------------------------
CREATE TABLE email_tokens (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  purpose     ENUM('VERIFY_EMAIL','RESET_PASSWORD') NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256(token)',
  expired_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_token_hash (token_hash),
  KEY idx_email_token_user_purpose (user_id, purpose, used_at),
  CONSTRAINT fk_email_token_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 약관 동의 이력
-- ---------------------------------------------------------
CREATE TABLE terms_agreements (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  user_id      BIGINT       NOT NULL,
  terms_type   ENUM('SERVICE','PRIVACY','MARKETING') NOT NULL,
  terms_version VARCHAR(20) NOT NULL COMMENT '예: 2025-05-01',
  agreed       TINYINT(1)   NOT NULL,
  agreed_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip           VARCHAR(45)  NULL,
  PRIMARY KEY (id),
  KEY idx_terms_user (user_id),
  CONSTRAINT fk_terms_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 로그인 시도 감사
-- ---------------------------------------------------------
CREATE TABLE login_audits (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  user_id    BIGINT       NULL,
  success    TINYINT(1)   NOT NULL,
  ip         VARCHAR(45)  NULL,
  user_agent VARCHAR(255) NULL,
  reason     VARCHAR(100) NULL COMMENT '실패 사유: WRONG_PASSWORD/NOT_FOUND/SUSPENDED 등',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_audit_email_time (email, created_at),
  KEY idx_login_audit_ip_time (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 폼
-- ---------------------------------------------------------
CREATE TABLE forms (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  user_id        BIGINT       NOT NULL,
  slug           CHAR(12)     NOT NULL COMMENT '공개 URL용 nanoid',
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  status         ENUM('DRAFT','PUBLISHED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  response_limit INT          NULL COMMENT 'NULL=무제한, 무료 플랜 기본 100',
  closed_at      DATETIME     NULL COMMENT '실제 마감된 시각(기록)',
  closes_at      DATETIME     NULL COMMENT '마감 예정 시각(예약). V3 추가. AutoCloseFormJob이 이 시각 도달 시 자동 마감',
  deleted_at     DATETIME     NULL COMMENT 'Soft delete',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_forms_slug (slug),
  KEY idx_forms_user_id (user_id, deleted_at),
  KEY idx_forms_status (status, deleted_at),
  KEY idx_forms_closes_at (status, closes_at),
  CONSTRAINT fk_forms_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 주의: closed_at(실제 마감 시각, 기록) ≠ closes_at(마감 예정 시각, 예약). 혼동 금지. 상세 §10.6 / §17 D-016.

-- ---------------------------------------------------------
-- 폼 필드
-- ---------------------------------------------------------
CREATE TABLE form_fields (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  form_id     BIGINT       NOT NULL,
  type        ENUM('SHORT','LONG','SINGLE','MULTI','EMAIL','NUMBER','DATE') NOT NULL,
  label       VARCHAR(500) NOT NULL,
  placeholder VARCHAR(255) NULL,
  required    TINYINT(1)   NOT NULL DEFAULT 0,
  order_num   INT          NOT NULL,
  options     JSON         NULL COMMENT 'SINGLE/MULTI: ["옵션1","옵션2"]',
  validation  JSON         NULL COMMENT '{"minLength":1,"maxLength":500} 등. SHORT 접미사: {"suffix":"고등학교"}(고정) 또는 {"suffixMode":"select","suffixOptions":["고등학교","중학교","초등학교"]}(선택). 상세 §17 D-017',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fields_form_order (form_id, order_num),
  CONSTRAINT fk_fields_form FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 응답 (제출 1건)
-- ---------------------------------------------------------
CREATE TABLE responses (
  id              BIGINT      NOT NULL AUTO_INCREMENT,
  form_id         BIGINT      NOT NULL,
  respondent_key  VARCHAR(64) NOT NULL COMMENT '클라이언트 UUID',
  ip              VARCHAR(45) NULL,
  user_agent      VARCHAR(255) NULL,
  submitted_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_responses_key (form_id, respondent_key),
  KEY idx_responses_form_time (form_id, submitted_at),
  CONSTRAINT fk_responses_form FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 응답 항목
-- ---------------------------------------------------------
CREATE TABLE response_items (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  response_id BIGINT NOT NULL,
  field_id    BIGINT NOT NULL,
  value       TEXT COMMENT '저장 형식: SINGLE/SHORT/LONG/EMAIL/NUMBER/DATE는 단일 문자열, MULTI는 JSON 배열 문자열 ["옵션1","옵션2"]',
  PRIMARY KEY (id),
  KEY idx_items_response_id (response_id),
  KEY idx_items_field_id (field_id),
  CONSTRAINT fk_items_response FOREIGN KEY (response_id) REFERENCES responses (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_field    FOREIGN KEY (field_id)    REFERENCES form_fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ┌─ 응답 값(response_items.value) 저장 형식 규약 (확정) ──────────────┐
-- │ SHORT / LONG / EMAIL / NUMBER / DATE / SINGLE → 단일 문자열         │
-- │ MULTI → JSON 배열 문자열. 예: ["옵션1","옵션3"]                     │
-- │   - 콤마구분 금지 (옵션 값에 콤마 포함 가능성 + options 컬럼과 일관) │
-- │   - 프론트 FieldRenderer onChange(string[]) → JSON.stringify 후 전송 │
-- │   - M5 CSV export 시 MULTI는 "옵션1, 옵션3"으로 표시(파싱 후 join)  │
-- │   - M6 통계 집계 시 JSON 파싱해 옵션별 카운트                       │
-- └────────────────────────────────────────────────────────────────────┘

-- ---------------------------------------------------------
-- 폼 신고
-- ---------------------------------------------------------
CREATE TABLE form_reports (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  form_id      BIGINT       NOT NULL,
  reporter_ip  VARCHAR(45)  NULL,
  reporter_user_id BIGINT   NULL,
  reason       ENUM('SPAM','PHISHING','ILLEGAL','PRIVACY','OTHER') NOT NULL,
  detail       TEXT         NULL,
  status       ENUM('PENDING','REVIEWING','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  handled_by   BIGINT       NULL,
  handled_at   DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_form (form_id),
  CONSTRAINT fk_reports_form FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 관리자 작업 감사
-- ---------------------------------------------------------
CREATE TABLE admin_audits (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  admin_id    BIGINT       NOT NULL,
  action      VARCHAR(50)  NOT NULL COMMENT 'USER_SUSPEND/USER_RESTORE/FORM_FORCE_CLOSE/REPORT_RESOLVE',
  target_type VARCHAR(20)  NOT NULL COMMENT 'USER/FORM/REPORT',
  target_id   BIGINT       NOT NULL,
  detail      JSON         NULL,
  ip          VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_admin (admin_id, created_at),
  KEY idx_admin_audit_target (target_type, target_id),
  CONSTRAINT fk_admin_audit_user FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.3 시드 데이터

`backend/src/main/resources/db/migration/V2__seed_admin.sql`

```sql
-- 최초 관리자 계정 (운영 배포 후 비밀번호 즉시 변경)
-- 비밀번호: AdminInit!2025  (bcrypt cost 12)
INSERT INTO users (email, password, nickname, role, status, email_verified_at)
VALUES (
  'admin@sosyge.net',
  '$2a$12$YQTtTQUePLPGrCa9CkWmIeYf6lcKVQpEYY8b3Ku.7zRePnTGSpYsq',
  '관리자',
  'ADMIN',
  'ACTIVE',
  NOW()
);
```

> **주의**: 운영 배포 직후 위 비밀번호를 반드시 `/api/users/me/password` API로 변경할 것.

### 5.4 인덱스 전략 요약

| 테이블 | 인덱스 | 이유 |
|---|---|---|
| users | `uq_users_email`, `idx_users_status` | 로그인, 관리자 필터링 |
| refresh_tokens | `uq_refresh_token_hash`, `idx_refresh_expired` | 검증, TTL 정리 |
| email_tokens | `uq_email_token_hash`, `(user_id, purpose, used_at)` | 토큰 검증, 중복 발급 체크 |
| forms | `uq_forms_slug`, `(user_id, deleted_at)`, `(status, deleted_at)` | 공개 URL, 내 폼 목록, 관리자 |
| form_fields | `(form_id, order_num)` | 정렬된 필드 조회 |
| responses | `uq_responses_key`, `(form_id, submitted_at)` | 중복 방지, 최신순 페이징 |
| response_items | `(response_id)`, `(field_id)` | 응답 상세, 통계 집계 |
| form_reports | `(status, created_at)` | 관리자 신고 큐 |
| admin_audits | `(admin_id, created_at)`, `(target_type, target_id)` | 감사 추적 |

### 5.5 Flyway 마이그레이션 규칙
- 파일명: `V{버전}__{설명}.sql` (예: `V3__add_field_validation.sql`)
- 운영 적용 후 **수정 금지** (수정 필요 시 새 버전 추가)
- 모든 DDL은 반드시 Flyway 파일로 관리, 수동 ALTER 금지
- 위치: `backend/src/main/resources/db/migration/`

### 5.6 무료 플랜 정책 (현재 단계 운영 기준)

| 항목 | 무료 한도 | 검증 위치 |
|---|---|---|
| 폼 개수 | 사용자당 10개 | `FormService.create()` |
| 폼당 필드 수 | 30개 | `FieldService.create()` |
| 폼당 응답 수 | 100건 (이후 추가 응답 거부) | `ResponseService.submit()` |
| 응답 보관 기간 | 1년 (이후 자동 삭제) | 배치 작업 (§13.2) |

위 한도는 `application.yml`의 `formflow.limits.*` 로 관리한다.

---

## 6. 인증 & 보안

### 6.1 회원가입 + 이메일 인증 플로우

```
[1] POST /api/auth/signup
    ↓ users INSERT (status=PENDING)
    ↓ email_tokens INSERT (purpose=VERIFY_EMAIL, ttl=24h)
    ↓ 이메일 발송 (https://form.sosyge.net/verify?token=...)
    ↓ 응답: { success: true, data: { userId, email } }   ※ 토큰 발급 X (미인증 상태)

[2] 사용자가 메일 링크 클릭 → 프론트 /verify?token=xxx
    ↓ POST /api/auth/verify-email  { token }
    ↓ email_tokens 검증 (해시 비교, expired_at, used_at)
    ↓ users.status = ACTIVE, email_verified_at = NOW()
    ↓ email_tokens.used_at = NOW()
    ↓ 응답: 자동 로그인 처리 — Access + Refresh 발급

[3] 미인증 상태에서 로그인 시도
    ↓ 401 + code=EMAIL_NOT_VERIFIED
    ↓ 프론트: "재발송" 버튼 제공
    ↓ POST /api/auth/resend-verification  (Rate Limit: 1분 1회, 1일 5회)
```

### 6.2 로그인 플로우

```
[1] POST /api/auth/login  { email, password, recaptchaToken? }
    ↓ reCAPTCHA 검증 (실패 누적 3회 이상이면 필수)
    ↓ users 조회
    ↓ status 체크: PENDING → 401 EMAIL_NOT_VERIFIED
    ↓             SUSPENDED → 403 ACCOUNT_SUSPENDED (suspended_reason 포함)
    ↓             DELETED → 404 NOT_FOUND
    ↓ bcrypt.matches() 검증
    ↓ login_audits INSERT
    ↓ Access Token 생성 (30분)
    ↓ Refresh Token 생성 (7일) → token_hash로 DB 저장
    ↓ Set-Cookie: refreshToken=<원본>; HttpOnly; Secure; SameSite=Strict;
                  Path=/api/auth; Max-Age=604800
    ↓ users.last_login_at = NOW()
    ↓ 응답: { accessToken, user: { id, email, nickname, role } }
```

### 6.3 토큰 갱신 / 로그아웃

```
[갱신] POST /api/auth/refresh  (Cookie: refreshToken)
    ↓ Cookie 없음 → 401 UNAUTHORIZED
    ↓ SHA-256 해시 → DB 조회 → expired_at 검증 → revoked_at 검증
    ↓ Token Rotation: 기존 Refresh revoked_at = NOW(), 새 Refresh 발급
    ↓ Set-Cookie 갱신 + 새 accessToken 응답

[로그아웃] POST /api/auth/logout  (Cookie: refreshToken)
    ↓ DB Refresh revoked_at = NOW()
    ↓ Access Token JTI를 Redis 블랙리스트에 추가 (TTL = 토큰 남은 만료시간)
    ↓ Set-Cookie: refreshToken=; Max-Age=0
```

### 6.4 비밀번호 재설정 플로우

```
[1] POST /api/auth/password-reset/request  { email, recaptchaToken }
    ↓ reCAPTCHA 필수
    ↓ users 조회 (없어도 동일 응답 — 이메일 존재 여부 노출 방지)
    ↓ email_tokens INSERT (purpose=RESET_PASSWORD, ttl=1h)
    ↓ 메일 발송 (https://form.sosyge.net/password-reset?token=...)
    ↓ 응답: 항상 { success: true, data: null }
    ↓ Rate Limit: 같은 이메일 1시간 3회, 같은 IP 1시간 10회

[2] POST /api/auth/password-reset/confirm  { token, newPassword }
    ↓ 토큰 검증 (해시, expired_at, used_at)
    ↓ 비밀번호 정책 검증 (§6.10)
    ↓ users.password 업데이트
    ↓ email_tokens.used_at = NOW()
    ↓ 해당 user의 모든 refresh_tokens revoked_at = NOW() (강제 로그아웃)
    ↓ 응답: 200 OK
```

### 6.5 JWT 상세

| 항목 | Access | Refresh |
|---|---|---|
| 알고리즘 | HS256 | HS256 |
| 만료 | 30분 | 7일 |
| 저장 위치 (클라) | 메모리 (Zustand) | HttpOnly Cookie |
| 저장 위치 (서버) | (저장 안 함) | token_hash로 DB |
| 회수 방법 | Redis 블랙리스트 (JTI 기준) | DB revoked_at |
| 클레임 | `sub`(userId), `email`, `role`, `jti`, `iat`, `exp` | `sub`, `jti`, `iat`, `exp` |

**Cookie 설정 (운영)**
```
Set-Cookie: refreshToken=<JWT>;
            HttpOnly;
            Secure;
            SameSite=Strict;
            Domain=.form.sosyge.net;
            Path=/api/auth;
            Max-Age=604800
```

**로컬 개발**: `Secure` 제거, `Domain` 제거, `SameSite=Lax`. (`application-local.yml`)

### 6.6 Spring Security 정책

```
permitAll:
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/refresh
  - POST /api/auth/logout
  - POST /api/auth/verify-email
  - POST /api/auth/resend-verification
  - POST /api/auth/password-reset/request
  - POST /api/auth/password-reset/confirm
  - GET  /api/f/**
  - POST /api/f/*/submit
  - POST /api/f/*/report
  - GET  /api/terms/**
  - GET  /actuator/health
  - GET  /v3/api-docs/**, /swagger-ui/**  (운영에서는 IP 화이트리스트)

hasRole('ADMIN'):
  - /api/admin/**

authenticated (USER 이상):
  - 그 외 모든 /api/**

Filter Chain:
  CorsFilter
  → JwtAuthenticationFilter (before UsernamePasswordAuthenticationFilter)
  → ExceptionTranslationFilter
  → AuthorizationFilter
```

### 6.7 Rate Limit 정책 (Bucket4j + Redis)

nginx에서 1차 IP 단위 제한 → 백엔드에서 2차 비즈니스 단위 제한.

| 경로 | 키 | 한도 | 비고 |
|---|---|---|---|
| POST /api/auth/signup | IP | 5회 / 1h | |
| POST /api/auth/login | email | 10회 / 10min | 초과 시 reCAPTCHA 필수 |
| POST /api/auth/login | IP | 30회 / 10min | |
| POST /api/auth/resend-verification | userId | 1회 / 1min, 5회 / 1day | |
| POST /api/auth/password-reset/request | email | 3회 / 1h | |
| POST /api/auth/password-reset/request | IP | 10회 / 1h | |
| POST /api/f/{slug}/submit | IP+slug | 30회 / 1h | 한 IP가 한 폼에 무한 제출 방지 |
| POST /api/f/{slug}/report | IP+slug | 5회 / 1day | 신고 스팸 방지 |

**구현 위치**: `RateLimitFilter` (서블릿 필터) — 경로 패턴 매칭으로 Bucket 조회.
**초과 응답**: `429 Too Many Requests` + `Retry-After` 헤더.

### 6.8 reCAPTCHA v3 적용

| 위치 | 필수 여부 | 임계 score |
|---|---|---|
| 회원가입 | 필수 | 0.5 |
| 로그인 | 조건부 (이메일별 로그인 실패 3회 이상) | 0.5 |
| 비밀번호 재설정 요청 | 필수 | 0.5 |
| 공개 폼 응답 제출 | 필수 | 0.3 (응답 마찰 최소화) |

검증 실패 시 `400 RECAPTCHA_FAILED`.

### 6.9 보안 헤더 (Spring Security)

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; " +
        "script-src 'self' https://www.google.com https://www.gstatic.com; " +
        "frame-src https://www.google.com; " +
        "img-src 'self' data: https:; " +
        "style-src 'self' 'unsafe-inline'"))
    .frameOptions(f -> f.deny())
    .contentTypeOptions(c -> {})
    .referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    .httpStrictTransportSecurity(h -> h.maxAgeInSeconds(31536000).includeSubDomains(true))
);
```

### 6.10 비밀번호 정책

- 8자 이상 64자 이하
- 영문 대/소문자, 숫자, 특수문자 중 **3종류 이상** 포함
- 이메일과 동일 금지
- 회원가입/재설정 시 `PasswordPolicyValidator`로 검증
- 저장: bcrypt cost 12

### 6.11 CORS 정책

```yaml
formflow:
  cors:
    allowed-origins:
      - https://form.sosyge.net
      - https://www.form.sosyge.net   # www 사용 시
    allowed-methods: [GET, POST, PATCH, DELETE, OPTIONS]
    allowed-headers: ["*"]
    exposed-headers: [Authorization, Retry-After]
    allow-credentials: true
    max-age: 3600
```

`Configuration` 클래스에서 위 값을 `CorsConfigurationSource` 빈으로 등록.

### 6.12 민감 데이터 로깅 정책

- 비밀번호, 토큰, Cookie 값은 **절대 로그에 남기지 않는다**.
- 요청/응답 로깅 시 자동 마스킹 필터 적용 (`LoggingFilter`):
  - 헤더: `Authorization`, `Cookie` → `***`
  - 바디: `password`, `token`, `accessToken`, `refreshToken` 키 → `***`
- `application.yml`의 `logging.pattern.console`에 `traceId` 포함 (MDC).

---

## 7. API 명세

### 7.1 공통 응답 포맷 (절대 위반 금지)

**성공**
```json
{
  "success": true,
  "data": { /* 또는 null, 또는 배열 */ }
}
```

**실패**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "사용자에게 보여줄 한국어 메시지",
  "details": { /* 선택: validation 오류 필드별 메시지 등 */ }
}
```

**페이지네이션 응답**
```json
{
  "success": true,
  "data": {
    "items": [ /* ... */ ],
    "page": 1,
    "size": 20,
    "total": 142,
    "hasNext": true
  }
}
```

### 7.2 공통 헤더

| 헤더 | 용도 |
|---|---|
| `Authorization: Bearer <accessToken>` | 인증 필요 API |
| `Cookie: refreshToken=<JWT>` | refresh/logout |
| `X-Recaptcha-Token: <token>` | reCAPTCHA 필요 API |
| `X-Request-Id: <uuid>` | (서버가 자동 부여, 클라가 보내면 그대로 사용) |

### 7.3 Auth API

#### POST /api/auth/signup
```jsonc
// Request
{
  "email": "user@example.com",
  "password": "Password1!",
  "nickname": "홍길동",
  "recaptchaToken": "03AGdBq25...",
  "termsAgreement": {
    "service": true,        // 필수
    "privacy": true,        // 필수
    "marketing": false      // 선택
  }
}

// Response 201
{ "success": true, "data": { "userId": 1, "email": "user@example.com" } }

// Response 400 (이메일 중복)
{ "success": false, "code": "EMAIL_ALREADY_EXISTS", "message": "이미 가입된 이메일입니다." }
```

#### POST /api/auth/verify-email
```jsonc
// Request
{ "token": "abc123..." }

// Response 200 — 인증 완료 + 자동 로그인 (Cookie 동시 발급)
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": 1, "email": "...", "nickname": "...", "role": "USER" }
  }
}

// Response 400
{ "success": false, "code": "INVALID_TOKEN", "message": "유효하지 않거나 만료된 링크입니다." }
```

#### POST /api/auth/resend-verification
```jsonc
// Request
{ "email": "user@example.com" }

// Response 200 (성공이든 아니든 동일 — 이메일 존재 노출 방지)
{ "success": true, "data": null }

// Response 429
{ "success": false, "code": "RATE_LIMITED", "message": "잠시 후 다시 시도해주세요." }
```

#### POST /api/auth/login
```jsonc
// Request
{
  "email": "user@example.com",
  "password": "Password1!",
  "recaptchaToken": "03AGdBq25..."   // 조건부 (실패 누적 3회 이상 시)
}

// Response 200 (Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict)
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": 1, "email": "...", "nickname": "...", "role": "USER" }
  }
}

// Response 401 — 이메일 미인증
{ "success": false, "code": "EMAIL_NOT_VERIFIED", "message": "이메일 인증이 필요합니다." }

// Response 403 — 정지 계정
{ "success": false, "code": "ACCOUNT_SUSPENDED", "message": "이용이 정지된 계정입니다.", "details": { "reason": "..." } }

// Response 401 — 비밀번호 불일치 (이메일 존재 여부 노출 X)
{ "success": false, "code": "INVALID_CREDENTIALS", "message": "이메일 또는 비밀번호가 올바르지 않습니다." }
```

#### POST /api/auth/refresh
```jsonc
// Cookie: refreshToken=...
// Response 200 — Cookie 갱신 (rotation)
{ "success": true, "data": { "accessToken": "eyJ..." } }

// Response 401
{ "success": false, "code": "UNAUTHORIZED", "message": "재로그인이 필요합니다." }
```

#### POST /api/auth/logout
```jsonc
// Cookie: refreshToken=...
// Response 200
{ "success": true, "data": null }
```

#### POST /api/auth/password-reset/request
```jsonc
// Request
{ "email": "user@example.com", "recaptchaToken": "03AGdBq25..." }

// Response 200 (항상 동일)
{ "success": true, "data": null }
```

#### POST /api/auth/password-reset/confirm
```jsonc
// Request
{ "token": "abc123...", "newPassword": "NewPassword1!" }

// Response 200
{ "success": true, "data": null }

// Response 400 (정책 위반)
{
  "success": false,
  "code": "PASSWORD_POLICY",
  "message": "비밀번호는 8자 이상이며 영문/숫자/특수문자 중 3종류 이상 포함해야 합니다."
}
```

### 7.4 사용자 API (Authorization 필요)

#### GET /api/users/me
```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": 1, "email": "...", "nickname": "...",
    "role": "USER", "plan": "FREE",
    "emailVerifiedAt": "2025-05-01T10:00:00",
    "createdAt": "2025-05-01T10:00:00"
  }
}
```

#### PATCH /api/users/me
```jsonc
// Request (부분 수정)
{ "nickname": "새 닉네임" }
// Response 200
{ "success": true, "data": { /* 갱신된 me */ } }
```

#### PATCH /api/users/me/password
```jsonc
// Request
{ "currentPassword": "...", "newPassword": "..." }
// Response 200
{ "success": true, "data": null }
```

#### DELETE /api/users/me
```jsonc
// Request
{ "password": "현재비밀번호" }
// Response 200 — 즉시 status=DELETED, 모든 refresh_tokens 폐기
// 30일 후 배치로 실제 익명화 (개인정보처리방침 명시)
{ "success": true, "data": null }
```

### 7.5 폼 관리 API (Authorization 필요)

#### GET /api/forms
```jsonc
// Query: ?page=1&size=20&status=PUBLISHED
// Response 200
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1, "slug": "k7Hx9aB2pQrT",
        "title": "고객 만족도 조사",
        "status": "PUBLISHED",
        "responseCount": 42,
        "responseLimit": 100,
        "createdAt": "2025-05-01T10:00:00"
      }
    ],
    "page": 1, "size": 20, "total": 1, "hasNext": false
  }
}
```

#### POST /api/forms
```jsonc
// Request
{ "title": "고객 만족도 조사", "description": "..." }

// Response 201
{
  "success": true,
  "data": {
    "id": 1, "slug": "k7Hx9aB2pQrT", "title": "...", "description": "...",
    "status": "DRAFT", "fields": [], "createdAt": "..."
  }
}

// Response 409 — 무료 한도 초과
{ "success": false, "code": "PLAN_LIMIT_EXCEEDED", "message": "무료 플랜에서는 폼을 10개까지 만들 수 있습니다." }
```

#### GET /api/forms/{id}
```jsonc
// Response 200 — 본인 폼만 (타인 폼은 403)
{
  "success": true,
  "data": {
    "id": 1, "slug": "k7Hx9aB2pQrT",
    "title": "...", "description": "...",
    "status": "PUBLISHED", "responseLimit": 100, "responseCount": 42,
    "closedAt": null,
    "publicUrl": "https://form.sosyge.net/f/k7Hx9aB2pQrT",
    "fields": [
      {
        "id": 10, "type": "SINGLE", "label": "전반적인 만족도는?",
        "required": true, "orderNum": 1,
        "options": ["매우 만족","만족","보통","불만족"],
        "validation": null
      }
    ]
  }
}
```

#### PATCH /api/forms/{id}
```jsonc
// Request (부분 수정)
{ "title": "...", "description": "...", "responseLimit": 200 }
// Response 200 — 갱신된 폼 상세
```

#### DELETE /api/forms/{id}
```jsonc
// Response 200 — Soft delete (deleted_at = NOW())
{ "success": true, "data": null }
```

#### PATCH /api/forms/{id}/status
```jsonc
// Request
{ "status": "PUBLISHED", "closedAt": null }
// 또는
{ "status": "CLOSED" }

// Response 200
{ "success": true, "data": null }

// Response 409 — 필드가 0개인 폼은 PUBLISHED 불가
{ "success": false, "code": "ILLEGAL_STATE", "message": "최소 1개 이상의 필드가 필요합니다." }
```

### 7.6 필드 API

> **발행 후 구조 잠금 (#9, D-017)**: 아래 4개 엔드포인트(POST/PATCH/DELETE/order)는 폼이 **DRAFT일 때만** 동작한다. PUBLISHED/CLOSED 폼에 호출 시 `409 FORM_NOT_EDITABLE`. `FieldService.verifyEditable(userId, formId)`가 소유권 + status를 한 곳에서 검증. 통계·CSV·응답 정합성 보장 목적. 마감일(`closes_at`)은 구조가 아니므로 이 잠금과 무관하게 발행 후에도 수정 가능(§10.6, D-018).

#### POST /api/forms/{formId}/fields
```jsonc
// Request
{
  "type": "SINGLE",
  "label": "전반적인 만족도는?",
  "placeholder": null,
  "required": true,
  "options": ["매우 만족","만족","보통","불만족"],
  "validation": null
}
// Response 201
{ "success": true, "data": { /* 생성된 필드, orderNum 자동 부여 */ } }
```

#### PATCH /api/forms/{formId}/fields/{fieldId}
```jsonc
// Request (부분 수정)
{ "label": "...", "options": [...] }
// Response 200
```

#### DELETE /api/forms/{formId}/fields/{fieldId}
```jsonc
// Response 200 — 나머지 필드의 orderNum 자동 재배치
{ "success": true, "data": null }
```

#### PATCH /api/forms/{formId}/fields/order
```jsonc
// Request
{ "orders": [ { "fieldId": 11, "orderNum": 1 }, { "fieldId": 10, "orderNum": 2 } ] }
// Response 200
{ "success": true, "data": null }
```

### 7.7 공개 폼 API (인증 불필요)

#### GET /api/f/{slug}
```jsonc
// Response 200
{
  "success": true,
  "data": {
    "slug": "k7Hx9aB2pQrT",
    "title": "...", "description": "...",
    "fields": [ /* §7.5 GET /api/forms/{id} 와 동일 구조, 단 id는 노출 */ ]
  }
}

// Response 404 — 비공개/마감/삭제/한도초과 모두 동일
{ "success": false, "code": "FORM_NOT_AVAILABLE", "message": "존재하지 않거나 응답할 수 없는 폼입니다." }
```

#### POST /api/f/{slug}/submit
```jsonc
// Headers: X-Recaptcha-Token: ...
// Request
{
  "respondentKey": "uuid-v4-string",
  "answers": [
    { "fieldId": 10, "value": "만족" },
    { "fieldId": 11, "value": "배송이 느립니다." }
  ]
}

// Response 201
{ "success": true, "data": null }

// Response 409 — 중복 제출
{ "success": false, "code": "DUPLICATE_RESPONSE", "message": "이미 응답한 폼입니다." }

// Response 404 — 폼 마감 등
{ "success": false, "code": "FORM_NOT_AVAILABLE", "message": "..." }

// Response 400 — 필수 필드 누락 / 검증 실패
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요.",
  "details": { "fieldErrors": { "10": "필수 항목입니다." } }
}
```

#### POST /api/f/{slug}/report
```jsonc
// Request
{ "reason": "PHISHING", "detail": "타사 사칭 의심" }
// Response 201
{ "success": true, "data": null }
```

### 7.8 응답 조회 API (Authorization 필요)

#### GET /api/forms/{id}/responses
```jsonc
// Query: ?page=1&size=20
// Response 200
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1, "respondentKey": "uuid-...",
        "submittedAt": "2025-05-01T12:00:00",
        "answers": [
          { "fieldId": 10, "label": "...", "value": "만족" },
          { "fieldId": 11, "label": "...", "value": "..." }
        ]
      }
    ],
    "page": 1, "size": 20, "total": 42, "hasNext": true
  }
}
```

#### GET /api/forms/{id}/responses/export
```jsonc
// Query: ?format=csv
// Response 200 — text/csv; charset=UTF-8 (BOM 포함)
// Content-Disposition: attachment; filename="form-1-responses-20250501.csv"
//
// 응답ID,제출시각,Q1라벨,Q2라벨,...
// 1,2025-05-01 12:00:00,"만족","배송이 느립니다."
```

#### GET /api/forms/{id}/stats
```jsonc
// Response 200
{
  "success": true,
  "data": {
    "totalResponses": 42,
    "fields": [
      {
        "fieldId": 10, "label": "전반적인 만족도는?", "type": "SINGLE",
        "distribution": [
          { "value": "매우 만족", "count": 10, "ratio": 0.24 },
          { "value": "만족", "count": 20, "ratio": 0.48 },
          { "value": "보통", "count": 0, "ratio": 0.0 }
        ]
      },
      {
        "fieldId": 11, "label": "개선이 필요한 점", "type": "LONG",
        "sampleAnswers": ["배송이 느립니다.", "..."]   // 최근 10개
      }
    ]
  }
}
```

**stats 집계 규약 (확정)**
- **distribution은 폼 필드의 `options` 전체를 포함한다.** 아무도 고르지 않은 옵션도 `count: 0, ratio: 0.0`으로 반드시 포함 (차트 완전성 + "0표"도 유의미한 정보). 옵션 순서는 `form_fields.options` 정의 순.
- **ratio 정의**:
  - SINGLE: `count / (해당 필드에 응답한 총 응답 수)`
  - MULTI: `(해당 옵션을 고른 응답 수) / (해당 필드에 응답한 총 응답 수)`. 한 응답이 여러 옵션을 고를 수 있으므로 distribution의 ratio 합은 1을 초과할 수 있다.
- 분모(필드 응답 수)는 그 필드에 값이 있는 응답만 카운트. 무응답(빈 값)은 분모에서 제외.
- 텍스트류(SHORT/LONG/EMAIL/NUMBER/DATE): `sampleAnswers` 최근 10개(빈 값 제외).


### 7.9 약관 API (인증 불필요)

#### GET /api/terms/{type}
- `type`: `service` | `privacy` | `marketing`
```jsonc
// Response 200
{
  "success": true,
  "data": {
    "type": "service",
    "version": "2025-05-01",
    "title": "이용약관",
    "contentHtml": "<h1>...</h1>",
    "effectiveAt": "2025-05-01T00:00:00"
  }
}
```

> 약관은 DB가 아닌 **Markdown 파일** + 메타 yaml로 관리.
> `backend/src/main/resources/terms/{type}/{version}.md` 로 버전 보존.

### 7.10 관리자 API (`hasRole('ADMIN')`)

#### GET /api/admin/users
```jsonc
// Query: ?page=1&size=50&status=ACTIVE&email=keyword
// Response 200
{
  "success": true,
  "data": {
    "items": [
      { "id": 2, "email": "...", "nickname": "...", "status": "ACTIVE",
        "formCount": 3, "lastLoginAt": "...", "createdAt": "..." }
    ],
    "page": 1, "size": 50, "total": 1230, "hasNext": true
  }
}
```

#### PATCH /api/admin/users/{id}/status
```jsonc
// Request
{ "status": "SUSPENDED", "reason": "스팸 폼 다수 작성" }
// Response 200
{ "success": true, "data": null }
// → admin_audits INSERT (action=USER_SUSPEND)
// → 해당 user의 모든 refresh_tokens revoke
```

#### GET /api/admin/forms
- 전체 폼 검색 (slug, 제목, 사용자 이메일로)

#### PATCH /api/admin/forms/{id}/force-close
```jsonc
// Request
{ "reason": "신고 다수 — 부적절한 콘텐츠" }
// Response 200
// → forms.status = CLOSED, admin_audits INSERT
// → 폼 소유자에게 이메일 통보
```

#### GET /api/admin/reports
```jsonc
// Query: ?status=PENDING&page=1
// Response 200 — 신고 큐
```

#### PATCH /api/admin/reports/{id}
```jsonc
// Request
{ "status": "RESOLVED", "detail": "강제 마감 처리함" }
```

#### GET /api/admin/audits
- `admin_audits` 조회 (감사 추적용)

### 7.11 헬스체크

| 경로 | 내용 |
|---|---|
| `GET /actuator/health` | DB + Redis 연결 상태 |
| `GET /actuator/info` | 버전 정보 |

운영 환경에서는 `health` 외 모든 actuator 엔드포인트는 IP 화이트리스트로 보호.

### 7.12 OpenAPI / Swagger

- 로컬/dev: `https://api.dev.form.sosyge.net/swagger-ui.html`
- prod: nginx 설정에서 IP 화이트리스트 적용 (사내 IP만 접근)

---

## 8. 백엔드 구조 (Spring Boot)

### 8.1 패키지 구조

```
backend/
└── src/main/java/net/sosyge/formflow/
    ├── FormflowApplication.java
    │
    ├── config/
    │   ├── SecurityConfig.java
    │   ├── CorsConfig.java
    │   ├── RedisConfig.java
    │   ├── MyBatisConfig.java
    │   ├── OpenApiConfig.java
    │   ├── WebMvcConfig.java
    │   └── AsyncConfig.java
    │
    ├── security/
    │   ├── JwtProvider.java
    │   ├── JwtAuthenticationFilter.java
    │   ├── CustomUserDetails.java
    │   ├── CustomUserDetailsService.java
    │   ├── PasswordPolicyValidator.java
    │   └── RecaptchaVerifier.java
    │
    ├── ratelimit/
    │   ├── RateLimitFilter.java
    │   ├── RateLimitPolicy.java
    │   └── BucketRegistry.java
    │
    ├── controller/
    │   ├── AuthController.java
    │   ├── UserController.java
    │   ├── FormController.java
    │   ├── FieldController.java
    │   ├── ResponseController.java
    │   ├── PublicFormController.java
    │   ├── TermsController.java
    │   └── admin/
    │       ├── AdminUserController.java
    │       ├── AdminFormController.java
    │       ├── AdminReportController.java
    │       └── AdminAuditController.java
    │
    ├── service/
    │   ├── AuthService.java
    │   ├── EmailVerificationService.java
    │   ├── PasswordResetService.java
    │   ├── UserService.java
    │   ├── FormService.java
    │   ├── FieldService.java
    │   ├── ResponseService.java
    │   ├── PublicFormService.java
    │   ├── StatsService.java
    │   ├── CsvExportService.java
    │   ├── TermsService.java
    │   ├── ReportService.java
    │   ├── mail/
    │   │   ├── MailService.java               # 인터페이스
    │   │   ├── NcpMailService.java            # NCP Outbound Mailer
    │   │   ├── SmtpMailService.java           # 로컬 fallback
    │   │   └── MailTemplate.java
    │   └── admin/
    │       ├── AdminUserService.java
    │       ├── AdminFormService.java
    │       └── AdminAuditService.java
    │
    ├── mapper/
    │   ├── UserMapper.java
    │   ├── RefreshTokenMapper.java
    │   ├── EmailTokenMapper.java
    │   ├── TermsAgreementMapper.java
    │   ├── LoginAuditMapper.java
    │   ├── FormMapper.java
    │   ├── FieldMapper.java
    │   ├── ResponseMapper.java
    │   ├── ResponseItemMapper.java
    │   ├── FormReportMapper.java
    │   └── AdminAuditMapper.java
    │
    ├── domain/
    │   ├── User.java
    │   ├── UserRole.java          # enum
    │   ├── UserStatus.java        # enum
    │   ├── UserPlan.java          # enum
    │   ├── RefreshToken.java
    │   ├── EmailToken.java
    │   ├── EmailTokenPurpose.java # enum
    │   ├── TermsAgreement.java
    │   ├── TermsType.java         # enum
    │   ├── LoginAudit.java
    │   ├── Form.java
    │   ├── FormStatus.java        # enum
    │   ├── FormField.java
    │   ├── FieldType.java         # enum
    │   ├── Response.java
    │   ├── ResponseItem.java
    │   ├── FormReport.java
    │   ├── ReportReason.java      # enum
    │   ├── ReportStatus.java      # enum
    │   └── AdminAudit.java
    │
    ├── dto/
    │   ├── request/
    │   │   ├── auth/
    │   │   │   ├── SignupRequest.java
    │   │   │   ├── LoginRequest.java
    │   │   │   ├── VerifyEmailRequest.java
    │   │   │   ├── ResendVerificationRequest.java
    │   │   │   ├── PasswordResetRequestDto.java
    │   │   │   └── PasswordResetConfirmRequest.java
    │   │   ├── user/
    │   │   │   ├── UpdateMeRequest.java
    │   │   │   ├── UpdatePasswordRequest.java
    │   │   │   └── DeleteMeRequest.java
    │   │   ├── form/
    │   │   │   ├── FormCreateRequest.java
    │   │   │   ├── FormUpdateRequest.java
    │   │   │   └── FormStatusRequest.java
    │   │   ├── field/
    │   │   │   ├── FieldCreateRequest.java
    │   │   │   ├── FieldUpdateRequest.java
    │   │   │   └── FieldOrderRequest.java
    │   │   ├── publicform/
    │   │   │   ├── SubmitRequest.java
    │   │   │   └── ReportFormRequest.java
    │   │   └── admin/
    │   │       ├── AdminUserStatusRequest.java
    │   │       ├── AdminForceCloseRequest.java
    │   │       └── AdminReportUpdateRequest.java
    │   │
    │   └── response/
    │       ├── ApiResponse.java
    │       ├── PageResponse.java
    │       ├── auth/
    │       │   ├── LoginResponse.java
    │       │   └── MeResponse.java
    │       ├── form/
    │       │   ├── FormSummaryResponse.java
    │       │   ├── FormDetailResponse.java
    │       │   └── PublicFormResponse.java
    │       ├── field/
    │       │   └── FieldResponse.java
    │       ├── response/
    │       │   ├── ResponseListItem.java
    │       │   └── StatsResponse.java
    │       └── admin/
    │           ├── AdminUserItem.java
    │           ├── AdminFormItem.java
    │           ├── AdminReportItem.java
    │           └── AdminAuditItem.java
    │
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   ├── BusinessException.java          # 최상위 비즈니스 예외
    │   ├── ErrorCode.java                  # enum (§16.2)
    │   ├── NotFoundException.java
    │   ├── ForbiddenException.java
    │   ├── DuplicateResponseException.java
    │   ├── FormNotAvailableException.java
    │   ├── EmailNotVerifiedException.java
    │   ├── AccountSuspendedException.java
    │   ├── RateLimitExceededException.java
    │   ├── RecaptchaFailedException.java
    │   ├── InvalidTokenException.java
    │   ├── PlanLimitExceededException.java
    │   └── PasswordPolicyException.java
    │
    ├── common/
    │   ├── ApiResponse.java
    │   ├── PageResponse.java
    │   ├── CurrentUser.java                # @AuthenticationPrincipal 단축 어노테이션
    │   ├── SlugGenerator.java              # nanoid 12자
    │   ├── TokenHasher.java                # SHA-256 유틸
    │   ├── Clock.java                      # 테스트 가능한 시간 추상화
    │   ├── RequestIdFilter.java            # MDC 주입
    │   ├── LoggingFilter.java              # 요청/응답 로깅 (마스킹)
    │   └── constants/
    │       ├── AuthConstants.java
    │       └── FormConstants.java
    │
    └── batch/
        ├── ExpiredTokenCleanupJob.java     # refresh_tokens, email_tokens TTL 정리
        ├── OldResponseCleanupJob.java      # 응답 보관 기간 초과 시 익명화
        └── DeletedUserAnonymizeJob.java    # status=DELETED 30일 후 익명화
```

### 8.2 핵심 클래스 — `ApiResponse`

`common/ApiResponse.java`
```java
package net.sosyge.formflow.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String code;
    private final String message;
    private final Object details;

    private ApiResponse(boolean success, T data, String code, String message, Object details) {
        this.success = success;
        this.data = data;
        this.code = code;
        this.message = message;
        this.details = details;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null, null, null);
    }

    public static ApiResponse<Void> fail(String code, String message) {
        return new ApiResponse<>(false, null, code, message, null);
    }

    public static ApiResponse<Void> fail(String code, String message, Object details) {
        return new ApiResponse<>(false, null, code, message, details);
    }
}
```

### 8.3 `ErrorCode` enum

`exception/ErrorCode.java`
```java
package net.sosyge.formflow.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 400
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값을 확인해주세요."),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 링크입니다."),
    PASSWORD_POLICY(HttpStatus.BAD_REQUEST, "비밀번호 정책을 만족하지 않습니다."),
    RECAPTCHA_FAILED(HttpStatus.BAD_REQUEST, "보안 검증에 실패했습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "이미 가입된 이메일입니다."),

    // 401
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "재로그인이 필요합니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.UNAUTHORIZED, "이메일 인증이 필요합니다."),

    // 403
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정입니다."),

    // 404
    NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없습니다."),
    FORM_NOT_AVAILABLE(HttpStatus.NOT_FOUND, "존재하지 않거나 응답할 수 없는 폼입니다."),

    // 409
    DUPLICATE_RESPONSE(HttpStatus.CONFLICT, "이미 응답한 폼입니다."),
    ILLEGAL_STATE(HttpStatus.CONFLICT, "현재 상태에서는 처리할 수 없습니다."),
    PLAN_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "플랜 한도를 초과했습니다."),
    FORM_NOT_EDITABLE(HttpStatus.CONFLICT, "발행된 폼은 질문을 수정할 수 없습니다. 질문을 바꾸려면 새 폼을 만들어 주세요."),

    // 429
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요."),

    // 500
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버에 일시적인 문제가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;
}
```

### 8.4 `BusinessException` + 전역 핸들러

`exception/BusinessException.java`
```java
package net.sosyge.formflow.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    private final Object details;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessException(ErrorCode errorCode, String message, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
```

`exception/GlobalExceptionHandler.java`
```java
package net.sosyge.formflow.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e, HttpServletRequest req) {
        log.warn("[BUSINESS] {} {} - code={} message={}",
                req.getMethod(), req.getRequestURI(), e.getErrorCode(), e.getMessage());
        return ResponseEntity.status(e.getErrorCode().getStatus())
                .body(e.getDetails() == null
                        ? ApiResponse.fail(e.getErrorCode().name(), e.getMessage())
                        : ApiResponse.fail(e.getErrorCode().name(), e.getMessage(), e.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e, HttpServletRequest req) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        log.warn("[VALIDATION] {} {} - fields={}", req.getMethod(), req.getRequestURI(), fieldErrors);
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ErrorCode.VALIDATION_ERROR.name(),
                        ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                        Map.of("fieldErrors", fieldErrors)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e, HttpServletRequest req) {
        log.warn("[BAD_REQUEST] {} {} - {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(), e.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuth(AuthenticationException e, HttpServletRequest req) {
        log.info("[UNAUTHORIZED] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getStatus())
                .body(ApiResponse.fail(ErrorCode.UNAUTHORIZED.name(), ErrorCode.UNAUTHORIZED.getDefaultMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException e, HttpServletRequest req) {
        log.warn("[FORBIDDEN] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.FORBIDDEN.getStatus())
                .body(ApiResponse.fail(ErrorCode.FORBIDDEN.name(), ErrorCode.FORBIDDEN.getDefaultMessage()));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(
            org.springframework.web.servlet.resource.NoResourceFoundException e, HttpServletRequest req) {
        log.info("[NOT_FOUND] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.NOT_FOUND.getStatus())
                .body(ApiResponse.fail(ErrorCode.NOT_FOUND.name(), ErrorCode.NOT_FOUND.getDefaultMessage()));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException e, HttpServletRequest req) {
        log.warn("[BAD_REQUEST] {} {} - malformed body", req.getMethod(), req.getRequestURI());
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(),
                        "요청 본문 형식이 올바르지 않습니다."));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException e, HttpServletRequest req) {
        log.info("[METHOD_NOT_ALLOWED] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(),
                        "허용되지 않은 HTTP 메서드입니다."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAll(Exception e, HttpServletRequest req) {
        log.error("[INTERNAL_ERROR] {} {} - {}", req.getMethod(), req.getRequestURI(), e.getMessage(), e);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getStatus())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR.name(), ErrorCode.INTERNAL_ERROR.getDefaultMessage()));
    }
}
```

> **§8.4 보완 이력 (M1에서 발견)**
> 위 4개 핸들러(`AccessDeniedException`, `NoResourceFoundException`, `HttpMessageNotReadableException`, `HttpRequestMethodNotSupportedException`)는 M1 검증 중 다음 케이스가 catch-all(`Exception.class`)로 떨어져 500을 반환하는 문제로 추가됨.
> - `NoResourceFoundException`: 매핑 없는 경로 (Spring 6 기본 동작 변경. 이전엔 404를 자동 반환했으나 Boot 3.2+ 부터 예외 throw)
> - `HttpMessageNotReadableException`: 잘못된 JSON 바디 (400으로 매핑되지 않으면 500)
> - `HttpRequestMethodNotSupportedException`: GET-only 경로에 POST 요청 등 (405로 매핑되지 않으면 500)
>
> 이 핸들러들이 없으면 M1 단계에서 컨트롤러 미구현 상태일 때 모든 미매핑 경로가 500을 반환해 진단이 어려워진다.

### 8.5 MyBatis 설정

`application.yml`
```yaml
mybatis:
  configuration:
    map-underscore-to-camel-case: true
    default-fetch-size: 100
    default-statement-timeout: 30
    cache-enabled: false
  type-aliases-package: net.sosyge.formflow.domain
  mapper-locations: classpath:mybatis/mapper/*.xml
```

Mapper XML 위치: `backend/src/main/resources/mybatis/mapper/*.xml`

**MyBatis 규칙 (필수 준수)**
1. SELECT은 반드시 `resultType` 또는 `resultMap` 명시.
2. JOIN/집계/별칭은 명시적으로 작성 (snake → camel 자동 변환 의존 X).
3. enum 컬럼은 기본 문자열 매핑 사용 (`TypeHandler` 별도 정의 불필요, MyBatis가 자동 처리).
4. 동적 쿼리는 `<if>`, `<choose>`, `<foreach>` 사용. `${}` 는 금지(SQL Injection). 항상 `#{}`.
5. 필요한 컬럼만 SELECT.

### 8.6 트랜잭션 정책

- 모든 `@Service` public 메서드에 적용:
  - 조회: `@Transactional(readOnly = true)`
  - 변경: `@Transactional`
- Controller에는 `@Transactional` 금지.
- 트랜잭션 외부에서 메일/외부 API 호출 (`@TransactionalEventListener(AFTER_COMMIT)`).

### 8.7 비동기 처리

`config/AsyncConfig.java`
```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mail-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

이메일 발송, 통계 사전 계산 등은 `@Async("mailExecutor")` 사용.

### 8.8 application.yml 전체 골격

`application.yml` (공통)
```yaml
spring:
  application:
    name: formflow
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:local}
  jackson:
    time-zone: Asia/Seoul
    date-format: yyyy-MM-dd HH:mm:ss
    serialization:
      write-dates-as-timestamps: false
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 5000
      idle-timeout: 600000
      max-lifetime: 1800000
  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: 3000

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

server:
  port: 8080
  forward-headers-strategy: native   # X-Forwarded-* 처리 (nginx 뒤)
  error:
    include-stacktrace: never
    include-message: never
  compression:
    enabled: true

formflow:
  app:
    front-url: ${FRONT_URL}
    api-url: ${API_URL}
  jwt:
    secret: ${JWT_SECRET}
    access-expiry-seconds: 1800
    refresh-expiry-seconds: 604800
  cookie:
    domain: ${COOKIE_DOMAIN:}
    secure: ${COOKIE_SECURE:true}
    same-site: ${COOKIE_SAMESITE:Strict}
  cors:
    allowed-origins: ${CORS_ORIGINS}   # 쉼표 구분
  mail:
    provider: ${MAIL_PROVIDER:ncp}     # ncp | smtp
    from: ${MAIL_FROM:no-reply@form.sosyge.net}
    from-name: FormFlow
    ncp:
      access-key: ${NCP_ACCESS_KEY:}
      secret-key: ${NCP_SECRET_KEY:}
  recaptcha:
    secret: ${RECAPTCHA_SECRET}
    threshold: 0.5
    submit-threshold: 0.3
  limits:
    forms-per-user: 10
    fields-per-form: 30
    responses-per-form: 100
    response-retention-days: 365

logging:
  level:
    root: INFO
    net.sosyge.formflow: DEBUG
    org.springframework.security: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%X{traceId:-}] %logger{36} - %msg%n"

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
      probes:
        enabled: true

sentry:
  dsn: ${SENTRY_DSN_BACKEND:}
  environment: ${SPRING_PROFILES_ACTIVE:local}
  send-default-pii: false
  traces-sample-rate: 0.1
```

`application-local.yml`
```yaml
formflow:
  cookie:
    secure: false
    same-site: Lax
  mail:
    provider: smtp
spring:
  mail:
    host: localhost
    port: 1025   # mailhog
```

### 8.9 패턴 — Service 예시

`service/PublicFormService.java` (응답 제출 — 가장 복잡한 케이스)
```java
@Service
@RequiredArgsConstructor
public class PublicFormService {

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final RecaptchaVerifier recaptchaVerifier;
    private final FormLimitProperties limits;

    @Transactional(readOnly = true)
    public PublicFormResponse getPublicForm(String slug) {
        Form form = formMapper.findActiveBySlug(slug)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORM_NOT_AVAILABLE));

        // 응답 한도 초과 시에도 동일 응답
        long count = responseMapper.countByFormId(form.getId());
        if (form.getResponseLimit() != null && count >= form.getResponseLimit()) {
            throw new BusinessException(ErrorCode.FORM_NOT_AVAILABLE);
        }
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(form.getId());
        return PublicFormResponse.from(form, fields);
    }

    @Transactional
    public void submit(String slug, SubmitRequest req, String recaptchaToken, String ip, String userAgent) {
        recaptchaVerifier.verify(recaptchaToken, "submit", limits.getSubmitThreshold());

        Form form = formMapper.findActiveBySlug(slug)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORM_NOT_AVAILABLE));

        long count = responseMapper.countByFormId(form.getId());
        if (form.getResponseLimit() != null && count >= form.getResponseLimit()) {
            throw new BusinessException(ErrorCode.FORM_NOT_AVAILABLE);
        }

        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(form.getId());
        validateAnswers(fields, req.getAnswers());

        Response response = Response.builder()
                .formId(form.getId())
                .respondentKey(req.getRespondentKey())
                .ip(ip)
                .userAgent(truncate(userAgent, 255))
                .build();
        try {
            responseMapper.insert(response);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESPONSE);
        }

        List<ResponseItem> items = req.getAnswers().stream()
                .map(a -> ResponseItem.builder()
                        .responseId(response.getId())
                        .fieldId(a.getFieldId())
                        .value(a.getValue())
                        .build())
                .toList();
        responseItemMapper.insertBatch(items);
    }

    private void validateAnswers(List<FormField> fields, List<SubmitRequest.Answer> answers) {
        Map<Long, String> answerMap = answers.stream()
                .collect(Collectors.toMap(SubmitRequest.Answer::getFieldId, SubmitRequest.Answer::getValue, (a, b) -> a));
        Map<Long, String> fieldErrors = new HashMap<>();
        for (FormField field : fields) {
            String value = answerMap.get(field.getId());
            if (field.isRequired() && (value == null || value.isBlank())) {
                fieldErrors.put(field.getId().toString(), "필수 항목입니다.");
            }
            // type별 추가 검증은 FieldValidator로 위임 (생략)
        }
        if (!fieldErrors.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                    Map.of("fieldErrors", fieldErrors));
        }
    }

    private static String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }
}
```

---

## 9. 프론트엔드 구조 (Next.js 14 App Router)

### 9.1 디렉토리 구조

```
frontend/
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx                     # 루트 레이아웃 + Providers
    │   ├── globals.css                    # tailwind directives
    │   ├── page.tsx                       # 랜딩
    │   ├── error.tsx                      # Error Boundary
    │   ├── not-found.tsx                  # 404
    │   │
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   ├── signup/page.tsx
    │   │   ├── verify/page.tsx            # ?token=
    │   │   ├── password-reset/page.tsx
    │   │   └── password-reset/confirm/page.tsx  # ?token=
    │   │
    │   ├── (app)/                         # 인증 필요 영역
    │   │   ├── layout.tsx                 # 헤더 + 사이드바
    │   │   ├── dashboard/page.tsx
    │   │   ├── settings/page.tsx
    │   │   ├── settings/password/page.tsx
    │   │   ├── settings/delete-account/page.tsx
    │   │   ├── builder/[formId]/page.tsx
    │   │   ├── forms/[formId]/responses/page.tsx
    │   │   └── forms/[formId]/stats/page.tsx
    │   │
    │   ├── f/[slug]/                      # 공개 폼 (SSR)
    │   │   ├── page.tsx
    │   │   ├── thanks/page.tsx
    │   │   └── report/page.tsx
    │   │
    │   ├── terms/
    │   │   ├── service/page.tsx
    │   │   ├── privacy/page.tsx
    │   │   └── marketing/page.tsx
    │   │
    │   └── admin/                         # role=ADMIN
    │       ├── layout.tsx
    │       ├── page.tsx                   # 대시보드
    │       ├── users/page.tsx
    │       ├── users/[id]/page.tsx
    │       ├── forms/page.tsx
    │       ├── reports/page.tsx
    │       └── audits/page.tsx
    │
    ├── components/
    │   ├── ui/                            # 공통 (Button, Input, Modal, Toast)
    │   ├── auth/
    │   │   ├── SignupForm.tsx
    │   │   ├── LoginForm.tsx
    │   │   ├── PasswordResetRequestForm.tsx
    │   │   ├── PasswordResetConfirmForm.tsx
    │   │   ├── TermsAgreement.tsx
    │   │   └── RecaptchaProvider.tsx
    │   ├── builder/
    │   │   ├── BuilderHeader.tsx
    │   │   ├── FieldList.tsx              # dnd-kit SortableContext
    │   │   ├── FieldItem.tsx
    │   │   ├── FieldEditorPanel.tsx
    │   │   └── editors/
    │   │       ├── ShortFieldEditor.tsx
    │   │       ├── LongFieldEditor.tsx
    │   │       ├── SingleFieldEditor.tsx
    │   │       ├── MultiFieldEditor.tsx
    │   │       ├── EmailFieldEditor.tsx
    │   │       ├── NumberFieldEditor.tsx
    │   │       └── DateFieldEditor.tsx
    │   ├── form/
    │   │   ├── PublicForm.tsx
    │   │   ├── FieldRenderer.tsx
    │   │   └── ReportFormModal.tsx
    │   ├── responses/
    │   │   ├── ResponseTable.tsx
    │   │   └── CsvDownloadButton.tsx
    │   ├── stats/
    │   │   ├── SingleChoiceChart.tsx
    │   │   ├── MultiChoiceChart.tsx
    │   │   └── TextSamples.tsx
    │   ├── admin/
    │   │   ├── UserTable.tsx
    │   │   ├── FormTable.tsx
    │   │   ├── ReportQueue.tsx
    │   │   └── AuditTable.tsx
    │   └── layout/
    │       ├── Header.tsx
    │       ├── Sidebar.tsx
    │       └── Footer.tsx
    │
    ├── store/
    │   ├── authStore.ts                   # Zustand (accessToken, user)
    │   └── builderStore.ts                # Zustand (편집 중 폼 임시 상태)
    │
    ├── lib/
    │   ├── api.ts                         # axios instance + interceptor
    │   ├── queryClient.ts                 # TanStack Query (4xx는 재시도 안 함 — §9.12)
    │   ├── apiResponse.ts                 # 응답 타입
    │   ├── errorMessage.ts                # ErrorCode → 한국어
    │   ├── auth.ts                        # 로그인/로그아웃 헬퍼
    │   ├── recaptcha.ts                   # executeRecaptcha 래퍼
    │   ├── sentry.ts
    │   └── format.ts                      # 날짜/숫자 포맷
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useForm.ts
    │   ├── useResponses.ts
    │   └── useDebounce.ts
    │
    ├── types/
    │   ├── api.ts                         # API 응답 타입
    │   ├── form.ts
    │   ├── field.ts
    │   ├── response.ts
    │   └── user.ts
    │
    └── middleware.ts                      # /admin 경로 role 가드
```

### 9.2 핵심 코드 — axios instance

`src/lib/api.ts`
```ts
import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const original = error.config!;
    const code = error.response?.data?.code as string | undefined;

    if (error.response?.status === 401 && code === 'UNAUTHORIZED' && !(original as any)._retry) {
      (original as any)._retry = true;
      try {
        refreshing ??= refresh();
        const newToken = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        useAuthStore.getState().clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

async function refresh(): Promise<string> {
  const res = await axios.post(
    `${API_URL}/api/auth/refresh`,
    {},
    { withCredentials: true }
  );
  const token = res.data?.data?.accessToken as string;
  useAuthStore.getState().setAccessToken(token);
  return token;
}
```

### 9.3 Zustand authStore

`src/store/authStore.ts`
```ts
import { create } from 'zustand';

type User = { id: number; email: string; nickname: string; role: 'USER' | 'ADMIN'; };

type AuthState = {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (t: string) => void;
  setUser: (u: User) => void;
  setAuth: (t: string, u: User) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (t) => set({ accessToken: t }),
  setUser: (u) => set({ user: u }),
  setAuth: (t, u) => set({ accessToken: t, user: u }),
  clear: () => set({ accessToken: null, user: null }),
}));
```

> 새로고침 시 메모리가 휘발됨 → `app/layout.tsx`의 Provider에서 마운트 시 `POST /api/auth/refresh` 한 번 시도하여 자동 복구.

### 9.4 SSR 공개 폼

`src/app/f/[slug]/page.tsx`
```tsx
import { notFound } from 'next/navigation';
import { PublicForm } from '@/components/form/PublicForm';

async function fetchPublicForm(slug: string) {
  const res = await fetch(`${process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL}/api/f/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.data : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const form = await fetchPublicForm(params.slug);
  if (!form) return { title: 'FormFlow' };
  return {
    title: `${form.title} | FormFlow`,
    description: form.description ?? form.title,
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const form = await fetchPublicForm(params.slug);
  if (!form) notFound();
  return <PublicForm form={form} />;
}
```

### 9.5 reCAPTCHA Provider

`src/components/auth/RecaptchaProvider.tsx`
```tsx
'use client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{ async: true, defer: true, appendTo: 'head' }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
```

### 9.6 미들웨어 — `/admin` 보호

`src/middleware.ts`
```ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 클라이언트에서 한 번 더 role 검증하지만, 즉시 리다이렉트가 UX에 좋음
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // 토큰은 메모리 저장이므로 미들웨어에서 정확한 인증 판단은 불가.
    // 따라서 미들웨어는 /admin 진입 시 빈 페이지 로딩 차단 정도만 수행하고
    // 실제 권한 검사는 클라이언트 컴포넌트 (AdminGuard)에서 수행.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

### 9.7 빌더 상태 관리 (Zustand)

`src/store/builderStore.ts`
- 편집 중인 폼의 필드 배열을 로컬에서 관리
- 드래그앤드롭으로 orderNum 변경 → "저장" 클릭 시 `PATCH /api/forms/{id}/fields/order` 한 번 호출
- 필드 추가/수정/삭제는 즉시 API 호출 (낙관적 업데이트는 TanStack Query mutation으로)

### 9.8 폼 검증 (react-hook-form + zod)

회원가입 예시:
```ts
import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string()
    .min(8, '8자 이상 입력해주세요.')
    .max(64, '64자 이하로 입력해주세요.')
    .refine((v) => {
      let kinds = 0;
      if (/[a-z]/.test(v)) kinds++;
      if (/[A-Z]/.test(v)) kinds++;
      if (/\d/.test(v)) kinds++;
      if (/[^a-zA-Z0-9]/.test(v)) kinds++;
      return kinds >= 3;
    }, '영문 대/소문자, 숫자, 특수문자 중 3종류 이상 포함해야 합니다.'),
  nickname: z.string().min(1).max(50),
  serviceAgreed: z.literal(true, { errorMap: () => ({ message: '필수 약관에 동의해주세요.' }) }),
  privacyAgreed: z.literal(true, { errorMap: () => ({ message: '필수 약관에 동의해주세요.' }) }),
  marketingAgreed: z.boolean(),
});
```

### 9.9 ErrorCode → 사용자 메시지

`src/lib/errorMessage.ts`
```ts
const MAP: Record<string, string> = {
  VALIDATION_ERROR: '입력값을 확인해주세요.',
  BAD_REQUEST: '잘못된 요청입니다.',
  INVALID_TOKEN: '유효하지 않거나 만료된 링크입니다.',
  PASSWORD_POLICY: '비밀번호는 8자 이상이며 영문/숫자/특수문자 중 3종류 이상 포함해야 합니다.',
  RECAPTCHA_FAILED: '보안 검증에 실패했습니다. 다시 시도해주세요.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  EMAIL_NOT_VERIFIED: '이메일 인증이 필요합니다.',
  ACCOUNT_SUSPENDED: '이용이 정지된 계정입니다.',
  FORBIDDEN: '권한이 없습니다.',
  NOT_FOUND: '존재하지 않습니다.',
  FORM_NOT_AVAILABLE: '존재하지 않거나 응답할 수 없는 폼입니다.',
  DUPLICATE_RESPONSE: '이미 응답한 폼입니다.',
  ILLEGAL_STATE: '현재 상태에서는 처리할 수 없습니다.',
  PLAN_LIMIT_EXCEEDED: '플랜 한도를 초과했습니다.',
  RATE_LIMITED: '잠시 후 다시 시도해주세요.',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다.',
};

export function toUserMessage(code?: string, fallback?: string) {
  if (code && MAP[code]) return MAP[code];
  return fallback ?? '오류가 발생했습니다.';
}
```

### 9.10 Sentry 설정

`sentry.client.config.ts`
```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  ignoreErrors: ['ResizeObserver loop limit exceeded'],
});
```

### 9.11 환경변수 (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ENV=local

# SSR 서버 사이드에서 호출할 때만 필요 (사설망 사용 시)
API_URL_INTERNAL=http://localhost:8080
```

Vercel 운영:
```bash
NEXT_PUBLIC_API_URL=https://api.form.sosyge.net
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_ENV=production
```

### 9.12 TanStack Query 재시도 정책 (중요)

`queryClient.ts`의 `defaultOptions.queries.retry`는 **4xx 응답에서 재시도하지 않는다.** 5xx/네트워크 오류만 1회 재시도.

```ts
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: (failureCount, error: any) => {
          const status = error?.response?.status;
          if (status >= 400 && status < 500) return false; // 4xx 즉시 중단
          return failureCount < 1;                          // 5xx/네트워크만 1회
        },
      },
    },
  });
}
```

**사유 (M5에서 발견)**: `retry: 1`로 두면 403/404 같은 4xx 응답에도 재시도가 걸려, 쿼리가 잠시 비-에러(pending) 상태에 머문다. 이 사이 `isError` 가드가 빗나가 "권한 없음" 같은 에러 UI 대신 generic 로딩/에러가 표시된다(StrictMode 이중 마운트와 겹치면 더 심함). 4xx는 재시도해도 결과가 같으므로 즉시 에러로 settle시키는 것이 옳다.

### 9.13 Recharts 렌더 규칙

모든 Recharts 차트의 `<Bar>`, `<Line>`, `<Pie>` 등 시리즈 요소는 **`isAnimationActive={false}`** 로 둔다.

```tsx
<Bar dataKey="count" isAnimationActive={false} />
```

**사유 (M7에서 발견)**: recharts의 진입 애니메이션은 `requestAnimationFrame`에 의존하는데, 백그라운드/headless 탭에서는 rAF가 일시정지되어 애니메이션이 완료되지 않고 막대/선이 height 0으로 남는다(데이터·축은 정상이나 시각 요소만 안 그려짐). 애니메이션을 끄면 결정적으로 렌더되어 이 문제와 자동화 검증 불안정이 모두 해소된다. UX 손실은 거의 없다(데이터 시각화는 즉시 표시가 오히려 자연스러움).

이 규칙은 모든 차트 컴포넌트에 적용: `SingleChoiceChart`, `MultiChoiceChart`, 관리자 `DailyTrendChart` 등.

> 참고: recharts 2.12.7의 `defaultProps` deprecation 콘솔 경고는 별개의 알려진 업스트림 이슈로, §16.3-11 참조. 기능 영향 없음.

### 9.14 디자인 시스템 / 브랜드 토큰 (전 화면 통일 완료)

전 화면이 아래 브랜드 체계로 통일됨. 새 화면·컴포넌트 추가 시 이 원칙을 따른다.

**컬러 (색상 영역 구분 원칙)**
| 영역 | 색 | 용도 |
|---|---|---|
| 일반(사용자) 영역 | brand 블루 `#378ADD` (light `#E6F1FB`, dark `#0C447C`) | 버튼/링크/포커스링/활성 메뉴/스피너/차트 응답 막대 |
| 관리자 영역 | 보라(purple, 기존 유지) | 권한 구분 의도. 일반 파랑(스피너·링크·focus)만 brand로, 보라 정체성·차트 응답막대(`#7c3aed`)는 유지 |
| 상태(status) | 의미색 | 초록=활성, 빨강=정지/신고, 노랑=대기. 관리자 뱃지 보라 유지 |

**Tailwind 설정** (`tailwind.config.ts`)
```ts
theme.extend.colors.brand = { DEFAULT:'#378ADD', light:'#E6F1FB', dark:'#0C447C' }
// 사용: bg-brand, text-brand, border-brand, focus:border-brand, focus:ring-brand/20,
//       bg-brand-light, text-brand-dark
```

**기타 규칙**
- 폰트: **Pretendard** (globals.css CDN). 배경 `gray-50`.
- 카드 패턴: 흰 카드 + 상단 브랜드 띠(`h-1.5 bg-brand`) + `rounded-xl`.
- `cn`은 순수 clsx (tailwind-merge 아님).
- **Recharts는 hex 직접 지정**(`fill="#378ADD"`). Tailwind 클래스는 Recharts props 안에서 안 먹음 (§9.13과 함께 주의).
- 전역 컴포넌트 우선: `Button.tsx` primary variant + `Input.tsx` focus ring을 brand로 전역화하면 화면별 `!important` 오버라이드 불필요.
- 공유 레이아웃 레버리지: `(auth)/layout.tsx` 한 곳이 로그인·회원가입·비번재설정·인증 5개 화면을 동시 제어.
- **함정**: `<Input>`의 `flex-1`은 내부 `<input>` 요소에 붙으므로, 가로 배치 시 래퍼 `<div className="flex-1">`로 감싸고 Input엔 `w-full`. (선택지 인풋 찌그러짐 사례)
- **함정**: NUMBER 필드 스크롤 휠 값 증감 → `onWheel={(e)=>e.currentTarget.blur()}`로 차단 (FieldRenderer).

---


## 10. 운영 기능

### 10.1 관리자 페이지 진입 정책

- 라우트: `https://form.sosyge.net/admin/**`
- 인증: 로그인 후 `user.role === 'ADMIN'` 검사 (FE 컴포넌트 가드 + BE `/api/admin/**` `hasRole('ADMIN')`)
- 추가 보호 (선택): 백엔드에 `admin.allowed-ips` 화이트리스트 옵션. 환경변수로 IP 목록 주입, 비어있으면 IP 검사 미적용.

```yaml
formflow:
  admin:
    allowed-ips: ${ADMIN_ALLOWED_IPS:}   # "1.2.3.4,5.6.7.8"
```

`AdminIpFilter`: `/api/admin/**` 요청 시 `X-Forwarded-For` 첫 IP가 화이트리스트에 없으면 `404` 반환 (관리자 페이지 존재 자체를 숨김).

### 10.2 어뷰징 대응 워크플로우

```
[감지]
  - 자동: Rate Limit 초과 누적 → 알람 (Sentry 또는 메일)
  - 수동: 폼 신고 누적 (form_reports 같은 form_id 3건 이상 PENDING)

[관리자 대시보드]
  - 신고 큐 (PENDING) 우선 처리
  - 폼 미리보기 → 강제 마감 또는 reject
  - 해당 사용자 다른 폼 확인 → 필요시 SUSPENDED 처리

[액션]
  - 폼 강제 마감: forms.status=CLOSED + admin_audits + 사용자 메일 통보
  - 사용자 정지: users.status=SUSPENDED + suspended_reason
                 + 모든 refresh_tokens revoke + 사용자 메일 통보

[복구]
  - 관리자 페이지에서 SUSPENDED → ACTIVE 복원 (감사 로그)
```

### 10.3 관리자 대시보드 위젯 (`/admin`)

- 오늘 가입자 수
- 오늘 응답 수
- PENDING 신고 수
- 최근 7일 일별 가입/응답 차트
- 최근 admin_audits 10건

### 10.4 모니터링 & 알람

| 종류 | 도구 | 알람 채널 | 임계 |
|---|---|---|---|
| 백엔드 예외 | Sentry | 메일 | 5분 내 10건 이상 |
| 프론트 에러 | Sentry | 메일 | 5분 내 20건 이상 |
| 서버 CPU/Mem | NCP Cloud Insight | 메일/SMS | CPU > 80% 5분 |
| DB 커넥션 풀 | actuator/health + Cloud Insight | 메일 | usage > 80% |
| 5xx 비율 | nginx 로그 → CloudWatch Agent 또는 NCP Cloud Insight | 메일 | 1분 > 1% |
| 응답 지연 | actuator metrics | 메일 | p95 > 1s |

### 10.5 로그 관리

- 형식: JSON 1줄(LogStash Encoder 또는 직접 `%mdc` 사용 — 운영 단순화를 위해 콘솔 로그 + nginx 로그를 NCP Object Storage로 일일 보관)
- 보관: 30일 (NCP Object Storage 라이프사이클)
- 민감 정보: §6.12 마스킹 필수
- `traceId` (UUID) MDC에 주입 → 응답 헤더 `X-Request-Id`로 전달

`common/RequestIdFilter.java`
```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-Request-Id";
    private static final String MDC_KEY = "traceId";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = Optional.ofNullable(req.getHeader(HEADER)).orElse(UUID.randomUUID().toString());
        MDC.put(MDC_KEY, id);
        res.setHeader(HEADER, id);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
```

### 10.6 배치 작업 스케줄

| Job | 실행 시간 | 내용 |
|---|---|---|
| ExpiredTokenCleanupJob | 매일 03:00 | `refresh_tokens`/`email_tokens` 중 `expired_at < NOW()` 또는 `used_at` 30일 이상 DELETE |
| OldResponseCleanupJob | 매일 03:30 | `responses.submitted_at < NOW() - 365일` 익명화 (IP/UA NULL 처리, value 유지) |
| DeletedUserAnonymizeJob | 매일 04:00 | `users.status=DELETED && updated_at < NOW() - 30일` → 이메일/닉네임 익명화, 폼은 soft delete |
| AutoCloseFormJob | 매 분 (`0 * * * * *`) | `status='PUBLISHED' AND closes_at IS NOT NULL AND closes_at <= NOW()` 폼을 CLOSED 처리 + `closed_at=NOW()` 기록. 마감 예약(#1) 구현. `idx_forms_closes_at` 활용 |

`@Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")` 사용 (AutoCloseFormJob만 매 분 `0 * * * * *`). 단일 인스턴스 가정. 다중 인스턴스 확장 시 ShedLock 도입.

> **마감일 두 컬럼 구분** (혼동 주의): `closes_at`=마감 **예정** 시각(사용자가 예약), `closed_at`=**실제** 마감된 시각(기록). 배치가 `closes_at` 도달을 감지해 `closed_at`을 찍는다. 마감 예정일은 발행 후에도 수정 가능(운영 메타, 필드 구조 잠금 #9와 무관). 설정은 공유 update가 아닌 전용 엔드포인트 `PATCH /api/forms/{id}/closes-at` 사용 — 이유는 §17 D-018.

---

## 11. 외부 연동

### 11.1 이메일 발송 (NCP Cloud Outbound Mailer)

NCP Cloud Outbound Mailer는 HMAC v2 서명이 필요한 REST API. 직접 호출.

`service/mail/NcpMailService.java`
```java
@Service
@Profile("!local")
@RequiredArgsConstructor
public class NcpMailService implements MailService {
    private static final String API_URL = "https://mail.apigw.ntruss.com/api/v1/mails";
    private final MailProperties props;
    private final RestTemplate restTemplate;

    @Override
    @Async("mailExecutor")
    public void send(String to, String subject, String htmlBody) {
        long timestamp = System.currentTimeMillis();
        String signature = makeSignature("POST", "/api/v1/mails", timestamp,
                props.getNcp().getAccessKey(), props.getNcp().getSecretKey());

        Map<String, Object> body = Map.of(
            "senderAddress", props.getFrom(),
            "senderName", props.getFromName(),
            "title", subject,
            "body", htmlBody,
            "recipients", List.of(Map.of("address", to, "type", "R")),
            "individual", true,
            "advertising", false
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-ncp-apigw-timestamp", String.valueOf(timestamp));
        headers.set("x-ncp-iam-access-key", props.getNcp().getAccessKey());
        headers.set("x-ncp-apigw-signature-v2", signature);

        try {
            restTemplate.postForEntity(API_URL, new HttpEntity<>(body, headers), Map.class);
        } catch (RestClientException e) {
            log.error("[MAIL] NCP send failed to={} subject={}", to, subject, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "메일 발송에 실패했습니다.");
        }
    }

    private static String makeSignature(String method, String uri, long timestamp, String accessKey, String secretKey) {
        String space = " ";
        String newLine = "\n";
        String message = method + space + uri + newLine + timestamp + newLine + accessKey;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
```

### 11.2 이메일 템플릿

`backend/src/main/resources/mail/`
```
mail/
├── verify-email.html          # 이메일 인증
├── password-reset.html        # 비밀번호 재설정
├── account-suspended.html     # 정지 알림
├── account-restored.html      # 정지 해제 알림
└── form-force-closed.html     # 폼 강제 마감 알림
```

템플릿 엔진: 간단하므로 String 치환(`{{nickname}}`, `{{link}}`) 또는 Thymeleaf 사용. **이 프로젝트는 단순 치환**으로 충분 (Thymeleaf 의존성 추가 불필요).

`service/mail/MailTemplate.java`
```java
@Component
public class MailTemplate {
    public String load(String name, Map<String, String> vars) {
        try (InputStream is = new ClassPathResource("mail/" + name + ".html").getInputStream()) {
            String html = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            for (var e : vars.entrySet()) {
                html = html.replace("{{" + e.getKey() + "}}", escape(e.getValue()));
            }
            return html;
        } catch (IOException e) {
            throw new IllegalStateException("mail template not found: " + name, e);
        }
    }
    private static String escape(String v) {
        return v == null ? "" : v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
```

**verify-email.html** (예시 — 한국어, 인라인 스타일):
```html
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Apple SD Gothic Neo',Pretendard,sans-serif;color:#222;">
  <div style="max-width:560px;margin:40px auto;padding:32px;border:1px solid #eee;border-radius:12px;">
    <h1 style="margin:0 0 16px;font-size:24px;">FormFlow 이메일 인증</h1>
    <p>{{nickname}}님, 안녕하세요.</p>
    <p>아래 버튼을 눌러 이메일 인증을 완료해 주세요. (유효기간: 24시간)</p>
    <p style="margin:32px 0;">
      <a href="{{link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">이메일 인증하기</a>
    </p>
    <p style="font-size:13px;color:#666;">버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요.<br>{{link}}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
    <p style="font-size:12px;color:#999;">본 메일은 발신 전용입니다. 문의는 support@sosyge.net 으로 보내주세요.</p>
  </div>
</body>
</html>
```

### 11.3 reCAPTCHA v3 검증

`security/RecaptchaVerifier.java`
```java
@Component
@RequiredArgsConstructor
public class RecaptchaVerifier {
    private static final String URL = "https://www.google.com/recaptcha/api/siteverify";
    private final RecaptchaProperties props;
    private final RestTemplate restTemplate;

    public void verify(String token, String action, double threshold) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", props.getSecret());
        body.add("response", token);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        Map<?,?> res;
        try {
            res = restTemplate.postForObject(URL, new HttpEntity<>(body, headers), Map.class);
        } catch (RestClientException e) {
            log.error("[RECAPTCHA] verify error", e);
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
        Boolean success = (Boolean) res.get("success");
        Number score = (Number) res.get("score");
        String resAction = (String) res.get("action");
        if (success == null || !success
                || score == null || score.doubleValue() < threshold
                || (action != null && !action.equals(resAction))) {
            log.warn("[RECAPTCHA] reject success={} score={} action={}", success, score, resAction);
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
    }
}
```

### 11.4 Sentry (백엔드)

`build.gradle`에 이미 포함. `application.yml`의 `sentry.dsn`만 설정.
운영 환경 변수: `SENTRY_DSN_BACKEND`.

---

## 12. 법적 페이지 (이용약관 / 개인정보처리방침)

### 12.1 운영 정책 요약

> **주의**: 아래는 표준 골격이며, 실제 서비스 오픈 전 반드시 법률 자문/검토를 받을 것.

| 항목 | 정책 |
|---|---|
| 운영자 | `[DECISION-NEEDED: 사업자명 등]` |
| 연락처 | `support@sosyge.net` |
| 약관 버전 관리 | Markdown 파일 + version 메타 |
| 동의 시점 | 회원가입 시 필수(서비스/개인정보), 선택(마케팅) |
| 보관 | `terms_agreements` 테이블 |
| 변경 시 | 7일 전 공지 + 재동의 (변경 영향도에 따라) |

### 12.2 약관 디렉토리 구조

```
backend/src/main/resources/terms/
├── service/
│   ├── 2025-05-01.md
│   └── meta.yml
├── privacy/
│   ├── 2025-05-01.md
│   └── meta.yml
└── marketing/
    ├── 2025-05-01.md
    └── meta.yml
```

`meta.yml` 예시
```yaml
current: 2025-05-01
versions:
  - version: 2025-05-01
    effectiveAt: 2025-05-01T00:00:00
    title: 이용약관
```

### 12.3 이용약관 골격 (`service/2025-05-01.md`)

```markdown
# 이용약관

## 제1조 (목적)
본 약관은 FormFlow(이하 "서비스")의 이용과 관련하여 운영자와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

## 제2조 (정의)
- "서비스"란 운영자가 form.sosyge.net 도메인을 통해 제공하는 온라인 폼 작성·응답 수집·통계 서비스를 말합니다.
- "이용자"란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말합니다.

## 제3조 (약관의 효력 및 변경)
1. 본 약관은 이용자가 동의함으로써 효력이 발생합니다.
2. 운영자는 필요한 경우 약관을 변경할 수 있으며, 변경 시 적용일자 7일 전부터 서비스 내에 공지합니다.

## 제4조 (회원가입)
1. 회원가입은 이메일 인증 절차를 거쳐 완료됩니다.
2. 운영자는 다음 각 호에 해당하는 경우 가입을 거부하거나 사후 해지할 수 있습니다.
   - 타인의 정보를 도용한 경우
   - 본 약관에 위반되는 목적으로 신청한 경우

## 제5조 (서비스의 제공 및 변경)
1. 운영자는 서비스를 24시간 연중무휴로 제공함을 원칙으로 하나, 점검·보수·천재지변·통신장애 등의 사유로 일시 중단될 수 있습니다.

## 제6조 (이용자의 의무)
이용자는 다음 행위를 하여서는 아니 됩니다.
- 타인의 정보 도용 / 허위 정보 등록
- 스팸·피싱·도박·불법행위에 서비스를 이용하는 행위
- 타인의 개인정보를 무단으로 수집하는 폼 운영
- 서비스의 정상 운영을 방해하는 행위

## 제7조 (서비스 이용 제한)
운영자는 이용자가 제6조를 위반한 경우 사전 통지 없이 서비스 이용을 정지하거나 계정을 삭제할 수 있습니다.

## 제8조 (책임 제한)
1. 운영자는 천재지변·통신장애 등 불가항력으로 인한 손해에 대해 책임을 지지 않습니다.
2. 이용자가 작성한 폼 및 수집한 응답의 내용에 대한 책임은 해당 이용자에게 있습니다.

## 제9조 (준거법 및 관할)
본 약관은 대한민국 법령에 의해 규율되며, 분쟁 발생 시 운영자 소재지 관할 법원을 1심 관할로 합니다.

부칙
- 본 약관은 2025년 5월 1일부터 시행합니다.
```

### 12.4 개인정보처리방침 골격 (`privacy/2025-05-01.md`)

```markdown
# 개인정보처리방침

## 1. 수집하는 개인정보 항목 및 수집 방법
- **회원가입 시**: 이메일 주소, 비밀번호(암호화 저장), 닉네임
- **서비스 이용 중 자동 수집**: 접속 IP, 브라우저 정보(User-Agent), 접속 일시
- **폼 응답자(비회원)**: 응답 내용, 응답자 식별 토큰(클라이언트 UUID), IP, User-Agent

## 2. 개인정보의 수집·이용 목적
- 회원 식별 및 본인 확인
- 서비스 제공 및 부정 이용 방지
- 법적 분쟁 발생 시 대응

## 3. 개인정보의 보유 및 이용 기간
- 회원 정보: 회원 탈퇴 시 즉시 파기(30일 익명화 보관 후 완전 삭제)
- 로그인 기록 / 부정 이용 기록: 3개월
- 폼 응답 데이터: 폼 생성자가 폼을 삭제하거나 365일이 경과하면 익명화 처리
- 관련 법령(전자상거래법 등)에 따라 보존 의무가 있는 정보는 해당 기간 동안 보관

## 4. 개인정보의 제3자 제공
운영자는 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 다음의 경우 예외로 합니다.
- 이용자가 사전에 동의한 경우
- 법령에 의해 요구되는 경우

## 5. 개인정보의 처리 위탁
- 인프라: Naver Cloud Platform (서버, DB, 메일 발송)
- 보안: Google reCAPTCHA (봇 차단)
- 에러 추적: Sentry

## 6. 이용자의 권리
이용자는 언제든지 자신의 개인정보를 조회·수정·삭제·동의 철회할 수 있습니다.

## 7. 개인정보 보호책임자
- 이름: `[DECISION-NEEDED]`
- 이메일: support@sosyge.net

## 8. 고지의 의무
본 방침이 변경되는 경우 적용일자 7일 전부터 서비스 내에 공지합니다.

시행일: 2025-05-01
```

### 12.5 동의 처리 흐름

1. 회원가입 폼에 체크박스 3개: 서비스(필수), 개인정보(필수), 마케팅(선택)
2. 제출 시 백엔드는 현재 `meta.yml.current` 버전을 읽어와 `terms_agreements`에 **항상 3건 INSERT** — service/privacy는 `agreed=true` 고정(미동의 시 가입 자체를 막음), marketing은 사용자 선택에 따라 `agreed=true` 또는 `agreed=false`.
   - **마케팅 거부도 `agreed=false`로 반드시 기록한다.** 사유:
     - 법적 입증: 추후 "동의한 적 없다/거부한 적 없다" 분쟁 시 가입 시점 의사표시 증빙
     - 재동의 추적: 나중에 마케팅 동의를 켤 때 `agreed_at` 기준 변화 이력 보존
     - `agreed TINYINT(1)` 컬럼 자체가 0/1 양쪽 저장을 전제로 설계됨
3. 약관 변경 시: 사용자 로그인 후 첫 요청에서 미동의 항목 감지 → 동의 모달 노출 → 동의 후 INSERT (Phase 3 이후 구현)

---

## 13. 배포

> 🔵 **이 섹션은 Phase 배포 — 추후 작업.** 도메인 발급 및 NCP 인프라 준비가 완료된 뒤 진행한다.
> 로컬 개발 중에는 §3-A를 따르고 이 절은 건너뛴다. Claude Code는 사용자가 명시적으로 "배포" 또는 "Phase 배포 진행" 이라고 요청하지 않는 한 본 절 작업을 수행하지 않는다.

### 13.1 환경 준비 체크리스트 (운영 1회)

```
[ ] NCP 계정 + 결제수단 등록
[ ] NCP Server (vCPU 2 / RAM 4GB / Ubuntu 22.04) 발급
[ ] NCP Cloud DB for MySQL 8.x 발급 → 사설 IP만 노출
[ ] NCP Cloud DB for Redis 발급 → 사설 IP만 노출
[ ] NCP Cloud Outbound Mailer 신청 → 발신 도메인 인증 (SPF/DKIM)
[ ] NCP API Gateway에서 발신자 접근키 발급
[ ] 도메인 DNS 설정 (sosyge.net 네임서버에서):
    - form.sosyge.net      → Vercel CNAME
    - api.form.sosyge.net   → NCP Server 공인 IP A 레코드
[ ] Vercel 프로젝트 생성 + 환경변수 설정
[ ] Google reCAPTCHA v3 사이트 등록 → site key / secret 확보
[ ] Sentry 프로젝트 2개 생성 (backend / frontend) → DSN 확보
[ ] GitHub 리포지토리 생성 (backend, frontend 분리)
[ ] GitHub Actions secrets 등록 (§13.5)
```

### 13.2 백엔드 배포 (NCP CentOS/Ubuntu)

`/etc/systemd/system/formflow.service`
```ini
[Unit]
Description=FormFlow Spring Boot
After=network-online.target
Wants=network-online.target

[Service]
User=formflow
WorkingDirectory=/opt/formflow
EnvironmentFile=/opt/formflow/.env
ExecStart=/usr/bin/java -Xms512m -Xmx2g \
  -Duser.timezone=Asia/Seoul \
  -Dspring.profiles.active=prod \
  -jar /opt/formflow/formflow.jar
SuccessExitStatus=143
TimeoutStopSec=20
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

`/opt/formflow/.env` (root:formflow 0640)
```bash
DB_URL=jdbc:mysql://<private-ip>:3306/formflow?useSSL=false&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_USERNAME=...
DB_PASSWORD=...
REDIS_HOST=<private-ip>
REDIS_PORT=6379
REDIS_PASSWORD=...
JWT_SECRET=...
FRONT_URL=https://form.sosyge.net
API_URL=https://api.form.sosyge.net
COOKIE_DOMAIN=.form.sosyge.net
COOKIE_SECURE=true
COOKIE_SAMESITE=Strict
CORS_ORIGINS=https://form.sosyge.net
MAIL_PROVIDER=ncp
MAIL_FROM=no-reply@form.sosyge.net
NCP_ACCESS_KEY=...
NCP_SECRET_KEY=...
RECAPTCHA_SECRET=...
SENTRY_DSN_BACKEND=https://...
ADMIN_ALLOWED_IPS=
```

배포 명령:
```bash
# 새 jar 업로드 후
sudo systemctl restart formflow
sudo journalctl -u formflow -f
```

### 13.3 프론트엔드 배포 (Vercel)

- GitHub 연동 → main 브랜치 push 시 자동 배포
- Environment Variables (Production / Preview / Development 각각):
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_ENV`
- 도메인 연결: `form.sosyge.net` → Vercel Domains

### 13.4 GitHub Actions — 백엔드 CI/CD

`.github/workflows/backend.yml`
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: formflow_test
        ports: ['3306:3306']
        options: --health-cmd="mysqladmin ping" --health-interval=10s
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - name: Test
        working-directory: backend
        run: ./gradlew test
        env:
          SPRING_PROFILES_ACTIVE: test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - name: Build
        working-directory: backend
        run: ./gradlew bootJar
      - name: SCP to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          source: "backend/build/libs/*.jar"
          target: "/tmp/formflow/"
          strip_components: 3
      - name: Restart service
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            sudo mv /tmp/formflow/*.jar /opt/formflow/formflow.jar
            sudo chown formflow:formflow /opt/formflow/formflow.jar
            sudo systemctl restart formflow
            sleep 5
            curl -fsS http://localhost:8080/actuator/health
```

### 13.5 GitHub Secrets

```
DEPLOY_HOST
DEPLOY_USER
DEPLOY_KEY               # SSH private key
SENTRY_AUTH_TOKEN        # 소스맵 업로드용 (선택)
```

### 13.6 롤백 절차

1. 직전 jar 파일 보관 정책: `/opt/formflow/backup/formflow-YYYYMMDD-HHMMSS.jar`
2. 배포 스크립트가 매 배포 전 현재 jar를 backup/으로 이동
3. 롤백:
```bash
sudo cp /opt/formflow/backup/formflow-20250501-090000.jar /opt/formflow/formflow.jar
sudo systemctl restart formflow
```
4. Flyway는 보통 down 마이그레이션을 제공하지 않으므로 **DDL은 항상 하위 호환** 유지 (컬럼 ADD만, DROP은 사용 중단 표시 후 별 릴리즈에서):

---

## 14. 개발 순서 (Claude Code 작업 단위)

각 마일스톤 = 하나의 PR 단위. **M0 → M1 → ... → M7 까지는 모두 로컬 환경(§3-A)에서 진행.** M8(배포)은 Phase 배포 시점에만.

### M0. 로컬 구동 (🟢 최우선 — 다른 마일스톤보다 먼저)
**목표**: 백엔드/프론트가 빈 골격 상태로라도 로컬에서 동시에 떠서 `/actuator/health`가 UP, 프론트 메인 페이지가 200으로 응답.

- [ ] 리포지토리 디렉토리 생성: `backend/`, `frontend/`, 루트에 `docker-compose.local.yml`
- [ ] §3-A.3 docker-compose.local.yml 작성 + `docker compose up -d`
- [ ] §3-A.2 사전 요구사항 확인 (JDK 17, Node 20, Docker)
- [ ] `backend/` Spring Boot 3.2.5 프로젝트 + §4.1 의존성
- [ ] `frontend/` Next.js 14.2.3 프로젝트 + §4.2 의존성
- [ ] §3-A.4 `backend/.env.local`, §3-A.5 `frontend/.env.local` 작성
- [ ] `application.yml` + `application-local.yml` (§8.8 + §3-A.6) — 메일은 SMTP/MailHog로
- [ ] §5.2 V1 마이그레이션 파일 추가 (Flyway가 기동 시 자동 적용)
- [ ] §3-A.11 실행 순서대로 기동 후 검증:
  - `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`
  - `http://localhost:3000` 200 응답
  - `http://localhost:8025` MailHog UI 접근 가능
  - MySQL Workbench/CLI로 `flyway_schema_history` 조회 → V1, V2 적용 확인
- [ ] `.gitignore`에 `.env.local`, `*.jar`, `node_modules/`, `build/` 추가

### M1. 백엔드 골격 + 공통 인프라
- [ ] §8.2~8.4 ApiResponse, ErrorCode, GlobalExceptionHandler
- [ ] §10.5 RequestIdFilter, LoggingFilter
- [ ] §6.6 SecurityConfig 골격 (인증 필요 경로만 분리, 토큰 검증은 비어 있어도 OK)
- [ ] §8.5 MyBatis 설정 + 빈 Mapper 인터페이스
- [ ] OpenAPI 활성화 → `http://localhost:8080/swagger-ui.html` 접근 확인
- [ ] FE: axios instance(§9.2), authStore(§9.3), queryClient, Sentry 골격 (Sentry DSN 비어있으면 비활성)

### M2. 회원/인증
- [ ] §7.3 Auth API 전체 구현 (signup ~ password reset)
- [ ] §6.1~6.4 플로우 구현
- [ ] §11.1~11.2 메일 발송 (verify-email, password-reset 템플릿)
- [ ] §6.7 RateLimitFilter (login, signup, password-reset 우선)
- [ ] §6.8 RecaptchaVerifier (회원가입, password-reset)
- [ ] §12 약관 파일 추가 + `/api/terms/{type}` 구현
- [ ] FE: 로그인/회원가입/이메일 인증/비밀번호 재설정 페이지

### M3. 폼 CRUD + 필드
- [ ] §7.5 폼 API 구현 + 무료 한도 검증
- [ ] §7.6 필드 API 구현 (단순 CRUD까지)
- [ ] FE: 대시보드, 폼 빌더 기본 (드래그앤드롭 제외)

### M4. 공개 폼 + 응답 제출
- [ ] §7.7 공개 폼 API
- [ ] §8.9 PublicFormService 구현
- [ ] §6.7 submit Rate Limit + §6.8 reCAPTCHA (로컬은 §3-A.7/§3-A.8 우회 설정)
- [ ] FE: `/f/[slug]` SSR 페이지 + 응답 폼

### M5. 응답 조회 + CSV
- [ ] §7.8 응답 목록 + 통계 API
- [ ] CSV export (UTF-8 BOM)
- [ ] FE: 응답 목록 페이지

### M6. 드래그앤드롭 + 통계 차트
- [ ] §7.6 필드 순서 변경 API
- [ ] FE: dnd-kit 적용
- [ ] FE: Recharts 통계 페이지

### M7. 관리자
- [ ] §7.10 관리자 API 전체
- [ ] §10.1 AdminIpFilter (로컬은 `ADMIN_ALLOWED_IPS` 비움)
- [ ] FE: `/admin/*` 페이지

### M8. 로컬 마무리 (운영 코드 자체는 로컬에서 검증 가능)
- [ ] §10.6 배치 작업 3개 구현 (로컬에서 cron 시간 임시 단축해 동작 확인)
- [ ] §11.4 Sentry 코드 통합 (DSN 비어있으면 자동 비활성 — 로컬은 그대로)
- [ ] §15.1~15.3 체크리스트 전체 통과 (로컬 기준)

### M9. 🔵 Phase 배포 (도메인 발급 후)
- [ ] §3-B 운영 환경 준비
- [ ] §13.1 환경 준비 체크리스트
- [ ] §13.2 백엔드 배포 (systemd)
- [ ] §13.3 프론트 배포 (Vercel)
- [ ] §13.4 GitHub Actions
- [ ] §13.5/§13.6 Secrets/롤백
- [ ] DNS 연결 + SSL 발급
- [ ] §15.4 배포 후 운영 검증

---

## 15. 검증 & QA 체크리스트

### 15.0 로컬 구동 검증 (M0 통과 기준)

```
[인프라]
[ ] docker compose ps → mysql/redis/mailhog 모두 healthy
[ ] mysql 컨테이너 접속 → SHOW DATABASES → formflow 존재
[ ] redis-cli ping → PONG
[ ] http://localhost:8025 → MailHog UI 표시

[백엔드]
[ ] bootRun 기동 시 Flyway 로그에 V1, V2 적용 메시지
[ ] curl http://localhost:8080/actuator/health → {"status":"UP"}
[ ] flyway_schema_history 테이블에 success=1로 마이그레이션 기록
[ ] http://localhost:8080/swagger-ui.html 접근 가능
[ ] 의존성 NoClassDefFoundError 등 기동 에러 없음

[프론트]
[ ] npm run dev → http://localhost:3000 200
[ ] 콘솔에 NEXT_PUBLIC_API_URL 미설정 에러 없음
[ ] axios가 localhost:8080으로 요청 (Network 탭)

[연동]
[ ] 회원가입 API 호출 → 201 + MailHog UI에 인증 메일 도착
[ ] 메일 링크 클릭 → 프론트 /verify 페이지 → 자동 로그인 → /dashboard
[ ] Cookie 탭에서 refreshToken HttpOnly=true 확인 (Secure=false, SameSite=Lax)
```

### 15.1 기능 검증

```
[회원/인증]
[ ] 회원가입 → 인증 메일 수신 → 링크 클릭 → 자동 로그인
[ ] 미인증 상태 로그인 시도 → EMAIL_NOT_VERIFIED
[ ] 잘못된 비밀번호 5회 → reCAPTCHA 강제
[ ] 비밀번호 재설정 메일 → 링크 → 변경 후 자동 로그아웃
[ ] Access Token 만료 후 자동 refresh 동작
[ ] 로그아웃 후 같은 refreshToken으로 refresh → 401
[ ] DELETED 계정으로 로그인 → 404

[폼/필드]
[ ] 폼 10개 만들고 11번째 → PLAN_LIMIT_EXCEEDED
[ ] 필드 0개로 PUBLISHED → ILLEGAL_STATE
[ ] 필드 30개 후 추가 → PLAN_LIMIT_EXCEEDED
[ ] 드래그앤드롭 후 새로고침 → 순서 유지
[ ] 타인 폼 수정 → 403

[공개 폼]
[ ] DRAFT 폼 공개 URL → FORM_NOT_AVAILABLE
[ ] CLOSED 폼 공개 URL → FORM_NOT_AVAILABLE
[ ] 응답 100건 후 추가 응답 → FORM_NOT_AVAILABLE
[ ] 같은 respondentKey 재제출 → DUPLICATE_RESPONSE
[ ] 필수 필드 누락 → VALIDATION_ERROR + fieldErrors
[ ] reCAPTCHA 토큰 누락 → RECAPTCHA_FAILED

[관리자]
[ ] 일반 유저로 /admin → 403 (FE는 즉시 리다이렉트)
[ ] 사용자 SUSPENDED 후 해당 사용자 API 호출 → ACCOUNT_SUSPENDED
[ ] 폼 강제 마감 시 소유자에게 메일 발송 확인
[ ] admin_audits 기록 확인
```

### 15.2 보안 검증

```
[ ] refreshToken Cookie: HttpOnly, Secure, SameSite=Strict 확인 (개발자 도구)
[ ] 비밀번호 응답·로그 어디에도 평문 노출 없음
[ ] JWT_SECRET이 코드/리포지토리에 하드코딩되지 않음 (grep -r "JWT_SECRET" 확인)
[ ] CORS allowed-origins 운영 도메인만 허용
[ ] 보안 헤더 확인: curl -I https://api.form.sosyge.net/actuator/health
    - Strict-Transport-Security
    - X-Frame-Options: DENY
    - X-Content-Type-Options: nosniff
    - Content-Security-Policy
[ ] SQL Injection 시도 — 모든 ${} 없음 확인 (grep "\${" mybatis/mapper/*.xml)
[ ] 비공개·마감·삭제·한도초과 모두 404 + FORM_NOT_AVAILABLE 응답으로 통일
[ ] 비밀번호 재설정 요청은 이메일 존재 여부와 무관하게 동일 응답
[ ] 관리자 작업은 모두 admin_audits 기록
```

### 15.3 성능 검증

```
[ ] 폼 응답 제출 p95 < 500ms (애플 폼 100개 시드 후 측정)
[ ] 응답 목록 페이지네이션 size=20 — p95 < 300ms
[ ] DB N+1 없음 (응답 목록 쿼리 — Mapper 로그로 확인)
[ ] CSV 다운로드 1000건 — < 3s
[ ] 동시 50 사용자 응답 제출 — 오류 없음 (k6 또는 Artillery로 테스트)
```

### 15.4 배포 후 운영 검증

```
[ ] https://form.sosyge.net 접속 시 HTTPS 자동 리다이렉트
[ ] https://api.form.sosyge.net/actuator/health 200
[ ] 회원가입 → 실제 메일 수신 (NCP 발신)
[ ] Sentry 에러 발생 시 알람 수신 확인
[ ] nginx Rate Limit 동작 (ab로 같은 IP에서 200rps 시도 → 429)
[ ] CSV 한글 — Excel에서 열어 깨짐 없음
[ ] 응답 후 통계 수치 정합성
[ ] Flyway 적용 이력: SELECT * FROM flyway_schema_history;
[ ] 배치 작업 다음 날 03:00 이후 로그 확인
```

---

## 16. 부록

### 16.1 환경변수 전체 목록

| 변수 | 위치 | 예시/설명 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | BE | `local` / `prod` |
| `DB_URL` | BE | `jdbc:mysql://...` |
| `DB_USERNAME` | BE | |
| `DB_PASSWORD` | BE | |
| `REDIS_HOST` | BE | |
| `REDIS_PORT` | BE | `6379` |
| `REDIS_PASSWORD` | BE | |
| `JWT_SECRET` | BE | 32자 이상 랜덤 (`openssl rand -base64 48`) |
| `FRONT_URL` | BE | `https://form.sosyge.net` |
| `API_URL` | BE | `https://api.form.sosyge.net` |
| `COOKIE_DOMAIN` | BE | `.form.sosyge.net` (로컬은 빈 값) |
| `COOKIE_SECURE` | BE | `true` (로컬 `false`) |
| `COOKIE_SAMESITE` | BE | `Strict` (로컬 `Lax`) |
| `CORS_ORIGINS` | BE | `https://form.sosyge.net` (쉼표 구분) |
| `MAIL_PROVIDER` | BE | `ncp` / `smtp` |
| `MAIL_FROM` | BE | `no-reply@form.sosyge.net` |
| `NCP_ACCESS_KEY` | BE | NCP IAM |
| `NCP_SECRET_KEY` | BE | NCP IAM |
| `RECAPTCHA_ENABLED` | BE | `true`(운영) / `false`(로컬) — 로컬은 검증 우회 |
| `RECAPTCHA_SECRET` | BE | Google reCAPTCHA (로컬은 더미값 OK) |
| `SENTRY_DSN_BACKEND` | BE | 비어있으면 자동 비활성 (로컬) |
| `ADMIN_ALLOWED_IPS` | BE | 빈 값이면 IP 제한 없음 (로컬은 빈 값) |
| `SMTP_HOST` | BE (로컬) | `localhost` (MailHog) |
| `SMTP_PORT` | BE (로컬) | `1025` (MailHog) |
| `NEXT_PUBLIC_API_URL` | FE | 로컬 `http://localhost:8080` / 운영 `https://api.form.sosyge.net` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | FE | 로컬은 Google 테스트 키 OK |
| `NEXT_PUBLIC_RECAPTCHA_ENABLED` | FE | `true` / `false` |
| `NEXT_PUBLIC_SENTRY_DSN` | FE | 비어있으면 비활성 |
| `NEXT_PUBLIC_ENV` | FE | `production` / `local` |
| `API_URL_INTERNAL` | FE (선택) | SSR fetch 시 사설망 URL |

### 16.2 에러 코드 전체 목록

| HTTP | code | 메시지 |
|---|---|---|
| 400 | VALIDATION_ERROR | 입력값을 확인해주세요. |
| 400 | BAD_REQUEST | 잘못된 요청입니다. |
| 400 | INVALID_TOKEN | 유효하지 않거나 만료된 링크입니다. |
| 400 | PASSWORD_POLICY | 비밀번호 정책을 만족하지 않습니다. |
| 400 | RECAPTCHA_FAILED | 보안 검증에 실패했습니다. |
| 400 | EMAIL_ALREADY_EXISTS | 이미 가입된 이메일입니다. |
| 401 | UNAUTHORIZED | 재로그인이 필요합니다. |
| 401 | INVALID_CREDENTIALS | 이메일 또는 비밀번호가 올바르지 않습니다. |
| 401 | EMAIL_NOT_VERIFIED | 이메일 인증이 필요합니다. |
| 403 | FORBIDDEN | 권한이 없습니다. |
| 403 | ACCOUNT_SUSPENDED | 이용이 정지된 계정입니다. |
| 404 | NOT_FOUND | 찾을 수 없습니다. |
| 404 | FORM_NOT_AVAILABLE | 존재하지 않거나 응답할 수 없는 폼입니다. |
| 409 | DUPLICATE_RESPONSE | 이미 응답한 폼입니다. |
| 409 | ILLEGAL_STATE | 현재 상태에서는 처리할 수 없습니다. |
| 409 | PLAN_LIMIT_EXCEEDED | 플랜 한도를 초과했습니다. |
| 409 | FORM_NOT_EDITABLE | 발행된 폼은 질문을 수정할 수 없습니다. 질문을 바꾸려면 새 폼을 만들어 주세요. |
| 429 | RATE_LIMITED | 잠시 후 다시 시도해주세요. |
| 500 | INTERNAL_ERROR | 서버에 일시적인 문제가 발생했습니다. |

### 16.3 자주 발생하는 문제 (트러블슈팅)

**0) [로컬] docker compose up 후 백엔드가 DB 연결 실패**
- mysql 컨테이너 healthy 상태 되기까지 5~10초 대기 필요.
- `docker compose -f docker-compose.local.yml ps`로 `(healthy)` 확인 후 백엔드 기동.
- `allowPublicKeyRetrieval=true` 누락 시 MySQL 8 + 비-SSL 환경에서 인증 실패. JDBC URL 확인.

**0-1) [로컬] MailHog로 메일이 가지 않는다**
- `MAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025` 확인.
- 빈 발신자 주소는 일부 메일 라이브러리에서 차단. `MAIL_FROM` 반드시 지정 (`no-reply@formflow.local` 같은 임의 도메인 OK).
- 백엔드가 `@Profile("local")`로 `SmtpMailService` 빈을 띄웠는지 로그 확인. `NcpMailService`가 함께 뜨면 충돌.

**0-2) [로컬] 회원가입 시 reCAPTCHA 에러**
- 로컬은 `RECAPTCHA_ENABLED=false`로 두어야 함 (BE/FE 양쪽).
- 그래도 에러가 나면 `RecaptchaVerifier`에 `props.isEnabled()` 단락 평가가 빠진 것. §3-A.7 코드로 교체.

**0-3) [로컬] 프론트에서 API 호출 시 CORS 차단**
- `CORS_ORIGINS=http://localhost:3000` 정확히. 슬래시 없음, http(s) 일치.
- 브라우저는 `withCredentials=true`이면 `Allowed-Origins: *`를 거부함 — 명시적으로 origin 지정.

**0-4) [로컬] Flyway가 V900 시드 SQL을 운영에서도 적용하려 한다**
- 시드는 `db/migration/`에 두면 안 됨. §3-A.10대로 `backend/scripts/seed-local.sql`로 분리하고 mysql CLI로 수동 적용.

**0-5) [로컬 macOS] Docker Desktop 없이 Colima로 셋업**
- `brew install colima docker docker-compose`
- `~/.docker/cli-plugins/`에 compose 플러그인 심볼릭 링크 (Homebrew 설치 경로 확인):
  ```bash
  mkdir -p ~/.docker/cli-plugins
  ln -sfn $(brew --prefix)/opt/docker-compose/bin/docker-compose ~/.docker/cli-plugins/docker-compose
  ```
- `colima start` 후 `docker compose ...` 명령 사용. 재기동 시 `colima start`부터.

**0-6) [로컬] 3306 포트 충돌 (호스트 Homebrew mysqld 점유)**
- 호스트에 이미 `mysqld` 또는 다른 MySQL이 떠 있으면 `docker compose up`이 포트 바인딩 실패.
- 호스트 mysqld를 끄는 대신 컨테이너 포트를 변경:
  - `docker-compose.local.yml`의 mysql.ports를 `"3307:3306"`으로
  - `backend/.env.local`의 `DB_URL`에서 포트를 `3307`로
- mysql CLI 접속 시 `mysql -h 127.0.0.1 -P 3307 -uformflow -pformflowpw formflow`

**0-7) [Spring Security 6 / Boot 3.2+] permitAll 경로인데도 401이 떨어진다**
- 핸들러 없는 경로가 404를 만들 때 `/error`로 forward되는 과정에서 ERROR 디스패치가 보안 재평가되어 `authenticated()` 룰에 걸리는 함정.
- 해결: `SecurityConfig`의 `authorizeHttpRequests`에 다음 한 줄 추가
  ```java
  .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
  ```
- 동반 함정: Spring Boot 3.2+ 에서는 매핑 없는 정적 자원 경로가 `NoResourceFoundException`을 throw하므로 §8.4의 핸들러 목록에 `NoResourceFoundException → 404`가 반드시 있어야 한다 (없으면 catch-all로 떨어져 500).

**1) Refresh 가 401만 떨어진다**
- Cookie의 `Domain` 설정 확인. 로컬은 `Domain` 미설정, 운영은 `.form.sosyge.net`.
- `withCredentials: true` 누락 확인.
- nginx에서 `Set-Cookie` 헤더가 클라이언트로 전달되는지 확인 (`proxy_pass_header Set-Cookie;`는 기본 동작).

**2) CORS preflight 실패**
- `CORS_ORIGINS` 환경변수 정확히 일치 (스킴/포트/슬래시).
- `OPTIONS`도 Spring Security `permitAll` 인지 확인.
- `allow-credentials: true` + `Allowed-Origins: *` 금지 (브라우저 거부).

**3) MyBatis에서 enum이 null로 박힘**
- DB 컬럼이 ENUM 타입이고 Java enum이 일치하는지 확인.
- 자동 매핑은 enum의 `name()` 기준. DB 값이 소문자면 별도 TypeHandler 필요.

**4) 메일이 발송되지 않음 (NCP)**
- 발신 도메인 인증(SPF/DKIM) 완료 여부 확인.
- `MAIL_FROM`이 인증된 도메인의 주소인지 확인.
- HMAC 서명 시 timestamp는 **밀리초** (`System.currentTimeMillis()`).
- 응답 본문에서 에러 메시지 확인 (현재 코드는 로그만 남김).

**5) 이메일 인증 링크 누르면 토큰이 잘려서 들어옴**
- 링크에 `?` 외 추가 파라미터가 있는지 확인.
- 토큰에 URL-safe Base64 사용 (`+/` 대신 `-_`).

**6) 응답 제출 시 DUPLICATE_RESPONSE가 무조건 떨어진다**
- 프론트가 같은 `respondentKey`를 재사용하는지 확인 (localStorage 기준).
- 폼 응답 페이지 진입 시 새 UUID 생성 후 localStorage 저장, 제출 후에도 보관 (재방문 시 중복 차단).

**7) CSV 한글 깨짐 (Excel)**
- `Content-Type: text/csv; charset=UTF-8` 만으로는 부족.
- 파일 맨 앞에 BOM(`\uFEFF`) 명시적으로 작성.

**8) Flyway 마이그레이션 실패 — checksum mismatch**
- 운영 적용된 마이그레이션 파일은 **수정 금지**. 새 버전(`V_n+1__`) 추가만 가능.
- 잘못 적용된 경우 `flyway_schema_history`에서 해당 row 수동 수정 후 재시도 (운영에서는 매우 조심).

**9) Vercel 빌드 시 `Module not found`**
- 모노레포가 아니라면 Vercel Root Directory를 `frontend`로 지정.
- `next.config.mjs`의 `transpilePackages` 누락 확인.

**10) Spring Security 6에서 `WebSecurityConfigurerAdapter` 안 됨**
- Spring Boot 3.x = Spring Security 6 → `SecurityFilterChain` 빈 등록 방식 사용.

**11) [Recharts] 콘솔에 `Support for defaultProps will be removed...` 경고**
- recharts 2.12.7 내부(XAxis/YAxis)에서 발생하는 알려진 업스트림 경고. **앱 코드 문제 아님**, 기능 영향 없음.
- §4.2에 버전이 고정돼 있으므로 임의 업그레이드 금지 (2.13+에서도 잔존, 3.x는 breaking change).
- 콘솔 노이즈를 줄이려면 운영 빌드에서만 해당 경고를 필터링하는 래퍼를 둘 수 있으나, 진짜 에러를 가릴 수 있어 권장하지 않음. 알려진 경고로 인지하고 무시.

**12) [dnd-kit] headless 브라우저 자동화에서 드래그가 트리거되지 않음**
- dnd-kit의 PointerSensor/KeyboardSensor는 실제 pointer 이벤트 시퀀스를 요구하여, headless 자동화 도구(합성 이벤트)로는 드래그가 재현되지 않을 수 있음. **제품 결함 아님** — 실제 마우스/키보드 입력에서는 정상 동작.
- 자동 검증 시에는 `onDragEnd`가 호출하는 reorder API(PATCH .../fields/order)를 직접 호출해 데이터플로우(영속/공개폼 반영)를 대체 검증하고, 실제 드래그는 사람이 1회 수동 확인 권장.
- a11y 겸 자동화 보조로 KeyboardSensor(`sortableKeyboardCoordinates`)를 추가해두면 좋음.

**13) [배포] MySQL `Access denied for 'formflow'@'127.0.0.1'` (계정은 만들었는데)**
- MySQL은 `localhost`(유닉스 소켓)와 `127.0.0.1`(TCP)을 **다른 호스트로 취급**. JDBC는 URL에 `localhost`라 써도 TCP(`127.0.0.1`)로 접속하므로, `@localhost` 계정만 있으면 인증 거부.
- 해결: `CREATE USER 'formflow'@'127.0.0.1'` 계정을 **동일 비밀번호로** 추가 + `GRANT`. 검증은 반드시 `mysql -h 127.0.0.1`(TCP)로.
- `.env`의 `DB_PASSWORD`를 따옴표로 감싸면 systemd가 따옴표까지 값으로 인식 → 인증 실패. 따옴표 없이 적을 것.

**14) [배포] prod 프로파일에서 `JavaMailSender` 빈 없음 → 기동 실패**
- `spring.mail.host` 설정이 `application-local.yml`에만 있으면, prod 프로파일에선 `JavaMailSender` 자동 생성이 안 됨 → `SmtpMailService` 생성 실패.
- 해결(즉효): `.env`에 Spring 표준 환경변수 `SPRING_MAIL_HOST`/`SPRING_MAIL_PORT` 추가(relaxed binding으로 `spring.mail.*` 자동 매핑). 커스텀 키 `SMTP_HOST`만으로는 부족.
- 근본책: 공통 `application.yml`에 `spring.mail.host: ${SMTP_HOST:...}`를 두면 모든 프로파일에서 잡힘.

**15) [배포] nginx에 server 블록 없는 서브도메인 → 기존 서비스로 fallback**
- 새 서브도메인(`form-dev`) 요청이 매칭되는 `server_name` 블록이 없으면, nginx는 **첫 번째(또는 default) server 블록**으로 보냄 → 엉뚱한 기존 앱이 응답(JSESSIONID 등으로 식별 가능).
- 해결: 해당 서브도메인용 `server { server_name ...; }` 블록을 **신규 conf 파일**로 추가. 기존 conf는 수정 금지. `nginx -t` 후 `reload`.

**16) [배포] 시스템 계정(`useradd -r`)으로 npm 실행 시 `EACCES /home/<user>`**
- `-r`(시스템 계정)은 홈 디렉토리가 없어, npm이 `~/.npm` 캐시를 못 만들고 `EACCES`로 설치 중단 → `node_modules` 절반만 깔리고 `next: command not found`.
- 해결: 빌드는 일반 권한(root 등)으로 수행 후 산출물 소유권만 서비스 계정으로 `chown`. systemd에는 `Environment=HOME=/home/<user>` 명시 + 해당 홈 디렉토리 생성.
- 빌드는 일회성이므로 "빌드는 root, 실행만 서비스계정" 패턴이 가장 단순.

**17) [배포] 와일드카드 인증서는 한 레벨만 커버**
- `*.sosyge.net`은 `xxx.sosyge.net`(한 레벨)만 매칭. `form.dev.sosyge.net`(두 레벨)은 커버 못 함.
- 해결: 서브도메인을 하이픈으로 한 레벨화(`form-dev.sosyge.net`). 또는 두 레벨이 꼭 필요하면 `*.dev.sosyge.net` 인증서를 별도 발급.
- 확인: `openssl s_client -servername <도메인> -connect <ip>:443 | openssl x509 -noout -checkhost <도메인>`

**18) [배포] 클라우드 아웃바운드 SMTP 차단 → 465(SSL)만 열림**
- iwinv 등 클라우드는 스팸 방지로 아웃바운드 SMTP 포트(25/465/587)를 기본 차단하는 경우가 많음. dev에서 Gmail SMTP relay로 실제 메일 발송 시 전부 timeout.
- 진단: `for p in 25 465 587; do timeout 6 bash -c "echo > /dev/tcp/smtp.gmail.com/$p" 2>/dev/null && echo "$p OPEN" || echo "$p BLOCKED"; done`
- 해결: iwinv 콘솔 방화벽에서 **아웃바운드 TCP 465 허용**(대상 IP `0.0.0.0/0` — Gmail IP 변동). iwinv는 587은 막고 465만 열린 케이스 확인됨 → **465(SSL) 사용**.
- 465 사용 시 `.env`: `SPRING_MAIL_PORT=465`, `...MAIL_SMTP_SSL_ENABLE=true`, `...MAIL_SMTP_STARTTLS_ENABLE=false`(587용 STARTTLS=true가 남아있으면 충돌).
- Gmail은 **발신자=계정 주소 강제** → `MAIL_FROM`을 `SPRING_MAIL_USERNAME`과 동일한 Gmail 주소로. `no-reply@도메인` 쓰면 거부/스팸.
- Gmail SMTP는 **앱 비밀번호**(2FA 필수) 사용. 일반 비번은 535. `.env` 비번은 따옴표·공백 없이.
- Gmail 무료 발송 한도 ≈ 일 500통. dev 소량 테스트엔 충분, 운영은 NCP Mailer(HTTPS API, 443) 권장 — SMTP 포트 차단과 무관.
- 참고: 가짜 수신주소(`x+test1@gmail.com` 등 미존재)는 SMTP `[MAIL][SMTP] sent`(릴레이 성공)는 찍히나 `550 5.1.1 ... does not exist`로 반송됨. 도착 검증은 실재 주소(본인 `+별칭` 등)로.

#### dev 메일 발송 설정 (Gmail SMTP, 실서버 검증 완료)
dev 환경에서 MailHog(가짜 우체통) 대신 실제 발송이 필요할 때(직원 테스트 등) 사용. `MAIL_PROVIDER=smtp` 유지, 접속 정보만 Gmail로:
```bash
MAIL_PROVIDER=smtp
MAIL_FROM=<gmail주소>                 # = USERNAME (Gmail 발신자 강제)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=465
SPRING_MAIL_USERNAME=<gmail주소>
SPRING_MAIL_PASSWORD=<앱비밀번호16자리>   # 2FA→앱비번, 따옴표 없이
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_SSL_ENABLE=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=false
```
→ `systemctl restart formflow` → 실재 주소로 가입 → `[MAIL][SMTP] sent` 로그 + 메일함 도착 확인.

**19) [배포][치명] dev 프론트가 API를 `localhost:8080`으로 호출 (CORS/404)**
- 증상: `form-dev.sosyge.net`에서 로그인 시 브라우저가 `http://localhost:8080/api/...` 호출 → CORS 차단 + 404. `.env.production`은 올바른데(`api-form-dev`) 번들엔 localhost가 박힘.
- 원인: **Next.js env 우선순위 `.env.local` > `.env.production`**. 로컬 개발용 `.env.local`(`NEXT_PUBLIC_API_URL=http://localhost:8080`)이 rsync로 dev에 딸려 올라가, 빌드가 `.env.production`을 무시하고 `.env.local`을 읽음. `NEXT_PUBLIC_*`는 **빌드 타임에 번들에 주입**되므로 env 바꾸면 반드시 재빌드 필요.
- 진단: `cat /opt/formflow-frontend/.env.local` (있으면 범인) / `grep -ro "localhost:8080" /opt/formflow-frontend/.next | head` (번들 오염 확인).
- 해결: `sudo rm /opt/formflow-frontend/.env.local` → `rm -rf .next && npm run build` → restart. 검증은 **시크릿창**(일반 창은 옛 JS 캐시).
- **재발 방지(필수)**: 프론트 배포 rsync에 `--exclude='.env.local' --exclude='.env' --exclude='.next' --exclude='node_modules'`. dev엔 `.env.production`만 존재해야 함. 로컬 전용 env가 절대 안 올라가게.

**20) [배포/개발] 코드 수정 후 재기동 안 하면 구버전 인스턴스가 응답**
- 증상: 새 로직(예: suffix 합치기)을 분명히 반영했는데 동작 안 함. API가 옛 동작 그대로.
- 원인: 실행 중인 백엔드(JVM)가 코드 변경 **이전에 기동된 인스턴스**라 새 클래스가 로드 안 됨. bootRun/jar 모두 재기동 필요.
- 해결: `systemctl restart formflow`(운영) 또는 bootRun 재시작(로컬). 검증 API 호출 전 반드시 재기동 확인.

**21) [API 설계] 부분 저장 + 공유 DTO에 nullable 필드 추가 → 데이터 유실**
- 증상: 제목만 저장했는데 마감일(`closes_at`)이 `null`로 지워짐.
- 원인: 빌더가 `update.mutate({ title })`처럼 **일부 필드만** 보내는데, 공유 `FormUpdateRequest`에 `closesAt`(nullable)을 추가하면 "안 보낸 것"과 "null로 지우려는 것"이 구분 안 됨 → 누락 = null로 덮어씀.
- 해결: 독립적으로 수정되는 메타(마감일 등)는 **공유 update에 넣지 말고 전용 엔드포인트**로 분리 (`PATCH /api/forms/{id}/closes-at`). create엔 포함 가능. 상세 §17 D-018.

### 16.4 용어 정의

| 용어 | 정의 |
|---|---|
| respondentKey | 비로그인 응답자 식별용 클라이언트 생성 UUID. localStorage 저장. |
| slug | 폼 공개 URL용 12자 nanoid. 추측 어렵게 충분한 엔트로피. |
| TokenHasher | refresh/email 토큰을 DB에 저장할 때 사용하는 SHA-256 해시 유틸. |
| Token Rotation | refresh 시 기존 토큰을 무효화하고 새 토큰 발급. 탈취 대응. |
| Soft Delete | `deleted_at` 컬럼만 채우고 row는 보존. |
| 익명화 | 식별 정보(이메일/IP/UA) NULL 또는 무작위로 치환, 분석용 통계는 유지. |
| closes_at | 마감 **예정** 시각(사용자 예약). AutoCloseFormJob이 도달 시 자동 마감. ↔ closed_at. |
| closed_at | **실제** 마감된 시각(기록). 배치 또는 수동 마감 시 기록. |
| suffix (접미사) | SHORT 필드 입력란 뒤 텍스트. fixed=고정 텍스트(서버 합침) / select=드롭다운 선택(프론트 합침). validation JSON 저장. |
| 발행 후 잠금 | 폼이 DRAFT가 아니면 필드 추가/수정/삭제/순서변경 금지(#9). 통계·응답 정합성 보장. 상태 전이 단방향(복귀 없음). |

---

## 17. 의사결정 로그

| ID | 결정 | 이유 | 변경 가능성 |
|---|---|---|---|
| D-001 | 인프라: NCP | 운영자 보유 환경 + 한국 리전 | 낮음 |
| D-002 | 도메인: form.sosyge.net | 운영자 보유 도메인 | 낮음 |
| D-003 | DB: MySQL 8 + MyBatis | 사용자 스택 선호 | 낮음 |
| D-004 | 캐시: Redis 필수 도입 | Rate Limit / 토큰 블랙리스트 | 낮음 |
| D-005 | 메일: NCP Cloud Outbound Mailer | 인프라 일관성 | 중 (SES 등으로 교체 용이) |
| D-006 | 모니터링: Sentry + NCP Cloud Insight | 무료 시작, 후속 확장 | 낮음 |
| D-007 | 약관 저장: MD 파일 | DB 부담 없음, 버전 관리 단순 | 중 |
| D-008 | 결제: 미도입 | MVP 단계는 무료 운영 | 높음 — Phase 4에서 도입 |
| D-009 | 인증: JWT (Access in memory + Refresh in HttpOnly Cookie) | XSS·CSRF 분리 방어 | 낮음 |
| D-010 | 비공개/마감/삭제/한도초과 → 동일한 404 응답 | 정보 유출 방지 | 낮음 |
| D-011 | `users.plan` 컬럼 미리 보유 | Phase 4 결제 도입 시 마이그레이션 부담 감소 | 낮음 |
| D-012 | Slug 12자 nanoid | URL 추측 방지 + 사용자 편의 (짧음) | 낮음 |
| D-013 | 단일 백엔드 인스턴스 시작 | 비용 최소화 | 트래픽 증가 시 LB + 멀티 인스턴스, ShedLock 도입 |
| D-014 | 약관 실제 법률 검토 | 골격만 제공, 오픈 전 검토 필요 | 필수 |
| D-015 | 중복 응답 방지: localStorage UUID(respondentKey) + DB UNIQUE(form_id, respondent_key) | 익명 설문 응답자에 로그인/이메일 인증은 과한 부담(이탈↑). 주민번호 등 고유식별정보는 개인정보보호법상 배제 | 중 — 엄격 1회 필요 시 "이메일 인증" 또는 "로그인 필수" 모드 폼별 옵션 추가 가능. 현재는 "선의의 실수 재제출 방지" 수준(시크릿창·다른기기·저장소삭제 우회 가능) |
| D-016 | 마감일 예약: `closes_at`(예정) 컬럼 신규 + AutoCloseFormJob 배치 | `closed_at`(실제)와 분리해 기존 로직 무변경. 배치가 예정 도달 시 실제 마감 처리. 정밀도 1분이면 충분 | 낮음 |
| D-017 | 발행 후 폼 구조 잠금: DRAFT만 필드 편집 (FieldService.verifyEditable) | 통계·CSV·응답 정합성 보장 + 응답자 공정성("발행=확정"). 상태 전이 DRAFT→PUBLISHED→CLOSED 단방향(복귀 없음) | 중 — 발행 후 수정 출구로 "폼 복제" 기능 추가 시 배너를 복제 버튼으로 연결 (현재는 "새 폼 만들기" 안내) |
| D-018 | 마감일 설정은 공유 update 아닌 전용 엔드포인트 `PATCH /{id}/closes-at` | 빌더가 부분 저장(`{title}`만 전송)하는 구조라, 공유 DTO에 nullable closesAt을 넣으면 제목만 저장 시 마감일이 null로 지워짐. 독립 메타는 전용 엔드포인트로 분리 | 낮음 |
| D-019 | 단답(SHORT) 접미사: fixed=서버 합침 / select=프론트 합침 (비대칭) | select는 선택값이 사용자 입력이라 프론트가 합쳐 단일 value로 전송(응답 구조 SubmitAnswer 무변경). fixed는 서버 applySuffix. validation JSON에 저장(스키마 무변경, suffixMode 없으면 1단계 호환) | 중 — 통계는 단답이라 분포 미산출(텍스트 샘플). select 분포 필요 시 별도 |

---

## 18. 미정 항목 (`[DECISION-NEEDED]`)

오픈 전 반드시 결정/입력해야 하는 항목:

- [ ] **운영 주체 정보**: 사업자명 / 대표자 / 사업장 주소 / 사업자등록번호 / 통신판매업 신고번호 (해당 시) — §1, §12
- [ ] **개인정보 보호책임자**: 이름, 직위, 이메일 — §12.4
- [ ] **고객 지원 이메일**: 현재 `support@sosyge.net` 가정 — 실제 운영 메일로 교체
- [ ] **약관 법률 검토**: §12.3, §12.4 골격을 변호사 검토 후 확정
- [ ] **NCP Cloud Outbound Mailer 발신 도메인 인증**: SPF/DKIM 설정
- [ ] **운영 관리자 계정**: §5.3 시드의 초기 비밀번호를 배포 직후 변경 + 실제 운영자 이메일로 교체
- [ ] **Sentry 알람 룰**: 임계값/수신자
- [ ] **NCP Cloud Insight 알람 룰**: CPU/Mem/Disk 임계 및 수신자
- [ ] **트래픽 예상치 / 비용 예산**: 응답 보관 정책(현재 365일) 조정 여부

---

## 19. 백로그 (미착수 / 향후)

직원 테스트 피드백 라운드(2026-06) 처리 후 남은 항목.

### 19.1 미착수 기능
| 항목 | 규모 | 메모 |
|---|---|---|
| **#4 날짜 기간** | 중상 | 새 필드 타입(`DATE_RANGE`) 또는 DATE에 validation 범위 모드. 응답 저장이 `{start,end}` 구조로 바뀜. **단일 기간 우선 권장, "여러 기간"은 과설계 위험** → 직원에게 단일/여러 확인 필요(다음 작업 설계 좌우) |
| **#10 조건부 이메일 발송** | 대(M급) | 특정 질문에 특정 답을 한 응답자에게만 메일 발송. 응답자 이메일 수집·발송 동의·발송 인프라·필터 UI 연계. 별도 마일스톤 |
| **M10 분기 질문 (조건부 skip logic)** | 대 | "학교 다니나요? 예→어느 학교?" 식 표시/숨김. 데이터모델(표시조건)+빌더 조건 UI+공개폼 실시간 표시·숨김+숨긴 필수필드 검증 제외+통계는 조건충족 응답만 분모. #9의 "응답마다 본 질문이 다름" 토대와 연결. 통계 ratio는 이미 `responded` 분모라 일부 대비됨 |
| **폼 복제** | 소~중 | `POST /api/forms/{id}/duplicate` — 폼+필드 깊은 복사로 새 DRAFT 생성. 발행 후 구조 잠금(#9)의 현실적 출구(복제→수정→재발행). 추가 시 빌더 잠금 배너를 "이 폼 복제하기" 버튼으로 연결 |

### 19.2 직원 피드백 처리 현황 (2026-06 라운드)
| # | 항목 | 상태 |
|---|---|---|
| 1 | 마감일 예약 | ✅ closes_at + AutoCloseFormJob (D-016) |
| 2 | 단답 뒤 고정/선택 텍스트 | ✅ suffix fixed/select (D-019) |
| 3 | 단답·장문 글자수 안내 | ✅ FieldRenderer validation 기반 안내문구 |
| 4 | 날짜 기간 | 🔲 백로그 19.1 |
| 5 | 엑셀 컬럼 밀림 | ✅ 버그 아님 — CsvExportService는 fieldId 매핑 정상. 응답ID 띄엄띄엄은 전역 auto_increment 정상 |
| 6 | 통계 CSV 다운로드 | ✅ 프론트 생성(선택형 분포만, BOM+RFC4180) |
| 7 | 대시보드 URL 복사 | ✅ 발행 폼 카드, origin+/f/slug 조립 |
| 8 | 중복 판단 기준 | ✅ 현 방식 유지 결정 (D-015) |
| 9 | 발행 후 질문 추가 정합성 | ✅ 발행 후 구조 잠금 (D-017) |
| 10 | 조건부 이메일 발송 | 🔲 백로그 19.1 |

---

**문서 종료.** 이 문서를 기준으로 Claude Code에게 마일스톤(§14) 단위로 작업을 의뢰하면 됩니다.
예: "M1 실행: §0~§5, §8, §10.5 까지 구현해줘."
