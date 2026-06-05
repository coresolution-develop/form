package net.sosyge.formflow.common;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * 이메일 인증/비밀번호 재설정용 평문 토큰 생성기.
 * URL-safe Base64로 인코딩된 32바이트 난수 (메일 링크에 그대로 사용).
 */
@Component
public class TokenGenerator {

    private final SecureRandom random = new SecureRandom();

    public String generate() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
