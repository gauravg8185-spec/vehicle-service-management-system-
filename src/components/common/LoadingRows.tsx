interface LoadingRowsProps {
  rows?: number;
  cols?: number;
}

export function LoadingRows({ rows = 5, cols = 6 }: LoadingRowsProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-4 px-5 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, colIdx) => (
              <div
                key={colIdx}
                className="h-4 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
