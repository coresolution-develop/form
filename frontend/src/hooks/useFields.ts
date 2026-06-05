'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createField,
  deleteField,
  reorderFields,
  updateField,
  type FieldCreateInput,
  type FieldOrder,
  type FieldUpdateInput,
} from '@/lib/fields';
import { formKeys } from '@/hooks/useForms';

/** 필드 변경 후 해당 폼 상세를 invalidate → useForm 재조회로 store 동기화. */
export function useCreateField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FieldCreateInput) => createField(formId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(formId) }),
  });
}

export function useUpdateField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { fieldId: number; input: FieldUpdateInput }) =>
      updateField(formId, vars.fieldId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(formId) }),
  });
}

export function useDeleteField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: number) => deleteField(formId, fieldId),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(formId) }),
  });
}

export function useReorderFields(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orders: FieldOrder[]) => reorderFields(formId, orders),
    // 실패 시 서버 상태로 롤백
    onError: () => qc.invalidateQueries({ queryKey: formKeys.detail(formId) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: formKeys.detail(formId) }),
  });
}
