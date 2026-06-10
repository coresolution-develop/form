'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddFieldMenu } from '@/components/builder/AddFieldMenu';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { FieldEditorPanel } from '@/components/builder/FieldEditorPanel';
import { FieldList } from '@/components/builder/FieldList';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDeleteField } from '@/hooks/useFields';
import { useForm } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import { useBuilderStore } from '@/store/builderStore';
import type { FormField } from '@/types/field';

export default function BuilderPage() {
  const params = useParams();
  const formId = Number(params.formId);
  const { toast } = useToast();

  const { data: form, isLoading, isError } = useForm(formId);
  const deleteField = useDeleteField(formId);

  const { selectedFieldId, previewMode, select, togglePreview, reset } = useBuilderStore();
  const [toDelete, setToDelete] = useState<FormField | null>(null);

  // 빌더 진입/폼 변경 시 UI 상태 초기화 (서버 상태는 useForm이 SSOT)
  useEffect(() => {
    reset();
  }, [formId, reset]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError || !form) {
    return <p className="py-20 text-center text-gray-500">폼을 불러올 수 없습니다.</p>;
  }

  const selectedField = form.fields.find((f) => f.id === selectedFieldId) ?? null;
  // #9: DRAFT 상태에서만 질문(필드) 구조 편집 가능. 발행/마감 폼은 잠금.
  const editMode = form.status === 'DRAFT';

  const onDeleteConfirm = () => {
    if (!toDelete) return;
    deleteField.mutate(toDelete.id, {
      onSuccess: () => {
        if (selectedFieldId === toDelete.id) select(null);
        setToDelete(null);
        toast('필드를 삭제했습니다.', 'success');
      },
      onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '삭제 실패'), 'error'),
    });
  };

  return (
    <div className="-m-6">
      <BuilderHeader form={form} previewMode={previewMode} onTogglePreview={togglePreview} />

      <div className="p-6">
        {previewMode ? (
          <div className="mx-auto max-w-2xl">
            <PreviewPanel title={form.title} description={form.description} fields={form.fields} />
          </div>
        ) : editMode ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="flex flex-col gap-4">
              <AddFieldMenu formId={formId} onCreated={(id) => select(id)} />
              <FieldList
                formId={formId}
                fields={form.fields}
                selectedId={selectedFieldId}
                onSelect={select}
                onDelete={setToDelete}
              />
            </section>

            <aside className="rounded-xl border border-gray-200 bg-white p-4">
              {selectedField ? (
                <FieldEditorPanel formId={formId} field={selectedField} />
              ) : (
                <p className="py-12 text-center text-sm text-gray-400">편집할 필드를 선택하세요.</p>
              )}
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">발행된 폼은 질문을 수정할 수 없습니다. 질문을 바꾸려면 새 폼을 만들어 주세요.</p>
              <p className="mt-1 text-xs text-amber-700">
                이미 수집된 응답·통계의 정합성을 위해 발행 후에는 질문 구조가 잠깁니다.
              </p>
            </div>
            <PreviewPanel title={form.title} description={form.description} fields={form.fields} />
          </div>
        )}
      </div>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="필드 삭제">
        <p className="text-sm text-gray-600">‘{toDelete?.label}’ 필드를 삭제하시겠습니까?</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            취소
          </Button>
          <Button onClick={onDeleteConfirm} loading={deleteField.isPending}>
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
