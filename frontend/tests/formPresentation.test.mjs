import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('preview and public form preserve description line breaks and render the title before the banner', () => {
  const preview = readSource('src/components/builder/PreviewPanel.tsx');
  const publicForm = readSource('src/components/form/PublicForm.tsx');

  assert.match(preview, /whitespace-pre-wrap break-words/);
  assert.match(publicForm, /whitespace-pre-wrap break-words/);
  assert.ok(preview.indexOf('<h2') < preview.indexOf('resolveAssetUrl(headerImageUrl)'));
  assert.ok(publicForm.indexOf('>{form.title}</h1>') < publicForm.indexOf('resolveAssetUrl(form.headerImageUrl)'));
});

test('builder header lets a long title use the available width', () => {
  const builderHeader = readSource('src/components/builder/BuilderHeader.tsx');

  assert.match(builderHeader, /flex min-w-0 flex-1 items-center gap-3/);
  assert.match(builderHeader, /min-w-\[12rem\] flex-1 rounded/);
});
