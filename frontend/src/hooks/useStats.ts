'use client';

import { useQuery } from '@tanstack/react-query';
import { getStats } from '@/lib/responses';

export function useStats(formId: number) {
  return useQuery({
    queryKey: ['stats', formId],
    queryFn: () => getStats(formId),
    enabled: Number.isFinite(formId) && formId > 0,
  });
}
