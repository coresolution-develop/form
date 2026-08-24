-- 선착순 수량 제한.
--   quota_total    = 총 수량 (NULL = 선착순 미사용)
--   quota_field_id = 차감 기준이 되는 NUMBER 필드 (예: '매수')
--   quota_used     = 지금까지 소진된 수량 (응답의 수량 필드 값 합계)
--
-- quota_used 를 비정규화해 들고 있는 이유:
-- 제출마다 response_items 를 SUM 하면 응답이 쌓일수록 느려지고, 무엇보다
-- '읽고 → 판단하고 → 넣는' 사이에 다른 제출이 끼어들 틈이 생긴다.
-- 선착순은 정확히 그 순간에 요청이 몰리므로, 폼 행을 잠그고 카운터를 올리는 방식으로 처리한다.
--
-- 필드가 삭제되면 quota_field_id 는 NULL 이 된다. 이때 quota_total 만 남아 설정이 반쪽이 되는데,
-- 서비스단에서는 이를 '설정 오류'로 보고 제출을 막는다(수량 제한이 조용히 풀리는 것보다 안전).
ALTER TABLE forms
    ADD COLUMN quota_total    INT    NULL     COMMENT '선착순 총 수량(NULL=미사용)'      AFTER response_limit,
    ADD COLUMN quota_field_id BIGINT NULL     COMMENT '수량 차감 기준 NUMBER 필드'        AFTER quota_total,
    ADD COLUMN quota_used     INT    NOT NULL DEFAULT 0 COMMENT '소진 수량(수량 필드 합계)' AFTER quota_field_id,
    ADD CONSTRAINT fk_forms_quota_field FOREIGN KEY (quota_field_id)
        REFERENCES form_fields (id) ON DELETE SET NULL;
