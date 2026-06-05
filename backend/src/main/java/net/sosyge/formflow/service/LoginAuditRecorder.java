package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.LoginAudit;
import net.sosyge.formflow.mapper.LoginAuditMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 로그인 시도 감사 기록.
 * 실패 로그인은 본 트랜잭션이 롤백되어도 기록이 남아야 하므로 REQUIRES_NEW로 독립 커밋한다.
 */
@Service
@RequiredArgsConstructor
public class LoginAuditRecorder {

    private final LoginAuditMapper loginAuditMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String email, Long userId, boolean success, String ip, String userAgent, String reason) {
        loginAuditMapper.insert(LoginAudit.builder()
                .email(email)
                .userId(userId)
                .success(success)
                .ip(ip)
                .userAgent(userAgent)
                .reason(reason)
                .build());
    }
}
