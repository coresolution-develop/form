# ex/ Sheets Sync 운영 배포 — `form.sosyge.net/ex/` (CI 방식)

빌드는 GitHub Actions, 배포는 **이미 설치된 self-hosted 러너**가 한다. 서버엔 git도, 빌드도 필요 없다.
스택: NestJS + **MySQL(기존 재사용)** + Redis. Apache(httpd)가 `/ex/`를 `:9100`으로 프록시.

```
main push (ex/**) → [build: GitHub] npm ci + prisma generate + build → tar
                  → [deploy: self-hosted 러너] /opt/formflow-ex 배치 + npm ci --omit=dev
                                              + prisma migrate deploy + systemctl restart formflow-ex
```

## 1. 서버 1회 셋업 (사람이 한 번)
```bash
# Redis 설치 (OS 패키지매니저에 맞게)
dnf install -y redis && systemctl enable --now redis

# 기존 MySQL 에 ex 전용 DB
mysql -uroot -p -e "CREATE DATABASE sheetsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 앱 디렉토리 + 시크릿/설정 (CI는 코드만 덮고 이 파일들은 보존한다)
mkdir -p /opt/formflow-ex
#  → service-account.json 업로드: /opt/formflow-ex/service-account.json
#  → .env 작성: /opt/formflow-ex/.env  (아래 2번)

# systemd 유닛 (ExecStart node 경로 which node 로 확인)
cp /tmp/formflow-ex/deploy/formflow-ex.service /etc/systemd/system/  # 또는 레포에서 복사
systemctl daemon-reload && systemctl enable formflow-ex
```

## 2. 운영 `.env` (`/opt/formflow-ex/.env`)
```env
DATABASE_URL=mysql://<user>:<pass>@localhost:3306/sheetsync
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=9100
SHEET_ID=132VKtn47SVlLL5NPnM_w2lMKvNPvWQM-Y80WrnOq5hg
SHEET_TAB=시트1
GOOGLE_SA_KEY_PATH=./service-account.json
SHEET_WEBHOOK_SECRET=<로컬과 동일 값 또는 새 랜덤>
```

## 3. Apache 프록시 (form.sosyge.net vhost)
`deploy/apache-form-ex.conf` 를 form.sosyge.net 의 `<VirtualHost *:443>` 안에 추가:
```apache
ProxyPreserveHost On
RedirectMatch ^/ex$ /ex/
ProxyPass        /ex/ http://127.0.0.1:9100/
ProxyPassReverse /ex/ http://127.0.0.1:9100/
```
```bash
httpd -M | grep proxy   # mod_proxy, mod_proxy_http 확인
apachectl configtest && systemctl reload httpd
```

## 4. 배포
1·2·3이 끝나면 — `ex/` 를 건드린 커밋을 `main`에 push하면 **CI가 자동 배포**한다.
(첫 배포도 동일: push → build → 러너가 `/opt/formflow-ex` 에 배치 + migrate + restart)

## 5. Apps Script
`code.gs` 의 `WEBHOOK_URL` 을 운영 주소로:
```javascript
const WEBHOOK_URL = 'https://form.sosyge.net/ex/sync/sheet-webhook';
```

## 접속
**https://form.sosyge.net/ex/**
