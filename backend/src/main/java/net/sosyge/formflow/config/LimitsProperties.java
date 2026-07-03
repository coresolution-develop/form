package net.sosyge.formflow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** formflow.limits.* — 무료 플랜 한도 (§5.6). */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "formflow.limits")
public class LimitsProperties {
    private int formsPerUser = 10;
    private int fieldsPerForm = 30;
    // null = 무제한(폼 생성 시 response_limit NULL). 값을 지정하면 새 폼의 기본 응답 한도가 된다.
    private Integer responsesPerForm = null;
    private int responseRetentionDays = 365;
}
