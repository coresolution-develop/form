# ex/ Sheets Sync 운영 배포 — `form.sosyge.net/ex/`

NestJS(ex/)를 운영 서버에 `:9100`으로 띄우고, **Apache(httpd)가 `/ex/`를 프록시**한다.
스택: NestJS + **MySQL(기존 재사용)** + Redis.

> 웹 UI는 상대경로로 호출하므로, Apache가 `/ex/`를 떼고 `:9100/`으로 넘기면 그대로 동작한다.

## 1. 서버 준비 (1회)
```bash
# Redis 설치 (OS 패키지매니저에 맞게 — CentOS/RHEL 예시)
sudo dnf install -y redis && sudo systemctl enable --now redis

# 기존 MySQL 에 ex 전용 DB 생성
mysql -uroot -p -e "CREATE DATABASE sheetsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 2. 코드 배포
```bash
sudo git clone https://github.com/coresolution-develop/form.git /opt/formflow-ex-src
cd /opt/formflow-ex-src/ex
npm ci
# service-account.json 업로드 → /opt/formflow-ex-src/ex/service-account.json
# .env 작성 (아래 3번)
npm run build
npx prisma migrate deploy   # MySQL 에 테이블 생성
```

## 3. 운영 `.env` (`/opt/formflow-ex-src/ex/.env`)
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

## 4. systemd
```bash
# deploy/formflow-ex.service 의 ExecStart node 경로 확인(which node) 후
sudo cp deploy/formflow-ex.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now formflow-ex
sudo systemctl status formflow-ex
curl -s localhost:9100/products    # [] 또는 목록이면 OK
```

## 5. Apache 프록시
`deploy/apache-form-ex.conf` 내용을 **form.sosyge.net 의 `<VirtualHost *:443>` 블록 안**에 추가:
```apache
ProxyPreserveHost On
RedirectMatch ^/ex$ /ex/
ProxyPass        /ex/ http://127.0.0.1:9100/
ProxyPassReverse /ex/ http://127.0.0.1:9100/
```
```bash
httpd -M | grep proxy                 # mod_proxy, mod_proxy_http 확인
sudo apachectl configtest && sudo systemctl reload httpd
```

## 6. Apps Script
`code.gs` 의 `WEBHOOK_URL` 을 운영 주소로 (임시 cloudflared 터널 불필요):
```javascript
const WEBHOOK_URL = 'https://form.sosyge.net/ex/sync/sheet-webhook';
```

## 접속
**https://form.sosyge.net/ex/**

## 갱신 배포 (이후)
```bash
cd /opt/formflow-ex-src && sudo git pull
cd ex && npm ci && npm run build && npx prisma migrate deploy
sudo systemctl restart formflow-ex
```
