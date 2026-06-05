package net.sosyge.formflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.FormField;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 응답 값 타입별 형식 검증 (§8.9 validateAnswers에서 위임).
 * required(필수) 여부는 PublicFormService가 선처리하고, 여기서는 값이 있을 때만 형식을 검증한다.
 *
 * @return 오류 메시지(검증 실패) 또는 null(통과)
 */
@Component
@RequiredArgsConstructor
public class FieldValidator {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE; // yyyy-MM-dd
    private static final TypeReference<List<String>> STR_LIST = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public String validate(FormField field, String value) {
        if (!StringUtils.hasText(value)) {
            return null; // 빈 값은 required 검사에서 처리
        }
        return switch (field.getType()) {
            case SHORT, LONG -> validateLength(field, value);
            case EMAIL -> EMAIL.matcher(value).matches() ? null : "이메일 형식이 올바르지 않습니다.";
            case NUMBER -> validateNumber(field, value);
            case DATE -> validateDate(value);
            case SINGLE -> options(field).contains(value) ? null : "선택할 수 없는 값입니다.";
            case MULTI -> validateMulti(field, value);
        };
    }

    private String validateLength(FormField field, String value) {
        Integer min = intValidation(field, "minLength");
        Integer max = intValidation(field, "maxLength");
        if (min != null && value.length() < min) return min + "자 이상 입력해주세요.";
        if (max != null && value.length() > max) return max + "자 이하로 입력해주세요.";
        return null;
    }

    private String validateNumber(FormField field, String value) {
        double num;
        try {
            num = Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return "숫자만 입력할 수 있습니다.";
        }
        Integer min = intValidation(field, "min");
        Integer max = intValidation(field, "max");
        if (min != null && num < min) return min + " 이상이어야 합니다.";
        if (max != null && num > max) return max + " 이하여야 합니다.";
        return null;
    }

    private String validateDate(String value) {
        try {
            LocalDate.parse(value.trim(), DATE);
            return null;
        } catch (DateTimeParseException e) {
            return "날짜 형식(YYYY-MM-DD)이 올바르지 않습니다.";
        }
    }

    private String validateMulti(FormField field, String value) {
        List<String> selected = parseMulti(value);
        List<String> opts = options(field);
        for (String s : selected) {
            if (!opts.contains(s)) {
                return "선택할 수 없는 값입니다.";
            }
        }
        return null;
    }

    private List<String> parseMulti(String value) {
        String v = value.trim();
        if (v.startsWith("[")) {
            try {
                return objectMapper.readValue(v, STR_LIST);
            } catch (Exception ignored) {
                // fall through to comma split
            }
        }
        return List.of(v.split("\\s*,\\s*"));
    }

    private List<String> options(FormField field) {
        return field.getOptions() == null ? List.of() : field.getOptions();
    }

    private Integer intValidation(FormField field, String key) {
        if (field.getValidation() == null) return null;
        Object raw = field.getValidation().get(key);
        return (raw instanceof Number n) ? n.intValue() : null;
    }
}
