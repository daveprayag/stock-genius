import Loader from "@/components/Loader";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6">📈 AI Stock Analyzer (India)</h1>
      <div className="flex flex-col gap-4 max-w-md w-full">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
        <Loader />
      </div>
    </main>
  );
}
