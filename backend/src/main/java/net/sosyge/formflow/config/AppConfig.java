package net.sosyge.formflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

/** 공용 빈 등록 (비밀번호 인코더, 외부 HTTP 호출용 RestTemplate). */
@Configuration
public class AppConfig {

    /** bcrypt cost 12 (§6.10). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /** reCAPTCHA/NCP 등 외부 API 호출용. */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
