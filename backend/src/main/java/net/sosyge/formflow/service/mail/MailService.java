package net.sosyge.formflow.service.mail;

/** 메일 발송 인터페이스. 프로필에 따라 SmtpMailService(local)/NcpMailService(운영)가 구현. */
public interface MailService {

    void send(String to, String subject, String htmlBody);
}
