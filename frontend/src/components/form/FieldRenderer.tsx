'use client';

import { cn } from '@/lib/cn';
import type { FormField } from '@/types/field';

/**
 * 응답자 관점 필드 렌더러. 빌더 미리보기(disabled)와 M4 공개 폼(active) 양쪽에서 재사용.
 *
 * @param value     SHORT/LONG/EMAIL/NUMBER/DATE/SINGLE → string, MULTI → string[]
 * @param onChange  값 변경 콜백 (disabled 또는 미제공 시 read-only)
 * @param disabled  입력 비활성 (빌더 미리보기)
 * @param error     필드별 오류 메시지
 */
export interface FieldRendererProps {
  field: FormField;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  disabled?: boolean;
  error?: string;
}

const inputBase =
  'w-full h-[42px] px-3 text-sm border rounded-lg outline-none transition-colors ' +
  'focus:border-brand focus:ring-2 focus:ring-brand/20 ' +
  'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

export function FieldRenderer({ field, value, onChange, disabled, error }: FieldRendererProps) {
  const strValue = typeof value === 'string' ? value : '';
  const arrValue = Array.isArray(value) ? value : [];
  const borderClass = error ? 'border-red-400' : 'border-gray-300';

  const optionBox = (selected: boolean) =>
    cn(
      'flex items-center gap-2.5 px-3 py-2.5 border rounded-lg text-sm',
      selected
        ? 'border-[1.5px] border-brand bg-brand-light text-brand-dark'
        : 'border-gray-300 text-gray-700',
      disabled ? 'cursor-default' : 'cursor-pointer',
    );

  const renderControl = () => {
    switch (field.type) {
      case 'LONG':
        return (
          <textarea
            rows={3}
            placeholder={field.placeholder ?? ''}
            value={strValue}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(inputBase, 'h-auto py-2.5 resize-none', borderClass)}
          />
        );
      case 'SINGLE':
        return (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={field.label}>
            {(field.options ?? []).map((opt, i) => (
              <label key={i} className={optionBox(strValue === opt)}>
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={opt}
                  checked={strValue === opt}
                  disabled={disabled}
                  onChange={(e) => onChange?.(e.target.value)}
                  className="h-4 w-4 accent-brand"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'MULTI':
        return (
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((opt, i) => (
              <label key={i} className={optionBox(arrValue.includes(opt))}>
                <input
                  type="checkbox"
                  value={opt}
                  checked={arrValue.includes(opt)}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arrValue, opt]
                      : arrValue.filter((v) => v !== opt);
                    onChange?.(next);
                  }}
                  className="h-4 w-4 rounded accent-brand"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      default: {
        const inputType =
          field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text';
        return (
          <input
            type={inputType}
            placeholder={field.placeholder ?? ''}
            value={strValue}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={(e) => onChange?.(e.target.value)}
            // NUMBER: 포커스 상태에서 휠로 값이 증감되는 브라우저 기본 동작 차단 (포커스 해제)
            onWheel={field.type === 'NUMBER' ? (e) => e.currentTarget.blur() : undefined}
            className={cn(inputBase, borderClass)}
          />
        );
      }
    }
  };

  return (
    <div className="flex flex-col">
      <label className="mb-1.5 block text-sm font-medium text-gray-800">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {renderControl()}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
