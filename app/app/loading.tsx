import { LoadingSkeleton } from "@/components/ui/Page";

export default function AppLoading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:px-10">
      <LoadingSkeleton className="h-8 w-56" />
      <LoadingSkeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-32" />
      </div>
      <LoadingSkeleton className="h-80" />
    </div>
  );
}
