package net.sosyge.formflow.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * refreshToken 쿠키 생성/삭제 (§6.5 / §3-A.9).
 * 로컬: Secure=false, SameSite=Lax, Domain 없음. 운영: Secure=true, SameSite=Strict, Domain=.form.sosyge.net.
 */
@Component
public class CookieUtil {

    public static final String REFRESH_COOKIE = "refreshToken";
    private static final String PATH = "/api/auth";

    private final String domain;
    private final boolean secure;
    private final String sameSite;
    private final long maxAgeSeconds;

    public CookieUtil(
            @Value("${formflow.cookie.domain:}") String domain,
            @Value("${formflow.cookie.secure:true}") boolean secure,
            @Value("${formflow.cookie.same-site:Strict}") String sameSite,
            @Value("${formflow.jwt.refresh-expiry-seconds}") long maxAgeSeconds) {
        this.domain = domain;
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAgeSeconds = maxAgeSeconds;
    }

    /** refreshToken 설정 쿠키. */
    public ResponseCookie create(String refreshToken) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(PATH)
                .maxAge(Duration.ofSeconds(maxAgeSeconds));
        if (StringUtils.hasText(domain)) {
            builder.domain(domain);
        }
        return builder.build();
    }

    /** refreshToken 삭제 쿠키 (Max-Age=0). */
    public ResponseCookie clear() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(PATH)
                .maxAge(0);
        if (StringUtils.hasText(domain)) {
            builder.domain(domain);
        }
        return builder.build();
    }
}
