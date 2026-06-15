package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.AdminAction;
import net.sosyge.formflow.domain.AdminAuditTargetType;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.dto.response.admin.AdminFormItem;
import net.sosyge.formflow.dto.response.form.FormDetailResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.service.mail.MailFacade;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** 관리자 폼 관리 (§7.10 / §10.2). */
@Service
@RequiredArgsConstructor
public class AdminFormService {

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final UserMapper userMapper;
    private final AdminAuditService auditService;
    private final MailFacade mailFacade;

    @Value("${formflow.app.front-url}")
    private String frontUrl;

    @Transactional(readOnly = true)
    public PageResponse<AdminFormItem> getForms(String keyword, int page, int size) {
        int offset = (page - 1) * size;
        List<AdminFormItem> items = formMapper.findPageForAdmin(keyword, offset, size);
        long total = formMapper.countForAdmin(keyword);
        return PageResponse.of(items, page, size, total);
    }

    /** 관리자 폼 미리보기: 상태(비공개/마감) 무관하게 폼+필드 열람 (§10.2 신고 조사). */
    @Transactional(readOnly = true)
    public FormDetailResponse getFormDetail(Long formId) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "폼을 찾을 수 없습니다."));
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        long responseCount = responseMapper.countByFormId(formId);
        return FormDetailResponse.of(form, fields, responseCount, frontUrl + "/f/" + form.getSlug());
    }

    /** 폼 강제 마감: status=CLOSED + 감사 로그 + 소유자 메일 통보 (§10.2). 이미 마감이면 멱등 no-op. */
    @Transactional
    public void forceClose(Long adminId, Long formId, String reason, String ip) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "폼을 찾을 수 없습니다."));

        if (form.getStatus() == FormStatus.CLOSED) {
            return; // 이미 마감 — 중복 감사/메일 방지
        }

        formMapper.updateStatus(formId, FormStatus.CLOSED, LocalDateTime.now());

        auditService.record(adminId, AdminAction.FORM_FORCE_CLOSE, AdminAuditTargetType.FORM,
                formId, Map.of("title", form.getTitle() == null ? "" : form.getTitle(),
                        "slug", form.getSlug(), "reason", reason == null ? "" : reason), ip);

        User owner = userMapper.findById(form.getUserId()).orElse(null);
        if (owner != null) {
            mailFacade.sendFormForceClosed(owner.getEmail(), owner.getNickname(), form.getTitle(), reason);
        }
    }
}
