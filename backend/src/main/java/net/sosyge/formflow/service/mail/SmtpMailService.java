package net.sosyge.formflow.service.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * SMTP 발송 (로컬: MailHog). {@code formflow.mail.provider=smtp} 또는 미설정 시 활성 (§8.8).
 * 운영(ncp)은 {@link NcpMailService}가 담당하며 두 빈은 동시에 뜨지 않는다.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "formflow.mail.provider", havingValue = "smtp", matchIfMissing = true)
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private final JavaMailSender mailSender;
    private final MailProperties props;

    @Override
    @Async("mailExecutor")
    public void send(String to, String subject, String htmlBody) {
        MimeMessage msg = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(props.getFrom(), props.getFromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("[MAIL][SMTP] sent to={} subject={}", to, subject);
        } catch (Exception e) {
            log.error("[MAIL][SMTP] send failed to={} subject={}", to, subject, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "메일 발송에 실패했습니다.");
        }
    }
}
