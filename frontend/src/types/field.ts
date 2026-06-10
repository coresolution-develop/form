export type FieldType = 'SHORT' | 'LONG' | 'SINGLE' | 'MULTI' | 'EMAIL' | 'NUMBER' | 'DATE';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** #2 단답형(SHORT) 고정 접미사(fixed). 입력란 뒤에 항상 붙는 텍스트(서버에서 합쳐 저장). */
  suffix?: string;
  /** #2 2단계: 접미사 모드. 'fixed'=고정 텍스트, 'select'=선택 목록(프론트가 합쳐 전송). */
  suffixMode?: 'fixed' | 'select';
  /** #2 2단계: select 모드의 선택 옵션 목록. */
  suffixOptions?: string[];
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
