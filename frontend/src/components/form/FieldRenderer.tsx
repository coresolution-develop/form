'use client';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
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

export function FieldRenderer({ field, value, onChange, disabled, error }: FieldRendererProps) {
  const label = (
    <span className="text-sm font-medium text-gray-800">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
  const strValue = typeof value === 'string' ? value : '';
  const arrValue = Array.isArray(value) ? value : [];

  const renderControl = () => {
    switch (field.type) {
      case 'LONG':
        return (
          <Textarea
            placeholder={field.placeholder ?? ''}
            value={strValue}
            disabled={disabled}
            error={error}
            onChange={(e) => onChange?.(e.target.value)}
          />
        );
      case 'SINGLE':
        return (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={field.label}>
            {(field.options ?? []).map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={opt}
                  checked={strValue === opt}
                  disabled={disabled}
                  onChange={(e) => onChange?.(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
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
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
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
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
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
          <Input
            type={inputType}
            placeholder={field.placeholder ?? ''}
            value={strValue}
            disabled={disabled}
            error={error}
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={(e) => onChange?.(e.target.value)}
          />
        );
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label}
      {renderControl()}
      {error && field.type !== 'LONG' && !['SHORT', 'EMAIL', 'NUMBER', 'DATE'].includes(field.type) && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
