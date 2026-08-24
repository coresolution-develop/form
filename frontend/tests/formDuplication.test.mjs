import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('forms api exposes duplicate endpoint call', () => {
  const forms = readSource('src/lib/forms.ts');
  assert.match(forms, /duplicateForm/);
  assert.match(forms, /\/api\/forms\/\$\{id\}\/duplicate/);

  const hooks = readSource('src/hooks/useForms.ts');
  assert.match(hooks, /useDuplicateForm/);
});

test('dashboard offers blank-or-copy choice and per-card duplicate action', () => {
  const dashboard = readSource('src/app/(app)/dashboard/page.tsx');
  assert.match(dashboard, /빈 폼으로 시작/);
  assert.match(dashboard, /복사해서 시작/);
  assert.match(dashboard, />\s*복제\s*</);
});

test('builder locked banner links to duplication as the edit path', () => {
  const builder = readSource('src/app/(app)/builder/[formId]/page.tsx');
  assert.match(builder, /이 폼 복제해서 수정하기/);
  assert.match(builder, /useDuplicateForm/);
});
