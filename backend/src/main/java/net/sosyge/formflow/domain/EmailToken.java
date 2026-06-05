package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** email_tokens 테이블 매핑. 이메일 인증/비밀번호 재설정을 purpose로 구분. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailToken {
    private Long id;
    private Long userId;
    private EmailTokenPurpose purpose;
    private String tokenHash;
    private LocalDateTime expiredAt;
    private LocalDateTime usedAt;
    private LocalDateTime createdAt;
}
