import { PosWorkspaceSkeleton } from '@/components/ui/PageSkeletons';

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 space-y-2">
        <div className="skeleton-shimmer h-7 w-44 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-72 max-w-full rounded-lg" />
      </div>
      <PosWorkspaceSkeleton />
    </div>
  );
}
