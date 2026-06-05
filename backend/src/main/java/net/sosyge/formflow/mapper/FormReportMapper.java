package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.FormReport;
import net.sosyge.formflow.domain.ReportStatus;
import net.sosyge.formflow.dto.response.admin.AdminReportItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface FormReportMapper {

    void insert(FormReport report);

    // --- 관리자 (§7.10 / §10.2) ---

    /** 신고 큐 (status null 이면 전체). 폼 제목/누적 PENDING 수 포함. */
    List<AdminReportItem> findPage(@Param("status") ReportStatus status,
                                   @Param("offset") int offset,
                                   @Param("size") int size);

    long count(@Param("status") ReportStatus status);

    Optional<FormReport> findById(@Param("id") Long id);

    void updateStatus(@Param("id") Long id,
                      @Param("status") ReportStatus status,
                      @Param("handledBy") Long handledBy,
                      @Param("handledAt") LocalDateTime handledAt);

    /** §10.2 누적 감지: 같은 폼의 PENDING 신고 수. */
    long countPendingByFormId(@Param("formId") Long formId);

    /** 대시보드: 특정 상태 신고 총 수. */
    long countByStatus(@Param("status") ReportStatus status);
}
