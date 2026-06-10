-- 마감 예정 시각(closes_at): 이 시각이 지나면 배치가 자동으로 PUBLISHED → CLOSED 처리.
-- closed_at(실제 마감 시각)과는 별개 컬럼.
ALTER TABLE forms ADD COLUMN closes_at DATETIME NULL COMMENT '마감 예정 시각' AFTER closed_at;

-- 배치 조회용 인덱스 (PUBLISHED + closes_at 도달 폼 탐색)
ALTER TABLE forms ADD KEY idx_forms_closes_at (status, closes_at);
