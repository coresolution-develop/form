package net.sosyge.formflow.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.UserMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 탈퇴 사용자 익명화 배치 (§10.6, 매일 04:00 KST).
 * status=DELETED 이고 30일 지난 사용자의 이메일/닉네임/비밀번호를 익명화하고
 * 해당 사용자의 폼을 soft delete 한다. (이메일 UNIQUE 충돌 방지: deleted_{id} 형식)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeletedUserAnonymizeJob {

    private static final int GRACE_DAYS = 30;

    private final UserMapper userMapper;
    private final FormMapper formMapper;

    @Scheduled(cron = "${formflow.batch.user-anonymize-cron:0 0 4 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void run() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime before = now.minusDays(GRACE_DAYS);
        List<Long> targets = userMapper.findDeletedToAnonymize(before);
        int forms = 0;
        for (Long id : targets) {
            userMapper.anonymize(id, "deleted_" + id + "@anonymized.local", "탈퇴회원");
            forms += formMapper.softDeleteByUserId(id, now);
        }
        log.info("[BATCH] DeletedUserAnonymize done: users={}, forms_soft_deleted={}",
                targets.size(), forms);
    }
}
