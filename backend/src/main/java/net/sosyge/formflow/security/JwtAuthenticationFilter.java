package net.sosyge.formflow.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.domain.UserRole;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT 인증 필터.
 *
 * <p>Authorization: Bearer 토큰을 파싱·검증하여 SecurityContext를 채운다.
 * JTI가 Redis 블랙리스트(로그아웃)면 인증하지 않는다.
 * 토큰이 없거나 검증 실패해도 체인을 통과시키며, 보호 경로는 entryPoint가 401로 응답한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String BLACKLIST_PREFIX = "blacklist:";

    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                Claims claims = jwtProvider.parse(token);
                String jti = claims.getId();

                boolean blacklisted = jti != null
                        && Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + jti));

                if (!blacklisted) {
                    Long userId = Long.valueOf(claims.getSubject());
                    String email = claims.get("email", String.class);
                    String role = claims.get("role", String.class);
                    CustomUserDetails principal = CustomUserDetails.of(userId, email, UserRole.valueOf(role));

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception e) {
                // 검증 실패: 인증하지 않고 통과 (보호 경로는 401로 응답)
                log.debug("[JWT] authentication skipped: {}", e.getMessage());
            }
        }

        chain.doFilter(request, response);
    }
}
