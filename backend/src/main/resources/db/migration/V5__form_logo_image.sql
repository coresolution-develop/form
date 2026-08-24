-- 헤더 이미지 슬롯 분리: 배너와 로고를 동시에 노출할 수 있게 한다.
--   header_image_url = 배너 (상단 전체폭)
--   logo_image_url   = 로고 (제목 위 중앙 소형)
--
-- 기존 header_image_style='LOGO' 행은 로고 슬롯으로 이관해 공개 폼 화면이 그대로 유지되게 한다.
-- (이관하지 않으면 로고로 쓰던 이미지가 갑자기 전체폭 배너로 늘어난다.)
--
-- header_image_style 은 더 이상 읽지 않는다 — 슬롯별 표시 방식이 고정이라 토글이 필요 없어졌다.
-- 컬럼 자체는 롤백 대비로 남겨둔다. 이관 결과 확인 후 별도 마이그레이션으로 제거할 것.
ALTER TABLE forms
    ADD COLUMN logo_image_url VARCHAR(512) NULL COMMENT '로고 이미지 절대 URL(제목 위 중앙 소형)' AFTER header_image_url;

UPDATE forms
   SET logo_image_url   = header_image_url,
       header_image_url = NULL
 WHERE header_image_style = 'LOGO'
   AND header_image_url IS NOT NULL;
