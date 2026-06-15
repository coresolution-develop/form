package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormStatus;
import net.sosyge.formflow.dto.response.admin.AdminFormItem;
import net.sosyge.formflow.dto.response.form.FormSummaryResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface FormMapper {

    void insert(Form form);

    /** 삭제되지 않은 폼 단건 (소유권 검증은 서비스에서). */
    Optional<Form> findByIdActive(@Param("id") Long id);

    /** 공개 조회용: PUBLISHED + 미삭제 폼만 slug로 조회. */
    Optional<Form> findActiveBySlug(@Param("slug") String slug);

    boolean existsBySlug(@Param("slug") String slug);

    /** 목록 + responseCount (LEFT JOIN GROUP BY로 N+1 방지). */
    List<FormSummaryResponse> findPageByUserId(@Param("userId") Long userId,
                                               @Param("offset") int offset,
                                               @Param("size") int size);

    long countByUserId(@Param("userId") Long userId);

    /** 관리자 사용자 상세: 해당 사용자의 모든 폼 요약 (페이징 없음, 사용자당 ≤10개). */
    List<FormSummaryResponse> findSummariesByUserId(@Param("userId") Long userId);

    long countActiveByUserId(@Param("userId") Long userId);

    void updateMeta(@Param("id") Long id,
                    @Param("title") String title,
                    @Param("description") String description,
                    @Param("responseLimit") Integer responseLimit);

    void updateStatus(@Param("id") Long id,
                      @Param("status") FormStatus status,
                      @Param("closedAt") LocalDateTime closedAt);

    /** 마감 예정 시각 설정/변경/해제(null) — #1 마감일 예약. */
    void updateClosesAt(@Param("id") Long id, @Param("closesAt") LocalDateTime closesAt);

    /** 배치(#1): closes_at 도달한 PUBLISHED 폼 id 목록. */
    List<Long> findExpiredPublished(@Param("now") LocalDateTime now);

    void softDelete(@Param("id") Long id, @Param("deletedAt") LocalDateTime deletedAt);

    // --- 관리자 (§7.10) ---

    /** 전체 폼 검색 (slug/title/소유자 이메일 keyword, 미삭제만). */
    List<AdminFormItem> findPageForAdmin(@Param("keyword") String keyword,
                                         @Param("offset") int offset,
                                         @Param("size") int size);

    long countForAdmin(@Param("keyword") String keyword);

    /** 배치(§10.6): 특정 사용자의 미삭제 폼 전체 soft delete. */
    int softDeleteByUserId(@Param("userId") Long userId, @Param("deletedAt") LocalDateTime deletedAt);
}
