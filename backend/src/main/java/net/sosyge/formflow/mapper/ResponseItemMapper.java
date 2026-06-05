package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.ResponseItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ResponseItemMapper {

    void insertBatch(@Param("items") List<ResponseItem> items);

    /** 여러 응답의 항목을 한 번에 조회 (N+1 방지). */
    List<ResponseItem> findByResponseIds(@Param("ids") List<Long> ids);

    /** 폼의 모든 응답 항목 일괄 조회 (통계/CSV용). */
    List<ResponseItem> findByFormId(@Param("formId") Long formId);
}
