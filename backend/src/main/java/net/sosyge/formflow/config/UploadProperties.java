package net.sosyge.formflow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** formflow.upload.* — 업로드 파일 저장(파일시스템) 설정. */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "formflow.upload")
public class UploadProperties {
    /** 저장 디렉토리. 배포로 지워지지 않는 경로여야 함(예: /opt/formflow/uploads). */
    private String dir = "./uploads";
    /** 이미지 최대 크기(바이트). 기본 2MB. */
    private long maxSizeBytes = 2L * 1024 * 1024;
}
