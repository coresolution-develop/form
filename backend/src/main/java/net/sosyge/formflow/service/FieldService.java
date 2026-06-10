package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.config.LimitsProperties;
import net.sosyge.formflow.domain.FieldType;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.dto.request.field.FieldCreateRequest;
import net.sosyge.formflow.dto.request.field.FieldOrderRequest;
import net.sosyge.formflow.dto.request.field.FieldUpdateRequest;
import net.sosyge.formflow.dto.response.field.FieldResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.FormMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FieldService {

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final LimitsProperties limits;

    @Transactional
    public FieldResponse create(Long userId, Long formId, FieldCreateRequest req) {
        verifyEditable(userId, formId);

        if (fieldMapper.countByFormId(formId) >= limits.getFieldsPerForm()) {
            throw new BusinessException(ErrorCode.PLAN_LIMIT_EXCEEDED,
                    "폼당 필드는 " + limits.getFieldsPerForm() + "개까지 추가할 수 있습니다.");
        }
        requireOptionsForChoice(req.type(), req.options());

        Integer max = fieldMapper.maxOrderNum(formId);
        int orderNum = (max == null ? 0 : max) + 1;

        FormField field = FormField.builder()
                .formId(formId)
                .type(req.type())
                .label(req.label())
                .placeholder(req.placeholder())
                .required(req.required() != null && req.required())
                .orderNum(orderNum)
                .options(req.options())
                .validation(req.validation())
                .build();
        fieldMapper.insert(field);

        return FieldResponse.from(field);
    }

    @Transactional
    public FieldResponse update(Long userId, Long formId, Long fieldId, FieldUpdateRequest req) {
        verifyEditable(userId, formId);
        FormField field = fieldMapper.findByIdAndFormId(fieldId, formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        if (req.label() != null) field.setLabel(req.label());
        if (req.placeholder() != null) field.setPlaceholder(req.placeholder());
        if (req.required() != null) field.setRequired(req.required());
        if (req.options() != null) field.setOptions(req.options());
        if (req.validation() != null) field.setValidation(req.validation());

        requireOptionsForChoice(field.getType(), field.getOptions());

        fieldMapper.updateField(field);
        return FieldResponse.from(field);
    }

    @Transactional
    public void reorder(Long userId, Long formId, FieldOrderRequest req) {
        verifyEditable(userId, formId);
        java.util.Set<Long> valid = fieldMapper.findByFormIdOrderByOrderNum(formId).stream()
                .map(FormField::getId)
                .collect(java.util.stream.Collectors.toSet());
        for (FieldOrderRequest.OrderItem o : req.orders()) {
            if (!valid.contains(o.fieldId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "해당 폼의 필드가 아닙니다.");
            }
        }
        for (FieldOrderRequest.OrderItem o : req.orders()) {
            fieldMapper.updateOrder(o.fieldId(), o.orderNum());
        }
    }

    @Transactional
    public void delete(Long userId, Long formId, Long fieldId) {
        verifyEditable(userId, formId);
        FormField field = fieldMapper.findByIdAndFormId(fieldId, formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        fieldMapper.deleteByIdAndFormId(fieldId, formId);
        fieldMapper.shiftOrderAfterDelete(formId, field.getOrderNum());
    }

    // ----------------------------------------------------------------

    /** 소유권 + 편집가능 상태(DRAFT) 검증. 발행/마감 폼은 구조 편집 금지(#9). */
    private Form verifyEditable(Long userId, Long formId) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!form.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (form.getStatus() != FormStatus.DRAFT) {
            throw new BusinessException(ErrorCode.FORM_NOT_EDITABLE);
        }
        return form;
    }

    private void requireOptionsForChoice(FieldType type, List<String> options) {
        if ((type == FieldType.SINGLE || type == FieldType.MULTI)
                && (options == null || options.isEmpty())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "선택지를 1개 이상 입력해주세요.");
        }
    }
}
