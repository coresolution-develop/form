package net.sosyge.formflow.common;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * 공개 폼 URL용 12자 nanoid 생성기 (§16.4).
 * URL-safe 문자만 사용해 추측이 어렵도록 충분한 엔트로피를 제공한다.
 */
@Component
public class SlugGenerator {

    /** URL-safe 알파벳 (혼동 방지를 위해 일반적인 nanoid 문자셋 사용) */
    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();

    private static final int LENGTH = 12;

    private final SecureRandom random = new SecureRandom();

    /** 12자 slug를 생성한다. */
    public String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
