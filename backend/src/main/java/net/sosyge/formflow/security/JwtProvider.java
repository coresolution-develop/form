package net.sosyge.formflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.exception.InvalidTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * JWT 발급/검증 (§6.5).
 * Access 30분 / Refresh 7일, HS256. Access 클레임: sub(userId), email, role, jti, iat, exp.
 */
@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessExpirySeconds;
    private final long refreshExpirySeconds;

    public JwtProvider(
            @Value("${formflow.jwt.secret}") String secret,
            @Value("${formflow.jwt.access-expiry-seconds}") long accessExpirySeconds,
            @Value("${formflow.jwt.refresh-expiry-seconds}") long refreshExpirySeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirySeconds = accessExpirySeconds;
        this.refreshExpirySeconds = refreshExpirySeconds;
    }

    /** Access Token 발급. sub=userId, email/role 클레임 포함. */
    public String createAccess(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessExpirySeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** Refresh Token 발급. sub, jti, iat, exp (식별 정보 최소화). */
    public String createRefresh(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(refreshExpirySeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** 토큰 검증 후 Claims 반환. 만료/위조/형식 오류 시 InvalidTokenException. */
    public Claims parse(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidTokenException();
        }
    }

    /** parse 별칭 — 의미상 클레임 추출. */
    public Claims extractClaims(String token) {
        return parse(token);
    }

    public long getAccessExpirySeconds() {
        return accessExpirySeconds;
    }

    public long getRefreshExpirySeconds() {
        return refreshExpirySeconds;
    }
}
