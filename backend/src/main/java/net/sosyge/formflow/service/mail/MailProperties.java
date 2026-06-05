package net.sosyge.formflow.service.mail;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** formflow.mail.* 바인딩 (Spring Boot의 MailProperties와 구분되는 앱 전용 설정). */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "formflow.mail")
public class MailProperties {
    private String provider = "ncp";
    private String from = "no-reply@form.sosyge.net";
    private String fromName = "FormFlow";
    private Ncp ncp = new Ncp();

    /** NCP Cloud Outbound Mailer 자격 (§11.1). formflow.mail.ncp.* */
    @Getter
    @Setter
    public static class Ncp {
        private String accessKey = "";
        private String secretKey = "";
    }
}
