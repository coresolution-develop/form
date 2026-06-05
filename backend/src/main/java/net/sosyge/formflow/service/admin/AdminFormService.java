package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.AdminAction;
import net.sosyge.formflow.domain.AdminAuditTargetType;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.dto.response.admin.AdminFormItem;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.service.mail.MailFacade;
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
    private final UserMapper userMapper;
    private final AdminAuditService auditService;
    private final MailFacade mailFacade;

    @Transactional(readOnly = true)
    public PageResponse<AdminFormItem> getForms(String keyword, int page, int size) {
        int offset = (page - 1) * size;
        List<AdminFormItem> items = formMapper.findPageForAdmin(keyword, offset, size);
        long total = formMapper.countForAdmin(keyword);
        return PageResponse.of(items, page, size, total);
    }

    /** 폼 강제 마감: status=CLOSED + 감사 로그 + 소유자 메일 통보 (§10.2). */
    @Transactional
    public void forceClose(Long adminId, Long formId, String reason, String ip) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "폼을 찾을 수 없습니다."));

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
