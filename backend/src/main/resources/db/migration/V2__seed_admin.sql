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
