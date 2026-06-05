package net.sosyge.formflow.common;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * refresh / email 토큰을 DB에 저장할 때 사용하는 SHA-256 해시 유틸 (§16.4).
 * 평문 토큰은 저장하지 않고, 64자 hex 해시(token_hash CHAR(64))만 보관한다.
 */
@Component
public class TokenHasher {

    /** 토큰 평문을 SHA-256 64자 hex 문자열로 변환한다. */
    public String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
