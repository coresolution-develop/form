-- 폼 헤더 이미지: 계열사 로고/배너 등을 공개 폼 상단에 노출.
-- header_image_url = 업로드된 이미지의 절대 URL(NULL=이미지 없음)
-- header_image_style = 표시 방식 (LOGO=상단 중앙 소형, BANNER=상단 전체폭)
ALTER TABLE forms
    ADD COLUMN header_image_url   VARCHAR(512)             NULL COMMENT '헤더 이미지 절대 URL' AFTER description,
    ADD COLUMN header_image_style ENUM('LOGO','BANNER')    NULL COMMENT '헤더 이미지 표시 방식' AFTER header_image_url;
