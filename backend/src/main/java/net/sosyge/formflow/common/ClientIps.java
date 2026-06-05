package net.sosyge.formflow.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

/** 클라이언트 IP 추출 유틸 (X-Forwarded-For 첫 IP 우선, §10.1). */
public final class ClientIps {

    private ClientIps() {
    }

    /** X-Forwarded-For 헤더의 첫 IP, 없으면 remoteAddr. */
    public static String resolve(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
