import { LoadingSkeleton } from "@/components/ui/Page";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-4">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-4 w-full max-w-xl" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    </main>
  );
}
