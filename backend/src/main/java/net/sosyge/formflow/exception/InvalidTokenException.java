package net.sosyge.formflow.exception;

/** 토큰 만료/위조/형식 오류. 400 INVALID_TOKEN 으로 매핑. */
public class InvalidTokenException extends BusinessException {

    public InvalidTokenException() {
        super(ErrorCode.INVALID_TOKEN);
    }

    public InvalidTokenException(String message) {
        super(ErrorCode.INVALID_TOKEN, message);
    }
}
