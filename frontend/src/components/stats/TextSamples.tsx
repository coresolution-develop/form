'use client';

export function TextSamples({ samples }: { samples: string[] }) {
  if (samples.length === 0) {
    return <p className="text-sm text-gray-400">아직 응답이 없습니다.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {samples.map((s, i) => (
        <li key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
          {s}
        </li>
      ))}
      <li className="text-xs text-gray-400">최근 {samples.length}개</li>
    </ul>
  );
}
