'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useUpdateField } from '@/hooks/useFields';
import { toUserMessage } from '@/lib/errorMessage';
import { CHOICE_TYPES, FIELD_TYPE_LABELS, type FieldValidation, type FormField } from '@/types/field';

interface Props {
  formId: number;
  field: FormField;
}

export function FieldEditorPanel({ formId, field }: Props) {
  const { toast } = useToast();
  const updateField = useUpdateField(formId);

  const isChoice = CHOICE_TYPES.includes(field.type);
  const [label, setLabel] = useState(field.label);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? '');
  const [required, setRequired] = useState(field.required);
  const [options, setOptions] = useState<string[]>(field.options ?? []);
  const [validation, setValidation] = useState<FieldValidation>(field.validation ?? {});

  // 선택된 필드가 바뀌면 로컬 편집 상태 재초기화
  useEffect(() => {
    setLabel(field.label);
    setPlaceholder(field.placeholder ?? '');
    setRequired(field.required);
    setOptions(field.options ?? []);
    setValidation(field.validation ?? {});
  }, [field.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (override?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
    validation?: FieldValidation;
  }) => {
    const nextLabel = override?.label ?? label;
    if (!nextLabel.trim()) {
      toast('필드 라벨을 입력해주세요.', 'error');
      return;
    }
    const nextOptions = override?.options ?? options;
    if (isChoice) {
      const clean = nextOptions.map((o) => o.trim()).filter(Boolean);
      if (clean.length === 0) {
        toast('선택지를 1개 이상 입력해주세요.', 'error');
        return;
      }
    }
    updateField.mutate(
      {
        fieldId: field.id,
        input: {
          label: nextLabel,
          placeholder: override?.placeholder ?? placeholder,
          required: override?.required ?? required,
          options: isChoice ? nextOptions.map((o) => o.trim()).filter(Boolean) : null,
          validation: isChoice ? null : (override?.validation ?? validation),
        },
      },
      { onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '저장 실패'), 'error') },
    );
  };

  const updateOption = (idx: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (idx: number) => {
    if (options.filter((o) => o.trim()).length <= 1) {
      toast('선택지는 최소 1개가 필요합니다.', 'error');
      return;
    }
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    save({ options: next });
  };

  const setValidationNum = (key: keyof FieldValidation, raw: string) => {
    const next = { ...validation };
    if (raw === '') delete next[key];
    else next[key] = Number(raw);
    setValidation(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">필드 편집</h3>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
      </div>

      <Input
        label="라벨"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => save()}
      />

      {!isChoice && (
        <Input
          label="플레이스홀더"
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          onBlur={() => save()}
        />
      )}

      <Checkbox
        label="필수 입력"
        checked={required}
        onChange={(e) => {
          setRequired(e.target.checked);
          save({ required: e.target.checked });
        }}
      />

      {isChoice && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-800">선택지</span>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  className="w-full"
                  value={opt}
                  placeholder={`선택지 ${i + 1}`}
                  onChange={(e) => updateOption(i, e.target.value)}
                  onBlur={() => save()}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeOption(i)} aria-label="선택지 삭제">
                ✕
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addOption}>
            + 선택지 추가
          </Button>
        </div>
      )}

      {(field.type === 'SHORT' || field.type === 'LONG') && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="최소 길이"
            type="number"
            value={validation.minLength ?? ''}
            onChange={(e) => setValidationNum('minLength', e.target.value)}
            onBlur={() => save()}
          />
          <Input
            label="최대 길이"
            type="number"
            value={validation.maxLength ?? ''}
            onChange={(e) => setValidationNum('maxLength', e.target.value)}
            onBlur={() => save()}
          />
        </div>
      )}

      {field.type === 'NUMBER' && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="최솟값"
            type="number"
            value={validation.min ?? ''}
            onChange={(e) => setValidationNum('min', e.target.value)}
            onBlur={() => save()}
          />
          <Input
            label="최댓값"
            type="number"
            value={validation.max ?? ''}
            onChange={(e) => setValidationNum('max', e.target.value)}
            onBlur={() => save()}
          />
        </div>
      )}
    </div>
  );
}
