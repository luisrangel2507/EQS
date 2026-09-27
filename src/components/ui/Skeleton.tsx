export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonTarjetas({ cantidad = 3, alto = "h-32" }: { cantidad?: number; alto?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className={`w-full ${alto}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpis({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-navy-900/90 p-4">
          <div className="skeleton-dark h-3 w-1/2 rounded" />
          <div className="skeleton-dark mt-3 h-8 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPagina() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <SkeletonKpis />
      <SkeletonTarjetas />
    </div>
  );
}
