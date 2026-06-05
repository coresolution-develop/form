package net.sosyge.formflow.ratelimit;

import io.github.bucket4j.Bandwidth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 경로별 Rate Limit 정책 매핑 (§6.7).
 *
 * <p>필터 단계에서 식별 가능한 IP / IP+slug 차원만 적용한다.
 * email / userId 차원(로그인 email, resend userId 등)은 본문/인증 의존이라 서비스 계층에서 다룬다(추후).
 */
@Component
public class RateLimitPolicy {

    private static final Pattern SUBMIT = Pattern.compile("^/api/f/([^/]+)/submit$");
    private static final Pattern REPORT = Pattern.compile("^/api/f/([^/]+)/report$");

    /** 매칭된 정책과 그 키. */
    public record Resolved(String name, String key, Bandwidth bandwidth) {}

    public Optional<Resolved> resolve(HttpServletRequest req) {
        String method = req.getMethod();
        String uri = req.getRequestURI();
        String ip = clientIp(req);

        if ("POST".equals(method)) {
            if (uri.equals("/api/auth/signup")) {
                return Optional.of(new Resolved("signup-ip", "rl:signup:ip:" + ip,
                        bandwidth(5, Duration.ofHours(1))));
            }
            if (uri.equals("/api/auth/login")) {
                return Optional.of(new Resolved("login-ip", "rl:login:ip:" + ip,
                        bandwidth(30, Duration.ofMinutes(10))));
            }
            if (uri.equals("/api/auth/password-reset/request")) {
                return Optional.of(new Resolved("pwreset-ip", "rl:pwreset:ip:" + ip,
                        bandwidth(10, Duration.ofHours(1))));
            }
            Matcher submit = SUBMIT.matcher(uri);
            if (submit.matches()) {
                String slug = submit.group(1);
                return Optional.of(new Resolved("submit-ip-slug", "rl:submit:" + ip + ":" + slug,
                        bandwidth(30, Duration.ofHours(1))));
            }
            Matcher report = REPORT.matcher(uri);
            if (report.matches()) {
                String slug = report.group(1);
                return Optional.of(new Resolved("report-ip-slug", "rl:report:" + ip + ":" + slug,
                        bandwidth(5, Duration.ofDays(1))));
            }
        }
        return Optional.empty();
    }

    private static Bandwidth bandwidth(long capacity, Duration period) {
        return Bandwidth.builder().capacity(capacity).refillGreedy(capacity, period).build();
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
