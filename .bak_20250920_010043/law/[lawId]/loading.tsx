// app/law/[lawId]/loading.tsx
export default function Loading() {
  return (
    <main className="p-6 space-y-4">
      <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse" />
      </div>
    </main>
  );
}
