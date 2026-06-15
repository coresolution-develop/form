package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.AdminAction;
import net.sosyge.formflow.domain.AdminAuditTargetType;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.domain.UserRole;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.response.admin.AdminUserDetail;
import net.sosyge.formflow.dto.response.admin.AdminUserItem;
import net.sosyge.formflow.dto.response.form.FormSummaryResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.RefreshTokenMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.service.mail.MailFacade;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** 관리자 사용자 관리 (§7.10 / §10.2). */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserMapper userMapper;
    private final FormMapper formMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final AdminAuditService auditService;
    private final MailFacade mailFacade;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserItem> getUsers(UserStatus status, String email, int page, int size) {
        int offset = (page - 1) * size;
        List<AdminUserItem> items = userMapper.findPageForAdmin(status, email, offset, size);
        long total = userMapper.countForAdmin(status, email);
        return PageResponse.of(items, page, size, total);
    }

    /** 어뷰징 조사용 사용자 상세: 기본정보 + 보유 폼 + 집계 (§10.2). */
    @Transactional(readOnly = true)
    public AdminUserDetail getUserDetail(Long userId) {
        User u = userMapper.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        List<FormSummaryResponse> forms = formMapper.findSummariesByUserId(userId);
        long totalResponses = forms.stream().mapToLong(FormSummaryResponse::getResponseCount).sum();
        return new AdminUserDetail(
                u.getId(), u.getEmail(), u.getNickname(), u.getRole(), u.getStatus(),
                u.getPlan() == null ? null : u.getPlan().name(),
                u.getSuspendedReason(), u.getEmailVerifiedAt(), u.getLastLoginAt(), u.getCreatedAt(),
                forms.size(), totalResponses, forms);
    }

    /**
     * 사용자 상태 변경 (SUSPENDED 정지 / ACTIVE 복원).
     * ★ 관리자(본인 포함)를 정지/변경하는 것은 거부 (무한 잠금 사고 방지, §10.2).
     */
    @Transactional
    public void updateUserStatus(Long adminId, Long targetUserId, UserStatus status,
                                 String reason, String ip) {
        if (status != UserStatus.SUSPENDED && status != UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "지원하지 않는 상태입니다. (SUSPENDED 또는 ACTIVE만 가능)");
        }

        User target = userMapper.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // ★ 관리자 계정은 정지/상태변경 대상에서 제외 (자기 자신/다른 관리자 모두)
        if (target.getRole() == UserRole.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "관리자 계정은 상태를 변경할 수 없습니다.");
        }

        if (status == UserStatus.SUSPENDED) {
            userMapper.updateStatusAndReason(targetUserId, UserStatus.SUSPENDED, reason);
            // 강제 로그아웃: 해당 사용자의 모든 refresh token revoke
            refreshTokenMapper.revokeAllByUserId(targetUserId, LocalDateTime.now());
            auditService.record(adminId, AdminAction.USER_SUSPEND, AdminAuditTargetType.USER,
                    targetUserId, Map.of("email", target.getEmail(), "reason", reason == null ? "" : reason), ip);
            mailFacade.sendAccountSuspended(target.getEmail(), target.getNickname(), reason);
        } else {
            userMapper.updateStatusAndReason(targetUserId, UserStatus.ACTIVE, null);
            auditService.record(adminId, AdminAction.USER_RESTORE, AdminAuditTargetType.USER,
                    targetUserId, Map.of("email", target.getEmail()), ip);
            mailFacade.sendAccountRestored(target.getEmail(), target.getNickname());
        }
    }
}
