'use client';

export function TextSamples({ samples }: { samples: string[] }) {
  if (samples.length === 0) {
    return <p className="text-sm text-gray-400">아직 응답이 없습니다.</p>;
  }
  return (
    <div>
      <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {samples.map((s, i) => (
          <li
            key={i}
            className="whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800"
          >
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-400">
        {samples.length}개 표시{samples.length >= 500 ? ' (최대 500개)' : ''}
      </p>
    </div>
  );
}
