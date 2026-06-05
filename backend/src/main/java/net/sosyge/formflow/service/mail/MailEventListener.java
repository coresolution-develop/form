package net.sosyge.formflow.service.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 트랜잭션 커밋 이후 메일을 발송한다 (§8.6).
 * mailService.send 가 @Async 이므로 요청 스레드를 막지 않는다.
 */
@Component
@RequiredArgsConstructor
public class MailEventListener {

    private final MailService mailService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMailMessage(MailMessageEvent event) {
        mailService.send(event.to(), event.subject(), event.html());
    }
}
