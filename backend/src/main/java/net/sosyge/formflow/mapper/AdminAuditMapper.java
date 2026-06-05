package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.AdminAudit;
import net.sosyge.formflow.dto.response.admin.AdminAuditItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/** 관리자 작업 감사 매퍼 (§7.10 / §10.2). */
@Mapper
public interface AdminAuditMapper {

    /** id 를 useGeneratedKeys 로 채워 반환. detail 은 JSON TypeHandler 로 직렬화. */
    void insert(AdminAudit audit);

    /** 감사 로그 페이지 조회 (targetType 은 null 이면 전체). */
    List<AdminAuditItem> findPage(@Param("targetType") String targetType,
                                  @Param("offset") int offset,
                                  @Param("size") int size);

    long count(@Param("targetType") String targetType);

    /** 대시보드용 최근 N건. */
    List<AdminAuditItem> findRecent(@Param("limit") int limit);
}
