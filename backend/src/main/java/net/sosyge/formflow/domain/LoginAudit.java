package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** login_audits 테이블 매핑. 로그인 시도 기록. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAudit {
    private Long id;
    private String email;
    private Long userId;
    private boolean success;
    private String ip;
    private String userAgent;
    private String reason;
    private LocalDateTime createdAt;
}
