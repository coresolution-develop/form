package net.sosyge.formflow.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.ClientIps;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 관리자 IP 화이트리스트 (§10.1).
 * {@code formflow.admin.allowed-ips} 가 비어 있으면 미적용(로컬 기본).
 * 비어 있지 않으면 {@code /api/admin/**} 요청의 X-Forwarded-For 첫 IP가 목록에 없을 때
 * 관리자 페이지 존재 자체를 숨기기 위해 404 를 반환한다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class AdminIpFilter extends OncePerRequestFilter {

    private static final String ADMIN_PREFIX = "/api/admin/";

    private final Set<String> allowedIps;
    private final ObjectMapper objectMapper;

    public AdminIpFilter(@Value("${formflow.admin.allowed-ips:}") String allowedIpsCsv,
                         ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.allowedIps = StringUtils.hasText(allowedIpsCsv)
                ? Arrays.stream(allowedIpsCsv.split(","))
                        .map(String::trim)
                        .filter(StringUtils::hasText)
                        .collect(Collectors.toUnmodifiableSet())
                : Set.of();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        // 화이트리스트 미설정 → 검사 미적용
        if (allowedIps.isEmpty() || !req.getRequestURI().startsWith(ADMIN_PREFIX)) {
            chain.doFilter(req, res);
            return;
        }

        String ip = ClientIps.resolve(req);
        if (ip != null && allowedIps.contains(ip)) {
            chain.doFilter(req, res);
            return;
        }

        // 존재 은닉: 404
        res.setStatus(HttpServletResponse.SC_NOT_FOUND);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiResponse<Void> body = ApiResponse.fail(
                ErrorCode.NOT_FOUND.name(), ErrorCode.NOT_FOUND.getDefaultMessage());
        objectMapper.writeValue(res.getWriter(), body);
    }
}
