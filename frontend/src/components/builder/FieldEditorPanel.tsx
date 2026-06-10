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

/** validation에서 SHORT 접미사 모드 파생 (1단계 fixed 데이터 호환). */
function deriveSuffixMode(v: FieldValidation | null | undefined): 'none' | 'fixed' | 'select' {
  if (v?.suffixMode === 'select') return 'select';
  if (typeof v?.suffix === 'string' && v.suffix.trim()) return 'fixed';
  return 'none';
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
  // #2 SHORT 접미사 모드 (none/fixed/select). validation에서 파생하되 UI 안정성 위해 로컬 상태 유지.
  const [suffixMode, setSuffixMode] = useState<'none' | 'fixed' | 'select'>(
    () => deriveSuffixMode(field.validation),
  );

  // 선택된 필드가 바뀌면 로컬 편집 상태 재초기화
  useEffect(() => {
    setLabel(field.label);
    setPlaceholder(field.placeholder ?? '');
    setRequired(field.required);
    setOptions(field.options ?? []);
    setValidation(field.validation ?? {});
    setSuffixMode(deriveSuffixMode(field.validation));
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

  const setValidationStr = (key: keyof FieldValidation, raw: string) => {
    const next = { ...validation };
    if (raw.trim() === '') delete next[key];
    else next[key] = raw;
    setValidation(next);
  };

  // ----- #2 SHORT 접미사 모드 -----
  const suffixOptions: string[] = Array.isArray(validation.suffixOptions) ? validation.suffixOptions : [];

  const changeSuffixMode = (mode: 'none' | 'fixed' | 'select') => {
    setSuffixMode(mode);
    const next = { ...validation };
    // 모드 전환 시 다른 모드의 충돌 키 제거
    delete next.suffix;
    delete next.suffixMode;
    delete next.suffixOptions;
    if (mode === 'select') {
      next.suffixMode = 'select';
      const existing = Array.isArray(validation.suffixOptions) ? validation.suffixOptions : [];
      next.suffixOptions = existing.length ? existing : [''];
      setValidation(next);
      return; // 옵션은 입력 후 blur에서 저장 (빈 옵션만으론 저장 보류)
    }
    // none / fixed(빈 suffix): 즉시 저장해 이전 모드 키 정리
    setValidation(next);
    save({ validation: next });
  };

  const setSuffixOptionAt = (idx: number, value: string) =>
    setValidation((v) => {
      const arr = Array.isArray(v.suffixOptions) ? [...v.suffixOptions] : [];
      arr[idx] = value;
      return { ...v, suffixMode: 'select', suffixOptions: arr };
    });

  const addSuffixOption = () =>
    setValidation((v) => {
      const arr = Array.isArray(v.suffixOptions) ? [...v.suffixOptions] : [];
      return { ...v, suffixMode: 'select', suffixOptions: [...arr, ''] };
    });

  const saveSuffixOptions = (arr: string[]) => {
    const clean = arr.map((o) => o.trim()).filter(Boolean);
    if (clean.length === 0) {
      toast('선택 옵션을 1개 이상 입력해주세요.', 'error');
      return;
    }
    const next = { ...validation };
    delete next.suffix;
    next.suffixMode = 'select';
    next.suffixOptions = clean;
    setValidation(next);
    save({ validation: next });
  };

  const removeSuffixOption = (idx: number) => {
    if (suffixOptions.filter((o) => o.trim()).length <= 1) {
      toast('선택 옵션은 최소 1개가 필요합니다.', 'error');
      return;
    }
    saveSuffixOptions(suffixOptions.filter((_, i) => i !== idx));
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

      {field.type === 'SHORT' && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
          <label className="text-sm font-medium text-gray-800">뒷부분(접미사)</label>
          <select
            value={suffixMode}
            onChange={(e) => changeSuffixMode(e.target.value as 'none' | 'fixed' | 'select')}
            aria-label="접미사 모드"
            className="h-10 rounded-lg border border-gray-300 px-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="none">없음</option>
            <option value="fixed">고정 텍스트</option>
            <option value="select">선택 목록</option>
          </select>

          {suffixMode === 'fixed' && (
            <Input
              label="고정 접미사 (예: 고등학교)"
              helperText="입력란 뒤에 항상 붙는 텍스트입니다."
              value={(validation.suffix as string) ?? ''}
              onChange={(e) => setValidationStr('suffix', e.target.value)}
              onBlur={() => save()}
            />
          )}

          {suffixMode === 'select' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">응답자가 입력란 뒤에서 고를 옵션 (예: 고등학교 / 중학교).</p>
              {suffixOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      className="w-full"
                      value={opt}
                      placeholder={`옵션 ${i + 1}`}
                      onChange={(e) => setSuffixOptionAt(i, e.target.value)}
                      onBlur={() => saveSuffixOptions(suffixOptions)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSuffixOption(i)} aria-label="옵션 삭제">
                    ✕
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addSuffixOption}>
                + 옵션 추가
              </Button>
            </div>
          )}
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
