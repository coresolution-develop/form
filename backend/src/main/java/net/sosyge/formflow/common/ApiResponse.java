package net.sosyge.formflow.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String code;
    private final String message;
    private final Object details;

    private ApiResponse(boolean success, T data, String code, String message, Object details) {
        this.success = success;
        this.data = data;
        this.code = code;
        this.message = message;
        this.details = details;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null, null, null);
    }

    public static ApiResponse<Void> fail(String code, String message) {
        return new ApiResponse<>(false, null, code, message, null);
    }

    public static ApiResponse<Void> fail(String code, String message, Object details) {
        return new ApiResponse<>(false, null, code, message, details);
    }
}
