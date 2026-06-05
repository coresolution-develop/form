package net.sosyge.formflow.domain;

/**
 * 관리자 감사 액션 종류 (admin_audits.action, §5.2 / §10.2).
 * VARCHAR 컬럼에 {@code name()} 으로 저장된다.
 */
public enum AdminAction {
    USER_SUSPEND,
    USER_RESTORE,
    FORM_FORCE_CLOSE,
    REPORT_RESOLVE
}
