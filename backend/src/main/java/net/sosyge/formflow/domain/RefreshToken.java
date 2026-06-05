package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** refresh_tokens 테이블 매핑. token_hash = SHA-256(평문), 평문 미저장. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {
    private Long id;
    private Long userId;
    private String tokenHash;
    private String userAgent;
    private String ip;
    private LocalDateTime expiredAt;
    private LocalDateTime revokedAt;
    private LocalDateTime createdAt;
}
