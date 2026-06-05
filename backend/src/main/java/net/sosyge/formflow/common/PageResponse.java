package net.sosyge.formflow.common;

import lombok.Getter;

import java.util.List;

/**
 * §7.1 페이지네이션 응답 구조.
 * <pre>
 * { "items": [...], "page": 1, "size": 20, "total": 142, "hasNext": true }
 * </pre>
 */
@Getter
public class PageResponse<T> {

    private final List<T> items;
    private final int page;
    private final int size;
    private final long total;
    private final boolean hasNext;

    private PageResponse(List<T> items, int page, int size, long total, boolean hasNext) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.total = total;
        this.hasNext = hasNext;
    }

    /** 페이지/사이즈/전체 건수로부터 hasNext를 계산해 생성한다. (page는 1-base) */
    public static <T> PageResponse<T> of(List<T> items, int page, int size, long total) {
        boolean hasNext = (long) page * size < total;
        return new PageResponse<>(items, page, size, total, hasNext);
    }
}
