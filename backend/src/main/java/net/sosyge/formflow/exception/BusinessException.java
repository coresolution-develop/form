package net.sosyge.formflow.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Object details;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessException(ErrorCode errorCode, String message, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
