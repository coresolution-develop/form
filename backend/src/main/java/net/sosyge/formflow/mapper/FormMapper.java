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

    /**
     * 제출 경로 전용 조회. 폼 행을 FOR UPDATE 로 잠근다.
     * 응답 수 제한·선착순 수량을 '판단하고 반영하는' 구간을 폼 단위로 직렬화하기 위한 것으로,
     * 반드시 쓰기 트랜잭션 안에서 호출해야 한다.
     */
    Optional<Form> findActiveBySlugForUpdate(@Param("slug") String slug);

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

    /** 배너 이미지 URL 설정/해제(null=제거). */
    void updateHeaderImage(@Param("id") Long id, @Param("url") String url);

    /** 로고 이미지 URL 설정/해제(null=제거). */
    void updateLogoImage(@Param("id") Long id, @Param("url") String url);

    /** 선착순 설정(총 수량·수량 필드). 둘 다 null=선착순 해제. */
    void updateQuotaConfig(@Param("id") Long id,
                           @Param("quotaTotal") Integer quotaTotal,
                           @Param("quotaFieldId") Long quotaFieldId);

    /** 소진 수량 누적. 폼 행 잠금(findActiveBySlugForUpdate) 안에서만 호출할 것. */
    void increaseQuotaUsed(@Param("id") Long id, @Param("qty") int qty);

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
