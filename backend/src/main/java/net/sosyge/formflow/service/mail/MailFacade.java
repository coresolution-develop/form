package net.sosyge.formflow.service.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 회원가입/비밀번호 재설정 메일 유스케이스.
 * 메일 html을 구성한 뒤 {@link MailMessageEvent}를 발행 → 트랜잭션 커밋 후 발송된다.
 */
@Component
@RequiredArgsConstructor
public class MailFacade {

    private final MailTemplate template;
    private final ApplicationEventPublisher publisher;

    @Value("${formflow.app.front-url}")
    private String frontUrl;

    /** 이메일 인증 메일 (§6.1, 링크: /verify?token=). */
    public void sendVerifyEmail(String to, String nickname, String rawToken) {
        String link = frontUrl + "/verify?token=" + rawToken;
        String html = template.load("verify-email", Map.of("nickname", nickname, "link", link));
        publisher.publishEvent(new MailMessageEvent(to, "FormFlow 이메일 인증", html));
    }

    /** 비밀번호 재설정 메일 (§6.4, 링크: /password-reset?token=). */
    public void sendPasswordReset(String to, String nickname, String rawToken) {
        String link = frontUrl + "/password-reset?token=" + rawToken;
        String html = template.load("password-reset", Map.of("nickname", nickname, "link", link));
        publisher.publishEvent(new MailMessageEvent(to, "FormFlow 비밀번호 재설정", html));
    }

    /** 계정 정지 통보 (§10.2). */
    public void sendAccountSuspended(String to, String nickname, String reason) {
        String html = template.load("account-suspended",
                Map.of("nickname", nickname, "reason", reason == null ? "" : reason));
        publisher.publishEvent(new MailMessageEvent(to, "FormFlow 계정 이용 정지 안내", html));
    }

    /** 계정 복원 통보 (§10.2). */
    public void sendAccountRestored(String to, String nickname) {
        String html = template.load("account-restored", Map.of("nickname", nickname));
        publisher.publishEvent(new MailMessageEvent(to, "FormFlow 계정 이용 재개 안내", html));
    }

    /** 폼 강제 마감 통보 (§10.2). */
    public void sendFormForceClosed(String to, String nickname, String formTitle, String reason) {
        String html = template.load("form-force-closed", Map.of(
                "nickname", nickname,
                "formTitle", formTitle == null ? "" : formTitle,
                "reason", reason == null ? "" : reason));
        publisher.publishEvent(new MailMessageEvent(to, "FormFlow 폼 강제 마감 안내", html));
    }
}
