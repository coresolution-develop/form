package net.sosyge.formflow.ratelimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** formflow.rate-limit.* 바인딩. 로컬은 enabled=false. */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "formflow.rate-limit")
public class RateLimitProperties {
    private boolean enabled = true;
}
