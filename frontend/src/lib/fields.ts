import { api } from '@/lib/api';
import type { FieldType, FieldValidation, FormField } from '@/types/field';

export interface FieldCreateInput {
  type: FieldType;
  label: string;
  placeholder?: string | null;
  required?: boolean;
  options?: string[] | null;
  validation?: FieldValidation | null;
}

export interface FieldUpdateInput {
  label?: string;
  placeholder?: string | null;
  required?: boolean;
  options?: string[] | null;
  validation?: FieldValidation | null;
}

export async function createField(formId: number, input: FieldCreateInput): Promise<FormField> {
  const res = await api.post(`/api/forms/${formId}/fields`, input);
  return res.data.data as FormField;
}

export async function updateField(
  formId: number,
  fieldId: number,
  input: FieldUpdateInput,
): Promise<FormField> {
  const res = await api.patch(`/api/forms/${formId}/fields/${fieldId}`, input);
  return res.data.data as FormField;
}

export async function deleteField(formId: number, fieldId: number): Promise<void> {
  await api.delete(`/api/forms/${formId}/fields/${fieldId}`);
}

export interface FieldOrder {
  fieldId: number;
  orderNum: number;
}

export async function reorderFields(formId: number, orders: FieldOrder[]): Promise<void> {
  await api.patch(`/api/forms/${formId}/fields/order`, { orders });
}
