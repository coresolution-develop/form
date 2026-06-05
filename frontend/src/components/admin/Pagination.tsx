'use client';

import { Button } from '@/components/ui/Button';

interface Props {
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

/** 관리자 목록 공통 페이지네이션 (1-base). */
export function Pagination({ page, size, total, hasNext, onPageChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-600">
      <span>
        {from}–{to} / 총 {total}건
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          이전
        </Button>
        <span className="px-1">{page}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
