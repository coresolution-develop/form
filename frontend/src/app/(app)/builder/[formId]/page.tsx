'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddFieldMenu } from '@/components/builder/AddFieldMenu';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { FieldEditorPanel } from '@/components/builder/FieldEditorPanel';
import { FieldList } from '@/components/builder/FieldList';
import { FormDescriptionEditor } from '@/components/builder/FormDescriptionEditor';
import { HeaderImageSettings } from '@/components/builder/HeaderImageSettings';
import { QuotaSettings } from '@/components/builder/QuotaSettings';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDeleteField } from '@/hooks/useFields';
import { useDuplicateForm, useForm } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import { useBuilderStore } from '@/store/builderStore';
import type { FormField } from '@/types/field';

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.formId);
  const { toast } = useToast();

  const { data: form, isLoading, isError } = useForm(formId);
  const deleteField = useDeleteField(formId);
  const duplicateForm = useDuplicateForm();

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
    return <p className="py-20 text-center text-ink-400">폼을 불러올 수 없습니다.</p>;
  }

  const selectedField = form.fields.find((f) => f.id === selectedFieldId) ?? null;
  // #9: DRAFT 상태에서만 질문(필드) 구조 편집 가능. 발행/마감 폼은 잠금.
  const editMode = form.status === 'DRAFT';

  // #9 잠금의 출구(D-017): 발행/마감된 폼은 복제해서 수정한다.
  const onDuplicate = () => {
    duplicateForm.mutate(formId, {
      onSuccess: (copy) => {
        toast('폼을 복제했습니다. 사본을 편집하세요.', 'success');
        router.push(`/builder/${copy.id}`);
      },
      onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '폼 복제 실패'), 'error'),
    });
  };

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
    <div className="-mx-8 -my-7">
      <BuilderHeader form={form} previewMode={previewMode} onTogglePreview={togglePreview} />

      <div className="min-h-[calc(100vh-104px)] bg-surface-subtle px-7 py-6">
        {!previewMode && (
          <div className="mb-6 flex flex-col gap-4">
            <FormDescriptionEditor form={form} />
            <HeaderImageSettings form={form} />
            <QuotaSettings form={form} />
          </div>
        )}
        {previewMode ? (
          <div className="mx-auto max-w-2xl">
            <PreviewPanel
              title={form.title}
              description={form.description}
              fields={form.fields}
              headerImageUrl={form.headerImageUrl}
              logoImageUrl={form.logoImageUrl}
            />
          </div>
        ) : editMode ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_392px]">
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

            <aside className="rounded-[10px] border border-line bg-white p-5">
              {selectedField ? (
                <FieldEditorPanel formId={formId} field={selectedField} fields={form.fields} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-300">편집할 필드를 선택하세요.</p>
              )}
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 rounded-lg border border-warn-fg/20 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
              <p className="font-medium">발행된 폼은 질문을 수정할 수 없습니다. 질문을 바꾸려면 폼을 복제해 주세요.</p>
              <p className="mt-1 text-xs text-warn-fg">
                이미 수집된 응답·통계의 정합성을 위해 발행 후에는 질문 구조가 잠깁니다.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2.5"
                onClick={onDuplicate}
                loading={duplicateForm.isPending}
              >
                이 폼 복제해서 수정하기
              </Button>
            </div>
            <PreviewPanel
              title={form.title}
              description={form.description}
              fields={form.fields}
              headerImageUrl={form.headerImageUrl}
              logoImageUrl={form.logoImageUrl}
            />
          </div>
        )}
      </div>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="필드 삭제">
        <p className="text-sm text-ink-500">‘{toDelete?.label}’ 필드를 삭제하시겠습니까?</p>
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
