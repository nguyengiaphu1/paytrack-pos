export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="h-6 w-44 animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-20 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
          <div className="col-span-2 h-20 animate-pulse rounded-lg bg-[var(--bg-subtle)] sm:col-span-1" />
        </div>
      </div>
    </div>
  );
}
