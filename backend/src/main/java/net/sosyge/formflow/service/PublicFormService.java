package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
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
        validateAnswers(fields, req.answers());

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

        Set<Long> validFieldIds = fields.stream().map(FormField::getId).collect(Collectors.toSet());
        List<ResponseItem> items = req.answers().stream()
                .filter(a -> a.fieldId() != null && validFieldIds.contains(a.fieldId()))
                .filter(a -> StringUtils.hasText(a.value()))
                .map(a -> ResponseItem.builder()
                        .responseId(response.getId())
                        .fieldId(a.fieldId())
                        .value(a.value())
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

    private void validateAnswers(List<FormField> fields, List<SubmitRequest.Answer> answers) {
        Map<Long, String> answerMap = answers.stream()
                .filter(a -> a.fieldId() != null)
                .collect(Collectors.toMap(SubmitRequest.Answer::fieldId, a -> a.value() == null ? "" : a.value(),
                        (a, b) -> a));

        Map<String, String> fieldErrors = new HashMap<>();
        for (FormField field : fields) {
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

    private static String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }
}
