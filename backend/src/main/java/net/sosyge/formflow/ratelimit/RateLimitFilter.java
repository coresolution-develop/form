package net.sosyge.formflow.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Rate Limit 필터 (§6.7) — nginx 1차 방어 뒤 백엔드 2차.
 * formflow.rate-limit.enabled=false(로컬)이면 통과. 초과 시 429 + Retry-After + ApiResponse(RATE_LIMITED).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties props;
    private final RateLimitPolicy policy;
    private final BucketRegistry registry;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        if (!props.isEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        Optional<RateLimitPolicy.Resolved> resolved = policy.resolve(request);
        if (resolved.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }

        RateLimitPolicy.Resolved r = resolved.get();
        Bucket bucket = registry.resolve(r.key(), r.bandwidth());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            chain.doFilter(request, response);
        } else {
            long retryAfterSeconds = Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds();
            writeTooManyRequests(response, retryAfterSeconds);
        }
    }

    private void writeTooManyRequests(HttpServletResponse res, long retryAfterSeconds) throws IOException {
        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        res.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(Math.max(1, retryAfterSeconds)));
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiResponse<Void> body = ApiResponse.fail(
                ErrorCode.RATE_LIMITED.name(), ErrorCode.RATE_LIMITED.getDefaultMessage());
        objectMapper.writeValue(res.getWriter(), body);
    }
}
