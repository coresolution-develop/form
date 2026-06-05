'use client';

import { useQuery } from '@tanstack/react-query';
import { getResponses } from '@/lib/responses';

export function useResponseList(formId: number, page: number) {
  return useQuery({
    queryKey: ['responses', formId, page],
    queryFn: () => getResponses(formId, page),
    enabled: Number.isFinite(formId) && formId > 0,
  });
}
