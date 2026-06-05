package net.sosyge.formflow.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 요청 로깅 필터 — §6.12 민감 데이터 마스킹.
 *
 * <ul>
 *   <li>헤더: {@code Authorization}, {@code Cookie} → {@code ***}</li>
 *   <li>바디 JSON 키: {@code password}, {@code token}, {@code accessToken}, {@code refreshToken} → {@code ***}</li>
 * </ul>
 *
 * <p>{@link RequestIdFilter}(HIGHEST_PRECEDENCE) 바로 뒤, Security 필터보다 앞에서 동작한다.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class LoggingFilter extends OncePerRequestFilter {

    private static final String MASKED = "***";

    /** 소문자 비교용 마스킹 대상 헤더 */
    private static final Set<String> MASK_HEADERS = Set.of("authorization", "cookie");

    /** 마스킹 대상 바디 JSON 키 */
    private static final List<String> MASK_FIELDS =
            List.of("password", "token", "accessToken", "refreshToken");

    /** "key":"value" → "key":"***" 로 치환하는 패턴 모음 */
    private static final List<Pattern> FIELD_PATTERNS = MASK_FIELDS.stream()
            .map(f -> Pattern.compile("(\"" + Pattern.quote(f) + "\"\\s*:\\s*)\"(.*?)\"",
                    Pattern.CASE_INSENSITIVE))
            .collect(Collectors.toList());

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        ContentCachingRequestWrapper wrapped = new ContentCachingRequestWrapper(req);

        log.info("[REQ] {} {} headers={}", req.getMethod(), req.getRequestURI(), maskedHeaders(req));

        try {
            chain.doFilter(wrapped, res);
        } finally {
            String body = new String(wrapped.getContentAsByteArray(), StandardCharsets.UTF_8);
            if (StringUtils.hasText(body)) {
                log.debug("[REQ-BODY] {} {} body={}", req.getMethod(), req.getRequestURI(), maskBody(body));
            }
        }
    }

    /** 헤더명을 순회하며 민감 헤더 값을 마스킹한 문자열을 만든다. */
    private String maskedHeaders(HttpServletRequest req) {
        return Collections.list(req.getHeaderNames()).stream()
                .map(name -> {
                    String value = MASK_HEADERS.contains(name.toLowerCase()) ? MASKED : req.getHeader(name);
                    return name + "=" + value;
                })
                .collect(Collectors.joining(", ", "{", "}"));
    }

    /** 바디 내 민감 JSON 키의 값을 마스킹한다. */
    private String maskBody(String body) {
        String result = body;
        for (Pattern p : FIELD_PATTERNS) {
            result = p.matcher(result).replaceAll("$1\"" + MASKED + "\"");
        }
        return result;
    }
}
