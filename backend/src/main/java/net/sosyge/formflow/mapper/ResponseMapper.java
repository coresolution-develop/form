package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.Response;
import net.sosyge.formflow.dto.response.admin.DailyCount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface ResponseMapper {

    void insert(Response response);

    long countByFormId(@Param("formId") Long formId);

    boolean existsByFormIdAndRespondentKey(@Param("formId") Long formId,
                                           @Param("respondentKey") String respondentKey);

    /** 최신순 페이지 조회. */
    List<Response> findPageByFormId(@Param("formId") Long formId,
                                    @Param("offset") int offset,
                                    @Param("size") int size);

    /** CSV/통계용 전체 조회 (응답 한도 100건이라 메모리 처리 OK). */
    List<Response> findAllByFormId(@Param("formId") Long formId);

    // --- 대시보드 (§10.3) ---

    long countSubmittedBetween(@Param("start") LocalDateTime start,
                               @Param("end") LocalDateTime end);

    /** since(포함) 이후 일자별 응답 수. */
    List<DailyCount> dailyResponsesSince(@Param("since") LocalDateTime since);

    /** 배치(§10.6): 보관기간 지난 응답의 IP/UA만 NULL 처리(익명화). value(response_items)는 유지. */
    int anonymizeOlderThan(@Param("before") LocalDateTime before);
}
