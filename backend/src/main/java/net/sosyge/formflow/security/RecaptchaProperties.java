package net.sosyge.formflow.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** formflow.recaptcha.* 바인딩. 로컬은 enabled=false 로 검증 우회. */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "formflow.recaptcha")
public class RecaptchaProperties {
    private boolean enabled = true;
    private String secret;
    private double threshold = 0.5;
    private double submitThreshold = 0.3;
}
