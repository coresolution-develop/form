package net.sosyge.formflow.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.config.LimitsProperties;
import net.sosyge.formflow.mapper.ResponseMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 오래된 응답 익명화 배치 (§10.6, 매일 03:30 KST).
 * 보관기간(response-retention-days, 기본 365일) 지난 응답의 IP/UA만 NULL 처리.
 * value(response_items)는 통계 보존을 위해 유지한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OldResponseCleanupJob {

    private final ResponseMapper responseMapper;
    private final LimitsProperties limits;

    @Scheduled(cron = "${formflow.batch.response-cleanup-cron:0 30 3 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void run() {
        LocalDateTime before = LocalDateTime.now().minusDays(limits.getResponseRetentionDays());
        int anonymized = responseMapper.anonymizeOlderThan(before);
        log.info("[BATCH] OldResponseCleanup done: anonymized={} (retentionDays={})",
                anonymized, limits.getResponseRetentionDays());
    }
}
