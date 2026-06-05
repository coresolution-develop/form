package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.common.SlugGenerator;
import net.sosyge.formflow.config.LimitsProperties;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.dto.request.form.FormCreateRequest;
import net.sosyge.formflow.dto.request.form.FormStatusRequest;
import net.sosyge.formflow.dto.request.form.FormUpdateRequest;
import net.sosyge.formflow.dto.response.form.FormDetailResponse;
import net.sosyge.formflow.dto.response.form.FormSummaryResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FormService {

    private static final int SLUG_MAX_RETRY = 5;

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final SlugGenerator slugGenerator;
    private final LimitsProperties limits;

    @Value("${formflow.app.front-url}")
    private String frontUrl;

    @Transactional
    public FormDetailResponse create(Long userId, FormCreateRequest req) {
        long count = formMapper.countActiveByUserId(userId);
        if (count >= limits.getFormsPerUser()) {
            throw new BusinessException(ErrorCode.PLAN_LIMIT_EXCEEDED,
                    "무료 플랜에서는 폼을 " + limits.getFormsPerUser() + "개까지 만들 수 있습니다.");
        }

        Form form = Form.builder()
                .userId(userId)
                .slug(generateUniqueSlug())
                .title(req.title())
                .description(req.description())
                .status(FormStatus.DRAFT)
                .responseLimit(limits.getResponsesPerForm())
                .build();
        formMapper.insert(form);

        return getDetail(userId, form.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<FormSummaryResponse> getList(Long userId, int page, int size) {
        int offset = (page - 1) * size;
        List<FormSummaryResponse> items = formMapper.findPageByUserId(userId, offset, size);
        long total = formMapper.countByUserId(userId);
        return PageResponse.of(items, page, size, total);
    }

    @Transactional(readOnly = true)
    public FormDetailResponse getDetail(Long userId, Long formId) {
        Form form = loadOwnedForm(userId, formId);
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        long responseCount = responseMapper.countByFormId(formId);
        String publicUrl = frontUrl + "/f/" + form.getSlug();
        return FormDetailResponse.of(form, fields, responseCount, publicUrl);
    }

    @Transactional
    public FormDetailResponse update(Long userId, Long formId, FormUpdateRequest req) {
        Form form = loadOwnedForm(userId, formId);
        String title = req.title() != null ? req.title() : form.getTitle();
        String description = req.description() != null ? req.description() : form.getDescription();
        Integer responseLimit = req.responseLimit() != null ? req.responseLimit() : form.getResponseLimit();
        formMapper.updateMeta(formId, title, description, responseLimit);
        return getDetail(userId, formId);
    }

    @Transactional
    public void updateStatus(Long userId, Long formId, FormStatusRequest req) {
        Form form = loadOwnedForm(userId, formId);
        FormStatus target = req.status();

        LocalDateTime closedAt = null;
        if (target == FormStatus.PUBLISHED) {
            if (fieldMapper.countByFormId(formId) == 0) {
                throw new BusinessException(ErrorCode.ILLEGAL_STATE, "최소 1개 이상의 필드가 필요합니다.");
            }
        } else if (target == FormStatus.CLOSED) {
            closedAt = req.closedAt() != null ? req.closedAt() : LocalDateTime.now();
        }
        formMapper.updateStatus(formId, target, closedAt);
    }

    @Transactional
    public void delete(Long userId, Long formId) {
        loadOwnedForm(userId, formId);
        formMapper.softDelete(formId, LocalDateTime.now());
    }

    // ----------------------------------------------------------------

    /** 존재(미삭제)하지 않으면 404, 소유자가 아니면 403 (§7.5). */
    private Form loadOwnedForm(Long userId, Long formId) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!form.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return form;
    }

    private String generateUniqueSlug() {
        for (int i = 0; i < SLUG_MAX_RETRY; i++) {
            String slug = slugGenerator.generate();
            if (!formMapper.existsBySlug(slug)) {
                return slug;
            }
        }
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "slug 생성에 실패했습니다.");
    }
}
