export type FieldType = 'SHORT' | 'LONG' | 'SINGLE' | 'MULTI' | 'EMAIL' | 'NUMBER' | 'DATE';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  [key: string]: unknown;
}

export interface FormField {
  id: number;
  type: FieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  orderNum: number;
  options: string[] | null;
  validation: FieldValidation | null;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  SHORT: '단답형',
  LONG: '장문형',
  SINGLE: '객관식(단일)',
  MULTI: '객관식(복수)',
  EMAIL: '이메일',
  NUMBER: '숫자',
  DATE: '날짜',
};

export const CHOICE_TYPES: FieldType[] = ['SINGLE', 'MULTI'];
