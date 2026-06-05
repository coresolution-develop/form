package net.sosyge.formflow.service.mail;

/** 트랜잭션 커밋 후 발송할 메일 이벤트 (§8.6 — 트랜잭션 외부에서 메일 발송). */
public record MailMessageEvent(String to, String subject, String html) {}
