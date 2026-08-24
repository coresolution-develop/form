'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createForm,
  deleteForm,
  deleteHeaderImage,
  duplicateForm,
  deleteLogoImage,
  getForm,
  listForms,
  updateClosesAt,
  updateForm,
  updateFormStatus,
  updateQuota,
  uploadHeaderImage,
  uploadLogoImage,
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

export function useDuplicateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => duplicateForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.all }),
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

export function useUploadHeaderImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadHeaderImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}

export function useDeleteHeaderImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteHeaderImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}

export function useUpdateQuota(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { quotaTotal: number | null; quotaFieldId: number | null }) =>
      updateQuota(id, vars.quotaTotal, vars.quotaFieldId),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}

export function useUploadLogoImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLogoImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}

export function useDeleteLogoImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLogoImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(id) }),
  });
}
