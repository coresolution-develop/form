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
  closed_at      DATETIME     NULL,
  deleted_at     DATETIME     NULL COMMENT 'Soft delete',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_forms_slug (slug),
  KEY idx_forms_user_id (user_id, deleted_at),
  KEY idx_forms_status (status, deleted_at),
  CONSTRAINT fk_forms_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  validation  JSON         NULL COMMENT '{"minLength":1,"maxLength":500} 등',
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
  value       TEXT,
  PRIMARY KEY (id),
  KEY idx_items_response_id (response_id),
  KEY idx_items_field_id (field_id),
  CONSTRAINT fk_items_response FOREIGN KEY (response_id) REFERENCES responses (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_field    FOREIGN KEY (field_id)    REFERENCES form_fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
