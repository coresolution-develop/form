package net.sosyge.formflow.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.mapper.EmailTokenMapper;
import net.sosyge.formflow.mapper.RefreshTokenMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 만료 토큰 정리 배치 (§10.6, 매일 03:00 KST).
 * refresh_tokens/email_tokens 중 만료됐거나 revoke/사용 후 30일 지난 행 DELETE.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpiredTokenCleanupJob {

    private static final int GRACE_DAYS = 30;

    private final RefreshTokenMapper refreshTokenMapper;
    private final EmailTokenMapper emailTokenMapper;

    @Scheduled(cron = "${formflow.batch.token-cleanup-cron:0 0 3 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void run() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime graceBefore = now.minusDays(GRACE_DAYS);
        int refreshDeleted = refreshTokenMapper.deleteExpiredOrRevoked(now, graceBefore);
        int emailDeleted = emailTokenMapper.deleteExpiredOrUsed(now, graceBefore);
        log.info("[BATCH] ExpiredTokenCleanup done: refresh_tokens={}, email_tokens={}",
                refreshDeleted, emailDeleted);
    }
}
