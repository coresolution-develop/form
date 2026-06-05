'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useCreateField } from '@/hooks/useFields';
import { toUserMessage } from '@/lib/errorMessage';
import { CHOICE_TYPES, FIELD_TYPE_LABELS, type FieldType } from '@/types/field';

const TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

interface Props {
  formId: number;
  onCreated: (fieldId: number) => void;
}

export function AddFieldMenu({ formId, onCreated }: Props) {
  const { toast } = useToast();
  const createField = useCreateField(formId);
  const [type, setType] = useState<FieldType>('SHORT');

  const onAdd = () => {
    const isChoice = CHOICE_TYPES.includes(type);
    createField.mutate(
      {
        type,
        label: `새 ${FIELD_TYPE_LABELS[type]} 필드`,
        required: false,
        options: isChoice ? ['선택지 1'] : null,
      },
      {
        onSuccess: (field) => onCreated(field.id),
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '필드 추가 실패'), 'error'),
      },
    );
  };

  return (
    <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-gray-800">필드 타입</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as FieldType)}
          className="h-10 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <Button onClick={onAdd} loading={createField.isPending}>
        + 필드 추가
      </Button>
    </div>
  );
}
