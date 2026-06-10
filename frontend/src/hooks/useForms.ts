'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createForm,
  deleteForm,
  getForm,
  listForms,
  updateClosesAt,
  updateForm,
  updateFormStatus,
  type FormCreateInput,
  type FormUpdateInput,
} from '@/lib/forms';
import type { FormStatus } from '@/types/form';

export const formKeys = {
  all: ['forms'] as const,
  list: (page: number) => ['forms', page] as const,
  detail: (id: number) => ['form', id] as const,
};

export function useFormList(page: number) {
  return useQuery({
    queryKey: formKeys.list(page),
    queryFn: () => listForms(page),
  });
}

export function useForm(id: number) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: () => getForm(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FormCreateInput) => createForm(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.all }),
  });
}

export function useUpdateForm(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FormUpdateInput) => updateForm(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(id) });
      qc.invalidateQueries({ queryKey: formKeys.all });
    },
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.all }),
  });
}

export function useUpdateFormStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { status: FormStatus; closedAt?: string | null }) =>
      updateFormStatus(id, vars.status, vars.closedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(id) });
      qc.invalidateQueries({ queryKey: formKeys.all });
    },
  });
}

export function useUpdateClosesAt(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (closesAt: string | null) => updateClosesAt(id, closesAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}
