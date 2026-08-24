package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.common.SlugGenerator;
import net.sosyge.formflow.config.LimitsProperties;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.FieldType;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.dto.request.form.FormCreateRequest;
import net.sosyge.formflow.dto.request.form.FormStatusRequest;
import net.sosyge.formflow.dto.request.form.FormUpdateRequest;
import net.sosyge.formflow.dto.request.form.QuotaUpdateRequest;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    /**
     * 폼 복제 — 폼 메타 + 필드를 깊은 복사해 새 DRAFT 를 만든다(D-017의 출구: 복제 → 수정 → 재발행).
     * 응답·통계·마감 시각·소진 수량은 복사하지 않는다. 이미지는 파일까지 물리 복사해 원본과 수명을 분리한다.
     */
    @Transactional
    public FormDetailResponse duplicate(Long userId, Long formId) {
        Form src = loadOwnedForm(userId, formId);
        long count = formMapper.countActiveByUserId(userId);
        if (count >= limits.getFormsPerUser()) {
            throw new BusinessException(ErrorCode.PLAN_LIMIT_EXCEEDED,
                    "무료 플랜에서는 폼을 " + limits.getFormsPerUser() + "개까지 만들 수 있습니다.");
        }

        String title = src.getTitle() + " (사본)";
        if (title.length() > 255) {
            title = title.substring(0, 255);
        }

        Form copy = Form.builder()
                .userId(userId)
                .slug(generateUniqueSlug())
                .title(title)
                .description(src.getDescription())
                .status(FormStatus.DRAFT)
                .responseLimit(src.getResponseLimit())
                .build();
        formMapper.insert(copy);

        String header = fileStorageService.copyByUrl(src.getHeaderImageUrl());
        if (header != null) {
            formMapper.updateHeaderImage(copy.getId(), apiUrl + "/uploads/" + header);
        }
        String logo = fileStorageService.copyByUrl(src.getLogoImageUrl());
        if (logo != null) {
            formMapper.updateLogoImage(copy.getId(), apiUrl + "/uploads/" + logo);
        }

        // 필드 깊은 복사 + 구필드 id → 신필드 id 매핑
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        Map<Long, Long> idMap = new HashMap<>();
        List<FormField> copies = new ArrayList<>();
        for (FormField f : fields) {
            FormField c = FormField.builder()
                    .formId(copy.getId())
                    .type(f.getType())
                    .label(f.getLabel())
                    .placeholder(f.getPlaceholder())
                    .required(f.isRequired())
                    .orderNum(f.getOrderNum())
                    .options(f.getOptions())
                    .validation(f.getValidation() == null ? null : new HashMap<>(f.getValidation()))
                    .build();
            fieldMapper.insert(c);
            idMap.put(f.getId(), c.getId());
            copies.add(c);
        }

        // 조건부 표시(validation.condition.fieldId)가 구필드 id 를 가리키므로 신필드 id 로 리매핑
        for (FormField c : copies) {
            Map<String, Object> validation = c.getValidation();
            if (validation == null || !(validation.get("condition") instanceof Map<?, ?> condRaw)) {
                continue;
            }
            Map<String, Object> cond = new HashMap<>();
            condRaw.forEach((k, v) -> cond.put(String.valueOf(k), v));
            if (cond.get("fieldId") instanceof Number oldId && idMap.get(oldId.longValue()) != null) {
                cond.put("fieldId", idMap.get(oldId.longValue()));
                validation.put("condition", cond);
            } else {
                validation.remove("condition"); // 원본에서 이미 깨진 참조면 조건 자체를 제거
            }
            fieldMapper.updateField(c);
        }

        // 선착순 설정 복사(수량 필드는 신필드 id 로). 소진량(quota_used)은 0에서 시작.
        if (src.getQuotaTotal() != null && src.getQuotaFieldId() != null) {
            Long mappedQuotaField = idMap.get(src.getQuotaFieldId());
            if (mappedQuotaField != null) {
                formMapper.updateQuotaConfig(copy.getId(), src.getQuotaTotal(), mappedQuotaField);
            }
        }

        return getDetail(userId, copy.getId());
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

    /** 배너 이미지 업로드/교체(상단 전체폭). 새 파일 저장 후 URL 기록, 이전 파일은 정리. */
    @Transactional
    public FormDetailResponse setHeaderImage(Long userId, Long formId, MultipartFile file) {
        Form form = loadOwnedForm(userId, formId);
        String url = storeAndBuildUrl(file);
        formMapper.updateHeaderImage(formId, url);
        fileStorageService.deleteByUrl(form.getHeaderImageUrl());
        return getDetail(userId, formId);
    }

    /** 배너 이미지 제거. URL NULL 처리 + 파일 삭제. */
    @Transactional
    public FormDetailResponse removeHeaderImage(Long userId, Long formId) {
        Form form = loadOwnedForm(userId, formId);
        formMapper.updateHeaderImage(formId, null);
        fileStorageService.deleteByUrl(form.getHeaderImageUrl());
        return getDetail(userId, formId);
    }

    /** 로고 이미지 업로드/교체(제목 위 중앙 소형). 배너와 독립 슬롯. */
    @Transactional
    public FormDetailResponse setLogoImage(Long userId, Long formId, MultipartFile file) {
        Form form = loadOwnedForm(userId, formId);
        String url = storeAndBuildUrl(file);
        formMapper.updateLogoImage(formId, url);
        fileStorageService.deleteByUrl(form.getLogoImageUrl());
        return getDetail(userId, formId);
    }

    /** 로고 이미지 제거. URL NULL 처리 + 파일 삭제. */
    @Transactional
    public FormDetailResponse removeLogoImage(Long userId, Long formId) {
        Form form = loadOwnedForm(userId, formId);
        formMapper.updateLogoImage(formId, null);
        fileStorageService.deleteByUrl(form.getLogoImageUrl());
        return getDetail(userId, formId);
    }

    /** 업로드 파일을 저장하고 공개 접근용 절대 URL을 만든다. */
    private String storeAndBuildUrl(MultipartFile file) {
        return apiUrl + "/uploads/" + fileStorageService.storeImage(file);
    }

    /**
     * 선착순 설정(총 수량 + 수량 필드). 둘 다 null 이면 해제.
     *
     * <p>발행 후에도 총 수량은 조정할 수 있게 둔다(운영 중 물량 추가가 흔하다).
     * 다만 <b>이미 소진된 양보다 작게</b>는 못 줄이고, <b>수량 필드 교체</b>는 소진 전에만 허용한다.
     * 이미 쌓인 quota_used 가 어떤 필드 기준으로 집계된 것인지 모호해지기 때문이다.
     */
    @Transactional
    public FormDetailResponse updateQuota(Long userId, Long formId, QuotaUpdateRequest req) {
        Form form = loadOwnedForm(userId, formId);
        Integer total = req.quotaTotal();
        Long fieldId = req.quotaFieldId();

        if (total == null && fieldId == null) {
            formMapper.updateQuotaConfig(formId, null, null);
            return getDetail(userId, formId);
        }
        if (total == null || fieldId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "총 수량과 수량 필드를 함께 지정해야 합니다.");
        }
        if (total < form.getQuotaUsed()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "이미 " + form.getQuotaUsed() + "개가 접수돼 총 수량을 그보다 작게 정할 수 없습니다.");
        }
        if (form.getQuotaUsed() > 0 && !fieldId.equals(form.getQuotaFieldId())) {
            throw new BusinessException(ErrorCode.ILLEGAL_STATE,
                    "이미 접수가 시작돼 수량 필드를 바꿀 수 없습니다.");
        }

        FormField field = fieldMapper.findByIdAndFormId(fieldId, formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "폼에 없는 필드입니다."));
        if (field.getType() != FieldType.NUMBER) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "수량 필드는 숫자 타입이어야 합니다.");
        }
        // 필수가 아니면 수량을 비운 채 제출될 수 있고, 그러면 몇 개를 차감할지 정할 수 없다.
        if (!field.isRequired()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "수량 필드는 필수 항목이어야 합니다.");
        }

        formMapper.updateQuotaConfig(formId, total, fieldId);
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
