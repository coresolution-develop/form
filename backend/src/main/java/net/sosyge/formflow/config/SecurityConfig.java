package net.sosyge.formflow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Spring Security 설정 — §6.6 정책.
 *
 * <p>M1 단계: permitAll / hasRole('ADMIN') / authenticated 경로를 분리한다.
 * JWT 검증 로직은 {@link JwtAuthenticationFilter}(현재 빈 껍데기)에서 M2에 구현하며,
 * 인증이 채워지지 않은 보호 경로는 §7.1 공통 포맷으로 401/403 응답한다.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 내부 ERROR/FORWARD 디스패치는 보안 재평가 대상에서 제외
                        // (예: 404가 /error로 forward될 때 권한 검사로 401이 되는 문제 방지)
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        // CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- permitAll (§6.6) ---
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/signup",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/verify-email",
                                "/api/auth/resend-verification",
                                "/api/auth/password-reset/request",
                                "/api/auth/password-reset/confirm").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/f/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/f/*/submit").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/f/*/report").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/terms/**").permitAll()
                        // 메서드 제한 없이 permitAll → 미지원 메서드는 보안(401)이 아닌 405로 surface
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // --- hasRole('ADMIN') (§6.6) ---
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // --- authenticated (그 외 모든 요청) ---
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                writeError(res, ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((req, res, e) ->
                                writeError(res, ErrorCode.FORBIDDEN))
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** 필터 단계의 인증/인가 실패를 §7.1 공통 실패 포맷(ApiResponse)으로 직렬화해 응답한다. */
    private void writeError(HttpServletResponse res, ErrorCode errorCode) throws IOException {
        res.setStatus(errorCode.getStatus().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiResponse<Void> body = ApiResponse.fail(errorCode.name(), errorCode.getDefaultMessage());
        objectMapper.writeValue(res.getWriter(), body);
    }
}
