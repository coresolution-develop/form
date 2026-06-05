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
    private int responsesPerForm = 100;
    private int responseRetentionDays = 365;
}
