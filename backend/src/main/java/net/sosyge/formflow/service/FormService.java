package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.common.SlugGenerator;
import net.sosyge.formflow.config.LimitsProperties;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.domain.HeaderImageStyle;
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
import org.springframework.web.multipart.MultipartFile;

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
    private final FileStorageService fileStorageService;

    @Value("${formflow.app.front-url}")
    private String frontUrl;

    // 기본값(빈 문자열) 필수 — API_URL 미설정 환경에서 플레이스홀더 해석 실패로 앱이 안 뜨는 것을 방지.
    // 비어 있으면 이미지 URL이 상대경로가 되어 이미지 기능만 동작 안 함(앱은 정상).
    @Value("${formflow.app.api-url:}")
    private String apiUrl;

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

        if (req.closesAt() != null) {
            requireFuture(req.closesAt());
            formMapper.updateClosesAt(form.getId(), req.closesAt());
        }

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
        if (req.headerImageStyle() != null) {
            formMapper.updateHeaderStyle(formId, req.headerImageStyle());
        }
        return getDetail(userId, formId);
    }

    /** 헤더 이미지 업로드/교체. 새 파일 저장 후 URL·스타일 기록, 이전 파일은 정리. */
    @Transactional
    public FormDetailResponse setHeaderImage(Long userId, Long formId, MultipartFile file, HeaderImageStyle style) {
        Form form = loadOwnedForm(userId, formId);
        String filename = fileStorageService.storeImage(file);
        String url = apiUrl + "/uploads/" + filename;
        HeaderImageStyle target = style != null ? style : HeaderImageStyle.LOGO;
        formMapper.updateHeaderImage(formId, url, target);
        if (form.getHeaderImageUrl() != null) {
            fileStorageService.deleteByUrl(form.getHeaderImageUrl());
        }
        return getDetail(userId, formId);
    }

    /** 헤더 이미지 제거. URL·스타일 NULL 처리 + 파일 삭제. */
    @Transactional
    public FormDetailResponse removeHeaderImage(Long userId, Long formId) {
        Form form = loadOwnedForm(userId, formId);
        formMapper.updateHeaderImage(formId, null, null);
        if (form.getHeaderImageUrl() != null) {
            fileStorageService.deleteByUrl(form.getHeaderImageUrl());
        }
        return getDetail(userId, formId);
    }

    /**
     * 마감 예정 시각 설정/변경/해제(null). 발행 후에도 허용(#9 필드 잠금과 무관한 운영 메타).
     * 과거 시각은 거부, null은 무기한(해제).
     */
    @Transactional
    public void updateClosesAt(Long userId, Long formId, LocalDateTime closesAt) {
        loadOwnedForm(userId, formId);
        if (closesAt != null) {
            requireFuture(closesAt);
        }
        formMapper.updateClosesAt(formId, closesAt);
    }

    private void requireFuture(LocalDateTime closesAt) {
        if (!closesAt.isAfter(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "마감 예정 시각은 현재보다 미래여야 합니다.");
        }
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
