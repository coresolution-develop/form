package net.sosyge.formflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.FieldType;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.FormReport;
import net.sosyge.formflow.domain.ReportStatus;
import net.sosyge.formflow.domain.Response;
import net.sosyge.formflow.domain.ResponseItem;
import net.sosyge.formflow.dto.request.publicform.ReportFormRequest;
import net.sosyge.formflow.dto.request.publicform.SubmitRequest;
import net.sosyge.formflow.dto.response.publicform.PublicFormResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.FormReportMapper;
import net.sosyge.formflow.mapper.ResponseItemMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import net.sosyge.formflow.security.RecaptchaProperties;
import net.sosyge.formflow.security.RecaptchaVerifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicFormService {

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final FormReportMapper formReportMapper;
    private final RecaptchaVerifier recaptchaVerifier;
    private final RecaptchaProperties recaptchaProperties;
    private final FieldValidator fieldValidator;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PublicFormResponse getPublicForm(String slug) {
        Form form = loadAvailableForm(slug);
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(form.getId());
        return PublicFormResponse.of(form, fields);
    }

    @Transactional
    public void submit(String slug, SubmitRequest req, String recaptchaToken, String ip, String userAgent) {
        recaptchaVerifier.verify(recaptchaToken, "submit", recaptchaProperties.getSubmitThreshold());

        Form form = loadAvailableForm(slug);
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(form.getId());
        Map<Long, String> answerMap = req.answers().stream()
                .filter(a -> a.fieldId() != null)
                .collect(Collectors.toMap(SubmitRequest.Answer::fieldId, a -> a.value() == null ? "" : a.value(),
                        (a, b) -> a));
        validateAnswers(fields, answerMap);

        Response response = Response.builder()
                .formId(form.getId())
                .respondentKey(req.respondentKey())
                .ip(ip)
                .userAgent(truncate(userAgent, 255))
                .build();
        try {
            responseMapper.insert(response);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESPONSE);
        }

        Map<Long, FormField> fieldById = fields.stream()
                .collect(Collectors.toMap(FormField::getId, f -> f));
        List<ResponseItem> items = req.answers().stream()
                .filter(a -> a.fieldId() != null && fieldById.containsKey(a.fieldId()))
                .filter(a -> StringUtils.hasText(a.value()))
                // 조건 미충족(숨은) 필드의 답은 저장하지 않는다.
                .filter(a -> isVisible(fieldById.get(a.fieldId()), answerMap))
                .map(a -> ResponseItem.builder()
                        .responseId(response.getId())
                        .fieldId(a.fieldId())
                        // #2 SHORT 고정 접미사: 입력값 + ' ' + suffix 로 합쳐 저장 (검증은 입력값 기준으로 이미 완료)
                        .value(applySuffix(fieldById.get(a.fieldId()), a.value()))
                        .build())
                .toList();
        if (!items.isEmpty()) {
            responseItemMapper.insertBatch(items);
        }
    }

    @Transactional
    public void report(String slug, ReportFormRequest req, String ip, Long reporterUserId) {
        Form form = loadAvailableForm(slug);
        formReportMapper.insert(FormReport.builder()
                .formId(form.getId())
                .reporterIp(ip)
                .reporterUserId(reporterUserId)
                .reason(req.reason())
                .detail(req.detail())
                .status(ReportStatus.PENDING)
                .build());
    }

    // ----------------------------------------------------------------

    /**
     * #2 단답형 접미사 — fixed 모드: SHORT 필드의 validation.suffix 가 있으면 "입력값 + ' ' + suffix" 로 합친다.
     * select 모드(suffixMode='select')는 프론트가 이미 합쳐 전송하므로 서버는 원본 그대로 저장.
     * SHORT 외 타입이나 suffix 없음/빈값이면 원본 입력값 그대로.
     */
    private String applySuffix(FormField field, String value) {
        if (field.getType() != FieldType.SHORT) {
            return value;
        }
        Map<String, Object> validation = field.getValidation();
        if (validation == null) {
            return value;
        }
        // select 모드: 프론트가 입력값+선택값을 이미 합쳐 보냄 → 서버는 손대지 않음
        if ("select".equals(validation.get("suffixMode"))) {
            return value;
        }
        Object suffix = validation.get("suffix");
        if (!(suffix instanceof String s) || s.isBlank()) {
            return value;
        }
        return value + " " + s.trim();
    }

    /** PUBLISHED + 미삭제 + 한도 미초과만 통과. 그 외(비공개/마감/삭제/한도초과)는 동일하게 404 (§6.10). */
    private Form loadAvailableForm(String slug) {
        Form form = formMapper.findActiveBySlug(slug)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORM_NOT_AVAILABLE));
        long count = responseMapper.countByFormId(form.getId());
        if (form.getResponseLimit() != null && count >= form.getResponseLimit()) {
            throw new BusinessException(ErrorCode.FORM_NOT_AVAILABLE);
        }
        return form;
    }

    private void validateAnswers(List<FormField> fields, Map<Long, String> answerMap) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FormField field : fields) {
            if (!isVisible(field, answerMap)) {
                continue; // 조건 미충족(숨은) 필드는 필수/검증 대상에서 제외
            }
            String value = answerMap.get(field.getId());
            if (field.isRequired() && !StringUtils.hasText(value)) {
                fieldErrors.put(field.getId().toString(), "필수 항목입니다.");
                continue;
            }
            String error = fieldValidator.validate(field, value);
            if (error != null) {
                fieldErrors.put(field.getId().toString(), error);
            }
        }
        if (!fieldErrors.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                    Map.of("fieldErrors", fieldErrors));
        }
    }

    /**
     * 조건부 표시 평가 — validation.condition = {fieldId, values}.
     * 기준 필드 답(SINGLE=문자열 / MULTI=JSON 배열)이 values 중 하나면 표시. 조건 없으면 항상 표시.
     */
    private boolean isVisible(FormField field, Map<Long, String> answerMap) {
        if (field == null || field.getValidation() == null) {
            return true;
        }
        Object condObj = field.getValidation().get("condition");
        if (!(condObj instanceof Map<?, ?> cond)) {
            return true;
        }
        if (!(cond.get("fieldId") instanceof Number fid) || !(cond.get("values") instanceof List<?> vals) || vals.isEmpty()) {
            return true; // 조건이 불완전하면 항상 표시(안전)
        }
        Set<String> allowed = vals.stream().map(String::valueOf).collect(Collectors.toSet());
        String answer = answerMap.get(fid.longValue());
        if (answer == null || answer.isBlank()) {
            return false;
        }
        if (allowed.contains(answer)) {
            return true; // SINGLE
        }
        try { // MULTI: JSON 배열 답과 교집합
            List<String> arr = objectMapper.readValue(answer, new TypeReference<List<String>>() {});
            return arr.stream().anyMatch(allowed::contains);
        } catch (Exception e) {
            return false;
        }
    }

    private static String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }
}
