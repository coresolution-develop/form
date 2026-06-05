'use client';

import { Checkbox } from '@/components/ui/Checkbox';

type Field = 'service' | 'privacy' | 'marketing';

interface Props {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
  onChange: (field: Field, value: boolean) => void;
  serviceError?: string;
  privacyError?: string;
}

const ROWS: { field: Field; label: string; required: boolean; href: string }[] = [
  { field: 'service', label: '이용약관 동의', required: true, href: '/terms/service' },
  { field: 'privacy', label: '개인정보처리방침 동의', required: true, href: '/terms/privacy' },
  { field: 'marketing', label: '마케팅 정보 수신 동의', required: false, href: '/terms/marketing' },
];

export function TermsAgreement({ service, privacy, marketing, onChange, serviceError, privacyError }: Props) {
  const values: Record<Field, boolean> = { service, privacy, marketing };
  const allChecked = service && privacy && marketing;

  const toggleAll = (checked: boolean) => {
    onChange('service', checked);
    onChange('privacy', checked);
    onChange('marketing', checked);
  };

  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-medium text-gray-800">약관 동의</legend>

      <div className="border-b border-gray-100 pb-2">
        <Checkbox
          label={<span className="font-medium">전체 동의</span>}
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
        />
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {ROWS.map((row) => (
          <div key={row.field} className="flex items-center justify-between">
            <Checkbox
              label={
                <span>
                  <span className={row.required ? 'text-blue-600' : 'text-gray-500'}>
                    [{row.required ? '필수' : '선택'}]
                  </span>{' '}
                  {row.label}
                </span>
              }
              checked={values[row.field]}
              onChange={(e) => onChange(row.field, e.target.checked)}
            />
            <a
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              보기
            </a>
          </div>
        ))}
      </div>

      {(serviceError || privacyError) && (
        <p className="mt-2 text-xs text-red-600">{serviceError ?? privacyError}</p>
      )}
    </fieldset>
  );
}
