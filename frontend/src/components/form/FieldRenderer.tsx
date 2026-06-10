'use client';

import { useState } from 'react';
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

/**
 * #2 select 모드(SHORT): 입력란 + 드롭다운. 내부에서 text/selected를 관리하고
 * 합친 값("입력값 선택값")을 onChange로 올린다. 입력값이 비면 빈 값('')을 올려 선택값만 제출되지 않게 한다.
 */
function SuffixSelectInput({
  options,
  placeholder,
  disabled,
  borderClass,
  onChange,
}: {
  options: string[];
  placeholder: string;
  disabled?: boolean;
  borderClass: string;
  onChange?: (value: string | string[]) => void;
}) {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(options[0] ?? '');
  const emit = (t: string, s: string) => onChange?.(t.trim() ? `${t.trim()} ${s}` : '');

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          emit(e.target.value, selected);
        }}
        className={cn(inputBase, borderClass)}
      />
      <select
        value={selected}
        disabled={disabled}
        aria-label="접미사 선택"
        onChange={(e) => {
          setSelected(e.target.value);
          emit(text, e.target.value);
        }}
        className={cn(
          'h-[42px] shrink-0 rounded-lg border border-gray-300 px-2 text-sm outline-none',
          'focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-gray-400',
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FieldRenderer({ field, value, onChange, disabled, error }: FieldRendererProps) {
  const strValue = typeof value === 'string' ? value : '';
  const arrValue = Array.isArray(value) ? value : [];
  const borderClass = error ? 'border-red-400' : 'border-gray-300';

  // 글자수/숫자 범위 제약 안내 (응답자가 입력 전에 인지). 실제 검증은 기존 로직 유지.
  const hint = (() => {
    const v = field.validation;
    if (!v) return null;
    if (field.type === 'SHORT' || field.type === 'LONG') {
      const { minLength: lo, maxLength: hi } = v;
      if (lo != null && hi != null) return `${lo}~${hi}자로 입력해주세요`;
      if (lo != null) return `최소 ${lo}자 이상 입력해주세요`;
      if (hi != null) return `최대 ${hi}자까지 입력할 수 있습니다`;
    }
    if (field.type === 'NUMBER') {
      const { min: lo, max: hi } = v;
      if (lo != null && hi != null) return `${lo}~${hi} 사이의 숫자를 입력해주세요`;
      if (lo != null) return `${lo} 이상의 숫자를 입력해주세요`;
      if (hi != null) return `${hi} 이하의 숫자를 입력해주세요`;
    }
    return null;
  })();

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
        // #2 select 모드(SHORT): 입력란 + 드롭다운, 프론트가 합쳐 전송.
        if (field.type === 'SHORT' && field.validation?.suffixMode === 'select') {
          const opts = Array.isArray(field.validation.suffixOptions)
            ? field.validation.suffixOptions.filter((o) => o && o.trim())
            : [];
          if (opts.length > 0) {
            return (
              <SuffixSelectInput
                options={opts}
                placeholder={field.placeholder ?? ''}
                disabled={disabled}
                borderClass={borderClass}
                onChange={onChange}
              />
            );
          }
        }
        // #2 SHORT 고정 접미사(fixed): 입력값 전송은 그대로(서버가 합침), 화면엔 우측에 고정 텍스트만 표시.
        const suffix = field.type === 'SHORT' ? (field.validation?.suffix as string | undefined) : undefined;
        const inputEl = (
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
        if (suffix && suffix.trim()) {
          return (
            <div className="flex items-center gap-2">
              {inputEl}
              <span className="whitespace-nowrap text-sm text-gray-600">{suffix}</span>
            </div>
          );
        }
        return inputEl;
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
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
