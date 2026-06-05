package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.AdminAction;
import net.sosyge.formflow.domain.AdminAuditTargetType;
import net.sosyge.formflow.domain.FormReport;
import net.sosyge.formflow.domain.ReportStatus;
import net.sosyge.formflow.dto.response.admin.AdminReportItem;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FormReportMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 관리자 신고 처리 (§7.10 / §10.2). */
@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final FormReportMapper formReportMapper;
    private final AdminAuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<AdminReportItem> getReports(ReportStatus status, int page, int size) {
        int offset = (page - 1) * size;
        List<AdminReportItem> items = formReportMapper.findPage(status, offset, size);
        long total = formReportMapper.count(status);
        return PageResponse.of(items, page, size, total);
    }

    /** 신고 상태 갱신 + handled_by/handled_at + 감사 로그 (§10.2). */
    @Transactional
    public void updateReport(Long adminId, Long reportId, ReportStatus status, String detail, String ip) {
        FormReport report = formReportMapper.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "신고를 찾을 수 없습니다."));

        formReportMapper.updateStatus(reportId, status, adminId, LocalDateTime.now());

        Map<String, Object> auditDetail = new HashMap<>();
        auditDetail.put("formId", report.getFormId());
        auditDetail.put("status", status.name());
        auditDetail.put("detail", detail == null ? "" : detail);
        auditService.record(adminId, AdminAction.REPORT_RESOLVE, AdminAuditTargetType.REPORT,
                reportId, auditDetail, ip);
    }
}
