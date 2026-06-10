package net.sosyge.formflow.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.mapper.FormMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 마감 예정 시각(closes_at) 도달한 PUBLISHED 폼을 자동 마감 (#1, 매 분 KST).
 * status=CLOSED + closed_at=now. closes_at 미설정 폼은 영향 없음(무기한).
 * 단일 인스턴스 가정 (ShedLock은 M9 이후, 기존 배치와 동일 정책).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AutoCloseFormJob {

    private final FormMapper formMapper;

    @Scheduled(cron = "${formflow.batch.auto-close-cron:0 * * * * *}", zone = "Asia/Seoul")
    @Transactional
    public void run() {
        LocalDateTime now = LocalDateTime.now();
        List<Long> expired = formMapper.findExpiredPublished(now);
        if (expired.isEmpty()) {
            return;
        }
        for (Long formId : expired) {
            formMapper.updateStatus(formId, FormStatus.CLOSED, now);
        }
        log.info("[BATCH] AutoCloseForm done: closed={} ids={}", expired.size(), expired);
    }
}
