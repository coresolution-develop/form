package net.sosyge.formflow.exception;

import io.sentry.Sentry;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e, HttpServletRequest req) {
        log.warn("[BUSINESS] {} {} - code={} message={}",
                req.getMethod(), req.getRequestURI(), e.getErrorCode(), e.getMessage());
        return ResponseEntity.status(e.getErrorCode().getStatus())
                .body(e.getDetails() == null
                        ? ApiResponse.fail(e.getErrorCode().name(), e.getMessage())
                        : ApiResponse.fail(e.getErrorCode().name(), e.getMessage(), e.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e, HttpServletRequest req) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        log.warn("[VALIDATION] {} {} - fields={}", req.getMethod(), req.getRequestURI(), fieldErrors);
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ErrorCode.VALIDATION_ERROR.name(),
                        ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                        Map.of("fieldErrors", fieldErrors)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e, HttpServletRequest req) {
        log.warn("[BAD_REQUEST] {} {} - {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(), e.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuth(AuthenticationException e, HttpServletRequest req) {
        log.info("[UNAUTHORIZED] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getStatus())
                .body(ApiResponse.fail(ErrorCode.UNAUTHORIZED.name(), ErrorCode.UNAUTHORIZED.getDefaultMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException e, HttpServletRequest req) {
        log.warn("[FORBIDDEN] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.FORBIDDEN.getStatus())
                .body(ApiResponse.fail(ErrorCode.FORBIDDEN.name(), ErrorCode.FORBIDDEN.getDefaultMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException e, HttpServletRequest req) {
        log.info("[NOT_FOUND] {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.NOT_FOUND.getStatus())
                .body(ApiResponse.fail(ErrorCode.NOT_FOUND.name(), ErrorCode.NOT_FOUND.getDefaultMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotReadable(HttpMessageNotReadableException e, HttpServletRequest req) {
        log.warn("[BAD_REQUEST] {} {} - malformed body", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(ErrorCode.BAD_REQUEST.getStatus())
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(), "요청 본문 형식이 올바르지 않습니다."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e, HttpServletRequest req) {
        log.info("[METHOD_NOT_ALLOWED] {} {}", req.getMethod(), req.getRequestURI());
        // ErrorCode enum에는 405가 없으므로 HttpStatus는 직접 지정, code는 BAD_REQUEST 재사용
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST.name(), "허용되지 않은 HTTP 메서드입니다."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAll(Exception e, HttpServletRequest req) {
        log.error("[INTERNAL_ERROR] {} {} - {}", req.getMethod(), req.getRequestURI(), e.getMessage(), e);
        // 500만 Sentry 전송 (4xx/비즈니스 예외는 노이즈라 제외). DSN 미설정 시 no-op.
        Sentry.captureException(e);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getStatus())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR.name(), ErrorCode.INTERNAL_ERROR.getDefaultMessage()));
    }
}
