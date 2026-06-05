package net.sosyge.formflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 설정 — 인터셉터 등록 지점.
 *
 * <p><b>필터 등록 정책:</b> {@link net.sosyge.formflow.common.RequestIdFilter}와
 * {@link net.sosyge.formflow.common.LoggingFilter}는 {@code @Component} + {@code @Order}로
 * Spring Boot가 서블릿 필터로 자동 등록한다(둘 다 {@code HIGHEST_PRECEDENCE}대 → Security 필터(-100)보다 앞).
 * 여기서 {@code FilterRegistrationBean}으로 다시 등록하면 필터가 이중 실행되므로 등록하지 않는다.
 *
 * <p>인터셉터는 M2 이후(예: 약관 재동의 체크 등) 필요 시 {@link #addInterceptors}에 추가한다.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // M1: 등록할 인터셉터 없음. M2 이후 추가 예정.
    }
}
