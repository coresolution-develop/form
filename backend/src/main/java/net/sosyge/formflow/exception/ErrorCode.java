package net.sosyge.formflow.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 400
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값을 확인해주세요."),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 링크입니다."),
    PASSWORD_POLICY(HttpStatus.BAD_REQUEST, "비밀번호 정책을 만족하지 않습니다."),
    RECAPTCHA_FAILED(HttpStatus.BAD_REQUEST, "보안 검증에 실패했습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "이미 가입된 이메일입니다."),

    // 401
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "재로그인이 필요합니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.UNAUTHORIZED, "이메일 인증이 필요합니다."),

    // 403
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정입니다."),

    // 404
    NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없습니다."),
    FORM_NOT_AVAILABLE(HttpStatus.NOT_FOUND, "존재하지 않거나 응답할 수 없는 폼입니다."),

    // 409
    DUPLICATE_RESPONSE(HttpStatus.CONFLICT, "이미 응답한 폼입니다."),
    ILLEGAL_STATE(HttpStatus.CONFLICT, "현재 상태에서는 처리할 수 없습니다."),
    FORM_NOT_EDITABLE(HttpStatus.CONFLICT, "발행된 폼은 질문을 수정할 수 없습니다. 질문을 바꾸려면 새 폼을 만들어 주세요."),
    PLAN_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "플랜 한도를 초과했습니다."),

    // 429
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요."),

    // 500
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버에 일시적인 문제가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;
}
